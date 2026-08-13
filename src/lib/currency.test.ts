import { describe, expect, test } from 'vitest';
import { jpyFromRmb, rmbFromJpy } from './currency';

describe('jpyFromRmb', () => {
  test('converts RMB to JPY using the given rate', () => {
    expect(jpyFromRmb(12.1, 36.36)).toBeCloseTo(439.96, 1);
  });
});

describe('rmbFromJpy', () => {
  test('converts JPY to RMB using the given rate', () => {
    expect(rmbFromJpy(440, 36.36)).toBeCloseTo(12.1, 1);
  });

  test('returns 0 when the rate is 0 instead of dividing by zero', () => {
    expect(rmbFromJpy(440, 0)).toBe(0);
  });
});
