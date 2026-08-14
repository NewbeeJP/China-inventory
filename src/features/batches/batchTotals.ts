import type { BatchLine } from '../../types/database';

export interface BatchTotals {
  quantity: number;
  cartons: number;
  netWeight: number;
  grossWeight: number;
  cbm: number;
  amountJpy: number;
  amountRmb: number;
}

function round(n: number, places = 3): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

// 原表里的 T.N.W / T.G.W / CBM / 出货金额 是按整箱算的：
// 净重、毛重、体积都是「一箱」的参数，所以要乘箱数而不是件数。
// 装不满一箱也占一个箱位，向上取整。
export function batchTotals(lines: BatchLine[]): BatchTotals {
  const totals: BatchTotals = {
    quantity: 0,
    cartons: 0,
    netWeight: 0,
    grossWeight: 0,
    cbm: 0,
    amountJpy: 0,
    amountRmb: 0,
  };

  for (const l of lines) {
    const p = l.product;
    totals.quantity += l.quantity;

    const cartons = p.box_qty ? Math.ceil(l.quantity / p.box_qty) : 0;
    totals.cartons += cartons;
    totals.netWeight += cartons * (p.net_weight ?? 0);
    totals.grossWeight += cartons * (p.gross_weight ?? 0);
    totals.cbm += cartons * (p.cbm ?? 0);

    totals.amountJpy += l.quantity * (p.price_jpy ?? 0);
    totals.amountRmb += l.quantity * (p.price_rmb ?? 0);
  }

  return {
    quantity: round(totals.quantity),
    cartons: totals.cartons,
    netWeight: round(totals.netWeight),
    grossWeight: round(totals.grossWeight),
    cbm: round(totals.cbm, 4),
    amountJpy: round(totals.amountJpy, 2),
    amountRmb: round(totals.amountRmb, 2),
  };
}
