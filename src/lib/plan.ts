import type { BridgeCombo, MonthPlan } from './types';

function monthOf(ymd: string): string {
  return ymd.slice(0, 7);
}

/** 오늘이 속한 달부터 사용기한이 속한 달까지 M개월에 R을 나눠 배정한다(합계 = R). */
export function buildMonthlyPlan(
  today: string,
  expiryDate: string,
  remainingTenths: number,
  combos: BridgeCombo[],
): MonthPlan[] {
  const months: string[] = [];
  let year = Number(today.slice(0, 4));
  let month = Number(today.slice(5, 7));
  const endKey = monthOf(expiryDate);
  for (;;) {
    const key = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
    if (key > endKey) break;
    months.push(key);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  if (months.length === 0) return [];

  const m = months.length;
  const wholeDays = Math.floor(remainingTenths / 10);
  const fractionTenths = remainingTenths - wholeDays * 10;
  const base = Math.floor(wholeDays / m);
  const extra = wholeDays - base * m; // 앞쪽 달부터 1일씩

  return months.map((key, i) => ({
    month: key,
    tenths: base * 10 + (i < extra ? 10 : 0) + (i === 0 ? fractionTenths : 0),
    // 조합마다 첫 휴가일이 속한 달에 표시한다
    comboDates: combos
      .map((c) => c.leaveDates[0])
      .filter((d) => d !== undefined && monthOf(d) === key),
  }));
}
