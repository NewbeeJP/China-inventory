import { useState } from 'react';
import { useExchangeRate } from './useExchangeRate';

export function ExchangeRateBadge() {
  const { rate, updateRate } = useExchangeRate();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');

  if (!rate) return null;

  if (editing) {
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await updateRate(Number(value));
          setEditing(false);
        }}
        className="flex items-center gap-2 text-sm"
      >
        <span>1 RMB =</span>
        <input
          type="number"
          autoFocus
          defaultValue={rate.rmb_to_jpy}
          onChange={(e) => setValue(e.target.value)}
          className="w-20 rounded-md border border-gray-300 px-2 py-1"
        />
        <span>JPY</span>
        <button type="submit" className="text-gray-900 underline">
          保存
        </button>
      </form>
    );
  }

  return (
    <button onClick={() => setEditing(true)} className="text-sm text-gray-500">
      当前汇率 1 RMB = {rate.rmb_to_jpy} JPY <span className="underline">编辑</span>
    </button>
  );
}
