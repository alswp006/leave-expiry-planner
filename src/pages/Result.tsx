import { useCallback, useEffect, useState } from 'react';
import { Top, ListRow, Paragraph, Spacing, Button } from '@toss/tds-mobile';
import { useLocation, useNavigate } from 'react-router-dom';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { SubmitFooter, ButtonStack } from '../components/BottomCTA';
import { Card } from '../components/Card';
import { SummaryHero } from '../components/SummaryHero';
import { DeepTier } from '../components/DeepTier';
import { TossRewardAd } from '@/components/TossRewardAd';
import { EmptyState, LoadingState } from '../components/StateView';
import { logClick } from '@/lib/analytics';
import { formatDot } from '@/lib/date';
import { requestReviewOnce } from '@/lib/review';
import { shareApp } from '@/lib/share';
import { summarize } from '@/lib/summary';
import type { AppInput, AppResult, BucketKind } from '@/lib/types';
import { formatNumber } from '@/lib/utils';
import { validateInputOptionalSalary as validateInput } from '@/lib/validation';

type View =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'error' }
  | { kind: 'ready'; input: AppInput; result: AppResult };

const NOTICES = [
  '남은 일수와 금액은 모두 추정치예요.',
  '출근율 80% 이상·개근을 가정한 추정치예요.',
  '상시 5인 미만 사업장은 연차 규정이 적용되지 않아요.',
  '회사가 연차 사용 촉진을 했다면 수당이 나오지 않을 수 있어요.',
];

const KIND_LABEL: Record<BucketKind, string> = {
  monthly: '월 단위 발생',
  prorated: '회계연도 비례',
  annual: '연 단위 발생',
};

