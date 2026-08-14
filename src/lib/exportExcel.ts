import * as XLSX from 'xlsx';
import type { ProductWithStock, TransactionType, TransactionWithProduct } from '../types/database';

const typeLabels: Record<TransactionType, string> = { inbound: '入库', outbound: '出库', order: '订单' };

export function productsToRows(products: ProductWithStock[]) {
  return products.map((p) => ({
    编号: p.id,
    品名: p.name_cn,
    品番: p.sku ?? '',
    材质: p.material ?? '',
    数箱: p.box_qty ?? '',
    日元单价: p.price_jpy ?? '',
    单价RMB: p.price_rmb ?? '',
    实时库存: p.current_stock,
  }));
}

export function transactionsToRows(transactions: TransactionWithProduct[]) {
  return transactions.map((t) => ({
    日期: t.date,
    品名: t.product.name_cn,
    品番: t.product.sku ?? '',
    类型: typeLabels[t.type],
    数量: t.quantity,
    备注: t.note ?? '',
  }));
}

function downloadWorkbook(rows: Record<string, unknown>[], sheetName: string, filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

export function exportProductsToExcel(products: ProductWithStock[]) {
  downloadWorkbook(productsToRows(products), '商品库存', `商品库存_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportTransactionsToExcel(transactions: TransactionWithProduct[]) {
  downloadWorkbook(transactionsToRows(transactions), '流水明细', `流水明细_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
