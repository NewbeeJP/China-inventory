import { describe, expect, test } from 'vitest';
import { buildTemplateCsv, parseQuantityCsv } from './quantityCsv';

const ids = new Set([1, 2, 3]);

describe('buildTemplateCsv', () => {
  test('writes a header, one row per product and an empty 数量 column', () => {
    const csv = buildTemplateCsv([
      { id: 1, name_cn: 'LED日光灯 P', sku: 'tube-120P', length: 125, width: 18, height: 17.5 },
    ]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('编号,品名,品番,包装尺寸,数量');
    expect(csv).toContain('1,LED日光灯 P,tube-120P,125×18×17.5,');
  });

  test('quotes a name containing a comma', () => {
    const csv = buildTemplateCsv([
      { id: 2, name_cn: 'A,B', sku: null, length: null, width: null, height: null },
    ]);
    expect(csv).toContain('"A,B"');
  });
});

describe('parseQuantityCsv', () => {
  test('reads 编号 and 数量, ignoring the reference columns', () => {
    const csv = '编号,品名,品番,包装尺寸,数量\n1,LED,tube,125×18×17.5,500\n2,LED,tube,,200\n';
    expect(parseQuantityCsv(csv, ids)).toEqual({
      rows: [
        { productId: 1, quantity: 500 },
        { productId: 2, quantity: 200 },
      ],
      errors: [],
    });
  });

  test('skips rows left blank rather than treating them as zero', () => {
    const csv = '编号,数量\n1,500\n2,\n3,\n';
    expect(parseQuantityCsv(csv, ids).rows).toEqual([{ productId: 1, quantity: 500 }]);
  });

  test('tolerates a BOM and CRLF line endings from Excel', () => {
    const csv = '\uFEFF编号,数量\r\n1,500\r\n';
    expect(parseQuantityCsv(csv, ids).rows).toEqual([{ productId: 1, quantity: 500 }]);
  });

  test('reports an unknown 编号 with its line number', () => {
    const result = parseQuantityCsv('编号,数量\n99,500\n', ids);
    expect(result.rows).toEqual([]);
    expect(result.errors[0]).toContain('第 2 行');
  });

  test('rejects a non-positive quantity', () => {
    expect(parseQuantityCsv('编号,数量\n1,-5\n', ids).errors[0]).toContain('不是有效的正数');
  });

  test('flags the same product listed twice', () => {
    const result = parseQuantityCsv('编号,数量\n1,100\n1,200\n', ids);
    expect(result.rows).toEqual([{ productId: 1, quantity: 100 }]);
    expect(result.errors[0]).toContain('重复');
  });

  test('refuses a file without the required headers', () => {
    expect(parseQuantityCsv('foo,bar\n1,2\n', ids).errors[0]).toContain('编号');
  });
});
