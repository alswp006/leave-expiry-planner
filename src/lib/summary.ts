// 사용 차감 · 요약 · 미사용 연차수당 추정. 일수는 ×10 정수, today는 인자로 주입한다.
import type { AppInput, AppResult, LeaveBucket } from '@/lib/types';
import { diffDays } from '@/lib/date';
import { buildBuckets, getNextAccrual } from '@/lib/accrual';

/** 사용기한이 빠른 묶음부터 사용 일수를 차감한다. 남은 일수는 0 아래로 내려가지 않는다. */
export function applyUsage(buckets: LeaveBucket[], usedTenths: number): LeaveBucket[] {
  let left = Math.max(0, Math.round(usedTenths));
  return [...buckets]
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate) || a.grantedDate.localeCompare(b.grantedDate))
    .map((b) => {
      const deduct = Math.min(left, b.remainingTenths);
      left -= deduct;
      return { ...b, remainingTenths: b.remainingTenths - deduct };
    });
}

export function summarize(input: AppInput, today: string): AppResult {
  const buckets = applyUsage(buildBuckets(input, today), input.usedDays * 10);
  const totalRemainingTenths = buckets.reduce((sum, b) => sum + b.remainingTenths, 0);
  const nearest = buckets.find((b) => b.remainingTenths > 0) ?? null;
  const dailyWage = Math.floor((input.monthlySalary * 8) / 209);
  return {
    today,
    buckets,
    totalRemainingTenths,
    nearest,
    dDay: nearest ? diffDays(today, nearest.expiryDate) : null,
    dailyWage,
    expiringAmount: nearest ? Math.floor((dailyWage * nearest.remainingTenths) / 10) : 0,
    nextAccrual: getNextAccrual(input, today),
  };
}
