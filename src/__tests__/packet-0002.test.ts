import { describe, it, expect } from "vitest";
import type { AppInput, LeaveBucket } from "@/lib/types";
import { addYears } from "@/lib/date";
import { buildBuckets, getNextAccrual } from "@/lib/accrual";
import { applyUsage, summarize } from "@/lib/summary";

const input = (over: Partial<AppInput>): AppInput => ({
  hireDate: "2026-03-15",
  basis: "hire",
  monthlySalary: 3000000,
  usedDays: 0,
  ...over,
});

const bucket = (expiryDate: string, remainingTenths: number): LeaveBucket => ({
  kind: "annual",
  grantedDate: "2026-01-01",
  expiryDate,
  grantedTenths: remainingTenths,
  remainingTenths,
});

describe("Packet 0002: 연차 발생 계산 + 사용 차감·요약", () => {
  it("AC-1: 입사 1년 미만은 월 단위 묶음 하나(60, 사용기한 2027-03-14)", () => {
    const buckets = buildBuckets(input({}), "2026-10-05");
    expect(buckets).toHaveLength(1);
    expect(buckets[0]).toMatchObject({ kind: "monthly", grantedDate: "2026-04-15", grantedTenths: 60, expiryDate: "2027-03-14" });
    expect(getNextAccrual(input({}), "2026-10-05")).toEqual({ date: "2026-10-15", tenths: 10 });
  });

  it("AC-1: 입사 당일이면 다음 발생은 입사일+1개월", () => {
    expect(getNextAccrual(input({}), "2026-03-15")).toEqual({ date: "2026-04-15", tenths: 10 });
  });

  it("AC-1: 말일 보정과 최대 11일", () => {
    const buckets = buildBuckets(input({ hireDate: "2026-01-31" }), "2026-03-01");
    expect(buckets[0].grantedTenths).toBe(10 * 1); // 02-28 한 번
    const full = buildBuckets(input({ hireDate: "2026-01-31" }), "2027-01-30");
    expect(full[0].grantedTenths).toBe(110);
  });

  it("AC-2: dDay 160, dailyWage 114832, expiringAmount 1722480", () => {
    const r = summarize(input({ hireDate: "2025-03-15" }), "2026-10-05");
    expect(r.dDay).toBe(160);
    expect(r.dailyWage).toBe(114832);
    expect(r.expiringAmount).toBe(1722480);
    expect(r.totalRemainingTenths).toBe(150);
  });

  it("AC-3: 회계연도 비례연차 76, 사용기한 2026-12-31, 월 단위 제외", () => {
    const i = input({ hireDate: "2025-07-01", basis: "fiscal" });
    const buckets = buildBuckets(i, "2026-10-05");
    expect(buckets).toHaveLength(1);
    expect(buckets[0]).toMatchObject({ kind: "prorated", grantedTenths: 76, expiryDate: "2026-12-31" });
    expect(summarize(i, "2026-10-05").expiringAmount).toBe(872723);
    expect(getNextAccrual(i, "2026-10-05")).toEqual({ date: "2027-01-01", tenths: 150 });
  });

  it("AC-4: 근속 k주년 일수 (k=1→150, 3→160, 5→170, 21→250)", () => {
    const hire = "2000-02-10";
    const cases: Array<[number, number]> = [[1, 150], [2, 150], [3, 160], [5, 170], [21, 250], [30, 250]];
    for (const [k, tenths] of cases) {
      const granted = addYears(hire, k);
      const b = buildBuckets(input({ hireDate: hire }), granted).find((x) => x.kind === "annual" && x.grantedDate === granted);
      expect(b?.grantedTenths).toBe(tenths);
    }
  });

  it("AC-4: 회계연도 + 입사일 01-01이면 입사일 기준과 같은 목록", () => {
    const hire = "2024-01-01";
    expect(buildBuckets(input({ hireDate: hire, basis: "fiscal" }), "2026-10-05")).toEqual(
      buildBuckets(input({ hireDate: hire, basis: "hire" }), "2026-10-05"),
    );
  });

  it("AC-4: 회계연도 n번째(n≥2) 1월 1일 일수", () => {
    const i = input({ hireDate: "2020-06-01", basis: "fiscal" });
    const b = buildBuckets(i, "2024-01-01").find((x) => x.grantedDate === "2024-01-01");
    // 2021-01-01이 비례(n=1), 2024-01-01은 n=4 → 15 + floor(2/2) = 16
    expect(b?.grantedTenths).toBe(160);
  });

  it("AC-5: 사용기한이 빠른 묶음부터 차감, 0 아래로 내려가지 않음", () => {
    const src = [bucket("2027-03-31", 60), bucket("2026-12-31", 50)];
    const out = applyUsage(src, 80);
    expect(out.map((b) => [b.expiryDate, b.remainingTenths])).toEqual([["2026-12-31", 0], ["2027-03-31", 30]]);
    expect(src[0].remainingTenths).toBe(60); // 원본 불변
    expect(applyUsage(src, 1000).every((b) => b.remainingTenths === 0)).toBe(true);
  });

  it("summarize: 사용 일수를 차감한 뒤 nearest·금액을 계산한다", () => {
    const r = summarize(input({ hireDate: "2025-03-15", usedDays: 4 }), "2026-10-05");
    expect(r.totalRemainingTenths).toBe(110);
    expect(r.nearest?.remainingTenths).toBe(110);
    expect(r.expiringAmount).toBe(Math.floor((114832 * 110) / 10));
  });

  it("summarize: 남은 연차가 없으면 nearest·dDay는 null, 금액 0", () => {
    const r = summarize(input({ usedDays: 6 }), "2026-10-05");
    expect(r.totalRemainingTenths).toBe(0);
    expect(r.nearest).toBeNull();
    expect(r.dDay).toBeNull();
    expect(r.expiringAmount).toBe(0);
  });
});
