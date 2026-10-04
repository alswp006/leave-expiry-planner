import { isValidYmd } from '@/lib/date';
import { getItem, removeItem, setItem } from '@/lib/storage';
import type { AppInput } from '@/lib/types';

export const INPUT_STORAGE_KEY = 'leave-expiry-planner:lastInput';

function isAppInput(v: unknown): v is AppInput {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.hireDate === 'string' &&
    isValidYmd(o.hireDate) &&
    (o.basis === 'hire' || o.basis === 'fiscal') &&
    typeof o.monthlySalary === 'number' &&
    Number.isFinite(o.monthlySalary) &&
    typeof o.usedDays === 'number' &&
    Number.isFinite(o.usedDays)
  );
}

function clearKey(): void {
  try {
    removeItem(INPUT_STORAGE_KEY);
  } catch {
    // 지우지 못해도 다음 로드에서 다시 걸러진다
  }
}

/** 마지막 입력을 저장한다. 저장소가 막혀 있어도 던지지 않는다. */
export function saveInput(input: AppInput): void {
  try {
    setItem(INPUT_STORAGE_KEY, input);
  } catch {
    // 용량 초과·사생활 보호 모드 — 저장 없이 진행
  }
}

/** 저장된 입력을 복원한다. 없거나 형식이 맞지 않으면 null, 손상된 키는 지운다. */
export function loadInput(): AppInput | null {
  const stored = getItem<unknown>(INPUT_STORAGE_KEY);
  if (isAppInput(stored)) {
    return {
      hireDate: stored.hireDate,
      basis: stored.basis,
      monthlySalary: stored.monthlySalary,
      usedDays: stored.usedDays,
    };
  }
  // getItem은 JSON 파싱 실패도 null로 돌려주므로, 비어 있는 경우에도 키를 비워 손상본을 정리한다
  clearKey();
  return null;
}

/** contract.ts 계약 이름 — 화면 패킷은 이 이름으로 import한다 */
export const saveAppInput: (input: AppInput) => void = saveInput;
export const loadAppInput: () => AppInput | null = loadInput;
