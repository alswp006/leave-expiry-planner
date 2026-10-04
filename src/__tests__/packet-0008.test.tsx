import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { mockTds, mockAppsInToss, mockNavigate } from "@/__tests__/__helpers__/mocks";
import App from "@/App";

mockTds();
mockAppsInToss();

vi.mock("@/components/TossRewardAd", () => ({
  TossRewardAd: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="reward-gate">{children}</div>
  ),
}));

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-05T09:00:00+09:00"));
  Element.prototype.scrollIntoView = vi.fn();
  mockNavigate.mockClear();
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
});

function renderApp(entry: unknown = "/") {
  return render(
    <MemoryRouter initialEntries={[entry as string]}>
      <App />
    </MemoryRouter>,
  );
}

const INPUT = { hireDate: "2025-03-15", basis: "hire", monthlySalary: 3000000, usedDays: 0 };

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "__tests__" ? [] : sourceFiles(p);
    return /\.(tsx?|css)$/.test(e.name) ? [p] : [];
  });
}

function scan(re: RegExp): string[] {
  const root = path.resolve(__dirname, "..");
  return sourceFiles(root).filter((f) => re.test(fs.readFileSync(f, "utf8")));
}

describe("라우팅 + 검수 점검", () => {
  it("AC-1[P0]: / 는 Home(입력 화면)을 렌더하고 결과 화면은 그리지 않는다", () => {
    renderApp("/");
    expect(screen.getByLabelText(/월급/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /계산/ })).toBeDisabled();
    expect(screen.queryByTestId("result-hero")).not.toBeInTheDocument();
  });

  it("AC-1[P0]: /result 는 state의 입력으로 Result를 렌더하고 입력칸은 없다", () => {
    renderApp({ pathname: "/result", state: { input: INPUT } });
    expect(screen.getByTestId("result-hero")).toBeInTheDocument();
    expect(screen.getByTestId("result-detail")).toBeInTheDocument();
    expect(screen.queryByLabelText(/월급/)).not.toBeInTheDocument();
  });

  it("AC-1[P0]: state 없이 /result로 직접 들어오면 빈 화면 안내가 뜨고 '/'로 가는 길이 있다(크래시 없음)", () => {
    renderApp("/result");
    expect(screen.getByTestId("result-empty")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "입력하러 가기" }));
    expect(mockNavigate).toHaveBeenCalledWith("/");
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it("AC-3[P0]: 입력 → 결과 → 게이트 → 다시 계산 흐름 동안 console.error 0건", async () => {
    const home = renderApp("/");
    fireEvent.change(screen.getByLabelText(/입사일(?! 기준)/), { target: { value: "2025-03-15" } });
    fireEvent.change(screen.getByLabelText(/월급/), { target: { value: "3000000" } });
    fireEvent.change(screen.getByLabelText(/사용 연차/), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: /계산/ }));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const [target, opts] = mockNavigate.mock.calls[0];
    expect(target).toBe("/result");
    expect(opts.state.input).toMatchObject({ hireDate: "2025-03-15", monthlySalary: 3000000, usedDays: 0 });
    home.unmount();

    // 앱의 라우트 정의가 navigate 대상 '/result'를 실제로 Result로 연결하는지 같은 state로 확인
    renderApp({ pathname: target, state: opts.state });
    await waitFor(() => expect(screen.getByTestId("result-hero")).toBeInTheDocument());
    expect(screen.getByTestId("reward-gate")).toBeInTheDocument();

    mockNavigate.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /다시 계산/ }));
    expect(mockNavigate).toHaveBeenCalledWith("/");
    expect(errorSpy).toHaveBeenCalledTimes(0);
  });

  it("AC-2[P0]: 외부 링크·window.open이 소스에 0건", () => {
    expect(scan(/href\s*=\s*\{?\s*["'`]https?:/)).toEqual([]);
    expect(scan(/window\.open\s*\(/)).toEqual([]);
    expect(scan(/location\.href\s*=\s*["'`]https?:/)).toEqual([]);
  });

  it("AC-2[P0]: GA/Amplitude 등 외부 로깅 import가 소스에 0건", () => {
    expect(scan(/from\s+["'](react-ga4?|ga-4-react|@amplitude\/[^"']*|amplitude-js|mixpanel-browser|@segment\/[^"']*|firebase\/analytics)["']/)).toEqual([]);
    expect(scan(/googletagmanager|google-analytics|gtag\s*\(/)).toEqual([]);
  });

  it("AC-2[P0]: HEX 색상 하드코딩이 소스에 0건", () => {
    expect(scan(/['"`(\s:]#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/)).toEqual([]);
  });

  it("AC-4[P0]: npm run build가 성공한다", () => {
    const out = execSync("npx vite build", {
      cwd: path.resolve(__dirname, "../.."),
      encoding: "utf8",
      stdio: "pipe",
    });
    expect(out).toMatch(/built in/);
    expect(fs.existsSync(path.resolve(__dirname, "../../dist/index.html"))).toBe(true);
  }, 180000);
});
