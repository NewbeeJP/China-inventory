import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../auth/AuthContext';
import { TRANSACTION_TYPES, TYPE_LABELS } from './transactionType';
import type { NewTransaction, Product, TransactionType } from '../../types/database';


export function TransactionForm({
  productId,
  onCreated,
}: {
  productId?: number;
  onCreated: () => void;
}) {
  const { session } = useAuth();
  const [type, setType] = useState<TransactionType>('inbound');
  const [quantity, setQuantity] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [products, setProducts] = useState<Pick<Product, 'id' | 'name_cn' | 'sku'>[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | undefined>(productId);

  useEffect(() => {
    if (productId == null) {
      supabase
        .from('products')
        .select('id, name_cn, sku')
        .order('id')
        .then(({ data }) => setProducts((data as Pick<Product, 'id' | 'name_cn' | 'sku'>[]) ?? []));
    }
  }, [productId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const targetProductId = productId ?? selectedProductId;
    if (!targetProductId || !quantity) return;

    const payload: NewTransaction & { created_by?: string } = {
      product_id: targetProductId,
      batch_id: null, // 这里是单笔登记；整单录入走「单据」页面
      type,
      quantity: Number(quantity),
      date,
      note: note || null,
      created_by: session?.user.id,
    };

    if (type === 'outbound') {
      const { data: stockRow } = await supabase
        .from('products_with_stock')
        .select('current_stock')
        .eq('id', targetProductId)
        .single();
      const currentStock = (stockRow as { current_stock: number } | null)?.current_stock ?? 0;
      if (currentStock - Number(quantity) < 0) {
        const confirmed = window.confirm(
          `出库后库存会变成 ${currentStock - Number(quantity)}，数量是否填错了？确认要继续吗？`
        );
        if (!confirmed) return;
      }
    }

    const { error } = await supabase.from('transactions').insert(payload);
    if (!error) {
      setQuantity('');
      setNote('');
      onCreated();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-md bg-gray-50 p-4">
      {productId == null && (
        <select
          required
          value={selectedProductId ?? ''}
          onChange={(e) => setSelectedProductId(Number(e.target.value))}
          className="mb-2 w-full rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="" disabled>
            选择商品
          </option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {String(p.id).padStart(4, '0')} {p.name_cn} {p.sku ? `(${p.sku})` : ''}
            </option>
          ))}
        </select>
      )}
      <div className="mb-2 flex gap-2">
        {TRANSACTION_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`flex-1 rounded-md border px-3 py-2 text-sm ${
              type === t ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 text-gray-700'
            }`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          type="number"
          required
          placeholder="数量"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="min-w-[100px] flex-1 rounded-md border border-gray-300 px-3 py-2"
        />
        <input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="min-w-[140px] flex-1 rounded-md border border-gray-300 px-3 py-2"
        />
        <input
          type="text"
          placeholder="备注（选填）"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="min-w-[140px] flex-[2] rounded-md border border-gray-300 px-3 py-2"
        />
        <button type="submit" className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white">
          提交
        </button>
      </div>
    </form>
  );
}
