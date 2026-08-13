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
  material_cn: 7, // 材质
  material_jp: 8, // 材質
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

const workbook = XLSX.read(readFileSync(SOURCE_FILE));
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });

const products = rows
  .slice(FIRST_DATA_ROW)
  .filter((row) => toTextOrNull(row[COLUMNS.name_cn]) !== null)
  .map((row) => ({
    name_cn: String(row[COLUMNS.name_cn]).trim(),
    name_en: toTextOrNull(row[COLUMNS.name_en]),
    material_cn: toTextOrNull(row[COLUMNS.material_cn]),
    material_jp: toTextOrNull(row[COLUMNS.material_jp]),
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
  }));

console.log(`Parsed ${products.length} products from ${SOURCE_FILE}. First 3:`);
console.log(products.slice(0, 3));

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data, error } = await supabase.from('products').insert(products).select('id');
if (error) {
  console.error('Insert failed:', error);
  process.exit(1);
}
console.log(`Inserted ${data.length} products.`);
