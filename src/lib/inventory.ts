import type { ProductWithStock } from '../types/database';

export function isLowStock(
  product: Pick<ProductWithStock, 'current_stock' | 'reorder_point'>
): boolean {
  if (product.reorder_point == null) return false;
  return product.current_stock < product.reorder_point;
}

export function filterProducts(
  products: ProductWithStock[],
  { search, lowStockOnly }: { search: string; lowStockOnly: boolean }
): ProductWithStock[] {
  const term = search.trim().toLowerCase();
  return products.filter((p) => {
    if (lowStockOnly && !isLowStock(p)) return false;
    if (!term) return true;
    return p.name_cn.toLowerCase().includes(term) || (p.sku ?? '').toLowerCase().includes(term);
  });
}
