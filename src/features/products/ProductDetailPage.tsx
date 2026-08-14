import { Link, useNavigate, useParams } from 'react-router-dom';
import { useProduct } from './useProduct';
import { useTransactions } from '../transactions/useTransactions';
import { TransactionForm } from '../transactions/TransactionForm';
import type { TransactionType } from '../../types/database';

const typeStyles: Record<TransactionType, string> = {
  inbound: 'bg-green-50 text-green-700',
  outbound: 'bg-red-50 text-red-700',
  order: 'bg-gray-100 text-gray-600',
};
const typeLabels: Record<TransactionType, string> = { inbound: '入库', outbound: '出库', order: '订单' };

export default function ProductDetailPage() {
  const { id } = useParams();
  const productId = Number(id);
  const { product, loading } = useProduct(productId);
  const { transactions, loading: txLoading } = useTransactions(productId);
  const navigate = useNavigate();

  if (loading) return <div className="p-4 text-gray-500">加载中…</div>;
  if (!product) return <div className="p-4 text-gray-500">找不到这个商品</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <Link to="/" className="text-sm text-gray-500">
        ← 返回商品列表
      </Link>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="text-base font-medium">{product.name_cn}</p>
            <p className="mt-0.5 text-xs text-gray-400">
              编号 {String(product.id).padStart(4, '0')} · 品番 {product.sku ?? '-'}
            </p>
          </div>
          <button
            onClick={() => navigate(`/products/${product.id}/edit`)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            编辑资料
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-gray-200 pt-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-gray-400">材质</p>
            <p className="text-sm">{product.material ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">数/箱</p>
            <p className="text-sm">{product.box_qty ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">单价(RMB)</p>
            <p className="text-sm">{product.price_rmb ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">实时库存</p>
            <p className="text-sm font-medium">{product.current_stock}</p>
          </div>
        </div>
      </div>

      <TransactionForm productId={product.id} onCreated={() => {}} />

      <div>
        <p className="mb-2 text-sm text-gray-500">历史流水</p>
        {txLoading ? (
          <p className="text-sm text-gray-400">加载中…</p>
        ) : (
          <div className="flex flex-col">
            {transactions.map((t) => (
              <div key={t.id} className="flex items-center gap-3 border-b border-gray-200 py-2.5">
                <span className="w-16 shrink-0 text-xs text-gray-400">{t.date}</span>
                <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs ${typeStyles[t.type]}`}>
                  {typeLabels[t.type]}
                </span>
                <span className="flex-1 text-sm">
                  {t.type === 'outbound' ? '-' : '+'}
                  {t.quantity}
                </span>
                <span className="text-xs text-gray-400">{t.note ?? ''}</span>
              </div>
            ))}
            {transactions.length === 0 && <p className="py-2 text-sm text-gray-400">还没有流水记录</p>}
          </div>
        )}
      </div>
    </div>
  );
}
