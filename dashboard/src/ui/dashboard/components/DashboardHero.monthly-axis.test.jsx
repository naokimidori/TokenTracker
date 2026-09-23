import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardHero } from "./DashboardHero.jsx";

function renderMonthlyHero(months) {
  return render(
    <DashboardHero
      period="total"
      summaryValue="0"
      summaryCostValue="$0.00"
      onPeriodChange={() => {}}
      onRefresh={() => {}}
      trendRows={months.map((month, index) => ({
        month,
        total_tokens: (index + 1) * 1_000_000,
      }))}
    />,
  );
}

describe("DashboardHero monthly axis", () => {
  it("labels total-view ticks with the actual months and includes years across a boundary", () => {
    renderMonthlyHero(["2025-12", "2026-01", "2026-02", "2026-03", "2026-04"]);

    const chart = screen.getByTestId("hero-chart");
    const ticks = within(chart).getByTestId("hero-x-ticks");
    expect([...ticks.children].map((tick) => tick.textContent)).toEqual([
      "2025年12月",
      "2026年2月",
      "2026年4月",
    ]);

    const firstBar = within(chart).getByRole("button", { name: "12月 用量 1M" });
    fireEvent.mouseEnter(firstBar);
    expect(within(chart).getAllByText("2025年12月")).toHaveLength(2);
  });

  it("shows concise month labels within one year", () => {
    renderMonthlyHero(["2026-01", "2026-02", "2026-03"]);

    const ticks = within(screen.getByTestId("hero-chart")).getByTestId("hero-x-ticks");
    expect([...ticks.children].map((tick) => tick.textContent)).toEqual(["1月", "2月", "3月"]);
  });
});
