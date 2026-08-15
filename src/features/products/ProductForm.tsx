import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useExchangeRate } from '../settings/useExchangeRate';
import { coerceFieldValue } from './productFields';
import type { NewProduct, Product } from '../../types/database';

const emptyForm: NewProduct = {
  name_cn: '',
  name_en: null,
  material: null,
  sku: null,
  box_qty: null,
  ctn: null,
  net_weight: null,
  gross_weight: null,
  length: null,
  width: null,
  height: null,
  cbm: null,
  price_jpy: null,
  price_rmb: null,
  reorder_point: null,
  opening_stock: 0,
  photo_url: null,
};

export default function ProductForm({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { rate } = useExchangeRate();
  const [form, setForm] = useState<NewProduct>(emptyForm);
  const [loading, setLoading] = useState(mode === 'edit');

  useEffect(() => {
    if (mode === 'edit' && id) {
      supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()
        .then(({ data }) => {
          if (data) setForm(data as Product);
          setLoading(false);
        });
    }
  }, [mode, id]);

  function field<K extends keyof NewProduct>(key: K) {
    return {
      value: form[key] ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((f) => ({ ...f, [key]: coerceFieldValue(key, e.target.value) }));
      },
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (mode === 'create') {
      const { data, error } = await supabase.from('products').insert(form).select('id').single();
      if (!error && data) navigate(`/products/${data.id}`);
    } else if (id) {
      const { error } = await supabase
        .from('products')
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (!error) navigate(`/products/${id}`);
    }
  }

  if (loading) return <div className="p-4 text-gray-500">加载中…</div>;

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-6 p-4">
      <section>
        <p className="mb-2 text-sm text-gray-500">基本信息</p>
        <label className="mb-1 block text-xs text-gray-400">品名</label>
        <input required className="mb-2 w-full rounded-md border border-gray-300 px-3 py-2" {...field('name_cn')} />
        <label className="mb-1 block text-xs text-gray-400">罗马字 / 英文名（选填）</label>
        <input className="mb-2 w-full rounded-md border border-gray-300 px-3 py-2" {...field('name_en')} />
        <label className="mb-1 block text-xs text-gray-400">品番（选填）</label>
        <input className="w-full rounded-md border border-gray-300 px-3 py-2" {...field('sku')} />
      </section>

      <section>
        <p className="mb-2 text-sm text-gray-500">材质</p>
        <input className="w-full rounded-md border border-gray-300 px-3 py-2" {...field('material')} />
      </section>

      <section>
        <p className="mb-2 text-sm text-gray-500">包装参数</p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="mb-1 block text-xs text-gray-400">数/箱</label>
            <input type="number" className="w-full rounded-md border border-gray-300 px-3 py-2" {...field('box_qty')} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">CTN箱数</label>
            <input type="number" className="w-full rounded-md border border-gray-300 px-3 py-2" {...field('ctn')} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">CBM</label>
            <input type="number" className="w-full rounded-md border border-gray-300 px-3 py-2" {...field('cbm')} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">净重(kg)</label>
            <input type="number" className="w-full rounded-md border border-gray-300 px-3 py-2" {...field('net_weight')} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">毛重(kg)</label>
            <input type="number" className="w-full rounded-md border border-gray-300 px-3 py-2" {...field('gross_weight')} />
          </div>
          <div />
          <div>
            <label className="mb-1 block text-xs text-gray-400">长(cm)</label>
            <input type="number" className="w-full rounded-md border border-gray-300 px-3 py-2" {...field('length')} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">宽(cm)</label>
            <input type="number" className="w-full rounded-md border border-gray-300 px-3 py-2" {...field('width')} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">高(cm)</label>
            <input type="number" className="w-full rounded-md border border-gray-300 px-3 py-2" {...field('height')} />
          </div>
        </div>
      </section>

      <section>
        <p className="mb-2 text-sm text-gray-500">
          价格
          {rate && (
            <span className="text-gray-400">
              （两个价格都手动填写，互不换算；汇率见右上角，仅供参考）
            </span>
          )}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs text-gray-400">日元单价</label>
            <input type="number" className="w-full rounded-md border border-gray-300 px-3 py-2" {...field('price_jpy')} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">单价(RMB)</label>
            <input type="number" className="w-full rounded-md border border-gray-300 px-3 py-2" {...field('price_rmb')} />
          </div>
        </div>
      </section>

      <section>
        <p className="mb-2 text-sm text-gray-500">库存设置</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs text-gray-400">期初库存</label>
            <input type="number" className="w-full rounded-md border border-gray-300 px-3 py-2" {...field('opening_stock')} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">预警线</label>
            <input type="number" className="w-full rounded-md border border-gray-300 px-3 py-2" {...field('reorder_point')} />
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-2 border-t border-gray-200 pt-4">
        <button type="button" onClick={() => navigate(-1)} className="rounded-md border border-gray-300 px-4 py-2 text-sm">
          取消
        </button>
        <button type="submit" className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white">
          保存商品
        </button>
      </div>
    </form>
  );
}
