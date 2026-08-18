import type { Product } from '../../types/database';

export type TemplateProduct = Pick<Product, 'id' | 'name_cn' | 'sku' | 'length' | 'width' | 'height'>;

export interface ParsedRow {
  productId: number;
  quantity: number;
}

export interface ParseResult {
  rows: ParsedRow[];
  errors: string[];
}

// 表头带 ASCII 标记：Excel 另存成本地编码后中文可能变乱码，
// 甚至「编」在 Shift-JIS 里根本没有对应字符，靠中文认列必然失败。
const HEADER = ['编号(ID)', '品名', '品番', '包装尺寸', '数量(QTY)'];

function escapeCell(v: string): string {
  // 品名/品番里可能自带换行，写进模板前压成空格，少一个出错来源
  const flat = v.replace(/[\r\n]+/g, ' ').trim();
  return /[",]/.test(flat) ? `"${flat.replace(/"/g, '""')}"` : flat;
}

export function buildTemplateCsv(products: TemplateProduct[]): string {
  const lines = [HEADER.join(',')];
  for (const p of products) {
    const size = p.length && p.width && p.height ? `${p.length}×${p.width}×${p.height}` : '';
    lines.push([String(p.id), p.name_cn, p.sku ?? '', size, ''].map(escapeCell).join(','));
  }
  return '\uFEFF' + lines.join('\r\n') + '\r\n';
}

// Excel 存 CSV 用系统本地编码，中文机器多为 GBK、日文机器为 Shift-JIS。
// 同一串字节往往在两种编码下都合法，只是解出来一个是乱码——所以不能
// 试到第一个不报错就收手，要看谁解出的中文更像模板里的词。
const MARKERS = ['品名', '品番', '数量', '编号', '包装尺寸'];

function score(text: string): number {
  return MARKERS.reduce((n, m) => (text.includes(m) ? n + 1 : n), 0);
}

export function decodeCsvBytes(buffer: ArrayBuffer): string {
  let best: { text: string; score: number } | null = null;
  for (const encoding of ['utf-8', 'gbk', 'shift_jis']) {
    let text: string;
    try {
      text = new TextDecoder(encoding, { fatal: true }).decode(buffer);
    } catch {
      continue; // 这种编码解不了，换下一种
    }
    const s = score(text);
    if (!best || s > best.score) best = { text, score: s };
  }
  return best?.text ?? new TextDecoder('utf-8').decode(buffer);
}

// 整篇一次性扫描：引号内的换行属于单元格内容，不能当作换行处理。
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  row.push(cell);
  rows.push(row);
  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c !== ''));
}

// 先按名字找；名字被编码破坏时退回位置——模板永远是第一列编号、最后一列数量。
function locateColumns(header: string[]): { idCol: number; qtyCol: number } {
  const find = (needles: string[]) =>
    header.findIndex((h) => needles.some((n) => h.toUpperCase().includes(n)));
  const byName = { idCol: find(['ID', '编号']), qtyCol: find(['QTY', '数量']) };
  if (byName.idCol !== -1 && byName.qtyCol !== -1) return byName;
  return { idCol: 0, qtyCol: header.length - 1 };
}

export function parseQuantityCsv(text: string, validIds: Set<number>): ParseResult {
  const table = parseCsv(text.replace(/^\uFEFF/, ''));
  if (table.length < 2) return { rows: [], errors: ['文件里没有数据行，请用下载的模板填写'] };

  const { idCol, qtyCol } = locateColumns(table[0]);
  if (idCol === qtyCol) {
    return { rows: [], errors: ['认不出「编号」和「数量」两列，请用下载的模板填写'] };
  }

  const rows: ParsedRow[] = [];
  const errors: string[] = [];
  const seen = new Set<number>();

  table.slice(1).forEach((cells, i) => {
    const lineNo = i + 2;
    const rawQty = cells[qtyCol] ?? '';
    if (rawQty === '') return; // 没填数量的行跳过

    const productId = Number(cells[idCol]);
    if (!Number.isInteger(productId) || !validIds.has(productId)) {
      errors.push(`第 ${lineNo} 行：编号 "${cells[idCol] ?? ''}" 在系统里找不到`);
      return;
    }
    const quantity = Number(rawQty);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      errors.push(`第 ${lineNo} 行：数量 "${rawQty}" 不是有效的正数`);
      return;
    }
    if (seen.has(productId)) {
      errors.push(`第 ${lineNo} 行：编号 ${productId} 重复出现`);
      return;
    }
    seen.add(productId);
    rows.push({ productId, quantity });
  });

  return { rows, errors };
}
