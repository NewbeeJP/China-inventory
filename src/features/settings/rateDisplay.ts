// 汇率显示：小数位要够，1 RMB≈20 JPY 用两位就够，
// 反过来 1 JPY≈0.05 RMB 两位会被抹成 0.05 甚至 0.00，所以小于 1 的多给几位。
export function formatRate(value: number): string {
  if (!Number.isFinite(value)) return '-';
  if (value === 0) return '0';
  const abs = Math.abs(value);
  const places = abs >= 100 ? 2 : abs >= 1 ? 2 : abs >= 0.01 ? 4 : 6;
  return value.toFixed(places);
}

export function invert(value: number): number {
  return value === 0 ? 0 : 1 / value;
}

export interface RateLine {
  from: string;
  to: string;
  value: number;
}

// reversed=false: 1 RMB = ? JPY / ? USD
// reversed=true:  1 JPY = ? RMB / 1 USD = ? RMB
export function rateLines(
  rmbToJpy: number,
  rmbToUsd: number | null,
  reversed: boolean
): RateLine[] {
  const pairs: [string, number | null][] = [
    ['JPY', rmbToJpy],
    ['USD', rmbToUsd],
  ];
  return pairs
    .filter((p): p is [string, number] => p[1] != null)
    .map(([code, value]) =>
      reversed
        ? { from: code, to: 'RMB', value: invert(value) }
        : { from: 'RMB', to: code, value }
    );
}
