import { useState, type FormEvent } from 'react';
import { useExchangeRate } from './useExchangeRate';
import { formatRate, rateLines } from './rateDisplay';

export function ExchangeRateBadge() {
  const { rate, updateRate } = useExchangeRate();
  const [editing, setEditing] = useState(false);
  const [reversed, setReversed] = useState(false);
  const [jpy, setJpy] = useState('');
  const [usd, setUsd] = useState('');

  if (!rate) return null;

  function startEditing() {
    setJpy(String(rate!.rmb_to_jpy));
    setUsd(rate!.rmb_to_usd == null ? '' : String(rate!.rmb_to_usd));
    setEditing(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await updateRate(Number(jpy), usd === '' ? null : Number(usd));
    setEditing(false);
  }

  if (editing) {
    return (
      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-gray-500">1 RMB =</span>
        <input
          type="number"
          step="any"
          autoFocus
          value={jpy}
          onChange={(e) => setJpy(e.target.value)}
          className="w-24 rounded-md border border-gray-300 px-2 py-1"
        />
        <span className="text-gray-500">JPY ·</span>
        <input
          type="number"
          step="any"
          value={usd}
          onChange={(e) => setUsd(e.target.value)}
          className="w-24 rounded-md border border-gray-300 px-2 py-1"
        />
        <span className="text-gray-500">USD</span>
        <button type="submit" className="underline">保存</button>
        <button type="button" onClick={() => setEditing(false)} className="text-gray-400">
          取消
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
      {rateLines(rate.rmb_to_jpy, rate.rmb_to_usd, reversed).map((line) => (
        <span key={line.to + line.from} className="whitespace-nowrap">
          1 {line.from} = <span className="text-gray-900">{formatRate(line.value)}</span> {line.to}
        </span>
      ))}
      <button
        type="button"
        onClick={() => setReversed((v) => !v)}
        title="反向显示"
        className="rounded-md border border-gray-300 px-1.5 leading-5"
      >
        ⇄
      </button>
      <button type="button" onClick={startEditing} className="underline">
        编辑
      </button>
    </div>
  );
}
