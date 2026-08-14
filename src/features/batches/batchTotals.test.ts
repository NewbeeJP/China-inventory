import { describe, expect, test } from 'vitest';
import { batchTotals } from './batchTotals';
import type { BatchLine } from '../../types/database';

function line(overrides: Partial<BatchLine> & { quantity: number }): BatchLine {
  return {
    id: 1,
    product_id: 1,
    batch_id: 1,
    type: 'outbound',
    date: '2026-08-11',
    note: null,
    created_by: null,
    created_at: '',
    ...overrides,
    product: {
      id: 1,
      name_cn: '示例商品',
      sku: null,
      box_qty: null,
      net_weight: null,
      gross_weight: null,
      cbm: null,
      price_jpy: null,
      price_rmb: null,
      ...overrides.product,
    },
  };
}

describe('batchTotals', () => {
  test('adds up quantity and money across lines', () => {
    const totals = batchTotals([
      line({ quantity: 500, product: { price_jpy: 440, price_rmb: 12.1 } as BatchLine['product'] }),
      line({ quantity: 200, product: { price_jpy: 550, price_rmb: 15.1 } as BatchLine['product'] }),
    ]);
    expect(totals.quantity).toBe(700);
    expect(totals.amountJpy).toBe(500 * 440 + 200 * 550);
    expect(totals.amountRmb).toBeCloseTo(500 * 12.1 + 200 * 15.1, 2);
  });

  test('derives carton count from 数/箱 and rounds up a part-full carton', () => {
    const totals = batchTotals([
      line({ quantity: 50, product: { box_qty: 25 } as BatchLine['product'] }),
      line({ quantity: 30, product: { box_qty: 25 } as BatchLine['product'] }),
    ]);
    // 50/25 = 2 整箱，30/25 = 1.2 箱按 2 箱算
    expect(totals.cartons).toBe(4);
  });

  test('scales weight and volume by carton count, not by piece', () => {
    const totals = batchTotals([
      line({ quantity: 50, product: { box_qty: 25, net_weight: 3.42, gross_weight: 4.12, cbm: 0.7875 } as BatchLine['product'] }),
    ]);
    expect(totals.cartons).toBe(2);
    expect(totals.netWeight).toBeCloseTo(6.84, 2);
    expect(totals.grossWeight).toBeCloseTo(8.24, 2);
    expect(totals.cbm).toBeCloseTo(1.575, 3);
  });

  test('skips lines whose product is missing the figure', () => {
    const totals = batchTotals([
      line({ quantity: 100, product: { box_qty: null, price_jpy: null } as BatchLine['product'] }),
      line({ quantity: 25, product: { box_qty: 25, price_jpy: 440 } as BatchLine['product'] }),
    ]);
    expect(totals.quantity).toBe(125);
    expect(totals.cartons).toBe(1);
    expect(totals.amountJpy).toBe(25 * 440);
  });

  test('an empty batch totals to zero rather than NaN', () => {
    const totals = batchTotals([]);
    expect(totals).toEqual({
      quantity: 0,
      cartons: 0,
      netWeight: 0,
      grossWeight: 0,
      cbm: 0,
      amountJpy: 0,
      amountRmb: 0,
    });
  });
});
