import type { TransactionType } from '../../types/database';

export const TRANSACTION_TYPES: TransactionType[] = ['inbound', 'outbound', 'order'];

export const TYPE_LABELS: Record<TransactionType, string> = {
  inbound: '入库',
  outbound: '出库',
  order: '订单',
};

// 整单的叫法（单条流水仍叫 入库/出库/订单）
export const DOC_LABELS: Record<TransactionType, string> = {
  inbound: '入库单',
  outbound: '出库单',
  order: '订货单',
};

export const TYPE_STYLES: Record<TransactionType, string> = {
  inbound: 'bg-green-50 text-green-700',
  outbound: 'bg-red-50 text-red-700',
  order: 'bg-gray-100 text-gray-600',
};

// 订单只是「已下单、还没到货」，不参与库存加减
export function affectsStock(type: TransactionType): boolean {
  return type !== 'order';
}
