import type { NewProduct } from '../../types/database';

// 哪些字段存数字必须显式列出。早先的写法是「默认值为 null 就当数字」，
// 而品番、材质这些文本字段默认值也是 null，于是输入的文字被 Number() 变成了 NaN。
export const NUMERIC_FIELDS = new Set<keyof NewProduct>([
  'box_qty',
  'ctn',
  'net_weight',
  'gross_weight',
  'length',
  'width',
  'height',
  'cbm',
  'price_jpy',
  'price_rmb',
  'reorder_point',
  'opening_stock',
]);

export function coerceFieldValue(
  key: keyof NewProduct,
  raw: string
): string | number | null {
  if (raw === '') return null;
  if (!NUMERIC_FIELDS.has(key)) return raw;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
