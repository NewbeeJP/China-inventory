import { describe, expect, test } from 'vitest';
import { coerceFieldValue } from './productFields';

describe('coerceFieldValue', () => {
  test('keeps text fields as typed, even ones that default to null', () => {
    expect(coerceFieldValue('name_cn', '【あかりさん】テープライト')).toBe('【あかりさん】テープライト');
    expect(coerceFieldValue('sku', 'tube-120P')).toBe('tube-120P');
    expect(coerceFieldValue('material', 'アルミ・プラスチック')).toBe('アルミ・プラスチック');
    expect(coerceFieldValue('name_en', 'LED TUBE P')).toBe('LED TUBE P');
  });

  test('converts numeric fields to numbers', () => {
    expect(coerceFieldValue('box_qty', '25')).toBe(25);
    expect(coerceFieldValue('price_rmb', '12.1')).toBe(12.1);
  });

  test('treats an emptied field as null', () => {
    expect(coerceFieldValue('sku', '')).toBeNull();
    expect(coerceFieldValue('box_qty', '')).toBeNull();
  });

  test('never yields NaN for an unparseable number', () => {
    expect(coerceFieldValue('box_qty', 'abc')).toBeNull();
  });
});
