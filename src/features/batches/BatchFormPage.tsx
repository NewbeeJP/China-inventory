import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../auth/AuthContext';
import { DOC_LABELS, TRANSACTION_TYPES } from '../transactions/transactionType';
import type { Product, TransactionType } from '../../types/database';
import { buildTemplateCsv, decodeCsvBytes, parseQuantityCsv } from './quantityCsv';

type PickerProduct = Pick<Product, 'id' | 'name_cn' | 'sku' | 'box_qty' | 'length' | 'width' | 'height'> & {
  current_stock: number;
};

export default function BatchFormPage() {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>('outbound');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');

  const [products, setProducts] = useState<PickerProduct[]>([]);
  const [search, setSearch] = useState('');
  // 商品 id -> 输入框里的数量（字符串，方便清空）
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importNote, setImportNote] = useState<string | null>(null);

  function downloadTemplate() {
    const csv = buildTemplateCsv(products);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `单据模板_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // 不能用 file.text()：那只按 UTF-8 解，Excel 存的是本地编码
    const text = decodeCsvBytes(await file.arrayBuffer());
    const { rows, errors } = parseQuantityCsv(text, new Set(products.map((p) => p.id)));
    // 填进同一个数量表，上传后仍可在下面逐行核对修改
    setQuantities((q) => {
      const next = { ...q };
      for (const r of rows) next[r.productId] = String(r.quantity);
      return next;
    });
    setImportErrors(errors);
    setImportNote(`已从文件读入 ${rows.length} 行${errors.length ? `，另有 ${errors.length} 行有问题` : ''}`);
    e.target.value = '';
  }

  useEffect(() => {
    supabase
      .from('products_with_stock')
      .select('id, name_cn, sku, box_qty, length, width, height, current_stock')
      .order('id')
      .then(({ data }) => setProducts((data ?? []) as PickerProduct[]));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (p) => p.name_cn.toLowerCase().includes(term) || (p.sku ?? '').toLowerCase().includes(term)
    );
  }, [products, search]);

  // 只有填了正数数量的商品才算进这一批
  const picked = useMemo(
    () =>
      Object.entries(quantities)
        .map(([id, raw]) => ({ product_id: Number(id), quantity: Number(raw) }))
        .filter((l) => Number.isFinite(l.quantity) && l.quantity > 0),
    [quantities]
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (picked.length === 0) {
      setError('至少给一个商品填上数量');
      return;
    }
    setSaving(true);
    setError(null);

    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .insert({ name, type, date, note: note || null, created_by: session?.user.id })
      .select('id')
      .single();

    if (batchError || !batch) {
      setSaving(false);
      setError(`单据创建失败：${batchError?.message ?? '未知错误'}`);
      return;
    }

    const { error: linesError } = await supabase.from('transactions').insert(
      picked.map((l) => ({
        ...l,
        batch_id: batch.id,
        type,
        date,
        note: null,
        created_by: session?.user.id,
      }))
    );

    setSaving(false);
    if (linesError) {
      // 单据已经建出来了，明说，免得以为整个操作没发生
      setError(`单据已创建，但明细写入失败：${linesError.message}。请打开这张单补录。`);
      return;
    }
    navigate(`/batches/${batch.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="p-4">
      <div className="mb-4 grid gap-2 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-gray-400">单据名称</label>
          <input
            required
            placeholder="3/16商事海运"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-400">类型</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TransactionType)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          >
            {TRANSACTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {DOC_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-400">日期</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div className="sm:col-span-4">
          <label className="mb-1 block text-xs text-gray-400">备注（选填）</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
      </div>

      <div className="sticky top-0 z-10 mb-2 flex flex-wrap items-center gap-2 border-y border-gray-200 bg-white py-2">
        <input
          placeholder="搜索品名 / 品番"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[160px] flex-1 rounded-md border border-gray-300 px-3 py-2"
        />
        <span className="text-sm text-gray-500">
          已选 {picked.length} 个商品，合计 {picked.reduce((s, l) => s + l.quantity, 0).toLocaleString()}
        </span>
        <button type="button" onClick={downloadTemplate} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          下载CSV模板
        </button>
        <label className="cursor-pointer rounded-md border border-gray-300 px-3 py-2 text-sm">
          上传CSV
          <input type="file" accept=".csv,text/csv" onChange={handleUpload} className="hidden" />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {saving ? '保存中…' : '提交这张单'}
        </button>
      </div>

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      {importNote && <p className="mb-2 text-sm text-gray-600">{importNote}</p>}
      {importErrors.length > 0 && (
        <ul className="mb-2 max-h-32 overflow-auto rounded-md bg-red-50 p-2 text-sm text-red-700">
          {importErrors.map((msg) => (
            <li key={msg}>{msg}</li>
          ))}
        </ul>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-300 text-left text-gray-500">
              <th className="px-2 py-2 font-medium">品名</th>
              <th className="px-2 py-2 font-medium">品番</th>
              <th className="px-2 py-2 text-right font-medium">数/箱</th>
              <th className="px-2 py-2 text-right font-medium">当前库存</th>
              <th className="px-2 py-2 text-right font-medium">本批数量</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const raw = quantities[p.id] ?? '';
              return (
                <tr key={p.id} className={`border-b border-gray-200 ${raw ? 'bg-amber-50' : ''}`}>
                  <td className="px-2 py-1.5">
                    {p.name_cn}
                    {p.length && p.width && p.height && (
                      <span className="ml-2 text-xs text-gray-400">{p.length}×{p.width}×{p.height}</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-gray-400">{p.sku ?? '-'}</td>
                  <td className="px-2 py-1.5 text-right text-gray-500">{p.box_qty ?? '-'}</td>
                  <td className="px-2 py-1.5 text-right">{p.current_stock}</td>
                  <td className="px-2 py-1.5 text-right">
                    <input
                      type="number"
                      value={raw}
                      onChange={(e) =>
                        setQuantities((q) => ({ ...q, [p.id]: e.target.value }))
                      }
                      className="w-24 rounded-md border border-gray-300 px-2 py-1 text-right"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="py-4 text-sm text-gray-400">没有匹配的商品</p>}
      </div>
    </form>
  );
}
