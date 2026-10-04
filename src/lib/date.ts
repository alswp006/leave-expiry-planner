// 날짜 유틸 — 'YYYY-MM-DD' 문자열 기준 순수 함수. Date는 로컬 기준으로만 쓴다.

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

export interface Ymd {
  year: number;
  month: number;
  day: number;
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

function toYmd(year: number, month: number, day: number): string {
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

function daysInMonth(year: number, month: number): number {
  // 로컬 Date의 day 0 = 전월 말일
  return new Date(year, month, 0).getDate();
}

function fromDate(d: Date): string {
  return toYmd(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function parseYmd(ymd: string): Ymd {
  const m = YMD_RE.exec(ymd);
  if (!m) return { year: NaN, month: NaN, day: NaN };
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

export function isValidYmd(ymd: string): boolean {
  const { year, month, day } = parseYmd(ymd);
  if (!Number.isInteger(year) || month < 1 || month > 12 || day < 1) return false;
  return day <= daysInMonth(year, month);
}

/** 월 단위 이동. 대상 월에 없는 날짜는 말일로 보정한다(2026-01-31 + 1개월 → 2026-02-28). */
export function addMonthsClamp(ymd: string, months: number): string {
  const { year, month, day } = parseYmd(ymd);
  const total = year * 12 + (month - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12 + 12) % 12 + 1;
  return toYmd(ny, nm, Math.min(day, daysInMonth(ny, nm)));
}

/** 연 단위 이동. 윤일(2/29)은 평년에 2/28로 보정한다. */
export function addYears(ymd: string, years: number): string {
  return addMonthsClamp(ymd, years * 12);
}

export function addDays(ymd: string, days: number): string {
  const { year, month, day } = parseYmd(ymd);
  return fromDate(new Date(year, month - 1, day + days));
}

/** to - from (일). 미래면 양수. UTC 자정 기준이라 서머타임에 영향받지 않는다. */
export function diffDays(from: string, to: string): number {
  const a = parseYmd(from);
  const b = parseYmd(to);
  const ms = Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day);
  return Math.round(ms / MS_PER_DAY);
}

export function formatDot(ymd: string): string {
  return ymd.replace(/-/g, '.');
}

export function isWeekend(ymd: string): boolean {
  const { year, month, day } = parseYmd(ymd);
  const dow = new Date(year, month - 1, day).getDay();
  return dow === 0 || dow === 6;
}
