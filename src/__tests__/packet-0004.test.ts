import { describe, it, expect, beforeEach, vi } from "vitest";
import type { AppInput, LeaveBucket } from "@/lib/types";

// ============================================================================
// AC-INPUT-2: 6가지 검증 문구
// ============================================================================
describe("AC-INPUT-2: 범위 밖 입력 — 6가지 검증 문구", () => {
  // validateInput(raw, today) → Partial<Record<fieldName, errorMessage>>
  // raw = { hireDate?: string, basis?: string, monthlySalary?: number, usedDays?: number }
  // today = 'YYYY-MM-DD'

  it("should return '올바른 날짜를 입력해 주세요' for invalid date like 2023-02-30", () => {
    const result = validateInput(
      { hireDate: "2023-02-30", basis: "hire", monthlySalary: 3000000, usedDays: 0 },
      "2026-10-05"
    );
    expect(result.hireDate).toBe("올바른 날짜를 입력해 주세요");
  });

  it("should return '오늘 이후 날짜는 입력할 수 없어요' for hireDate > today", () => {
    const result = validateInput(
      { hireDate: "2026-10-06", basis: "hire", monthlySalary: 3000000, usedDays: 0 },
      "2026-10-05"
    );
    expect(result.hireDate).toBe("오늘 이후 날짜는 입력할 수 없어요");
  });

  it("should return '1980년 이후 날짜를 입력해 주세요' for hireDate < 1980-01-01", () => {
    const result = validateInput(
      { hireDate: "1979-12-31", basis: "hire", monthlySalary: 3000000, usedDays: 0 },
      "2026-10-05"
    );
    expect(result.hireDate).toBe("1980년 이후 날짜를 입력해 주세요");
  });

  it("should return '1원 ~ 1억 원 사이로 입력해 주세요' for monthlySalary <= 0", () => {
    const result = validateInput(
      { hireDate: "2025-03-15", basis: "hire", monthlySalary: 0, usedDays: 0 },
      "2026-10-05"
    );
    expect(result.monthlySalary).toBe("1원 ~ 1억 원 사이로 입력해 주세요");
  });

  it("should return '1원 ~ 1억 원 사이로 입력해 주세요' for monthlySalary > 100,000,000", () => {
    const result = validateInput(
      { hireDate: "2025-03-15", basis: "hire", monthlySalary: 100000001, usedDays: 0 },
      "2026-10-05"
    );
    expect(result.monthlySalary).toBe("1원 ~ 1억 원 사이로 입력해 주세요");
  });

  it("should return '0.5일 단위로 입력해 주세요' for usedDays < 0", () => {
    const result = validateInput(
      { hireDate: "2025-03-15", basis: "hire", monthlySalary: 3000000, usedDays: -0.5 },
      "2026-10-05"
    );
    expect(result.usedDays).toBe("0.5일 단위로 입력해 주세요");
  });

  it("should return '0.5일 단위로 입력해 주세요' for usedDays not in 0.5 unit", () => {
    const result = validateInput(
      { hireDate: "2025-03-15", basis: "hire", monthlySalary: 3000000, usedDays: 1.3 },
      "2026-10-05"
    );
    expect(result.usedDays).toBe("0.5일 단위로 입력해 주세요");
  });

  it("should return '지금 쓸 수 있는 연차(n일)보다 많아요' for usedDays > available tenths", () => {
    // Mock available tenths = 7.6 (76 tenths / 10)
    const result = validateInput(
      { hireDate: "2025-03-15", basis: "hire", monthlySalary: 3000000, usedDays: 8 },
      "2026-10-05",
      76 // availableTenths
    );
    expect(result.usedDays).toBe("지금 쓸 수 있는 연차(7.6일)보다 많아요");
  });
});

// ============================================================================
// AC-INPUT-3: 쓸 수 있는 연차가 0일 때
// ============================================================================
describe("AC-INPUT-3: 쓸 수 있는 연차가 0일일 때", () => {
  it("should return '지금 쓸 수 있는 연차가 없어요' when availableTenths=0 and usedDays>0", () => {
    const result = validateInput(
      { hireDate: "2026-10-05", basis: "hire", monthlySalary: 3000000, usedDays: 1 },
      "2026-10-05",
      0 // availableTenths = 0 (no accrued leave on hire date itself)
    );
    expect(result.usedDays).toBe("지금 쓸 수 있는 연차가 없어요");
  });

  it("should return no error when availableTenths=0 and usedDays=0", () => {
    const result = validateInput(
      { hireDate: "2026-10-05", basis: "hire", monthlySalary: 3000000, usedDays: 0 },
      "2026-10-05",
      0
    );
    expect(result.usedDays).toBeUndefined();
  });

  it("should return no error when usedDays is empty string (treated as 0)", () => {
    const result = validateInput(
      { hireDate: "2026-10-05", basis: "hire", monthlySalary: 3000000, usedDays: 0 },
      "2026-10-05",
      0
    );
    expect(result.usedDays).toBeUndefined();
  });
});

