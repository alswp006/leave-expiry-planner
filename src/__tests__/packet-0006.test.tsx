import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { mockTds, mockAppsInToss, mockNavigate } from "@/__tests__/__helpers__/mocks";
import Result from "@/pages/Result";
import type { AppInput } from "@/lib/types";

mockTds();
mockAppsInToss();

vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual<typeof import("react-router-dom")>("react-router-dom")),
  useNavigate: () => mockNavigate,
}));

const summarizeMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/summary", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/summary")>();
  summarizeMock.mockImplementation(actual.summarize);
  return { ...actual, summarize: summarizeMock };
});

const INPUT: AppInput = {
  hireDate: "2025-03-15",
  basis: "hire",
  monthlySalary: 3000000,
  usedDays: 0,
};

let errorSpy: ReturnType<typeof vi.spyOn>;
let realSummarize: typeof import("@/lib/summary").summarize;

beforeEach(async () => {
  realSummarize = (await vi.importActual<typeof import("@/lib/summary")>("@/lib/summary")).summarize;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-05T09:00:00+09:00"));
  mockNavigate.mockClear();
  summarizeMock.mockReset();
  summarizeMock.mockImplementation(realSummarize);
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
});

function renderResult(state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/result", state }]}>
      <Result />
    </MemoryRouter>,
  );
}

const NOTICES = [
  "출근율 80% 이상·개근을 가정한 추정치예요.",
  "상시 5인 미만 사업장은 연차 규정이 적용되지 않아요.",
  "회사가 연차 사용 촉진을 했다면 수당이 나오지 않을 수 있어요.",
];

function expectNotices() {
  for (const n of NOTICES) expect(screen.getByText(n)).toBeInTheDocument();
}

describe("Result 핵심 답(무료 층)", () => {
  it("AC-1[P0]: 입사 2025-03-15·월급 300만 원 → D-160, 소멸 문장, 1,722,480원을 보여 준다", async () => {
    renderResult({ input: INPUT });
    expect(await screen.findByText("D-160")).toBeInTheDocument();
    expect(screen.getByText("2027.03.14까지 안 쓰면 15일이 사라져요")).toBeInTheDocument();
    expect(screen.getByText(/1,722,480원/)).toBeInTheDocument();
    expect(screen.getByText(/114,832원/)).toBeInTheDocument();
    expect(summarizeMock).toHaveBeenCalledWith(INPUT, "2026-10-05");
    expect(screen.getByRole("button", { name: /다시 계산하기/ })).toBeInTheDocument();
  });

  it("AC-1[P0]: 「다시 계산하기」는 홈(/)으로 이동한다", async () => {
    renderResult({ input: INPUT });
    fireEvent.click(await screen.findByRole("button", { name: /다시 계산하기/ }));
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("AC-2[P0]: 남은 연차가 0이면 안내 문구를 보이고 금액 행을 숨긴다", async () => {
    renderResult({ input: { ...INPUT, usedDays: 100 } });
    expect(await screen.findByText("지금 사라질 연차가 없어요")).toBeInTheDocument();
    expect(screen.queryByText(/못 쓰면 사라지는 금액/)).not.toBeInTheDocument();
    expect(screen.queryByText(/1,722,480원/)).not.toBeInTheDocument();
    expect(screen.queryByText(/D-\d+/)).not.toBeInTheDocument();
    expectNotices();
  });

  it("AC-3[P0]: route state가 없으면 '계산된 결과가 없어요'와 「입력하러 가기」를 보여 준다", async () => {
    renderResult(undefined);
    expect(await screen.findByText("계산된 결과가 없어요")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /입력하러 가기/ }));
    expect(mockNavigate).toHaveBeenCalledWith("/");
    expect(summarizeMock).not.toHaveBeenCalled();
    expect(screen.queryByText("계산 중 문제가 생겼어요")).not.toBeInTheDocument();
  });

  it("AC-3[P0]: input.hireDate가 '2023-02-30'이면 에러가 아니라 '계산된 결과가 없어요'로 처리한다", async () => {
    renderResult({ input: { ...INPUT, hireDate: "2023-02-30" } });
    expect(await screen.findByText("계산된 결과가 없어요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /입력하러 가기/ })).toBeInTheDocument();
    expect(screen.queryByText("계산 중 문제가 생겼어요")).not.toBeInTheDocument();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("AC-4[P0]: summarize 예외 → 에러 화면, 정상으로 돌린 뒤 「다시 시도」 → 결과, 누른 시점의 오늘로 재계산", async () => {
    summarizeMock.mockImplementation(() => {
      throw new Error("boom");
    });
    renderResult({ input: INPUT });
    expect(await screen.findByText("계산 중 문제가 생겼어요")).toBeInTheDocument();
    expect(screen.queryByText("D-160")).not.toBeInTheDocument();
    expectNotices();

    summarizeMock.mockImplementation(realSummarize);
    vi.setSystemTime(new Date("2026-10-06T09:00:00+09:00"));
    fireEvent.click(screen.getByRole("button", { name: /다시 시도/ }));
    expect(await screen.findByText("D-159")).toBeInTheDocument();
    expect(summarizeMock).toHaveBeenLastCalledWith(INPUT, "2026-10-06");
    expect(screen.queryByText("계산 중 문제가 생겼어요")).not.toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("AC-4[P0]: dailyWage가 NaN이면 에러 화면이고 계속 실패하면 에러가 유지된다", async () => {
    summarizeMock.mockImplementation((input: AppInput, today: string) => ({
      ...realSummarize(input, today),
      dailyWage: NaN,
    }));
    renderResult({ input: INPUT });
    expect(await screen.findByText("계산 중 문제가 생겼어요")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /다시 시도/ }));
    expect(await screen.findByText("계산 중 문제가 생겼어요")).toBeInTheDocument();
    expect(screen.queryByText(/1,722,480원/)).not.toBeInTheDocument();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("AC-5[P0]: 결과·0일·결과 없음·에러 모든 상태에서 안내 3줄이 보이고 console.error는 0건이다", async () => {
    const first = renderResult({ input: INPUT });
    await screen.findByText("D-160");
    expectNotices();
    first.unmount();

    const zero = renderResult({ input: { ...INPUT, usedDays: 100 } });
    await screen.findByText("지금 사라질 연차가 없어요");
    expectNotices();
    zero.unmount();

    summarizeMock.mockImplementation(() => {
      throw new Error("boom");
    });
    const err = renderResult({ input: INPUT });
    await screen.findByText("계산 중 문제가 생겼어요");
    expectNotices();
    err.unmount();

    expect(errorSpy).not.toHaveBeenCalled();
  });
});
