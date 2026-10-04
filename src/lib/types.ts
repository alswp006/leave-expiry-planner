// SPEC Data Model — 필드명 변경 금지
export type Basis = 'hire' | 'fiscal';

export interface AppInput {
  hireDate: string; // 'YYYY-MM-DD'
  basis: Basis;
  monthlySalary: number; // 원, 1 ~ 100,000,000
  usedDays: number; // 0.5 단위, 기본 0
}

export type BucketKind = 'monthly' | 'prorated' | 'annual';

export interface LeaveBucket {
  kind: BucketKind; // 1년 미만 월 단위 / 회계연도 비례 / 연 단위
  grantedDate: string; // monthly는 첫 발생일
  expiryDate: string; // 사용기한(마지막 사용 가능일)
  grantedTenths: number; // 발생 일수 ×10
  remainingTenths: number; // 사용 차감 후 ×10
}

export interface AppResult {
  today: string;
  buckets: LeaveBucket[]; // 사용기한 지난 묶음 제외, 사용기한 오름차순
  totalRemainingTenths: number;
  nearest: LeaveBucket | null; // 남은 일수 > 0인 묶음 중 사용기한이 가장 이른 것
  dDay: number | null;
  dailyWage: number; // floor(월급/209*8)
  expiringAmount: number; // floor(dailyWage * nearest.remaining)
  nextAccrual: { date: string; tenths: number } | null;
}

export interface MonthPlan {
  month: string; // 'YYYY-MM'
  tenths: number;
  comboDates: string[];
}

export interface BridgeCombo {
  leaveDates: string[];
  offStart: string;
  offEnd: string;
  offDays: number;
  efficiency: number;
}

export interface RouteState {
  input: AppInput;
  result: AppResult;
}
