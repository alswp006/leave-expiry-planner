import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  mockTds,
  mockAppsInToss,
  mockAnalytics,
  mockNavigate,
  mockLogClick,
  mockRequestReviewOnce,
  mockShareApp,
} from "@/__tests__/__helpers__/mocks";
import Result from "@/pages/Result";
import Home from "@/pages/Home";
import type { AppInput } from "@/lib/types";

mockTds();
mockAppsInToss();
mockAnalytics();

vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual<typeof import("react-router-dom")>("react-router-dom")),
  useNavigate: () => mockNavigate,
}));

const INPUT: AppInput = {
  hireDate: "2025-03-15",
  basis: "hire",
  monthlySalary: 3000000,
  usedDays: 0,
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-05T09:00:00+09:00"));
  mockRequestReviewOnce.mockClear();
  mockShareApp.mockClear();
  mockLogClick.mockClear();
  mockNavigate.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderAt(ui: React.ReactElement, pathname: string, state?: unknown) {
  return render(
    React.createElement(MemoryRouter, { initialEntries: [{ pathname, state }] }, ui),
  );
}

const shareButton = () => screen.getByRole("button", { name: /공유/ });

describe("[개선] 행동 로그·리뷰·공유 2가지 추가", () => {
  it("AC-1[P0]: 결과가 나온 Result에서 requestReviewOnce가 정확히 1번 호출된다", () => {
    renderAt(React.createElement(Result), "/result", { input: INPUT });
    expect(screen.getByTestId("result-hero")).toBeInTheDocument();
    expect(mockRequestReviewOnce).toHaveBeenCalledTimes(1);
  });

  it("AC-2[P0]: Home 진입 직후에는 리뷰를 요청하지 않는다", () => {
    renderAt(React.createElement(Home), "/");
    expect(screen.getByRole("button", { name: /연차 계산하기/ })).toBeInTheDocument();
    expect(mockRequestReviewOnce).toHaveBeenCalledTimes(0);
  });

  it("AC-2[P0]: 결과가 없는(빈) Result 진입에서는 리뷰를 요청하지 않는다", () => {
    renderAt(React.createElement(Result), "/result");
    expect(screen.getByTestId("result-empty")).toBeInTheDocument();
    expect(mockRequestReviewOnce).toHaveBeenCalledTimes(0);
  });

  it("AC-2[P0]: 계산 오류 직후(error 상태)에는 리뷰를 요청하지 않는다", () => {
    renderAt(React.createElement(Result), "/result", {
      input: { ...INPUT, hireDate: "not-a-date" },
    });
    // 오류든 빈 상태든 성공 화면(result-hero)이 아니다
    expect(screen.queryByTestId("result-hero")).not.toBeInTheDocument();
    expect(mockRequestReviewOnce).toHaveBeenCalledTimes(0);
  });

  it("AC-3[P0]: 결과 화면 공유 버튼이 1개이고 누르면 shareApp이 message와 함께 호출된다", () => {
    renderAt(React.createElement(Result), "/result", { input: INPUT });
    expect(screen.getAllByRole("button", { name: /공유/ })).toHaveLength(1);
    fireEvent.click(shareButton());
    expect(mockShareApp).toHaveBeenCalledTimes(1);
    const arg = (mockShareApp.mock.calls[0] as unknown as [{ message: string }])[0];
    expect(typeof arg.message).toBe("string");
    expect(arg.message.length).toBeGreaterThan(0);
  });

  it("AC-3[P0]: 결과가 없는 화면에는 공유 버튼이 없다", () => {
    renderAt(React.createElement(Result), "/result");
    expect(screen.queryByRole("button", { name: /공유/ })).not.toBeInTheDocument();
    expect(mockShareApp).toHaveBeenCalledTimes(0);
  });

  it("AC-4[P1]: 공유 버튼을 누르면 logClick이 함께 호출된다", () => {
    renderAt(React.createElement(Result), "/result", { input: INPUT });
    fireEvent.click(shareButton());
    const names = mockLogClick.mock.calls.map((c) => c[0] as string);
    expect(names.some((n) => /share/.test(n))).toBe(true);
    expect(mockShareApp).toHaveBeenCalledTimes(1);
  });
});
