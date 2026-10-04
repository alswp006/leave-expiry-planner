import type { BridgeCombo } from './types';
import { addDays, diffDays, isWeekend } from './date';
import { HOLIDAY_COVERAGE_END } from './holidays';

const MAX_COMBOS = 3;
const MAX_LEAVE_DAYS = 3;

/** 연휴 조합 추천 — k=1~3 연속 평일, 연속 휴무 k+3 이상, 효율순, 누적 k ≤ R, 최대 3개. */
export function recommendBridges(
  today: string,
  expiryDate: string,
  remainingTenths: number,
  holidays: string[],
): BridgeCombo[] {
  const holidaySet = new Set(holidays.filter((h) => h <= HOLIDAY_COVERAGE_END));
  const isOff = (ymd: string) => isWeekend(ymd) || holidaySet.has(ymd);

  const candidates: BridgeCombo[] = [];
  const first = addDays(today, 1);
  const span = diffDays(first, expiryDate);
  for (let i = 0; i <= span; i++) {
    const start = addDays(first, i);
    for (let k = 1; k <= MAX_LEAVE_DAYS; k++) {
      const leaveDates = Array.from({ length: k }, (_, j) => addDays(start, j));
      const last = leaveDates[k - 1];
      if (last > expiryDate) break;
      if (leaveDates.some(isOff)) break;

      let offStart = start;
      while (addDays(offStart, -1) >= today && isOff(addDays(offStart, -1))) {
        offStart = addDays(offStart, -1);
      }
      let offEnd = last;
      while (isOff(addDays(offEnd, 1))) offEnd = addDays(offEnd, 1);

      const offDays = diffDays(offStart, offEnd) + 1;
      if (offDays < k + 3) continue;
      candidates.push({ leaveDates, offStart, offEnd, offDays, efficiency: offDays / k });
    }
  }

  candidates.sort(
    (a, b) => b.efficiency - a.efficiency || (a.leaveDates[0] < b.leaveDates[0] ? -1 : 1),
  );

  const picked: BridgeCombo[] = [];
  let usedLeaveTenths = 0;
  for (const c of candidates) {
    if (picked.length >= MAX_COMBOS) break;
    const leaveTenths = c.leaveDates.length * 10;
    if (usedLeaveTenths + leaveTenths > remainingTenths) continue;
    // 휴무 구간이 겹치면 같은 연휴를 두 번 세는 것이라 건너뛴다
    if (picked.some((p) => c.offStart <= p.offEnd && p.offStart <= c.offEnd)) continue;
    usedLeaveTenths += leaveTenths;
    picked.push(c);
  }
  return picked;
}
