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

const HEADER = ['编号', '品名', '品番', '包装尺寸', '数量'];

function escapeCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

// Excel 认 BOM 才不会把中文显示成乱码
export function buildTemplateCsv(products: TemplateProduct[]): string {
  const lines = [HEADER.join(',')];
  for (const p of products) {
    const size = p.length && p.width && p.height ? `${p.length}×${p.width}×${p.height}` : '';
    lines.push([String(p.id), p.name_cn, p.sku ?? '', size, ''].map(escapeCell).join(','));
  }
  return '\uFEFF' + lines.join('\r\n') + '\r\n';
}

function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

// 只认「编号」和「数量」两列，其余列是给人看的参考，随便他们怎么改
export function parseQuantityCsv(text: string, validIds: Set<number>): ParseResult {
  const clean = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim();
  const lines = clean.split('\n').filter((l) => l.trim() !== '');
  if (lines.length === 0) return { rows: [], errors: ['文件是空的'] };

  const header = splitLine(lines[0]);
  const idCol = header.indexOf('编号');
  const qtyCol = header.indexOf('数量');
  if (idCol === -1 || qtyCol === -1) {
    return { rows: [], errors: ['表头里必须有「编号」和「数量」两列，请用下载的模板填写'] };
  }

  const rows: ParsedRow[] = [];
  const errors: string[] = [];
  const seen = new Set<number>();

  lines.slice(1).forEach((line, i) => {
    const lineNo = i + 2;
    const cells = splitLine(line);
    const rawQty = cells[qtyCol] ?? '';
    if (rawQty === '') return; // 没填数量的行直接跳过

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
