export function jpyFromRmb(rmb: number, rmbToJpy: number): number {
  return Math.round(rmb * rmbToJpy * 100) / 100;
}

export function rmbFromJpy(jpy: number, rmbToJpy: number): number {
  if (rmbToJpy === 0) return 0;
  return Math.round((jpy / rmbToJpy) * 100) / 100;
}
