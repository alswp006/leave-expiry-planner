const onlyDigits = (raw: string): string => raw.replace(/\D/g, '');

/** 입사일 입력 → 숫자 최대 8자리(YYYYMMDD). */
export function maskHireDate(raw: string): string {
  return onlyDigits(raw).slice(0, 8);
}

/** 8자리면 YYYY.MM.DD, 그보다 짧으면 입력 그대로. */
export function displayHireDate(digits: string): string {
  if (digits.length !== 8) return digits;
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6)}`;
}

/** 월급 입력 → 앞자리 0을 뺀 숫자 최대 9자리. */
export function maskSalary(raw: string): string {
  return onlyDigits(raw).replace(/^0+/, '').slice(0, 9);
}

/** 숫자 문자열에 3자리마다 쉼표. */
export function displaySalary(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 사용 연차 입력 → 정수부 최대 2자리, 소수점 1개, 소수 1자리. */
export function maskUsedDays(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, '');
  const dot = cleaned.indexOf('.');
  const hasDot = dot !== -1;
  const intRaw = hasDot ? cleaned.slice(0, dot) : cleaned;
  const decimal = hasDot ? cleaned.slice(dot + 1).replace(/\./g, '').slice(0, 1) : '';

  let int = intRaw.replace(/^0+/, '').slice(0, 2);
  if (int === '' && (hasDot || intRaw !== '')) int = '0';

  return hasDot ? `${int}.${decimal}` : int;
}
