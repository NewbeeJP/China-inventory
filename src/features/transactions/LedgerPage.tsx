import { useMemo, useState } from 'react';
import { useTransactions } from './useTransactions';
import { TransactionForm } from './TransactionForm';
import { exportTransactionsToExcel } from '../../lib/exportExcel';
import type { TransactionType } from '../../types/database';

const typeStyles: Record<TransactionType, string> = {
  inbound: 'bg-green-50 text-green-700',
  outbound: 'bg-red-50 text-red-700',
  order: 'bg-gray-100 text-gray-600',
};
const typeLabels: Record<TransactionType, string> = { inbound: '入库', outbound: '出库', order: '订单' };

export default function LedgerPage() {
  const { transactions, loading } = useTransactions();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showForm, setShowForm] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (from && t.date < from) return false;
      if (to && t.date > to) return false;
      if (!term) return true;
      return (
        t.product.name_cn.toLowerCase().includes(term) ||
        (t.product.sku ?? '').toLowerCase().includes(term)
      );
    });
  }, [transactions, search, typeFilter, from, to]);

  if (loading) return <div className="p-4 text-gray-500">加载中…</div>;

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="搜索品名 / 品番"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[160px] flex-[2] rounded-md border border-gray-300 px-3 py-2"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TransactionType | 'all')}
          className="min-w-[100px] flex-1 rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="all">全部类型</option>
          <option value="inbound">入库</option>
          <option value="outbound">出库</option>
          <option value="order">订单</option>
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="min-w-[130px] flex-1 rounded-md border border-gray-300 px-3 py-2" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="min-w-[130px] flex-1 rounded-md border border-gray-300 px-3 py-2" />
        <button onClick={() => setShowForm((v) => !v)} className="rounded-md bg-gray-900 px-3 py-2 text-sm text-white">
          + 登记一笔
        </button>
        <button
          onClick={() => exportTransactionsToExcel(filtered)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700"
        >
          导出 Excel
        </button>
      </div>

      {showForm && (
        <div className="mb-4">
          <TransactionForm onCreated={() => setShowForm(false)} />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-300 text-left text-gray-500">
              <th className="px-2 py-2 font-medium">日期</th>
              <th className="px-2 py-2 font-medium">品名</th>
              <th className="px-2 py-2 font-medium">品番</th>
              <th className="px-2 py-2 font-medium">类型</th>
              <th className="px-2 py-2 text-right font-medium">数量</th>
              <th className="px-2 py-2 font-medium">备注</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-b border-gray-200">
                <td className="whitespace-nowrap px-2 py-2">{t.date}</td>
                <td className="px-2 py-2">{t.product.name_cn}</td>
                <td className="px-2 py-2 text-gray-400">{t.product.sku ?? '-'}</td>
                <td className="px-2 py-2">
                  <span className={`rounded-md px-2 py-0.5 text-xs ${typeStyles[t.type]}`}>{typeLabels[t.type]}</span>
                </td>
                <td className="px-2 py-2 text-right">{t.quantity}</td>
                <td className="px-2 py-2 text-gray-500">{t.note ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="py-4 text-sm text-gray-400">没有符合条件的记录</p>}
      </div>
    </div>
  );
}
