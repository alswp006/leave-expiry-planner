import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { mockTds, mockAppsInToss, mockNavigate } from "@/__tests__/__helpers__/mocks";
import Home from "@/pages/Home";

mockTds();
mockAppsInToss();

vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual<typeof import("react-router-dom")>("react-router-dom")),
  useNavigate: () => mockNavigate,
}));

const KEY = "leave-expiry-planner:lastInput";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-20T09:00:00+09:00"));
  mockNavigate.mockClear();
  Element.prototype.scrollIntoView = vi.fn();
});

function renderHome() {
  return render(React.createElement(MemoryRouter, null, React.createElement(Home)));
}

const hire = () => screen.getByLabelText(/입사일(?! 기준)/) as HTMLInputElement;
const salary = () => screen.getByLabelText(/월급/) as HTMLInputElement;
const used = () => screen.getByLabelText(/사용 연차/) as HTMLInputElement;
const cta = () => screen.getByRole("button", { name: /계산/ }) as HTMLButtonElement;

function fillAll() {
  fireEvent.change(hire(), { target: { value: "2025-03-15" } });
  fireEvent.change(salary(), { target: { value: "3200000" } });
  fireEvent.change(used(), { target: { value: "2.5" } });
}

describe("Home 입력 화면", () => {
  it("AC-1[P0]: 첫 화면에는 에러 필드가 없고 빈 칸이 있으면 CTA가 비활성이며 hint가 보인다", () => {
    renderHome();
    expect(hire()).not.toHaveAttribute("aria-invalid", "true");
    expect(salary()).not.toHaveAttribute("aria-invalid", "true");
    expect(used()).not.toHaveAttribute("aria-invalid", "true");
    expect(cta()).toBeDisabled();
    expect(screen.getByTestId("submit-footer-hint").textContent?.length).toBeGreaterThan(0);
  });

  it("AC-1[P0]: blur 이후에만 에러가 켜진다 (잘못된 월급 입력 후 blur)", () => {
    renderHome();
    fireEvent.change(salary(), { target: { value: "100000001" } });
    expect(salary()).not.toHaveAttribute("aria-invalid", "true");
    fireEvent.blur(salary());
    expect(salary()).toHaveAttribute("aria-invalid", "true");
    expect(within(document.body).getAllByRole("alert").length).toBeGreaterThanOrEqual(1);
  });

  it("AC-2[P0]: 입사일 2025-03-15 붙여넣기 → 2025.03.15 표시, inputMode는 numeric/numeric/decimal", () => {
    renderHome();
    fireEvent.change(hire(), { target: { value: "2025-03-15" } });
    expect(hire().value).toBe("2025.03.15");
    expect(hire()).toHaveAttribute("inputmode", "numeric");
    expect(salary()).toHaveAttribute("inputmode", "numeric");
    expect(used()).toHaveAttribute("inputmode", "decimal");
  });

  it("AC-3[P0]: 계산하면 lastInput 저장 후 /result로 state와 함께 이동한다", () => {
    renderHome();
    fillAll();
    expect(cta()).toBeEnabled();
    fireEvent.click(cta());

    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    expect(saved).toEqual({ hireDate: "2025-03-15", basis: "hire", monthlySalary: 3200000, usedDays: 2.5 });
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const [path, opts] = mockNavigate.mock.calls[0];
    expect(path).toBe("/result");
    expect(opts.state.input).toEqual(saved);
    expect(opts.state.result.today).toBe("2026-09-20");
  });

  it("AC-3[P0]: 저장된 입력이 있으면 다시 진입할 때 4개 필드가 미리 채워진다", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ hireDate: "2025-03-15", basis: "fiscal", monthlySalary: 3200000, usedDays: 2.5 }),
    );
    renderHome();
    expect(hire().value).toBe("2025.03.15");
    expect(salary().value).toBe("3,200,000");
    expect(used().value).toBe("2.5");
    expect(screen.getByRole("button", { name: /회계연도 기준/, pressed: true })).toBeInTheDocument();
    expect(cta()).toBeEnabled();
  });

  it("AC-4[P0]: lastInput이 손상되면 Empty State, 빈 필드, 입사일 기준이 선택된다", () => {
    localStorage.setItem(KEY, "{bad json");
    renderHome();
    expect(hire().value).toBe("");
    expect(salary().value).toBe("");
    expect(used().value).toBe("");
    expect(screen.getByRole("button", { name: /^입사일 기준/, pressed: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /회계연도 기준/, pressed: false })).toBeInTheDocument();
    expect(cta()).toBeDisabled();
  });

  it("AC-5[P1]: 포커스하면 scrollIntoView({block:'center'})가 불린다", () => {
    renderHome();
    const spy = Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>;
    fireEvent.focus(salary());
    expect(spy).toHaveBeenCalledWith({ block: "center" });
    fireEvent.focus(hire());
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("AC-5[P1]: 모든 Button과 TextField에 aria-label이 있다", () => {
    renderHome();
    for (const el of [hire(), salary(), used()]) {
      expect(el.getAttribute("aria-label")?.length).toBeGreaterThan(0);
    }
    const unlabeled = screen.getAllByRole("button").filter((b) => !b.getAttribute("aria-label"));
    expect(unlabeled).toHaveLength(0);
  });
});
