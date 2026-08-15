import { describe, expect, test } from 'vitest';
import { formatRate, invert, rateLines } from './rateDisplay';

describe('formatRate', () => {
  test('keeps two decimals for an ordinary rate', () => {
    expect(formatRate(20.1543)).toBe('20.15');
    expect(formatRate(20)).toBe('20.00');
  });

  test('keeps a sub-1 rate from collapsing to two decimals', () => {
    expect(formatRate(0.0496)).toBe('0.0496');
  });

  test('gives a very small rate enough places to stay non-zero', () => {
    expect(formatRate(0.00123)).toBe('0.001230');
  });
});

describe('invert', () => {
  test('flips the direction', () => {
    expect(invert(20)).toBeCloseTo(0.05, 6);
  });

  test('returns 0 rather than Infinity when the rate is 0', () => {
    expect(invert(0)).toBe(0);
  });
});

describe('rateLines', () => {
  test('lists both currencies in the stored direction', () => {
    expect(rateLines(20, 0.14, false)).toEqual([
      { from: 'RMB', to: 'JPY', value: 20 },
      { from: 'RMB', to: 'USD', value: 0.14 },
    ]);
  });

  test('flips both currencies when reversed', () => {
    const lines = rateLines(20, 0.14, true);
    expect(lines[0].from).toBe('JPY');
    expect(lines[0].to).toBe('RMB');
    expect(lines[0].value).toBeCloseTo(0.05, 6);
    expect(lines[1].value).toBeCloseTo(7.142857, 5);
  });

  test('omits a currency that has no rate set', () => {
    expect(rateLines(20, null, false)).toHaveLength(1);
  });
});
