/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

/** 사용자 입력: 입사일(YYYY-MM-DD), 월급(KRW), 사용할 연차(십분의 일 단위 정수×10) (구현: 패킷 0001) */
export type AppInput = { joinDate: string; monthlyWage: number; usedDays: number };

/** 연차 묶음: 발생일, 만료일, 잔여일수(×10) (구현: 패킷 0001) */
export type LeaveBucket = { startDate: string; expiryDate: string; daysInTenths: number };

/** 연휴 조합: 시작일(YYYY-MM-DD), 포함 휴무일수 (구현: 패킷 0001) */
export type BridgeCombo = { startDate: string; offDays: number };

/** 월별 계획: 월(YYYY-MM), 배정 연차(×10), 연휴 조합 목록 (구현: 패킷 0001) */
export type MonthPlan = { month: string; allocatedTenths: number; combos: BridgeCombo[] };

/** 계산 결과: D-day(일수), 사라질 금액(KRW), 묶음, 1일 통상임금, 월별 플랜, 남은 연차(십분의 일×10) (구현: 패킷 0001) */
export type AppResult = { dDay: number; expiringAmountKrw: number; buckets: LeaveBucket[]; dailyWage: number; monthPlans: MonthPlan[]; remainingDays: number };

/** Result 페이지 라우트 상태 (구현: 패킷 0001) */
export type RouteState = { input: AppInput; result: AppResult };

/** 문자열을 YYYY-MM-DD 형식으로 파싱, 실패 시 null (구현: 패킷 0001) */
export type parseYmdFn = (s: string) => string | null;

/** YYYY-MM-DD 유효성 검사 (구현: 패킷 0001) */
export type isValidYmdFn = (ymd: string) => boolean;

/** 월 추가, 말일 보정 (2026-01-31 + 1개월 → 2026-02-28) (구현: 패킷 0001) */
export type addMonthsClampFn = (ymd: string, months: number) => string;

/** 일수 추가, 음수 가능 (구현: 패킷 0001) */
export type addDaysFn = (ymd: string, days: number) => string;

/** 두 날짜 사이 일수 (to - from, 양수는 미래) (구현: 패킷 0001) */
export type diffDaysFn = (from: string, to: string) => number;

/** YYYY-MM-DD → YYYY.MM.DD (구현: 패킷 0001) */
export type formatDotFn = (ymd: string) => string;

/** 토요일 또는 일요일 판정 (구현: 패킷 0001) */
export type isWeekendFn = (ymd: string) => boolean;

/** 입사일·회계연도·오늘 기준으로 발생 연차 묶음 목록 생성 (구현: 패킷 0002) */
export type buildBucketsFn = (input: AppInput, today: string) => LeaveBucket[];

/** 다음 발생 연차 (날짜·십분의 일×10), 없으면 null (구현: 패킷 0002) */
export type getNextAccrualFn = (input: AppInput, today: string) => { date: string; tenths: number } | null;

/** 연차 발생·사용·사라질 금액·D-day 종합 계산 (구현: 패킷 0002) */
export type summarizeFn = (input: AppInput, today: string) => AppResult;

/** 2026~2027 공휴일 배열 (YYYY-MM-DD), 정적 (구현: 패킷 0003) */
export type holidaysFn = string[];

/** 공휴일 배열 끝 날짜 (YYYY-MM-DD) (구현: 패킷 0003) */
export type HOLIDAY_COVERAGE_ENDFn = string;

/** 효율순 연휴 조합 추천 (k=1~3 평일, 연속 휴무 k+3 이상, 누적 ≤ R, 최대 3개) (구현: 패킷 0003) */
export type recommendBridgesFn = (holidays: string[], startDate: string, endDate: string, remainingTenths: number, maxCount?: number) => BridgeCombo[];

/** R을 M개월에 나눠 배정, 조합 날짜 표시 (구현: 패킷 0003) */
export type buildMonthlyPlanFn = (result: AppResult, holidays: string[], startDate: string, endDate: string) => MonthPlan[];

/** 필드별 오류 문구 반환, 유효하면 null (구현: 패킷 0004) */
export type validateInputFn = (raw: unknown, today: string) => { [key: string]: string } | null;

/** 키 'leave-expiry-planner:lastInput'에 저장 (try-catch) (구현: 패킷 0004) */
export type saveAppInputFn = (input: AppInput) => void;

/** 저장된 AppInput 복원, 형식 오류 시 null 반환 후 키 삭제 (구현: 패킷 0004) */
export type loadAppInputFn = () => AppInput | null;
