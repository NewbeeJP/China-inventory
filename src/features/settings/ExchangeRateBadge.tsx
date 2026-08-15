import { useEffect, useState, type FormEvent } from 'react';
import { useExchangeRate } from './useExchangeRate';
import { formatRate, rateLines } from './rateDisplay';
import { fetchLiveRate, type LiveRate } from './liveRate';

export function ExchangeRateBadge() {
  const { rate, updateRate } = useExchangeRate();
  const [live, setLive] = useState<LiveRate | null>(null);
  const [checked, setChecked] = useState(false);
  const [editing, setEditing] = useState(false);
  const [reversed, setReversed] = useState(false);
  const [jpy, setJpy] = useState('');
  const [usd, setUsd] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetchLiveRate(controller.signal).then((r) => {
      setLive(r);
      setChecked(true);
    });
    return () => controller.abort();
  }, []);

  // 取到实时值就用实时的，取不到（断网、接口被挡）退回手动维护的那份
  const source = live
    ? { jpy: live.jpy, usd: live.usd }
    : rate
      ? { jpy: rate.rmb_to_jpy, usd: rate.rmb_to_usd }
      : null;

  if (!source) return null;

  function startEditing() {
    setJpy(rate ? String(rate.rmb_to_jpy) : '');
    setUsd(rate?.rmb_to_usd == null ? '' : String(rate.rmb_to_usd));
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
        <span className="text-gray-500">备用汇率 1 RMB =</span>
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
        <button type="button" onClick={() => setEditing(false)} className="text-gray-400">取消</button>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
      {rateLines(source.jpy, source.usd, reversed).map((line) => (
        <span key={line.from + line.to} className="whitespace-nowrap">
          1 {line.from} = <span className="text-gray-900">{formatRate(line.value)}</span> {line.to}
        </span>
      ))}
      <span className="whitespace-nowrap text-xs text-gray-400">
        {live ? `实时 ${live.date}` : checked ? '实时汇率取不到，显示备用值' : '获取中…'}
      </span>
      <button
        type="button"
        onClick={() => setReversed((v) => !v)}
        title="反向显示"
        className="rounded-md border border-gray-300 px-1.5 leading-5"
      >
        ⇄
      </button>
      <button type="button" onClick={startEditing} className="underline" title="设置取不到实时汇率时显示的备用值">
        备用值
      </button>
    </div>
  );
}
