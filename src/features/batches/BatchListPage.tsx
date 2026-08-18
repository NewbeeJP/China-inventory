import { Link } from 'react-router-dom';
import { useBatches } from './useBatches';
import { DOC_LABELS, TYPE_STYLES } from '../transactions/transactionType';

export default function BatchListPage() {
  const { batches, loading } = useBatches();

  if (loading) return <div className="p-4 text-gray-500">加载中…</div>;

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-500">一次装柜、一次到货、一次下单，各记一张单，共 {batches.length} 张</p>
        <Link to="/batches/new" className="rounded-md bg-gray-900 px-3 py-2 text-sm text-white">
          + 新建单据
        </Link>
      </div>

      {batches.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">还没有单据，点右上角新建一张</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-300 text-left text-gray-500">
                <th className="px-2 py-2 font-medium">日期</th>
                <th className="px-2 py-2 font-medium">单据名称</th>
                <th className="px-2 py-2 font-medium">类型</th>
                <th className="px-2 py-2 text-right font-medium">商品数</th>
                <th className="px-2 py-2 text-right font-medium">总数量</th>
                <th className="px-2 py-2 font-medium">备注</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="whitespace-nowrap px-2 py-2">
                    <Link to={`/batches/${b.id}`} className="block">
                      {b.date}
                    </Link>
                  </td>
                  <td className="px-2 py-2">
                    <Link to={`/batches/${b.id}`} className="block font-medium">
                      {b.name}
                    </Link>
                  </td>
                  <td className="px-2 py-2">
                    <span className={`rounded-md px-2 py-0.5 text-xs ${TYPE_STYLES[b.type]}`}>
                      {DOC_LABELS[b.type]}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right">{b.line_count}</td>
                  <td className="px-2 py-2 text-right">{b.total_quantity.toLocaleString()}</td>
                  <td className="px-2 py-2 text-gray-500">{b.note ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
