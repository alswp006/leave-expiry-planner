# Shared Context (auto-generated — do NOT modify)


## 패킷 간 계약 (src/lib/contract.ts — 자동 생성, 수정 금지)
여기 선언된 이름·인자·반환 타입은 확정이다. 기반 패킷은 이대로 구현하고,
화면 패킷은 이대로 호출하라. 다르게 만들지 마라.

```typescript
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

/** 키 'leave-expiry-planner:
```

## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
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

```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  App.tsx
  components/
    AdSlot.tsx
    Amount.tsx
    BottomCTA.tsx
    Card.tsx
    CountUp.tsx
    DeepTier.tsx
    FloatingTabBar.tsx
    MiniBar.tsx
    PageShell.tsx
    ScreenScaffold.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
  hooks/
  lib/
    accrual.ts
    analytics.ts
    bridges.ts
    contract.ts
    date.ts
    holidays.ts
    inputMask.ts
    inputStore.ts
    plan.ts
    review.ts
    share.ts
    storage.ts
    summary.ts
    types.ts
    utils.ts
    validation.ts
  main.tsx
  pages/
    Home.tsx
    Result.tsx
    __TdsGallery.tsx
  styles/
    globals.css
    reward-ad.css
  types/
  vite-env.d.ts

### Exports (src/lib/)
- accrual.ts: export function buildBuckets(input: AppInput, today: string): LeaveBucket[]; export function getNextAccrual(input: AppInput, today: string):
- analytics.ts: export type LogFields = Record<string, string | number | boolean | null>; export const DWELL_MS = 3000; export function fireAndForget(call: () => unknown): void; export function logScreen(page: string, extra?: LogFields): void; export function logClick(name: string, extra?: LogFields): void; export function logImpression(name: string, extra?: LogFields): void; export function useScreenLog(page: string): void
- bridges.ts: export function recommendBridges( today: string, expiryDate: string, remainingTenths: number, holidays: string[], ): Bri
- contract.ts: export type AppInput =; export type LeaveBucket =; export type BridgeCombo =; export type MonthPlan =; export type AppResult =; export type RouteState =; export type parseYmdFn = (s: string) => string | null; export type isValidYmdFn = (ymd: string) => boolean
- date.ts: export interface Ymd; export function parseYmd(ymd: string): Ymd; export function isValidYmd(ymd: string): boolean; export function addMonthsClamp(ymd: string, months: number): string; export function addYears(ymd: string, years: number): string; export function addDays(ymd: string, days: number): string; export function diffDays(from: string, to: string): number; export function formatDot(ymd: string): string
- holidays.ts: export const HOLIDAYS: string[] = [ // 2026 '2026-01-01', '2026-02-16', '2026-02-17', '2026-02-18', // 설 연휴 '2026-03-02'; export const holidays: string[] = HOLIDAYS; export const HOLIDAY_COVERAGE_END = '2027-12-31'
- inputMask.ts: export function maskHireDate(raw: string): string; export function displayHireDate(digits: string): string; export function maskSalary(raw: string): string; export function displaySalary(digits: string): string; export function maskUsedDays(raw: string): string
- inputStore.ts: export const INPUT_STORAGE_KEY = 'leave-expiry-planner:lastInput'; export function saveInput(input: AppInput): void; export function loadInput(): AppInput | null; export const saveAppInput: (input: AppInput) => void = saveInput; export const loadAppInput: () => AppInput | null = loadInput
- plan.ts: export function buildMonthlyPlan( today: string, expiryDate: string, remainingTenths: number, combos: BridgeCombo[], ): 
- review.ts: export function requestReviewOnce(key: string = REVIEW_REQUESTED_KEY): void
- share.ts: export interface ShareAppOptions; export async function shareApp(opts: ShareAppOptions): Promise<void>
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void
- summary.ts: export function applyUsage(buckets: LeaveBucket[], usedTenths: number): LeaveBucket[]; export function summarize(input: AppInput, today: string): AppResult
- types.ts: export type Basis = 'hire' | 'fiscal'; export interface AppInput; export type BucketKind = 'monthly' | 'prorated' | 'annual'; export interface LeaveBucket; export interface AppResult; export interface MonthPlan; export interface BridgeCombo; export interface RouteState
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string
- validation.ts: export type InputErrors = Partial<Record<keyof AppInput, string>>; export const MIN_HIRE_DATE = '1980-01-01'; export const MAX_SALARY = 100_000_000; export function validateInput( raw: Partial<Record<keyof AppInput, unknown>>, today: string, availableTenths?: number, ); export function validateInputOptionalSalary( raw: Partial<Record<keyof AppInput, unknown>>, today: string, availableTent

### Components (src/components/)
- AdSlot.tsx: AdSlot
- Amount.tsx: Amount
- BottomCTA.tsx: SubmitFooter, ButtonStack
- Card.tsx: Card
- CountUp.tsx: CountUp
- DeepTier.tsx: DeepTier
- FloatingTabBar.tsx: FloatingTabBar
- MiniBar.tsx: MiniBar
- PageShell.tsx: PageShell
- ScreenScaffold.tsx: ScreenScaffold
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.t...
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 타입 정의 + 날짜 유틸 (files: src/lib/types.ts, src/lib/date.ts)
- 0002: 연차 발생 계산 + 사용 차감·요약 (files: src/lib/accrual.ts, src/lib/summary.ts)
- 0003: 공휴일 + 연휴 조합 + 월별 플랜 (files: src/lib/holidays.ts, src/lib/bridges.ts, src/lib/plan.ts)
- 0004: 입력 검증·마스킹·안전한 저장 (files: src/lib/validation.ts, src/lib/inputMask.ts, src/lib/inputStore.ts)
- 0005: Home 입력 화면 (files: src/pages/Home.tsx)
- 0006: Result 핵심 답(무료 층) (files: src/pages/Result.tsx)
- 0007: 더 깊은 층 + 리워드 게이트 (files: src/components/DeepTier.tsx, src/pages/Result.tsx)
- 0008: 라우팅 + 검수 점검 (files: src/App.tsx)

## Available exports from existing files
// src/App.tsx
export default function App() {

// src/components/AdSlot.tsx
export function AdSlot({ adGroupId, className, variant, theme }: AdSlotProps) {

// src/components/Amount.tsx
export function Amount({

// src/components/BottomCTA.tsx
export function SubmitFooter({
export function ButtonStack({

// src/components/Card.tsx
export function Card({

// src/components/CountUp.tsx
export function CountUp({

// src/components/DeepTier.tsx
export function DeepTier({

// src/components/FloatingTabBar.tsx
export type TabItem = {
export function FloatingTabBar({ items }: { items: TabItem[] }) {

// src/components/MiniBar.tsx
export function MiniBar({

// src/components/PageShell.tsx
export function PageShell({

// src/components/ScreenScaffold.tsx
export function ScreenScaffold({

// src/components/Sparkline.tsx
export function Sparkline({

// src/components/StateView.tsx
export function EmptyState({
export function LoadingState({

// src/components/SummaryHero.tsx
export function SummaryHero({

// src/components/TossPurchase.tsx
export interface TossPurchaseResult {
export function TossPurchase({

// src/components/TossRewardAd.tsx
export function TossRewardAd({

// src/lib/accrual.ts
export function buildBuckets(input: AppInput, today: string): LeaveBucket[] {
export function getNextAccrual(input: AppInput, today: string): { date: string; tenths: number } | null {

// src/lib/analytics.ts
export type LogFields = Record<string, string | number | boolean | null>;
export const DWELL_MS = 3000;
export function fireAndForget(call: () => unknown): void {
export function logScreen(page: string, extra?: LogFields): void {
export function logClick(name: string, extra?: LogFields): void {
export function logImpression(name: string, extra?: LogFields): void {
export function useScreenLog(page: string): void {

// src/lib/bridges.ts
export function recommendBridges(

// src/lib/contract.ts
export type AppInput = { joinDate: string; monthlyWage: number; usedDays: number };
expo

## Memory Index (자동 학습 — 힌트로만 사용, 실제 코드 확인 필수)

Available topics: deploy(4), general(14), testing(2), ui(3)

Key lessons (verify against actual code before applying):
- [general] 진입점 라우터 배선은 맨 끝에 두지 말고 기반 패킷 직후 플레이스홀더 페이지와 함께 먼저 병합하라. 화면 패킷은 그 플레이스홀더를 교체하게 해서, 언제 중단돼도 병합된 화면에 도달할 수 있게 하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 파일 생성 전 디렉토리 구조 확인 — mkdir -p로 경로 보장 (60% · 타 앱 1회 — 맹신 금지)
- [general] 화면·라우팅 등 소비자 모듈은 그것이 import하는 생산자 모듈이 병합된 뒤에만 병합하고, 순서를 지킬 수 없으면 소비자 병합과 동시에 최소 플레이스홀더를 만들어 매 병합 직후 타입체크와 빌드가 항상 통과하도록 유지하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 전역 라우팅·탭바·Provider 배선은 개별 화면보다 먼저(초반 20% 안에) 완료하고 미구현 화면은 스텁 라우트로 연결해, 시간 예산이 소진돼도 앱이 항상 실행 가능한 상태를 유지하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 저장·데이터 접근 등 기반 계층 패킷은 이를 import 하는 화면 패킷보다 반드시 먼저 완료·병합하고, 미완료면 상위 화면 패킷 병합을 차단하라 — 빈 기반 모듈 하나가 전 라우트 스모크를 무너뜨린다. (60% · 타 앱 1회 — 맹신 금지)