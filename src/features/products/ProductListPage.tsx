import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProducts } from './useProducts';
import { filterProducts, isLowStock } from '../../lib/inventory';
import { exportProductsToExcel } from '../../lib/exportExcel';

export default function ProductListPage() {
  const { products, loading } = useProducts();
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  // null 表示「全部」
  const [category, setCategory] = useState<string | null>(null);

  // 分类标签的数量始终按全部商品算，切换标签时数字不会跳
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) map.set(p.name_cn, (map.get(p.name_cn) ?? 0) + 1);
    return [...map].map(([name, count]) => ({ name, count }));
  }, [products]);

  const filtered = useMemo(() => {
    const base = filterProducts(products, { search, lowStockOnly });
    return category === null ? base : base.filter((p) => p.name_cn === category);
  }, [products, search, lowStockOnly, category]);

  // 搜索时退回「全部」，否则在某个分类里搜别的东西会一无所获
  function handleSearch(value: string) {
    setSearch(value);
    if (value.trim() !== '') setCategory(null);
  }

  // 同一品名的多个规格归到一组，跟原来 Excel 的排布一致
  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const p of filtered) {
      const list = map.get(p.name_cn);
      if (list) list.push(p);
      else map.set(p.name_cn, [p]);
    }
    return [...map].map(([name, items]) => ({ name, items }));
  }, [filtered]);

  if (loading) return <div className="p-4 text-gray-500">加载中…</div>;

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="搜索品名 / 品番"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
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

      <div className="mb-3 flex flex-wrap gap-1.5">
        {[{ name: '全部', count: products.length, value: null as string | null }, ...categories.map((c) => ({ ...c, value: c.name }))].map(
          (tab) => {
            const active = category === tab.value;
            return (
              <button
                key={tab.name}
                onClick={() => setCategory(tab.value)}
                className={`rounded-md border px-2.5 py-1 text-sm ${
                  active
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.name}
                <span className={active ? 'ml-1 text-gray-300' : 'ml-1 text-gray-400'}>{tab.count}</span>
              </button>
            );
          }
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-300 text-left text-gray-500">
              <th className="px-3 py-2 font-medium">编号</th>
              <th className="px-3 py-2 font-medium">品番</th>
              <th className="px-3 py-2 font-medium">材质</th>
              <th className="px-3 py-2 text-right font-medium">实时库存</th>
              <th className="px-3 py-2 text-right font-medium">库存总数</th>
              <th className="px-3 py-2 text-right font-medium">出库总数</th>
              <th className="px-3 py-2 text-right font-medium">订单总数</th>
              <th className="px-3 py-2 text-right font-medium">日元单价</th>
              <th className="px-3 py-2 text-right font-medium">单价(RMB)</th>
              <th className="px-3 py-2 font-medium">包装尺寸</th>
              <th className="px-3 py-2 font-medium">最近出库</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map(({ name, items }) => (
              <Fragment key={name}>
                <tr className={`border-b border-gray-200 bg-gray-100 ${category === null ? '' : 'hidden'}`}>
                  <td colSpan={11} className="whitespace-nowrap px-3 py-2 text-sm font-medium">
                    {name}
                    <span className="ml-2 font-normal text-gray-400">
                      {items.length} 个规格 · 合计库存{' '}
                      {items.reduce((sum, p) => sum + p.current_stock, 0).toLocaleString()}
                    </span>
                  </td>
                </tr>
                {items.map((p) => (
                  <tr
                    key={p.id}
                    className={`border-b border-gray-100 ${isLowStock(p) ? 'bg-red-50' : ''}`}
                  >
                    <td className="whitespace-nowrap px-3 py-1.5 text-gray-400">
                      <Link to={`/products/${p.id}`}>{String(p.id).padStart(4, '0')}</Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 font-medium text-gray-900">
                      <Link to={`/products/${p.id}`}>{p.sku ?? '-'}</Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5">{p.material ?? '-'}</td>
                    <td
                      className={`whitespace-nowrap px-3 py-1.5 text-right ${
                        isLowStock(p) ? 'font-medium text-red-700' : 'font-medium'
                      }`}
                    >
                      {p.current_stock.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right text-gray-600">
                      {p.inbound_total.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right text-gray-600">
                      {p.outbound_total.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right text-gray-600">
                      {p.order_total.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right">{p.price_jpy ?? '-'}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right">{p.price_rmb ?? '-'}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-gray-400">
                      {p.length && p.width && p.height ? `${p.length}×${p.width}×${p.height}` : '-'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-gray-500">
                      {p.latest_date ? `${p.latest_date} 出库 ${p.latest_quantity}` : '-'}
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
