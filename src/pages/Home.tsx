import { useMemo, useState } from 'react';
import type { FocusEvent } from 'react';
import { Top, TextField, Chip, ChipItem, Spacing, Paragraph } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { useNavigate } from 'react-router-dom';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { SubmitFooter } from '../components/BottomCTA';
import { logClick } from '@/lib/analytics';
import { displayHireDate, displaySalary, maskHireDate, maskSalary, maskUsedDays } from '@/lib/inputMask';
import { loadInput, saveInput } from '@/lib/inputStore';
import { summarize } from '@/lib/summary';
import type { AppInput, Basis, RouteState } from '@/lib/types';
import { validateInputOptionalSalary as validateInput } from '@/lib/validation';
import type { InputErrors } from '@/lib/validation';

type Field = 'hireDate' | 'monthlySalary' | 'usedDays';

const BASIS_OPTIONS: { value: Basis; label: string }[] = [
  { value: 'hire', label: '입사일 기준' },
  { value: 'fiscal', label: '회계연도 기준(1월 1일)' },
];

function todayYmd(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 'YYYYMMDD' 8자리면 'YYYY-MM-DD', 아니면 빈 문자열(검증이 오류로 잡는다). */
function digitsToYmd(digits: string): string {
  if (digits.length !== 8) return '';
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

function tickWeak() {
  try {
    Promise.resolve(generateHapticFeedback({ type: 'tickWeak' })).catch(() => {});
  } catch {
    /* WebView 밖에서는 SDK가 throw — 무시 */
  }
}

function scrollToCenter(e: FocusEvent<HTMLInputElement>) {
  e.currentTarget.scrollIntoView({ block: 'center' });
}

export default function Home() {
  const navigate = useNavigate();
  // 저장값이 없거나 손상됐으면 null → 빈 필드
  const [stored] = useState<AppInput | null>(() => loadInput());
  const [hireDigits, setHireDigits] = useState(() => (stored ? stored.hireDate.replace(/\D/g, '') : ''));
  const [basis, setBasis] = useState<Basis>(stored?.basis ?? 'hire');
  const [salaryDigits, setSalaryDigits] = useState(() => (stored ? maskSalary(String(stored.monthlySalary)) : ''));
  const [usedText, setUsedText] = useState(() => (stored && stored.usedDays > 0 ? String(stored.usedDays) : ''));
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});

  const today = todayYmd();
  const input: AppInput = {
    hireDate: digitsToYmd(hireDigits),
    basis,
    monthlySalary: salaryDigits === '' ? 0 : Number(salaryDigits),
    usedDays: usedText === '' ? 0 : Number(usedText),
  };

  // 지금 쓸 수 있는 연차(×10) — 사용 연차 상한 검사에 쓴다. 입사일이 유효할 때만 계산한다.
  const availableTenths = useMemo(() => {
    if (!input.hireDate || validateInput({ hireDate: input.hireDate }, today).hireDate) return undefined;
    try {
      return summarize({ hireDate: input.hireDate, basis, monthlySalary: 1, usedDays: 0 }, today)
        .totalRemainingTenths;
    } catch {
      return undefined;
    }
  }, [input.hireDate, basis, today]);

  const errors: InputErrors = validateInput(input, today, availableTenths);
  const valid = Object.keys(errors).length === 0;
  const shown = (field: Field): string | undefined => (touched[field] ? errors[field] : undefined);

  const touch = (field: Field) => setTouched((t) => (t[field] ? t : { ...t, [field]: true }));

  let hint: string | undefined;
  if (!valid) {
    if (hireDigits === '') hint = '입사일을 입력해 주세요';
    else hint = errors.hireDate ?? errors.monthlySalary ?? errors.usedDays;
  }

  const submit = () => {
    if (!valid) return;
    logClick('calculate_submit');
    saveInput(input);
    const result = summarize(input, today);
    const state: RouteState = { input, result };
    navigate('/result', { state });
  };

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>연차 소멸 계산기</Top.TitleParagraph>} />}
      bottom={
        <SubmitFooter
          label="연차 계산하기"
          ariaLabel="연차 계산하기"
          onClick={submit}
          disabled={!valid}
          hint={hint}
        />
      }
    >
      {stored === null ? (
        <div data-testid="home-empty" style={{ padding: '8px 24px 16px', wordBreak: 'keep-all' }}>
          <Paragraph.Text typography="t6" color="var(--adaptiveGrey600)">
            입사일만 넣으면 연차가 사라지는 날을 알려드려요
          </Paragraph.Text>
        </div>
      ) : null}
      <TextField
        variant="box"
        label="입사일"
        labelOption="sustain"
        aria-label="입사일"
        placeholder="예: 2025.03.15"
        inputMode="numeric"
        enterKeyHint="next"
        value={displayHireDate(hireDigits)}
        onChange={(e) => setHireDigits(maskHireDate(e.target.value))}
        onFocus={scrollToCenter}
        onBlur={() => touch('hireDate')}
        hasError={shown('hireDate') !== undefined}
        help={shown('hireDate')}
      />

      <Spacing size={16} />

      {/* 필드 라벨 왼쪽 선에 맞춘다 — TextField 내부 인셋과 같은 값 */}
      <div style={{ padding: '0 20px' }}>
        <Paragraph.Text typography="t6" color="var(--adaptiveGrey600)">
          연차를 세는 기준
        </Paragraph.Text>
      </div>
      <Spacing size={8} />
      <Chip kind="select" wrap>
        {BASIS_OPTIONS.map((o) => (
          <ChipItem
            key={o.value}
            selected={basis === o.value}
            aria-label={o.label}
            onClick={() => {
              tickWeak();
              setBasis(o.value);
            }}
          >
            {o.label}
          </ChipItem>
        ))}
      </Chip>

      <Spacing size={16} />

      <TextField
        variant="box"
        label="월급(세전)"
        labelOption="sustain"
        aria-label="월급(세전)"
        placeholder="예: 3,200,000"
        inputMode="numeric"
        enterKeyHint="next"
        suffix="원"
        value={displaySalary(salaryDigits)}
        onChange={(e) => setSalaryDigits(maskSalary(e.target.value))}
        onFocus={scrollToCenter}
        onBlur={() => touch('monthlySalary')}
        hasError={shown('monthlySalary') !== undefined}
        help={shown('monthlySalary') ?? '선택 항목이에요. 넣으면 사라지는 금액도 계산해요'}
      />

      <Spacing size={16} />

      <TextField
        variant="box"
        label="올해 사용한 연차"
        labelOption="sustain"
        aria-label="올해 사용 연차(일)"
        placeholder="예: 2.5"
        inputMode="decimal"
        enterKeyHint="done"
        suffix="일"
        value={usedText}
        onChange={(e) => setUsedText(maskUsedDays(e.target.value))}
        onFocus={scrollToCenter}
        onBlur={() => touch('usedDays')}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
        hasError={shown('usedDays') !== undefined}
        help={shown('usedDays') ?? '비우면 0일로 계산해요'}
      />

      {/* 하단 고정 CTA에 가리지 않도록 여유를 둔다 */}
      <Spacing size={180} />
    </ScreenScaffold>
  );
}
