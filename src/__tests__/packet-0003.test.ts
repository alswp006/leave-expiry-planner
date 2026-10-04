import { describe, it, expect } from "vitest";
import type { BridgeCombo } from "@/lib/types";
import { HOLIDAYS, HOLIDAY_COVERAGE_END } from "@/lib/holidays";
import { recommendBridges } from "@/lib/bridges";
import { buildMonthlyPlan } from "@/lib/plan";

describe("packet-0003: 공휴일 + 연휴 조합 + 월별 플랜", () => {
  describe("recommendBridges", () => {
    it("AC-1: 10-08, 12-24, 12-31 조합 3개, 각 offDays 4", () => {
      const combos = recommendBridges("2026-10-05", "2026-12-31", 76, HOLIDAYS);

      expect(combos.map((c) => c.leaveDates[0])).toEqual(["2026-10-08", "2026-12-24", "2026-12-31"]);
      combos.forEach((c) => expect(c.offDays).toBe(4));
      expect(combos[0].offStart).toBe("2026-10-08");
      expect(combos[0].offEnd).toBe("2026-10-11");
    });

    it("AC-2: 공휴일 배열이 비면 조합 0개", () => {
      expect(recommendBridges("2026-10-05", "2026-12-31", 76, [])).toHaveLength(0);
    });

    it("최대 3개, 누적 휴가일이 R을 넘지 않는다", () => {
      const many = recommendBridges("2026-01-01", "2027-12-31", 300, HOLIDAYS);
      expect(many.length).toBeLessThanOrEqual(3);

      const tight = recommendBridges("2026-10-05", "2026-12-31", 20, HOLIDAYS);
      expect(tight).toHaveLength(2);
    });

    it("AC-5: 2028-01-01 이후는 주말만 휴무라 조합이 없다", () => {
      const combos = recommendBridges("2028-06-01", "2028-12-31", 76, ["2028-08-15", "2028-10-03"]);
      expect(combos).toHaveLength(0);
      expect(HOLIDAY_COVERAGE_END).toBe("2027-12-31");
    });
  });

  describe("buildMonthlyPlan", () => {
    it("AC-3: R=150, M=6 → [30,30,30,20,20,20]", () => {
      const plan = buildMonthlyPlan("2026-01-01", "2026-06-30", 150, []);
      expect(plan.map((p) => p.tenths)).toEqual([30, 30, 30, 20, 20, 20]);
    });

    it("AC-3: R=76, M=3 → [36,20,20]", () => {
      const plan = buildMonthlyPlan("2026-10-01", "2026-12-31", 76, []);
      expect(plan.map((p) => p.month)).toEqual(["2026-10", "2026-11", "2026-12"]);
      expect(plan.map((p) => p.tenths)).toEqual([36, 20, 20]);
    });

    it("AC-3: 합계는 항상 R", () => {
      for (const r of [0, 5, 76, 100, 365]) {
        const plan = buildMonthlyPlan("2026-01-15", "2026-03-31", r, []);
        expect(plan).toHaveLength(3);
        expect(plan.reduce((s, p) => s + p.tenths, 0)).toBe(r);
      }
    });

    it("AC-4: 조합 날짜가 든 달의 comboDates가 채워진다", () => {
      const combos: BridgeCombo[] = recommendBridges("2026-10-05", "2026-12-31", 76, HOLIDAYS);
      const plan = buildMonthlyPlan("2026-10-05", "2026-12-31", 76, combos);

      expect(plan.find((p) => p.month === "2026-10")?.comboDates).toEqual(["2026-10-08"]);
      expect(plan.find((p) => p.month === "2026-11")?.comboDates).toEqual([]);
      expect(plan.find((p) => p.month === "2026-12")?.comboDates).toEqual(["2026-12-24", "2026-12-31"]);
    });

    it("사용기한이 오늘보다 이르면 빈 배열", () => {
      expect(buildMonthlyPlan("2026-10-05", "2026-09-30", 76, [])).toEqual([]);
    });
  });
});
