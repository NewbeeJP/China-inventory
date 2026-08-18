import { Link, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useBatch } from './useBatches';
import { batchTotals } from './batchTotals';
import { DOC_LABELS, TYPE_STYLES } from '../transactions/transactionType';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-gray-50 p-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

export default function BatchDetailPage() {
  const { id } = useParams();
  const { batch, lines, loading, refetch } = useBatch(Number(id));

  if (loading) return <div className="p-4 text-gray-500">加载中…</div>;
  if (!batch) return <div className="p-4 text-gray-500">找不到这张单据</div>;

  const totals = batchTotals(lines);

  async function removeLine(lineId: number) {
    if (!window.confirm('把这个商品从单据里删掉？对应的库存变动也会一起撤销。')) return;
    await supabase.from('transactions').delete().eq('id', lineId);
    refetch();
  }

  return (
    <div className="p-4">
      <Link to="/batches" className="text-sm text-gray-500">
        ← 返回单据列表
      </Link>

      <div className="mb-4 mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-medium">{batch.name}</h1>
        <span className={`rounded-md px-2 py-0.5 text-xs ${TYPE_STYLES[batch.type]}`}>
          {DOC_LABELS[batch.type]}
        </span>
        <span className="text-sm text-gray-500">{batch.date}</span>
        {batch.note && <span className="text-sm text-gray-400">{batch.note}</span>}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        <Stat label="商品数" value={String(lines.length)} />
        <Stat label="总数量" value={totals.quantity.toLocaleString()} />
        <Stat label="总箱数" value={totals.cartons.toLocaleString()} />
        <Stat label="总净重(kg)" value={totals.netWeight.toLocaleString()} />
        <Stat label="总毛重(kg)" value={totals.grossWeight.toLocaleString()} />
        <Stat label="总CBM" value={String(totals.cbm)} />
        <Stat label="总金额(日元)" value={totals.amountJpy.toLocaleString()} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-300 text-left text-gray-500">
              <th className="px-2 py-2 font-medium">品名</th>
              <th className="px-2 py-2 font-medium">品番</th>
              <th className="px-2 py-2 text-right font-medium">数量</th>
              <th className="px-2 py-2 text-right font-medium">箱数</th>
              <th className="px-2 py-2 text-right font-medium">日元单价</th>
              <th className="px-2 py-2 text-right font-medium">日元金额</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const cartons = l.product.box_qty ? Math.ceil(l.quantity / l.product.box_qty) : null;
              return (
                <tr key={l.id} className="border-b border-gray-200">
                  <td className="px-2 py-2">
                    <Link to={`/products/${l.product.id}`}>{l.product.name_cn}</Link>
                  </td>
                  <td className="px-2 py-2 text-gray-400">{l.product.sku ?? '-'}</td>
                  <td className="px-2 py-2 text-right">{l.quantity.toLocaleString()}</td>
                  <td className="px-2 py-2 text-right text-gray-500">{cartons ?? '-'}</td>
                  <td className="px-2 py-2 text-right text-gray-500">{l.product.price_jpy ?? '-'}</td>
                  <td className="px-2 py-2 text-right">
                    {l.product.price_jpy ? (l.quantity * l.product.price_jpy).toLocaleString() : '-'}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => removeLine(l.id)}
                      className="text-xs text-gray-400 hover:text-red-600"
                    >
                      移除
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {lines.length === 0 && <p className="py-4 text-sm text-gray-400">这张单还没有商品</p>}
      </div>
    </div>
  );
}
