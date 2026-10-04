import { useCallback, useMemo, useState } from 'react';
import { Button, ListRow, Paragraph, Spacing, Tab, useHaptic } from '@toss/tds-mobile';
import { Card } from './Card';
import { EmptyState } from './StateView';
import { logClick } from '@/lib/analytics';
import { recommendBridges } from '@/lib/bridges';
import { diffDays } from '@/lib/date';
import { HOLIDAY_COVERAGE_END, holidays } from '@/lib/holidays';
import { buildMonthlyPlan } from '@/lib/plan';
import type { BridgeCombo, MonthPlan } from '@/lib/types';
import { formatNumber } from '@/lib/utils';

type Plan = { ok: true; plans: MonthPlan[]; combos: BridgeCombo[] } | { ok: false };

/** 'YYYY-MM-DD' → '10/8' (0 패딩 없는 월/일). */
function monthDay(ymd: string): string {
  return `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8, 10))}`;
}

function monthLabel(month: string): string {
  return `${month.slice(0, 4)}년 ${Number(month.slice(5, 7))}월`;
}

function days(tenths: number): string {
  return `${formatNumber(tenths / 10)}일`;
}

function todayYmd(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 순수 계산 — 예외는 호출부가 에러 상태로 바꾼다. */
function compute(today: string, expiryDate: string, remainingTenths: number): Plan {
  try {
    const combos = recommendBridges(today, expiryDate, remainingTenths, holidays);
    const plans = buildMonthlyPlan(today, expiryDate, remainingTenths, combos);
    return { ok: true, plans, combos };
  } catch {
    return { ok: false };
  }
}

/**
 * 더 깊은 층(F4) — 월별 플랜 / 연휴 조합 탭. 호출부(Result)가 TossRewardAd로 감싼다.
 * 핵심 답은 건드리지 않고, 계산이 실패하면 이 영역만 에러와 「다시 시도」를 보인다.
 */
export function DeepTier({
  today,
  expiryDate,
  remainingTenths,
}: {
  today: string;
  /** 계획을 세울 마지막 날 — 가장 빨리 사라지는 묶음의 사용기한 */
  expiryDate: string;
  /** 그 기한 안에 써야 하는 연차 ×10 */
  remainingTenths: number;
}) {
  const [tab, setTab] = useState(0);
  // 다시 시도를 누른 시점의 오늘 — 처음엔 부모가 준 today
  const [retryToday, setRetryToday] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const haptic = useHaptic();

  const effectiveToday = retryToday ?? today;
  // attempt가 바뀔 때마다 다시 계산한다(같은 날이어도 재시도).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const plan = useMemo(() => compute(effectiveToday, expiryDate, remainingTenths), [effectiveToday, expiryDate, remainingTenths, attempt]);

  const onTabChange = useCallback(
    (index: number) => {
      try {
        Promise.resolve(haptic.generate({ type: 'tickWeak' })).catch(() => {});
      } catch {
        /* WebView 밖에서는 throw — 무시 */
      }
      logClick(index === 0 ? 'deep_tab_monthly' : 'deep_tab_combo');
      setTab(index);
    },
    [haptic],
  );

  const retry = useCallback(() => {
    logClick('deep_retry');
    setRetryToday(todayYmd());
    setAttempt((n) => n + 1);
  }, []);

  const beyondCoverage = expiryDate > HOLIDAY_COVERAGE_END;

  if (!plan.ok) {
    return (
      <Card testId="deep-tier">
        <EmptyState
          testId="deep-tier-error"
          title="계산 중 문제가 생겼어요"
          description="연휴 조합만 불러오지 못했어요. 위 결과는 그대로예요."
          action={
            <Button variant="weak" size="medium" aria-label="다시 시도" onClick={retry}>
              다시 시도
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <Card testId="deep-tier">
      <Tab onChange={onTabChange}>
        <Tab.Item selected={tab === 0}>월별 플랜</Tab.Item>
        <Tab.Item selected={tab === 1}>연휴 조합</Tab.Item>
      </Tab>
      {beyondCoverage ? (
        <>
          <Spacing size={8} />
          <Paragraph.Text typography="t7" color="var(--adaptiveGrey600)">
            공휴일 정보는 2027년까지 반영돼 있어요
          </Paragraph.Text>
        </>
      ) : null}
      <Spacing size={8} />
      {tab === 0 ? <MonthlyRows plans={plan.plans} /> : <ComboRows combos={plan.combos} />}
    </Card>
  );
}

function MonthlyRows({ plans }: { plans: MonthPlan[] }) {
  if (plans.length === 0) {
    return (
      <Paragraph.Text typography="t6" color="var(--adaptiveGrey600)">
        배정할 달이 없어요
      </Paragraph.Text>
    );
  }
  return (
    <div data-testid="deep-monthly">
      {plans.map((p) => (
        <ListRow
          key={p.month}
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top={monthLabel(p.month)}
              bottom={
                p.comboDates.length > 0
                  ? `연차 ${days(p.tenths)} · 연휴 조합 포함 (${p.comboDates.map(monthDay).join(', ')})`
                  : `연차 ${days(p.tenths)}`
              }
            />
          }
        />
      ))}
    </div>
  );
}

function ComboRows({ combos }: { combos: BridgeCombo[] }) {
  if (combos.length === 0) {
    return (
      <div data-testid="deep-combos-empty">
        <Paragraph.Text typography="t6" color="var(--adaptiveGrey600)">
          기간 안에 붙여 쓸 연휴가 없어요
        </Paragraph.Text>
      </div>
    );
  }
  return (
    <div data-testid="deep-combos">
      {combos.map((c) => (
        <ListRow
          key={c.leaveDates.join('|')}
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top={`${monthDay(c.offStart)} ~ ${monthDay(c.offEnd)} · ${diffDays(c.offStart, c.offEnd) + 1}일 연속 쉬어요`}
              bottom={`연차 ${c.leaveDates.map(monthDay).join(', ')} (${c.leaveDates.length}일) 사용`}
            />
          }
        />
      ))}
    </div>
  );
}
