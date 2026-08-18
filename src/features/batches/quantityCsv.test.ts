import { describe, expect, test } from 'vitest';
import { buildTemplateCsv, decodeCsvBytes, parseQuantityCsv } from './quantityCsv';

const ids = new Set([1, 2, 3]);

describe('buildTemplateCsv', () => {
  test('writes a header, one row per product and an empty 数量 column', () => {
    const csv = buildTemplateCsv([
      { id: 1, name_cn: 'LED日光灯 P', sku: 'tube-120P', length: 125, width: 18, height: 17.5 },
    ]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('编号(ID),品名,品番,包装尺寸,数量(QTY)');
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
    const result = parseQuantityCsv('编号(ID),数量(QTY)\n99,500\n', ids);
    expect(result.rows).toEqual([]);
    expect(result.errors[0]).toContain('第 2 行');
  });

  test('rejects a non-positive quantity', () => {
    expect(parseQuantityCsv('编号(ID),数量(QTY)\n1,-5\n', ids).errors[0]).toContain('不是有效的正数');
  });

  test('flags the same product listed twice', () => {
    const result = parseQuantityCsv('编号(ID),数量(QTY)\n1,100\n1,200\n', ids);
    expect(result.rows).toEqual([{ productId: 1, quantity: 100 }]);
    expect(result.errors[0]).toContain('重复');
  });

  test('refuses a single-column file, where id and quantity cannot be told apart', () => {
    expect(parseQuantityCsv('数量\n500\n', ids).errors[0]).toContain('认不出');
  });

  test('refuses a file with no data rows', () => {
    expect(parseQuantityCsv('编号(ID),数量(QTY)\n', ids).errors[0]).toContain('没有数据行');
  });
});

describe('decodeCsvBytes', () => {
  test('reads a UTF-8 file', () => {
    const bytes = new TextEncoder().encode('编号(ID),数量(QTY)\n1,500\n');
    expect(decodeCsvBytes(bytes.buffer as ArrayBuffer)).toContain('编号');
  });

  test('picks Shift-JIS over GBK when both decode but only one reads as the template', () => {
    // 「品名,品番,数量」的 Shift-JIS 字节。同样这串在 GBK 下也合法，
    // 只是解出「昳柤…」这种乱码，所以要靠内容评分才选得对。
    const bytes = new Uint8Array([
      0x95, 0x69, 0x96, 0xbc, 0x2c, 0x95, 0x69, 0x94, 0xd4, 0x2c, 0x90, 0x94, 0x97, 0xca,
    ]);
    expect(decodeCsvBytes(bytes.buffer as ArrayBuffer)).toBe('品名,品番,数量');
  });
});
