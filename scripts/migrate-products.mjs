import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import { readFileSync } from 'node:fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.migration' });

const SOURCE_FILE = process.argv[2];
if (!SOURCE_FILE) {
  console.error('Usage: node scripts/migrate-products.mjs <path-to-old-excel-file.xlsx>');
  process.exit(1);
}

// Column indices (0-based) as found in the original "中国库存用.xlsx" sheet
// "20260722库存". Verify these against the actual file before running --
// the sheet has merged header cells and stray values, this mapping was
// derived by manual inspection, not a machine-readable header row.
const COLUMNS = {
  name_cn: 4, // ITEM
  name_en: 5, // romaji / English name
  material_cn: 7, // 材质（原表这列全空）
  material_jp: 8, // 材質（原表材质数据实际都在这列）
  sku: 9, // 品番
  box_qty: 17, // 数/箱
  ctn: 18, // CTN
  net_weight: 19, // N.W
  gross_weight: 20, // G.W
  length: 23, // L
  width: 24, // W
  height: 25, // H
  cbm: 26, // CBM
  price_jpy: 27, // 日元价格
  price_rmb: 29, // 单价(RMB)
  opening_stock: 31, // 实时库存 -- becomes each product's opening_stock
};
const FIRST_DATA_ROW = 3; // rows 0-1 are headers (0-indexed), data starts at row index 2 in most exports; verify against your file

function toNumberOrNull(v) {
  if (v === undefined || v === '' || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toTextOrNull(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

// The sheet only writes 品名/品番/材质 on the FIRST row of each product family;
// the rows beneath it omit those fields but are still independent stock lines
// with their own dimensions, prices and 实时库存. Those rows carry a stray
// running number in the ITEM column (50, 51, 90, 91 ...) which is just a
// sequence counter and is ignored. Each such row inherits its family's name
// and gets a size suffix so the variants stay distinguishable in the app.
function isFamilyHeader(row) {
  const item = toTextOrNull(row[COLUMNS.name_cn]);
  return item !== null && !/^[0-9.]+$/.test(item);
}

function hasAnyData(row) {
  return (
    toNumberOrNull(row[COLUMNS.opening_stock]) !== null ||
    toNumberOrNull(row[COLUMNS.price_jpy]) !== null ||
    toNumberOrNull(row[COLUMNS.price_rmb]) !== null ||
    toNumberOrNull(row[COLUMNS.length]) !== null
  );
}

const workbook = XLSX.read(readFileSync(SOURCE_FILE));
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });

const products = [];
const skipped = [];
let family = null;

rows.slice(FIRST_DATA_ROW).forEach((row, i) => {
  const excelRow = FIRST_DATA_ROW + i + 1; // 1-based row number as shown in Excel

  if (isFamilyHeader(row)) {
    family = {
      name_cn: String(row[COLUMNS.name_cn]).trim(),
      name_en: toTextOrNull(row[COLUMNS.name_en]),
      // 两列合并成一个字段：中文列在原表里是空的，数据都在日文列
      material: toTextOrNull(row[COLUMNS.material_cn]) ?? toTextOrNull(row[COLUMNS.material_jp]),
    };
  }

  if (family === null || !hasAnyData(row)) {
    if (hasAnyData(row)) skipped.push({ excelRow, reason: 'no product name above it' });
    return;
  }

  products.push({
    excelRow,
    // 品名保持大类名，规格靠长宽高等字段区分
    name_cn: family.name_cn,
    name_en: family.name_en,
    material: family.material,
    sku: toTextOrNull(row[COLUMNS.sku]),
    box_qty: toNumberOrNull(row[COLUMNS.box_qty]),
    ctn: toNumberOrNull(row[COLUMNS.ctn]),
    net_weight: toNumberOrNull(row[COLUMNS.net_weight]),
    gross_weight: toNumberOrNull(row[COLUMNS.gross_weight]),
    length: toNumberOrNull(row[COLUMNS.length]),
    width: toNumberOrNull(row[COLUMNS.width]),
    height: toNumberOrNull(row[COLUMNS.height]),
    cbm: toNumberOrNull(row[COLUMNS.cbm]),
    price_jpy: toNumberOrNull(row[COLUMNS.price_jpy]),
    price_rmb: toNumberOrNull(row[COLUMNS.price_rmb]),
    opening_stock: toNumberOrNull(row[COLUMNS.opening_stock]) ?? 0,
  });
});

const totalStock = products.reduce((sum, p) => sum + p.opening_stock, 0);
console.log(`Parsed ${products.length} products from ${SOURCE_FILE}.`);
console.log(`Total opening stock: ${totalStock}`);
if (skipped.length) {
  console.log(`Skipped ${skipped.length} rows that had data but no product name above them:`);
  console.log(skipped.slice(0, 10));
}
console.log('\nExcel row -> product name (first 15):');
for (const p of products.slice(0, 15)) {
  console.log(`  R${String(p.excelRow).padStart(3)}  ${p.name_cn}  库存 ${p.opening_stock}`);
}

// excelRow is a parse-time aid only -- strip it before inserting.
const payload = products.map(({ excelRow: _excelRow, ...rest }) => rest);

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data, error } = await supabase.from('products').insert(payload).select('id');
if (error) {
  console.error('Insert failed:', error);
  process.exit(1);
}
console.log(`Inserted ${data.length} products.`);
