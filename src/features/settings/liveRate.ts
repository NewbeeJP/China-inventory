// 汇率只是参考数字，不参与任何计算，所以拿不到就退回手动值，绝不阻塞页面。
const ENDPOINT = 'https://api.frankfurter.dev/v1/latest?base=CNY&symbols=JPY,USD';

export interface LiveRate {
  jpy: number;
  usd: number | null;
  date: string;
}

export function parseLiveRate(payload: unknown): LiveRate | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const { rates, date } = payload as { rates?: Record<string, unknown>; date?: unknown };
  if (!rates || typeof date !== 'string') return null;
  const jpy = Number(rates.JPY);
  if (!Number.isFinite(jpy) || jpy <= 0) return null;
  const usdRaw = Number(rates.USD);
  return { jpy, usd: Number.isFinite(usdRaw) && usdRaw > 0 ? usdRaw : null, date };
}

export async function fetchLiveRate(signal?: AbortSignal): Promise<LiveRate | null> {
  try {
    const res = await fetch(ENDPOINT, { signal });
    if (!res.ok) return null;
    return parseLiveRate(await res.json());
  } catch {
    return null;
  }
}
