import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { AppInput, AppResult, AccrualBucket } from "@/lib/types";
import { buildBuckets, getNextAccrual } from "@/lib/accrual";
import { applyUsage, summarize } from "@/lib/summary";

describe("Packet 0002: 연차 발생 계산 + 사용 차감·요약", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ===== AC-1: buildBuckets + getNextAccrual (입사 2026-03-15, 오늘 2026-10-05) =====
  describe("AC-1: Basic accrual with monthly salary", () => {
    it("should build monthly bucket with 60 tenths expiring 2027-03-14", () => {
      vi.setSystemTime(new Date("2026-10-05T00:00:00+09:00"));

      const input: AppInput = {
        hiredDate: "2026-03-15",
        monthlySalary: 0,
        isFiscalYear: false,
        usedTenths: 0,
      };

      const buckets = buildBuckets(input, "2026-10-05");

      expect(buckets).toHaveLength(1);
      expect(buckets[0].tenths).toBe(60);
      expect(buckets[0].expiryDate).toBe("2027-03-14");
    });

    it("should calculate next accrual on 2026-10-15 with 10 tenths", () => {
      vi.setSystemTime(new Date("2026-10-05T00:00:00+09:00"));

      const input: AppInput = {
        hiredDate: "2026-03-15",
        monthlySalary: 0,
        isFiscalYear: false,
        usedTenths: 0,
      };

      const next = getNextAccrual(input, "2026-10-05");

      expect(next.date).toBe("2026-10-15");
      expect(next.tenths).toBe(10);
    });
  });

  // ===== AC-2: dailyWage, dDay, expiringAmount =====
  describe("AC-2: Daily wage, D-day, and expiring amount", () => {
    it("should calculate dailyWage=114832, dDay=160, expiringAmount=1722480", () => {
      vi.setSystemTime(new Date("2026-10-05T00:00:00+09:00"));

      const input: AppInput = {
        hiredDate: "2025-03-15",
        monthlySalary: 3000000,
        isFiscalYear: false,
        usedTenths: 0,
      };

      const result = summarize(input, "2026-10-05");

      // dailyWage = floor(3,000,000 / 209 * 8) = floor(114832.0382...) = 114832
      expect(result.dailyWage).toBe(114832);
      // dDay: days from today to expiry of first bucket (2026-10-05 → 2027-03-14 = 160 days)
      expect(result.dDayToExpiry).toBe(160);
      // expiringAmount = 60 tenths * 114832 / 4 = 1,722,480
      expect(result.expiringAmount).toBe(1722480);
    });

    it("should apply floor division correctly for dailyWage", () => {
      vi.setSystemTime(new Date("2026-10-05T00:00:00+09:00"));

      const input: AppInput = {
        hiredDate: "2025-03-15",
        monthlySalary: 3000001,
        isFiscalYear: false,
        usedTenths: 0,
      };

      const result = summarize(input, "2026-10-05");

      // floor(3,000,001 / 209 * 8) = 114832 (same due to floor)
      expect(result.dailyWage).toBe(114832);
    });
  });

  // ===== AC-3: Fiscal year (회계연도) prorated =====
  describe("AC-3: Fiscal year accrual", () => {
    it("should build prorated bucket with 76 tenths, expiry 2026-12-31", () => {
      vi.setSystemTime(new Date("2026-10-05T00:00:00+09:00"));

      const input: AppInput = {
        hiredDate: "2025-07-01",
        monthlySalary: 0,
        isFiscalYear: true,
        usedTenths: 0,
      };

      const buckets = buildBuckets(input, "2026-10-05");

      // Fiscal year mode: only prorated, no monthly buckets
      expect(buckets).toHaveLength(1);
      expect(buckets[0].tenths).toBe(76);
      expect(buckets[0].expiryDate).toBe("2026-12-31");
    });

    it("should calculate expiringAmount=872723 with fiscal year (3M salary)", () => {
      vi.setSystemTime(new Date("2026-10-05T00:00:00+09:00"));

      const input: AppInput = {
        hiredDate: "2025-07-01",
        monthlySalary: 3000000,
        isFiscalYear: true,
        usedTenths: 0,
      };

      const result = summarize(input, "2026-10-05");

      // expiringAmount = 76 tenths * 114832 / 10 ≈ 872,723.2 → floor = 872,723
      expect(result.expiringAmount).toBe(872723);
    });
  });

  // ===== AC-4: Accrual table k (근속년수) → tenths =====
  describe("AC-4: Accrual table by years of service", () => {
    it("k=1 year: should accumulate 210 tenths (60 monthly + 150 anniversary)", () => {
      vi.setSystemTime(new Date("2027-03-15T00:00:00+09:00"));

      const input: AppInput = {
        hiredDate: "2026-03-15",
        monthlySalary: 0,
        isFiscalYear: false,
        usedTenths: 0,
      };

      const buckets = buildBuckets(input, "2027-03-15");
      const totalTenths = buckets.reduce((sum, b) => sum + b.tenths, 0);

      // 1 year × 12 months × 5 tenths = 60 (monthly)
      // + 150 (k=1 anniversary bonus)
      // = 210 tenths total
      expect(totalTenths).toBe(210);
    });

    it("fiscal year + hired on 01-01 should match salary-year mode", () => {
      vi.setSystemTime(new Date("2027-01-15T00:00:00+09:00"));

      const inputFiscal: AppInput = {
        hiredDate: "2026-01-01",
        monthlySalary: 0,
        isFiscalYear: true,
        usedTenths: 0,
      };

      const inputSalary: AppInput = {
        hiredDate: "2026-01-01",
        monthlySalary: 0,
        isFiscalYear: false,
        usedTenths: 0,
      };

      const bucketsFiscal = buildBuckets(inputFiscal, "2027-01-15");
      const bucketsSalary = buildBuckets(inputSalary, "2027-01-15");

      const totalFiscal = bucketsFiscal.reduce((sum, b) => sum + b.tenths, 0);
      const totalSalary = bucketsSalary.reduce((sum, b) => sum + b.tenths, 0);

      expect(totalFiscal).toBe(totalSalary);
    });
  });

  // ===== AC-5: applyUsage with FIFO expiry order =====
  describe("AC-5: Apply usage with FIFO expiry", () => {
    it("should deduct from earliest-expiring bucket first", () => {
      const buckets: AccrualBucket[] = [
        { tenths: 50, expiryDate: "2026-12-31" },
        { tenths: 60, expiryDate: "2027-03-31" },
      ];

      const result = applyUsage(buckets, 80);

      // First bucket (2026-12-31): 50 - 50 = 0
      // Second bucket (2027-03-31): 60 - 30 = 30
      expect(result[0].tenths).toBe(0);
      expect(result[1].tenths).toBe(30);
    });

    it("should keep remainingTenths >= 0 when usage > available", () => {
      const buckets: AccrualBucket[] = [
        { tenths: 30, expiryDate: "2026-12-31" },
        { tenths: 50, expiryDate: "2027-03-31" },
      ];

      const result = applyUsage(buckets, 100);

      expect(result.every((b) => b.tenths >= 0)).toBe(true);
      const totalAfter = result.reduce((sum, b) => sum + b.tenths, 0);
      // Total was 80, used 100, remaining 0 (can't use more than available)
      expect(totalAfter).toBe(0);
    });

    it("should not deduct more than total available tenths", () => {
      const buckets: AccrualBucket[] = [
        { tenths: 30, expiryDate: "2026-12-31" },
      ];

      const result = applyUsage(buckets, 50);

      // Only 30 available, so can only deduct 30
      expect(result[0].tenths).toBe(0);
    });

    it("should handle multi-bucket deduction correctly", () => {
      const buckets: AccrualBucket[] = [
        { tenths: 20, expiryDate: "2026-06-30" },
        { tenths: 40, expiryDate: "2026-12-31" },
        { tenths: 60, expiryDate: "2027-06-30" },
      ];

      const result = applyUsage(buckets, 65);

      // 20 + 40 + 5 = 65
      expect(result[0].tenths).toBe(0);
      expect(result[1].tenths).toBe(0);
      expect(result[2].tenths).toBe(55);
    });
  });

  // ===== Integration: summarize combines buckets + usage + calculations =====
  describe("summarize integration", () => {
    it("should combine buildBuckets and applyUsage in summarize", () => {
      vi.setSystemTime(new Date("2026-10-05T00:00:00+09:00"));

      const input: AppInput = {
        hiredDate: "2025-03-15",
        monthlySalary: 3000000,
        isFiscalYear: false,
        usedTenths: 40, // Use 40 tenths
      };

      const result = summarize(input, "2026-10-05");

      // Should have buckets with usage applied
      expect(result.dailyWage).toBe(114832);
      expect(result.dDayToExpiry).toBe(160);
      // expiringAmount for remaining 20 tenths (60 - 40)
      expect(result.expiringAmount).toBe(2296640); // (60-40) * 114832 = 20 * 114832
    });

    it("should return valid AppResult structure", () => {
      vi.setSystemTime(new Date("2026-10-05T00:00:00+09:00"));

      const input: AppInput = {
        hiredDate: "2026-03-15",
        monthlySalary: 3000000,
        isFiscalYear: false,
        usedTenths: 0,
      };

      const result = summarize(input, "2026-10-05");

      expect(result).toHaveProperty("dailyWage");
      expect(result).toHaveProperty("dDayToExpiry");
      expect(result).toHaveProperty("expiringAmount");
      expect(result.dailyWage).toBeGreaterThan(0);
      expect(result.dDayToExpiry).toBeGreaterThan(0);
      expect(result.expiringAmount).toBeGreaterThanOrEqual(0);
    });
  });
});