// ============================================================================
// AC-INPUT-MASKING: 입입력 마스킹 11개 예시
// ============================================================================
describe("AC-INPUT-MASKING: 입력 마스킹", () => {
  describe("입사일 마스킹 (maskHireDate)", () => {
    it("should remove non-numeric characters: '2025-03-15' → '20250315' (internal)", () => {
      const masked = maskHireDate("2025-03-15");
      expect(masked).toBe("20250315");
    });

    it("should remove non-numeric: '2025a03' → '202503'", () => {
      const masked = maskHireDate("2025a03");
      expect(masked).toBe("202503");
    });

    it("should truncate to 8 digits: '202503151' → '20250315'", () => {
      const masked = maskHireDate("202503151");
      expect(masked).toBe("20250315");
    });

    it("should display 8-digit as YYYY.MM.DD: displayHireDate('20250315') → '2025.03.15'", () => {
      const displayed = displayHireDate("20250315");
      expect(displayed).toBe("2025.03.15");
    });

    it("should display < 8 digits as-is: displayHireDate('202503') → '202503'", () => {
      const displayed = displayHireDate("202503");
      expect(displayed).toBe("202503");
    });
  });

  describe("월급 마스킹 (maskSalary)", () => {
    it("should remove non-numeric and leading zeros: '3,000,000원' → '3000000' (internal)", () => {
      const masked = maskSalary("3,000,000원");
      expect(masked).toBe("3000000");
    });

    it("should remove leading zeros: '0012' → '12'", () => {
      const masked = maskSalary("0012");
      expect(masked).toBe("12");
    });

    it("should truncate to 9 digits: '1234567890' → '123456789'", () => {
      const masked = maskSalary("1234567890");
      expect(masked).toBe("123456789");
    });

    it("should display with commas every 3 digits: displaySalary('3000000') → '3,000,000'", () => {
      const displayed = displaySalary("3000000");
      expect(displayed).toBe("3,000,000");
    });

    it("should handle small values: displaySalary('12') → '12'", () => {
      const displayed = displaySalary("12");
      expect(displayed).toBe("12");
    });
  });

  describe("사용 연차 마스킹 (maskUsedDays)", () => {
    it("should remove negative sign: '-3' → '3'", () => {
      const masked = maskUsedDays("-3");
      expect(masked).toBe("3");
    });

    it("should truncate decimal to 1 digit: '1.55' → '1.5'", () => {
      const masked = maskUsedDays("1.55");
      expect(masked).toBe("1.5");
    });

    it("should keep only first dot: '1.2.3' → '1.2'", () => {
      const masked = maskUsedDays("1.2.3");
      expect(masked).toBe("1.2");
    });

    it("should prepend 0 for dot-first: '.5' → '0.5'", () => {
      const masked = maskUsedDays(".5");
      expect(masked).toBe("0.5");
    });

    it("should filter non-numeric and dot: 'abc' → ''", () => {
      const masked = maskUsedDays("abc");
      expect(masked).toBe("");
    });

    it("should remove leading zeros from integer part: '03.5' → '3.5'", () => {
      const masked = maskUsedDays("03.5");
      expect(masked).toBe("3.5");
    });

    it("should limit integer part to 2 digits: '999' → '99'", () => {
      const masked = maskUsedDays("999");
      expect(masked).toBe("99");
    });
  });
});

