import { describe, expect, test } from 'vitest';
import { parseLiveRate } from './liveRate';

describe('parseLiveRate', () => {
  test('reads both currencies and the quote date', () => {
    expect(parseLiveRate({ base: 'CNY', date: '2026-08-14', rates: { JPY: 23.588, USD: 0.14834 } })).toEqual({
      jpy: 23.588,
      usd: 0.14834,
      date: '2026-08-14',
    });
  });

  test('keeps JPY when USD is absent', () => {
    expect(parseLiveRate({ date: '2026-08-14', rates: { JPY: 23.588 } })?.usd).toBeNull();
  });

  test('rejects a payload without a usable JPY rate', () => {
    expect(parseLiveRate({ date: '2026-08-14', rates: { JPY: 0 } })).toBeNull();
    expect(parseLiveRate({ date: '2026-08-14', rates: {} })).toBeNull();
    expect(parseLiveRate({ rates: { JPY: 20 } })).toBeNull();
  });

  test('rejects junk rather than throwing', () => {
    expect(parseLiveRate(null)).toBeNull();
    expect(parseLiveRate('nope')).toBeNull();
  });
});
