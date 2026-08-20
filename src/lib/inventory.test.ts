import { describe, expect, test } from 'vitest';
import { isLowStock, filterProducts } from './inventory';
import type { ProductWithStock } from '../types/database';

function makeProduct(overrides: Partial<ProductWithStock> = {}): ProductWithStock {
  return {
    id: 1,
    name_cn: '示例商品 A',
    name_en: null,
    material: null,
    sku: 'sku-a',
    box_qty: null,
    ctn: null,
    net_weight: null,
    gross_weight: null,
    length: null,
    width: null,
    height: null,
    cbm: null,
    price_jpy: null,
    price_rmb: null,
    reorder_point: 100,
    opening_stock: 0,
    photo_url: null,
    created_at: '',
    updated_at: '',
    current_stock: 500,
    latest_date: null,
    latest_type: null,
    latest_quantity: null,
    inbound_total: 0,
    outbound_total: 0,
    order_total: 0,
    last_inbound_date: null,
    last_inbound_quantity: null,
    last_order_date: null,
    last_order_quantity: null,
    ...overrides,
  };
}

describe('isLowStock', () => {
  test('true when current_stock is below reorder_point', () => {
    expect(isLowStock(makeProduct({ current_stock: 40, reorder_point: 100 }))).toBe(true);
  });

  test('false when current_stock is at or above reorder_point', () => {
    expect(isLowStock(makeProduct({ current_stock: 100, reorder_point: 100 }))).toBe(false);
  });

  test('false when reorder_point is not set', () => {
    expect(isLowStock(makeProduct({ current_stock: 0, reorder_point: null }))).toBe(false);
  });
});

describe('filterProducts', () => {
  const products = [
    makeProduct({ id: 1, name_cn: '示例商品 A', sku: 'tube-120P', current_stock: 40, reorder_point: 100 }),
    makeProduct({ id: 2, name_cn: '示例商品 B', sku: null, current_stock: 900, reorder_point: 100 }),
  ];

  test('search matches name_cn case-insensitively', () => {
    const result = filterProducts(products, { search: '商品 A', lowStockOnly: false });
    expect(result.map((p) => p.id)).toEqual([1]);
  });

  test('search matches sku', () => {
    const result = filterProducts(products, { search: 'tube', lowStockOnly: false });
    expect(result.map((p) => p.id)).toEqual([1]);
  });

  test('lowStockOnly filters to products under their reorder point', () => {
    const result = filterProducts(products, { search: '', lowStockOnly: true });
    expect(result.map((p) => p.id)).toEqual([1]);
  });
});
