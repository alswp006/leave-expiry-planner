import { describe, it, expect } from "vitest";
import type {
  Basis,
  AppInput,
  LeaveBucket,
  AppResult,
  BucketKind,
  MonthPlan,
  BridgeCombo,
  RouteState,
} from "@/lib/types";
import {
  parseYmd,
  isValidYmd,
  addMonthsClamp,
  addYears,
  addDays,
  diffDays,
  formatDot,
  isWeekend,
} from "@/lib/date";

describe("타입 정의 + 날짜 유틸", () => {
  // ============================================================================
  // AC-1: addMonthsClamp — 월 추가 시 말일 보정
  // ============================================================================
  describe("AC-1: addMonthsClamp", () => {
    it("should add months and clamp to last day of month", () => {
      const result = addMonthsClamp("2026-01-31", 1);
      expect(result).toBe("2026-02-28");
    });

    it("should handle leap year February", () => {
      const result = addMonthsClamp("2024-01-31", 1); // 2024는 윤년
      expect(result).toBe("2024-02-29");
    });

    it("should add multiple months", () => {
      const result = addMonthsClamp("2026-01-31", 3);
      expect(result).toBe("2026-04-30");
    });

    it("should handle day that exists in target month", () => {
      const result = addMonthsClamp("2026-03-15", 1);
      expect(result).toBe("2026-04-15");
    });

    it("should handle zero months", () => {
      const result = addMonthsClamp("2026-03-15", 0);
      expect(result).toBe("2026-03-15");
    });

    it("should handle negative months", () => {
      const result = addMonthsClamp("2026-03-31", -1);
      expect(result).toBe("2026-02-28");
    });
  });

  // ============================================================================
  // AC-2: diffDays — 두 날짜 사이의 일수 계산
  // ============================================================================
  describe("AC-2: diffDays", () => {
    it("should calculate days between two dates", () => {
      const result = diffDays("2026-10-05", "2027-03-14");
      expect(result).toBe(160);
    });

    it("should return 0 for same date", () => {
      const result = diffDays("2026-10-05", "2026-10-05");
      expect(result).toBe(0);
    });

    it("should handle negative difference (endDate before startDate)", () => {
      const result = diffDays("2027-03-14", "2026-10-05");
      expect(result).toBe(-160);
    });

    it("should calculate single day difference", () => {
      const result = diffDays("2026-10-05", "2026-10-06");
      expect(result).toBe(1);
    });

    it("should handle year boundary", () => {
      const result = diffDays("2026-12-31", "2027-01-01");
      expect(result).toBe(1);
    });

    it("should handle leap year correctly", () => {
      // 2024년 2월 29일에서 3월 1일까지 1일
      const result = diffDays("2024-02-29", "2024-03-01");
      expect(result).toBe(1);
    });
  });

  // ============================================================================
  // AC-3: isValidYmd — 날짜 유효성 검증
  // ============================================================================
  describe("AC-3: isValidYmd", () => {
    it("should reject invalid February 30th", () => {
      const result = isValidYmd("2023-02-30");
      expect(result).toBe(false);
    });

    it("should accept valid date", () => {
      const result = isValidYmd("2026-10-05");
      expect(result).toBe(true);
    });

    it("should accept leap year February 29", () => {
      const result = isValidYmd("2024-02-29");
      expect(result).toBe(true);
    });

    it("should reject non-leap year February 29", () => {
      const result = isValidYmd("2023-02-29");
      expect(result).toBe(false);
    });

    it("should reject invalid month 13", () => {
      const result = isValidYmd("2026-13-01");
      expect(result).toBe(false);
    });

    it("should reject invalid month 0", () => {
      const result = isValidYmd("2026-00-01");
      expect(result).toBe(false);
    });

    it("should reject invalid day 0", () => {
      const result = isValidYmd("2026-10-00");
      expect(result).toBe(false);
    });

    it("should reject invalid day 31 in April (30 days)", () => {
      const result = isValidYmd("2026-04-31");
      expect(result).toBe(false);
    });

    it("should accept valid day 31 in January", () => {
      const result = isValidYmd("2026-01-31");
      expect(result).toBe(true);
    });

    it("should reject invalid format", () => {
      const result = isValidYmd("2026/10/05");
      expect(result).toBe(false);
    });

    it("should reject incomplete date string", () => {
      const result = isValidYmd("2026-10");
      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // AC-4: formatDot — 날짜를 'YYYY.MM.DD' 형식으로 표시
  // ============================================================================
  describe("AC-4: formatDot", () => {
    it("should format date with dots", () => {
      const result = formatDot("2027-03-14");
      expect(result).toBe("2027.03.14");
    });

    it("should handle single digit month and day", () => {
      const result = formatDot("2026-01-05");
      expect(result).toBe("2026.01.05");
    });

    it("should handle double digit month and day", () => {
      const result = formatDot("2026-12-25");
      expect(result).toBe("2026.12.25");
    });

    it("should preserve leading zeros", () => {
      const result = formatDot("2026-02-03");
      expect(result).toBe("2026.02.03");
    });
  });

  // ============================================================================
  // AC-5: types.ts exports SPEC Data Model types correctly
  // ============================================================================
  describe("AC-5: Types from SPEC Data Model", () => {
    it("should export Basis type with 'hire' and 'fiscal'", () => {
      // Type check at compile time - this just validates the import works
      const basis1: Basis = "hire";
      const basis2: Basis = "fiscal";
      expect(basis1).toBe("hire");
      expect(basis2).toBe("fiscal");
    });

    it("should export AppInput with correct fields", () => {
      const input: AppInput = {
        hireDate: "2026-03-15",
        basis: "hire",
        monthlySalary: 3000000,
        usedDays: 0,
      };
      expect(input.hireDate).toBe("2026-03-15");
      expect(input.basis).toBe("hire");
      expect(input.monthlySalary).toBe(3000000);
      expect(input.usedDays).toBe(0);
    });

    it("should export LeaveBucket with correct fields", () => {
      const bucket: LeaveBucket = {
        kind: "monthly" as BucketKind,
        grantedDate: "2026-04-15",
        expiryDate: "2027-03-14",
        grantedTenths: 10,
        remainingTenths: 10,
      };
      expect(bucket.kind).toBe("monthly");
      expect(bucket.grantedDate).toBe("2026-04-15");
      expect(bucket.expiryDate).toBe("2027-03-14");
      expect(bucket.grantedTenths).toBe(10);
      expect(bucket.remainingTenths).toBe(10);
    });

    it("should export AppResult with correct fields", () => {
      const result: AppResult = {
        today: "2026-10-05",
        buckets: [],
        totalRemainingTenths: 150,
        nearest: null,
        dDay: 160,
        dailyWage: 114832,
        expiringAmount: 1722480,
        nextAccrual: { date: "2026-10-15", tenths: 10 },
      };
      expect(result.today).toBe("2026-10-05");
      expect(Array.isArray(result.buckets)).toBe(true);
      expect(result.totalRemainingTenths).toBe(150);
      expect(result.dDay).toBe(160);
      expect(result.dailyWage).toBe(114832);
      expect(result.expiringAmount).toBe(1722480);
      expect(result.nextAccrual?.date).toBe("2026-10-15");
      expect(result.nextAccrual?.tenths).toBe(10);
    });

    it("should export MonthPlan with correct fields", () => {
      const plan: MonthPlan = {
        month: "2026-10",
        tenths: 30,
        comboDates: ["2026-10-08"],
      };
      expect(plan.month).toBe("2026-10");
      expect(plan.tenths).toBe(30);
      expect(Array.isArray(plan.comboDates)).toBe(true);
    });

    it("should export BridgeCombo with correct fields", () => {
      const combo: BridgeCombo = {
        leaveDates: ["2026-10-08"],
        offStart: "2026-10-08",
        offEnd: "2026-10-11",
        offDays: 4,
        efficiency: 4,
      };
      expect(combo.leaveDates).toContain("2026-10-08");
      expect(combo.offStart).toBe("2026-10-08");
      expect(combo.offEnd).toBe("2026-10-11");
      expect(combo.offDays).toBe(4);
      expect(combo.efficiency).toBe(4);
    });

    it("should export RouteState with correct fields", () => {
      const input: AppInput = {
        hireDate: "2026-03-15",
        basis: "hire",
        monthlySalary: 3000000,
        usedDays: 0,
      };
      const result: AppResult = {
        today: "2026-10-05",
        buckets: [],
        totalRemainingTenths: 150,
        nearest: null,
        dDay: 160,
        dailyWage: 114832,
        expiringAmount: 1722480,
        nextAccrual: null,
      };
      const routeState: RouteState = { input, result };
      expect(routeState.input.hireDate).toBe("2026-03-15");
      expect(routeState.result.dDay).toBe(160);
    });
  });

  // ============================================================================
  // Additional date utility function tests
  // ============================================================================
  describe("parseYmd", () => {
    it("should parse YYYY-MM-DD format", () => {
      const result = parseYmd("2026-10-05");
      expect(result).toEqual({ year: 2026, month: 10, day: 5 });
    });

    it("should parse with leading zeros", () => {
      const result = parseYmd("2026-01-05");
      expect(result).toEqual({ year: 2026, month: 1, day: 5 });
    });
  });

  describe("addYears", () => {
    it("should add years to a date", () => {
      const result = addYears("2026-03-15", 1);
      expect(result).toBe("2027-03-15");
    });

    it("should handle leap year February", () => {
      const result = addYears("2024-02-29", 1);
      expect(result).toBe("2025-02-28"); // 2025는 윤년이 아님
    });

    it("should subtract years", () => {
      const result = addYears("2026-03-15", -1);
      expect(result).toBe("2025-03-15");
    });
  });

  describe("addDays", () => {
    it("should add days to a date", () => {
      const result = addDays("2026-10-05", 1);
      expect(result).toBe("2026-10-06");
    });

    it("should handle month boundary", () => {
      const result = addDays("2026-10-31", 1);
      expect(result).toBe("2026-11-01");
    });

    it("should handle year boundary", () => {
      const result = addDays("2026-12-31", 1);
      expect(result).toBe("2027-01-01");
    });

    it("should subtract days", () => {
      const result = addDays("2026-10-05", -1);
      expect(result).toBe("2026-10-04");
    });
  });

  describe("isWeekend", () => {
    it("should return true for Saturday", () => {
      // 2026-10-03은 토요일
      const result = isWeekend("2026-10-03");
      expect(result).toBe(true);
    });

    it("should return true for Sunday", () => {
      // 2026-10-04은 일요일
      const result = isWeekend("2026-10-04");
      expect(result).toBe(true);
    });

    it("should return false for Monday", () => {
      // 2026-10-05는 월요일
      const result = isWeekend("2026-10-05");
      expect(result).toBe(false);
    });

    it("should return false for Friday", () => {
      // 2026-10-02는 금요일
      const result = isWeekend("2026-10-02");
      expect(result).toBe(false);
    });
  });
});
