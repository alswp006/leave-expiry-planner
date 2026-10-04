import { isValidYmd } from '@/lib/date';
import type { AppInput } from '@/lib/types';

export type InputErrors = Partial<Record<keyof AppInput, string>>;

export const MIN_HIRE_DATE = '1980-01-01';
export const MAX_SALARY = 100_000_000;

/**
 * 입력 필드별 오류 문구를 돌려준다. 오류가 없는 필드는 키 자체가 없다.
 * availableTenths(지금 쓸 수 있는 연차 ×10)를 주면 사용 연차 상한도 검사한다.
 */
export function validateInput(
  raw: Partial<Record<keyof AppInput, unknown>>,
  today: string,
  availableTenths?: number,
): InputErrors {
  const errors: InputErrors = {};

  const hireDate = typeof raw.hireDate === 'string' ? raw.hireDate : '';
  if (!isValidYmd(hireDate)) {
    errors.hireDate = '올바른 날짜를 입력해 주세요';
  } else if (hireDate > today) {
    errors.hireDate = '오늘 이후 날짜는 입력할 수 없어요';
  } else if (hireDate < MIN_HIRE_DATE) {
    errors.hireDate = '1980년 이후 날짜를 입력해 주세요';
  }

  const salary = raw.monthlySalary;
  if (typeof salary !== 'number' || !Number.isFinite(salary) || salary < 1 || salary > MAX_SALARY) {
    errors.monthlySalary = '1원 ~ 1억 원 사이로 입력해 주세요';
  }

  const used = typeof raw.usedDays === 'number' && Number.isFinite(raw.usedDays) ? raw.usedDays : 0;
  const halfUnits = used * 2;
  if (used < 0 || Math.abs(halfUnits - Math.round(halfUnits)) > 1e-9) {
    errors.usedDays = '0.5일 단위로 입력해 주세요';
  } else if (availableTenths !== undefined && used > 0 && Math.round(used * 10) > availableTenths) {
    errors.usedDays =
      availableTenths <= 0
        ? '지금 쓸 수 있는 연차가 없어요'
        : `지금 쓸 수 있는 연차(${availableTenths / 10}일)보다 많아요`;
  }

  return errors;
}

/** 월급은 선택 항목 — 비워 두면(0) 월급 오류만 건너뛰고 나머지를 검사한다. */
export function validateInputOptionalSalary(
  raw: Partial<Record<keyof AppInput, unknown>>,
  today: string,
  availableTenths?: number,
): InputErrors {
  const errors = validateInput(raw, today, availableTenths);
  if (raw.monthlySalary === 0) delete errors.monthlySalary;
  return errors;
}
