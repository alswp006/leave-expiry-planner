import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { mockTds, mockAppsInToss, mockNavigate } from "@/__tests__/__helpers__/mocks";
import Result from "@/pages/Result";
import type { AppInput, BridgeCombo } from "@/lib/types";

mockTds();
mockAppsInToss();

vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual<typeof import("react-router-dom")>("react-router-dom")),
  useNavigate: () => mockNavigate,
}));

// 게이트는 children을 data-testid="reward-gate" 안에 그대로 그린다(광고 로직은 템플릿 몫).
vi.mock("@/components/TossRewardAd", () => ({
  TossRewardAd: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="reward-gate">{children}</div>
  ),
}));

const bridgesMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/bridges", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/bridges")>();
  bridgesMock.mockImplementation(actual.recommendBridges);
  return { ...actual, recommendBridges: bridgesMock };
});

const COMBO: BridgeCombo = {
  leaveDates: ["2026-10-08"],
  offStart: "2026-10-08",
  offEnd: "2026-10-11",
  offDays: 4,
  efficiency: 4,
};

const INPUT: AppInput = { hireDate: "2025-03-15", basis: "hire", monthlySalary: 3000000, usedDays: 0 };

let errorSpy: ReturnType<typeof vi.spyOn>;
let realBridges: typeof import("@/lib/bridges").recommendBridges;

function setToday(iso: string) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${iso}T09:00:00+09:00`));
}

beforeEach(async () => {
  realBridges = (await vi.importActual<typeof import("@/lib/bridges")>("@/lib/bridges")).recommendBridges;
  setToday("2026-10-05");
  mockNavigate.mockClear();
  bridgesMock.mockReset();
  bridgesMock.mockImplementation(realBridges);
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
});

function renderResult(input: AppInput = INPUT) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/result", state: { input } }]}>
      <Result />
    </MemoryRouter>,
  );
}

describe("더 깊은 층 + 리워드 게이트", () => {
  it("AC-1[P0]: D-day·금액·묶음 목록은 게이트 바깥, F4(월별 플랜)만 게이트 안", () => {
    bridgesMock.mockReturnValue([COMBO]);
    renderResult();
    const gate = screen.getByTestId("reward-gate");
    expect(within(gate).getByText("월별 플랜")).toBeInTheDocument();
    expect(within(gate).getByText("연휴 조합")).toBeInTheDocument();
    expect(gate).not.toContainElement(screen.getByTestId("result-hero"));
    expect(gate).not.toContainElement(screen.getByTestId("result-detail"));
    expect(gate).not.toContainElement(screen.getByTestId("result-buckets"));
    expect(screen.getByText("D-160")).toBeInTheDocument();
  });

  it("AC-1[P0]: 남은 연차가 0이면 게이트를 렌더링하지 않는다", () => {
    renderResult({ ...INPUT, usedDays: 15 });
    expect(screen.getByTestId("result-hero")).toBeInTheDocument();
    expect(screen.queryByTestId("reward-gate")).toBeNull();
    expect(screen.queryByText("월별 플랜")).toBeNull();
  });

  it("AC-2[P0]: 조합이 든 달의 행에 '연휴 조합 포함 (10/8)' 문구가 보인다", () => {
    bridgesMock.mockReturnValue([COMBO]);
    renderResult();
    expect(screen.getAllByText(/연휴 조합 포함 \(10\/8\)/)).toHaveLength(1);
    expect(bridgesMock).toHaveBeenCalled();
  });

  it("AC-2[P0]: 조합이 0개면 연휴 조합 탭에 '기간 안에 붙여 쓸 연휴가 없어요'를 보이고 월별 플랜은 유지한다", () => {
    bridgesMock.mockReturnValue([]);
    renderResult();
    expect(screen.queryByText(/연휴 조합 포함/)).toBeNull();
    expect(screen.getByText(/2026\.?-?10|10월/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("연휴 조합"));
    expect(screen.getByText("기간 안에 붙여 쓸 연휴가 없어요")).toBeInTheDocument();
    expect(screen.getByTestId("result-detail")).toBeInTheDocument();
  });

  it("AC-3[P1]: 기간이 2028년 이후면 '공휴일 정보는 2027년까지 반영돼 있어요'를 보인다", () => {
    bridgesMock.mockReturnValue([]);
    setToday("2027-10-05");
    renderResult({ hireDate: "2026-03-15", basis: "hire", monthlySalary: 3000000, usedDays: 0 });
    expect(screen.getByText("공휴일 정보는 2027년까지 반영돼 있어요")).toBeInTheDocument();
    expect(screen.getByTestId("reward-gate")).toBeInTheDocument();
  });

  it("AC-3[P1]: 기간이 2027년 안에 끝나면 공휴일 안내를 보이지 않는다", () => {
    bridgesMock.mockReturnValue([COMBO]);
    renderResult();
    expect(screen.queryByText("공휴일 정보는 2027년까지 반영돼 있어요")).toBeNull();
    expect(screen.getByTestId("reward-gate")).toBeInTheDocument();
  });

  it("AC-4[P0]: recommendBridges 예외 → F4 영역만 에러+「다시 시도」, 핵심 답 유지, 재시도하면 복구", () => {
    bridgesMock.mockImplementation(() => {
      throw new Error("boom");
    });
    renderResult();
    const gate = screen.getByTestId("reward-gate");
    expect(within(gate).getByText("계산 중 문제가 생겼어요")).toBeInTheDocument();
    expect(screen.getAllByText("계산 중 문제가 생겼어요")).toHaveLength(1);
    expect(screen.getByText("D-160")).toBeInTheDocument();
    expect(screen.getByTestId("result-detail")).toBeInTheDocument();
    expect(errorSpy).not.toHaveBeenCalled();

    bridgesMock.mockReturnValue([COMBO]);
    fireEvent.click(within(gate).getByRole("button", { name: "다시 시도" }));
    expect(screen.queryByText("계산 중 문제가 생겼어요")).toBeNull();
    expect(screen.getAllByText(/연휴 조합 포함 \(10\/8\)/)).toHaveLength(1);
  });

  it("AC-5[P0]: DeepTier.tsx에 setTimeout·setInterval·광고 SDK 직접 import가 없다", () => {
    const file = path.resolve(__dirname, "../components/DeepTier.tsx");
    expect(fs.existsSync(file)).toBe(true);
    const src = fs.readFileSync(file, "utf8");
    expect(src).not.toMatch(/setTimeout|setInterval/);
    expect(src).not.toMatch(/@apps-in-toss\/web-framework/);
    expect(src).not.toMatch(/loadFullScreenAd|showFullScreenAd|TossAds/);
  });

  it("AC-5[P0]: 오프라인에서도 「다시 계산하기」가 동작하고 console.error가 없다", () => {
    const onLine = vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
    bridgesMock.mockReturnValue([COMBO]);
    renderResult();
    expect(screen.getByText("D-160")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다시 계산하기" }));
    expect(mockNavigate).toHaveBeenCalledWith("/");
    expect(errorSpy).not.toHaveBeenCalled();
    onLine.mockRestore();
  });
});
