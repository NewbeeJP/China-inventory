import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProducts } from './useProducts';
import { filterProducts, isLowStock } from '../../lib/inventory';
import { exportProductsToExcel } from '../../lib/exportExcel';

export default function ProductListPage() {
  const { products, loading } = useProducts();
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const filtered = useMemo(
    () => filterProducts(products, { search, lowStockOnly }),
    [products, search, lowStockOnly]
  );

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
        <button
          onClick={() => setLowStockOnly((v) => !v)}
          className={`rounded-md border px-3 py-2 text-sm ${
            lowStockOnly ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-300 text-gray-700'
          }`}
        >
          仅看预警
        </button>
        <Link
          to="/products/new"
          className="rounded-md bg-gray-900 px-3 py-2 text-sm text-white"
        >
          + 新增商品
        </Link>
        <button
          onClick={() => exportProductsToExcel(filtered)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700"
        >
          导出 Excel
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-300 text-left text-gray-500">
              <th className="px-2 py-2 font-medium">编号</th>
              <th className="px-2 py-2 font-medium">品名</th>
              <th className="px-2 py-2 font-medium">品番</th>
              <th className="px-2 py-2 font-medium">材质</th>
              <th className="px-2 py-2 text-right font-medium">日元单价</th>
              <th className="px-2 py-2 text-right font-medium">单价(RMB)</th>
              <th className="px-2 py-2 text-right font-medium">实时库存</th>
              <th className="px-2 py-2 font-medium">最近动向</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr
                key={p.id}
                className={`border-b border-gray-200 ${isLowStock(p) ? 'bg-red-50' : ''}`}
              >
                <td className="px-2 py-2 text-gray-400">
                  <Link to={`/products/${p.id}`} className="block">
                    {String(p.id).padStart(4, '0')}
                  </Link>
                </td>
                <td className="px-2 py-2">
                  <Link to={`/products/${p.id}`} className="block">
                    {p.name_cn}
                  </Link>
                </td>
                <td className="px-2 py-2 text-gray-400">{p.sku ?? '-'}</td>
                <td className="px-2 py-2">{p.material_cn ?? p.material_jp ?? '-'}</td>
                <td className="px-2 py-2 text-right">{p.price_jpy ?? '-'}</td>
                <td className="px-2 py-2 text-right">{p.price_rmb ?? '-'}</td>
                <td
                  className={`px-2 py-2 text-right ${
                    isLowStock(p) ? 'font-medium text-red-700' : ''
                  }`}
                >
                  {p.current_stock}
                </td>
                <td className="px-2 py-2 text-gray-500">
                  {p.latest_date
                    ? `${p.latest_date} ${p.latest_type === 'inbound' ? '入库' : '出库'} ${p.latest_quantity}`
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
