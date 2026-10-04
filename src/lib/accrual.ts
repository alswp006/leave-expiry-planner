// 연차 발생 계산 — 일수는 0.1일 단위 정수(×10)로만 다룬다. today는 항상 인자로 받는다.
import type { AppInput, LeaveBucket } from '@/lib/types';
import { addDays, addMonthsClamp, addYears, diffDays, isValidYmd, parseYmd } from '@/lib/date';

const MAX_MONTHLY = 11;
const MAX_EVENT_INDEX = 200;

interface AnnualEvent {
  kind: 'prorated' | 'annual';
  date: string;
  expiryDate: string;
  tenths: number;
}

/** 근속 k주년(또는 회계연도 n번째 1월 1일 중 n≥2의 n-1)에 생기는 일수 ×10 */
function annualTenths(k: number): number {
  return Math.min(25, 15 + Math.floor((k - 1) / 2)) * 10;
}

/** 입사 1년 미만 월 단위 발생일(입사일+1개월 ~ +11개월) */
function monthlyDates(hireDate: string): string[] {
  const dates: string[] = [];
  for (let i = 1; i <= MAX_MONTHLY; i++) dates.push(addMonthsClamp(hireDate, i));
  return dates;
}

function monthlyExpiry(hireDate: string): string {
  return addDays(addYears(hireDate, 1), -1);
}

function isFiscal(input: AppInput): boolean {
  // 회계연도 기준이어도 입사일이 1월 1일이면 입사일 기준과 같은 목록이다.
  return input.basis === 'fiscal' && !(parseYmd(input.hireDate).month === 1 && parseYmd(input.hireDate).day === 1);
}

/** idx번째(1부터) 연 단위 발생 이벤트 */
function annualEvent(input: AppInput, idx: number): AnnualEvent {
  const { hireDate } = input;
  if (!isFiscal(input)) {
    const date = addYears(hireDate, idx);
    return { kind: 'annual', date, expiryDate: addDays(addYears(hireDate, idx + 1), -1), tenths: annualTenths(idx) };
  }
  const year = parseYmd(hireDate).year + idx;
  const date = `${String(year).padStart(4, '0')}-01-01`;
  const expiryDate = `${String(year).padStart(4, '0')}-12-31`;
  if (idx === 1) {
    // 입사일~그해 12-31 재직일수(입사일 포함) 비례, 0.1일 단위 반올림
    const served = diffDays(hireDate, `${String(year - 1).padStart(4, '0')}-12-31`) + 1;
    return { kind: 'prorated', date, expiryDate, tenths: Math.round((150 * served) / 365) };
  }
  return { kind: 'annual', date, expiryDate, tenths: annualTenths(idx - 1) };
}

/** 오늘까지 발생했고 사용기한이 지나지 않은 묶음을 사용기한 오름차순으로 반환한다(사용 차감 전). */
export function buildBuckets(input: AppInput, today: string): LeaveBucket[] {
  if (!isValidYmd(input.hireDate) || !isValidYmd(today)) return [];
  const buckets: LeaveBucket[] = [];

  const accrued = monthlyDates(input.hireDate).filter((d) => d <= today);
  const expiry = monthlyExpiry(input.hireDate);
  if (accrued.length > 0 && expiry >= today) {
    const tenths = accrued.length * 10;
    buckets.push({ kind: 'monthly', grantedDate: accrued[0], expiryDate: expiry, grantedTenths: tenths, remainingTenths: tenths });
  }

  for (let idx = 1; idx <= MAX_EVENT_INDEX; idx++) {
    const ev = annualEvent(input, idx);
    if (ev.date > today) break;
    if (ev.expiryDate < today || ev.tenths <= 0) continue;
    buckets.push({
      kind: ev.kind,
      grantedDate: ev.date,
      expiryDate: ev.expiryDate,
      grantedTenths: ev.tenths,
      remainingTenths: ev.tenths,
    });
  }

  return buckets.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate) || a.grantedDate.localeCompare(b.grantedDate));
}

/** 오늘 이후 가장 가까운 발생일과 일수(×10). 같은 날 겹치면 합산한다. */
export function getNextAccrual(input: AppInput, today: string): { date: string; tenths: number } | null {
  if (!isValidYmd(input.hireDate) || !isValidYmd(today)) return null;
  const upcoming = new Map<string, number>();
  const add = (date: string, tenths: number) => upcoming.set(date, (upcoming.get(date) ?? 0) + tenths);

  for (const d of monthlyDates(input.hireDate)) if (d > today) add(d, 10);
  for (let idx = 1; idx <= MAX_EVENT_INDEX; idx++) {
    const ev = annualEvent(input, idx);
    if (ev.date > today) {
      add(ev.date, ev.tenths);
      break;
    }
  }

  let next: { date: string; tenths: number } | null = null;
  for (const [date, tenths] of upcoming) {
    if (next === null || date < next.date) next = { date, tenths };
  }
  return next;
}
