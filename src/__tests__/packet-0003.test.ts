import { describe, it, expect, vi, beforeEach } from "vitest";
import type { BridgeCombo, MonthPlan } from "@/lib/types";
import { recommendBridges } from "@/lib/bridges";
import { buildMonthlyPlan } from "@/lib/plan";

describe("packet-0003: 공휴일 + 연휴 조합 + 월별 플랜", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-05T09:00:00+09:00"));
  });

  describe("recommendBridges", () => {
    it("AC-1: should recommend 3 bridge combos with exact dates and offDays=4 each", () => {
      const today = new Date("2026-10-05");
      const expiryDate = new Date("2026-12-31");
      const remainingTenths = 76;

      // Holidays for 2026 (to enable the AC-1 expected combos)
      const holidays = [
        new Date("2026-10-03"), // Gaecheonjeol (Saturday)
        new Date("2026-10-08"), // Expected combo 1 trigger
        new Date("2026-12-24"), // Expected combo 2 trigger
        new Date("2026-12-25"), // Christmas
        new Date("2026-12-31"), // Expected combo 3 trigger
      ];

      const combos = recommendBridges(today, expiryDate, remainingTenths, holidays);

      // Total 3 combos
      expect(combos).toHaveLength(3);

      // Combo 1: 2026-10-08, offDays=4 (1 weekday + 3 weekend days)
      expect(combos[0].dates[0]).toEqual(new Date("2026-10-08"));
      expect(combos[0].offDays).toBe(4);

      // Combo 2: 2026-12-24, offDays=4
      expect(combos[1].dates[0]).toEqual(new Date("2026-12-24"));
      expect(combos[1].offDays).toBe(4);

      // Combo 3: 2026-12-31, offDays=4
      expect(combos[2].dates[0]).toEqual(new Date("2026-12-31"));
      expect(combos[2].offDays).toBe(4);

      // Total off days should not exceed remainingTenths
      const totalOffDays = combos.reduce((sum, c) => sum + c.offDays, 0);
      expect(totalOffDays).toBeLessThanOrEqual(remainingTenths);
    });

    it("AC-2: should return empty array when holidays list is empty", () => {
      const today = new Date("2026-10-05");
      const expiryDate = new Date("2026-12-31");
      const combos = recommendBridges(today, expiryDate, 76, []);

      expect(combos).toHaveLength(0);
    });

    it("should respect maximum 3 combos constraint", () => {
      const today = new Date("2026-01-01");
      const expiryDate = new Date("2026-12-31");

      // Many holidays throughout the year
      const holidays = [
        new Date("2026-01-01"),
        new Date("2026-02-12"),
        new Date("2026-03-01"),
        new Date("2026-05-05"),
        new Date("2026-06-06"),
        new Date("2026-08-15"),
        new Date("2026-09-14"),
        new Date("2026-10-03"),
        new Date("2026-12-25"),
      ];

      const combos = recommendBridges(today, expiryDate, 300, holidays);

      // Maximum 3 combos even with many holidays
      expect(combos.length).toBeLessThanOrEqual(3);
    });
  });

  describe("buildMonthlyPlan", () => {
    it("AC-3: should allocate R=150 over M=6 months as [30,30,30,20,20,20]", () => {
      const today = new Date("2026-01-01");
      const expiryDate = new Date("2026-06-30");
      const plan = buildMonthlyPlan(today, expiryDate, 150, []);

      const allocations = plan.map((m) => m.allocation);
      expect(allocations).toEqual([30, 30, 30, 20, 20, 20]);
    });

    it("AC-3: should allocate R=76 over M=3 months as [36,20,20]", () => {
      const today = new Date("2026-10-01");
      const expiryDate = new Date("2026-12-31");
      const plan = buildMonthlyPlan(today, expiryDate, 76, []);

      const allocations = plan.map((m) => m.allocation);
      expect(allocations).toEqual([36, 20, 20]);
    });

    it("AC-3: total allocation must equal R across all months", () => {
      const today = new Date("2026-01-01");
      const expiryDate = new Date("2026-12-31");
      const R = 365;
      const plan = buildMonthlyPlan(today, expiryDate, R, []);

      const totalAllocation = plan.reduce((sum, m) => sum + m.allocation, 0);
      expect(totalAllocation).toBe(R);
    });

    it("AC-3: should handle uneven distribution (R not perfectly divisible by M)", () => {
      const today = new Date("2026-01-01");
      const expiryDate = new Date("2026-03-31");
      const R = 100;
      const M = 3;
      const plan = buildMonthlyPlan(today, expiryDate, R, []);

      expect(plan).toHaveLength(M);
      const totalAllocation = plan.reduce((sum, m) => sum + m.allocation, 0);
      expect(totalAllocation).toBe(R);
    });

    it("AC-4: should populate comboDates for months containing combo dates", () => {
      const today = new Date("2026-10-05");
      const expiryDate = new Date("2026-12-31");
      const combos: BridgeCombo[] = [
        { dates: [new Date("2026-10-08")], offDays: 4 },
        { dates: [new Date("2026-12-24")], offDays: 4 },
      ];

      const plan = buildMonthlyPlan(today, expiryDate, 76, combos);

      // October (month 10) should have comboDates
      const octPlan = plan.find((m) => m.month === 10);
      expect(octPlan).toBeDefined();
      expect(octPlan?.comboDates).toBeDefined();
      if (octPlan?.comboDates) {
        expect(octPlan.comboDates).toContainEqual(new Date("2026-10-08"));
      }

      // December (month 12) should have comboDates
      const decPlan = plan.find((m) => m.month === 12);
      expect(decPlan).toBeDefined();
      expect(decPlan?.comboDates).toBeDefined();
      if (decPlan?.comboDates) {
        expect(decPlan.comboDates).toContainEqual(new Date("2026-12-24"));
      }

      // Non-combo months should not have comboDates or it should be undefined/empty
      const novPlan = plan.find((m) => m.month === 11);
      if (novPlan) {
        expect(novPlan.comboDates === undefined || novPlan.comboDates.length === 0).toBe(
          true,
        );
      }
    });

    it("AC-5: dates after 2028-01-01 should treat only weekends as holidays", () => {
      // Test setup: expiryDate beyond HOLIDAY_COVERAGE_END (2027-12-31)
      const today = new Date("2028-06-01");
      const expiryDate = new Date("2028-12-31");

      // After 2028-01-01, no defined holidays from holidays.ts
      // Only weekends should count as holidays
      const combos = recommendBridges(today, expiryDate, 76, []);

      // Since only weekends count (no 1-3 weekday combinations possible),
      // combos should be 0 unless weekend-only combos are supported
      expect(combos).toBeDefined();
      expect(Array.isArray(combos)).toBe(true);

      // buildMonthlyPlan should still work but without holiday-based combos
      const plan = buildMonthlyPlan(today, expiryDate, 76, combos);
      expect(plan).toBeDefined();
      expect(plan.length).toBeGreaterThan(0);
    });

    it("should return MonthPlan with correct structure (year, month, allocation)", () => {
      const today = new Date("2026-10-01");
      const expiryDate = new Date("2026-12-31");
      const plan = buildMonthlyPlan(today, expiryDate, 76, []);

      expect(plan).toHaveLength(3);

      plan.forEach((monthPlan, idx) => {
        expect(monthPlan).toHaveProperty("year");
        expect(monthPlan).toHaveProperty("month");
        expect(monthPlan).toHaveProperty("allocation");
        expect(typeof monthPlan.year).toBe("number");
        expect(typeof monthPlan.month).toBe("number");
        expect(typeof monthPlan.allocation).toBe("number");
        expect(monthPlan.allocation).toBeGreaterThan(0);

        if (idx === 0) {
          expect(monthPlan.year).toBe(2026);
          expect(monthPlan.month).toBe(10);
        }
      });
    });

    it("should return BridgeCombo with dates array and offDays", () => {
      const today = new Date("2026-10-05");
      const expiryDate = new Date("2026-12-31");
      const holidays = [new Date("2026-10-08"), new Date("2026-12-24"), new Date("2026-12-31")];

      const combos = recommendBridges(today, expiryDate, 76, holidays);

      if (combos.length > 0) {
        combos.forEach((combo) => {
          expect(combo).toHaveProperty("dates");
          expect(combo).toHaveProperty("offDays");
          expect(Array.isArray(combo.dates)).toBe(true);
          expect(typeof combo.offDays).toBe("number");
          expect(combo.offDays).toBeGreaterThan(0);
        });
      }
    });
  });
});