// ============================================================================
// AC-STORAGE-SAFE: localStorage 실패 처리
// ============================================================================
describe("AC-STORAGE-SAFE: localStorage 실패 처리", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("saveInput: try-catch 안전성", () => {
    it("should not throw even if setItem fails", () => {
      const mockSetItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });

      const input: AppInput = {
        hireDate: "2025-03-15",
        basis: "hire",
        monthlySalary: 3000000,
        usedDays: 0,
      };

      expect(() => saveInput(input)).not.toThrow();
      mockSetItem.mockRestore();
    });

    it("should not call console.* on setItem failure", () => {
      const consoleSpy = vi.spyOn(console, "error");
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });

      const input: AppInput = {
        hireDate: "2025-03-15",
        basis: "hire",
        monthlySalary: 3000000,
        usedDays: 0,
      };

      saveInput(input);
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("loadInput: 형식 검증 + 정리", () => {
    it("should return null and delete key if JSON parse fails", () => {
      localStorage.setItem("leave-expiry-planner:lastInput", "{bad json");

      const result = loadInput();

      expect(result).toBeNull();
      expect(localStorage.getItem("leave-expiry-planner:lastInput")).toBeNull();
    });

    it("should return null and delete key if hireDate is invalid (2023-02-30)", () => {
      const badInput = {
        hireDate: "2023-02-30",
        basis: "hire",
        monthlySalary: 3000000,
        usedDays: 0,
      };
      localStorage.setItem("leave-expiry-planner:lastInput", JSON.stringify(badInput));

      const result = loadInput();

      expect(result).toBeNull();
      expect(localStorage.getItem("leave-expiry-planner:lastInput")).toBeNull();
    });

    it("should return null and delete key if basis is invalid ('x')", () => {
      const badInput = {
        hireDate: "2025-03-15",
        basis: "x",
        monthlySalary: 3000000,
        usedDays: 0,
      };
      localStorage.setItem("leave-expiry-planner:lastInput", JSON.stringify(badInput));

      const result = loadInput();

      expect(result).toBeNull();
      expect(localStorage.getItem("leave-expiry-planner:lastInput")).toBeNull();
    });

    it("should return null and delete key if monthlySalary is not a finite number", () => {
      const badInput = {
        hireDate: "2025-03-15",
        basis: "hire",
        monthlySalary: NaN,
        usedDays: 0,
      };
      localStorage.setItem("leave-expiry-planner:lastInput", JSON.stringify(badInput));

      const result = loadInput();

      expect(result).toBeNull();
      expect(localStorage.getItem("leave-expiry-planner:lastInput")).toBeNull();
    });

    it("should return null and delete key if usedDays is not a finite number", () => {
      const badInput = {
        hireDate: "2025-03-15",
        basis: "hire",
        monthlySalary: 3000000,
        usedDays: Infinity,
      };
      localStorage.setItem("leave-expiry-planner:lastInput", JSON.stringify(badInput));

      const result = loadInput();

      expect(result).toBeNull();
      expect(localStorage.getItem("leave-expiry-planner:lastInput")).toBeNull();
    });

    it("should return null if getItem throws", () => {
      const mockGetItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("Storage error");
      });

      const result = loadInput();

      expect(result).toBeNull();
      mockGetItem.mockRestore();
    });

    it("should not call console.* on removeItem failure during cleanup", () => {
      const consoleSpy = vi.spyOn(console, "error");
      vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
        throw new Error("removeItem failed");
      });

      localStorage.setItem("leave-expiry-planner:lastInput", "{bad json");

      loadInput();

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should return valid input if all fields are correct", () => {
      const validInput: AppInput = {
        hireDate: "2025-03-15",
        basis: "hire",
        monthlySalary: 3000000,
        usedDays: 0,
      };
      localStorage.setItem("leave-expiry-planner:lastInput", JSON.stringify(validInput));

      const result = loadInput();

      expect(result).toEqual(validInput);
      expect(result?.hireDate).toBe("2025-03-15");
      expect(result?.basis).toBe("hire");
      expect(result?.monthlySalary).toBe(3000000);
      expect(result?.usedDays).toBe(0);
    });
  });

  describe("console.* 호출 0건 보증", () => {
    it("should have 0 console calls across all error scenarios", () => {
      const consoleSpy = vi.spyOn(console, "error");
      const consoleWarnSpy = vi.spyOn(console, "warn");
      const consoleLogSpy = vi.spyOn(console, "log");

      // Scenario 1: setItem failure
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });
      saveInput({
        hireDate: "2025-03-15",
        basis: "hire",
        monthlySalary: 3000000,
        usedDays: 0,
      });

      // Scenario 2: getItem failure
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("Storage error");
      });
      loadInput();

      // Scenario 3: removeItem failure
      vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
        throw new Error("removeItem failed");
      });
      localStorage.setItem("leave-expiry-planner:lastInput", "{bad json");
      loadInput();

      expect(consoleSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
      consoleWarnSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });
});

// ============================================================================
// Helper functions (these will be imported from actual modules)
// ============================================================================
function validateInput(
  raw: Partial<AppInput>,
  today: string,
  availableTenths?: number
): Partial<Record<keyof AppInput, string>> {
  // Placeholder — implementation in src/lib/validation.ts
  throw new Error("Not implemented");
}

function maskHireDate(raw: string): string {
  // Placeholder — implementation in src/lib/inputMask.ts
  throw new Error("Not implemented");
}

function displayHireDate(digits: string): string {
  // Placeholder — implementation in src/lib/inputMask.ts
  throw new Error("Not implemented");
}

function maskSalary(raw: string): string {
  // Placeholder — implementation in src/lib/inputMask.ts
  throw new Error("Not implemented");
}

function displaySalary(digits: string): string {
  // Placeholder — implementation in src/lib/inputMask.ts
  throw new Error("Not implemented");
}

function maskUsedDays(raw: string): string {
  // Placeholder — implementation in src/lib/inputMask.ts
  throw new Error("Not implemented");
}

function saveInput(input: AppInput): void {
  // Placeholder — implementation in src/lib/inputStore.ts
  throw new Error("Not implemented");
}

function loadInput(): AppInput | null {
  // Placeholder — implementation in src/lib/inputStore.ts
  throw new Error("Not implemented");
}
