import { describe, expect, test } from 'vitest';
import { productsToRows, transactionsToRows } from './exportExcel';
import type { ProductWithStock, TransactionWithProduct } from '../types/database';

function makeProduct(overrides: Partial<ProductWithStock> = {}): ProductWithStock {
  return {
    id: 1,
    name_cn: '示例商品 A',
    name_en: null,
    material: '铝',
    sku: 'tube-120P',
    box_qty: 25,
    ctn: 20,
    net_weight: null,
    gross_weight: null,
    length: null,
    width: null,
    height: null,
    cbm: null,
    price_jpy: 440,
    price_rmb: 12.1,
    reorder_point: 100,
    opening_stock: 0,
    photo_url: null,
    created_at: '',
    updated_at: '',
    current_stock: 1300,
    latest_date: '2026-08-11',
    latest_type: 'outbound',
    latest_quantity: 500,
    ...overrides,
  };
}

describe('productsToRows', () => {
  test('maps a product to a flat export row with Chinese headers', () => {
    const rows = productsToRows([makeProduct()]);
    expect(rows).toEqual([
      {
        编号: 1,
        品名: '示例商品 A',
        品番: 'tube-120P',
        材质: '铝',
        数箱: 25,
        日元单价: 440,
        单价RMB: 12.1,
        实时库存: 1300,
      },
    ]);
  });
});

describe('transactionsToRows', () => {
  test('maps a transaction to a flat export row', () => {
    const tx: TransactionWithProduct = {
      id: 1,
      product_id: 1,
      type: 'outbound',
      quantity: 500,
      date: '2026-08-11',
      note: '商事海运 3/16装柜',
      created_by: null,
      created_at: '',
      product: { id: 1, name_cn: '示例商品 A', sku: 'tube-120P' },
    };
    expect(transactionsToRows([tx])).toEqual([
      { 日期: '2026-08-11', 品名: '示例商品 A', 品番: 'tube-120P', 类型: '出库', 数量: 500, 备注: '商事海运 3/16装柜' },
    ]);
  });
});
