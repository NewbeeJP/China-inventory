import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProducts } from './useProducts';
import { filterProducts, isLowStock } from '../../lib/inventory';
import { exportProductsToExcel } from '../../lib/exportExcel';

// 只提示一次；读写都包起来，无痕窗口或禁用存储时不至于崩掉
const SEEN_KEY = 'guide-banner-dismissed';

function readDismissed(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return true; // 存不了就别一直弹
  }
}

export default function ProductListPage() {
  const [guideDismissed, setGuideDismissed] = useState(readDismissed);

  function dismissGuide() {
    setGuideDismissed(true);
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      // 存不下就算了，下次再提示一遍也无妨
    }
  }

  const { products, loading } = useProducts();
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  // null 表示「全部」
  const [category, setCategory] = useState<string | null>(null);

  // 分类标签的数量始终按全部商品算，切换标签时数字不会跳
  const categories = useMemo(() => {
    const map = new Map<string, { count: number; stock: number }>();
    for (const p of products) {
      const c = map.get(p.name_cn) ?? { count: 0, stock: 0 };
      map.set(p.name_cn, { count: c.count + 1, stock: c.stock + p.current_stock });
    }
    return [...map].map(([name, v]) => ({ name, ...v }));
  }, [products]);

  const totalStock = useMemo(
    () => products.reduce((sum, p) => sum + p.current_stock, 0),
    [products]
  );

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

  const sidebarItems = [
    { name: '全部', count: products.length, stock: totalStock, value: null as string | null },
    ...categories.map((c) => ({ ...c, value: c.name })),
  ];

  return (
    <div className="flex flex-col gap-4 p-4 lg:flex-row">
      {/* 分类栏：窄屏时横过来排在上面，宽屏时固定在左侧跟着滚 */}
      <aside className="shrink-0 lg:w-56">
        <p className="mb-2 px-1 text-xs text-gray-400">商品分类</p>
        <nav className="flex gap-1 overflow-x-auto lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] lg:flex-col lg:overflow-y-auto">
          {sidebarItems.map((item) => {
            const active = category === item.value;
            return (
              <button
                key={item.name}
                onClick={() => setCategory(item.value)}
                className={`shrink-0 rounded-md px-3 py-2 text-left text-sm lg:w-full ${
                  active ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="block truncate">{item.name}</span>
                <span className={`block text-xs ${active ? 'text-gray-300' : 'text-gray-400'}`}>
                  {item.count} 个规格 · 库存 {item.stock.toLocaleString()}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
      {!guideDismissed && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
          <span>第一次用？</span>
          <Link to="/guide" className="font-medium underline">
            看看使用指南
          </Link>
          <span className="text-gray-500">— 怎么录一次入库、怎么改商品资料，都有分步说明</span>
          <button onClick={dismissGuide} className="ml-auto text-gray-400 hover:text-gray-700">
            知道了
          </button>
        </div>
      )}

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
              <th className="px-3 py-2 font-medium">最近入库</th>
              <th className="w-full px-3 py-2 font-medium">订单（预计入库）</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map(({ name, items }) => (
              <Fragment key={name}>
                <tr className={`border-b border-gray-200 bg-gray-100 ${category === null ? '' : 'hidden'}`}>
                  <td colSpan={13} className="whitespace-nowrap px-3 py-2 text-sm font-medium">
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
                      {p.latest_date ? `${p.latest_date}  ${p.latest_quantity}` : '-'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-gray-500">
                      {p.last_inbound_date ? `${p.last_inbound_date}  ${p.last_inbound_quantity}` : '-'}
                    </td>
                    <td className="w-full whitespace-nowrap px-3 py-1.5 text-gray-500">
                      {p.last_order_date ? `${p.last_order_date}  ${p.last_order_quantity}` : '-'}
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}