function todayYmd(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** route state에서 AppInput을 꺼낸다. 모양이 틀리거나 validateInput을 통과하지 못하면 null(결과 없음). */
function readInput(state: unknown, today: string): AppInput | null {
  if (typeof state !== 'object' || state === null) return null;
  const raw = (state as { input?: unknown }).input;
  if (typeof raw !== 'object' || raw === null) return null;
  const { hireDate, basis, monthlySalary, usedDays } = raw as Record<string, unknown>;
  if (basis !== 'hire' && basis !== 'fiscal') return null;
  if (Object.keys(validateInput({ hireDate, monthlySalary, usedDays }, today)).length > 0) return null;
  return { hireDate, basis, monthlySalary, usedDays } as AppInput;
}

/** summarize를 돌리고 숫자가 깨졌으면 throw한다 — 호출부가 에러 상태로 바꾼다. */
function calculate(input: AppInput, today: string): AppResult {
  const result = summarize(input, today);
  const finite = (n: unknown) => typeof n === 'number' && Number.isFinite(n);
  if (
    !result ||
    !finite(result.dailyWage) ||
    !finite(result.totalRemainingTenths) ||
    !finite(result.expiringAmount) ||
    (result.dDay !== null && !finite(result.dDay)) ||
    !Array.isArray(result.buckets)
  ) {
    throw new Error('invalid summary');
  }
  return result;
}

/** 누른 시점의 오늘로 계산한다. 예외는 에러 상태로 돌려 에러 로깅 없이 처리한다. */
function compute(state: unknown): View {
  const today = todayYmd();
  const input = readInput(state, today);
  if (!input) return { kind: 'empty' };
  try {
    return { kind: 'ready', input, result: calculate(input, today) };
  } catch {
    return { kind: 'error' };
  }
}

function dDayText(dDay: number): string {
  return dDay === 0 ? 'D-DAY' : `D-${formatNumber(dDay)}`;
}

function days(tenths: number): string {
  return `${formatNumber(tenths / 10)}일`;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <ListRow contents={<ListRow.Texts type="2RowTypeA" top={label} bottom={value} />} />;
}

function Notices() {
  return (
    <div
      data-testid="result-notices"
      style={{ padding: '0 24px', wordBreak: 'keep-all', textAlign: 'center', textWrap: 'balance', display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      {NOTICES.map((line) => (
        <div key={line}>
          <Paragraph.Text typography="t6" color="var(--adaptiveGrey700)">
            {line}
          </Paragraph.Text>
        </div>
      ))}
    </div>
  );
}

export default function Result() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [view, setView] = useState<View>({ kind: 'loading' });

  useEffect(() => {
    setView(compute(state));
  }, [state]);

  // 결과가 실제로 나온 뒤에만 리뷰를 묻는다 — 빈 상태·에러·로딩에서는 부르지 않는다.
  const ready = view.kind === 'ready';
  useEffect(() => {
    if (ready) requestReviewOnce();
  }, [ready]);

  const goHome = useCallback(() => navigate('/'), [navigate]);
  const retry = useCallback(() => {
    logClick('result_retry');
    setView(compute(state));
  }, [state]);

  const top = <Top title={<Top.TitleParagraph>계산 결과</Top.TitleParagraph>} />;

  if (view.kind === 'ready') {
    const { result } = view;
    const nearest = result.nearest;
    const hasExpiring = nearest !== null && result.dDay !== null && result.totalRemainingTenths > 0;
    const liveBuckets = result.buckets;
    const next = result.nextAccrual;
    const hasSalary = view.input.monthlySalary > 0;

    return (
      <ScreenScaffold
        top={top}
        bottom={
          <SubmitFooter
            label="다시 계산하기"
            ariaLabel="다시 계산하기"
            onClick={() => {
              logClick('result_recalc');
              goHome();
            }}
          />
        }
      >
        {hasExpiring ? (
          <SummaryHero
            testId="result-hero"
            label="가장 빨리 사라지는 연차까지"
            value={<Paragraph.Text typography="t1">{dDayText(result.dDay as number)}</Paragraph.Text>}
            caption={`${formatDot(nearest.expiryDate)}까지 안 쓰면 ${days(nearest.remainingTenths)}이 사라져요`}
          />
        ) : (
          <SummaryHero
            testId="result-hero"
            label="사라질 연차"
            value={<Paragraph.Text typography="t2">지금 사라질 연차가 없어요</Paragraph.Text>}
          />
        )}
        <Spacing size={8} />
        <div style={{ padding: '0 8px', wordBreak: 'keep-all' }}>
          <Paragraph.Text typography="t7" color="var(--adaptiveGrey600)">
            남은 일수와 금액은 모두 추정치예요
          </Paragraph.Text>
        </div>
        <Spacing size={8} />
        <Card testId="result-detail">
          <InfoRow label="남은 연차 합계" value={days(result.totalRemainingTenths)} />
          {hasExpiring && hasSalary ? (
            <InfoRow label="못 쓰면 사라지는 금액" value={`${formatNumber(result.expiringAmount)}원`} />
          ) : null}
          {hasSalary ? (
            <InfoRow label="1일 통상임금(추정)" value={`${formatNumber(result.dailyWage)}원`} />
          ) : null}
          <InfoRow
            label="다음 발생 예정"
            value={next ? `${formatDot(next.date)} · +${days(next.tenths)}` : '예정된 발생이 없어요'}
          />
        </Card>
        {liveBuckets.length > 0 ? (
          <>
            <Spacing size={16} />
            <Card testId="result-buckets">
              <Paragraph.Text typography="st11">연차 묶음</Paragraph.Text>
              {liveBuckets.map((b) => (
                <ListRow
                  key={`${b.kind}-${b.grantedDate}-${b.expiryDate}`}
                  contents={
                    <ListRow.Texts
                      type="2RowTypeA"
                      top={`${formatDot(b.expiryDate)}까지`}
                      bottom={`${KIND_LABEL[b.kind]} · 발생 ${formatDot(b.grantedDate)} · 남은 ${days(b.remainingTenths)} / 발생 ${days(b.grantedTenths)}`}
                    />
                  }
                />
              ))}
            </Card>
          </>
        ) : null}
        {/* 더 깊은 층만 게이트 안 — 핵심 답은 위에서 이미 그려졌다. 남은 연차가 없으면 게이트도 없다. */}
        {hasExpiring ? (
          <>
            <Spacing size={16} />
            <TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID ?? ''}>
              <DeepTier
                today={result.today}
                expiryDate={nearest.expiryDate}
                remainingTenths={nearest.remainingTenths}
              />
            </TossRewardAd>
          </>
        ) : null}
        <Spacing size={16} />
        <Button
          display="block"
          variant="weak"
          onClick={() => {
            logClick('share_tap');
            void shareApp({ message: '내 연차가 언제 사라지는지 계산해 봤어요', path: '/' });
          }}
        >
          결과 공유하기
        </Button>
        <Spacing size={16} />
        <Notices />
        <Spacing size={96} />
      </ScreenScaffold>
    );
  }

  if (view.kind === 'error') {
    return (
      <ScreenScaffold
        top={top}
        bottom={
          <ButtonStack
            primary={{ label: '다시 시도', ariaLabel: '다시 시도', onClick: retry }}
            secondary={{ label: '입력 화면으로', ariaLabel: '입력 화면으로', onClick: goHome }}
          />
        }
      >
        <EmptyState
          testId="result-error"
          title="계산 중 문제가 생겼어요"
          description="잠시 뒤에 다시 시도해 주세요. 계속되면 입력값을 확인해 주세요."
        />
        <Notices />
        <Spacing size={140} />
      </ScreenScaffold>
    );
  }

  if (view.kind === 'empty') {
    return (
      <ScreenScaffold top={top} bottom={<SubmitFooter label="입력하러 가기" ariaLabel="입력하러 가기" onClick={goHome} />}>
        <EmptyState
          testId="result-empty"
          title="계산된 결과가 없어요"
          description="입사일을 넣으면 사라질 연차를 알려드려요."
        />
        <Notices />
        <Spacing size={96} />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold top={top}>
      <LoadingState rows={4} testId="result-loading" />
      <Spacing size={16} />
      <Notices />
    </ScreenScaffold>
  );
}
