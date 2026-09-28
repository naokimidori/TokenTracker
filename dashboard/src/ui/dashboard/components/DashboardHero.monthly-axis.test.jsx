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

  it("handles 24-month span with sparse usage correctly and avoids repeated 0M", () => {
    const months = [
      { month: "2024-10", total_tokens: 0 },
      { month: "2024-11", total_tokens: 0 },
      { month: "2024-12", total_tokens: 0 },
      { month: "2025-01", total_tokens: 0 },
      { month: "2025-02", total_tokens: 0 },
      { month: "2025-03", total_tokens: 0 },
      { month: "2025-04", total_tokens: 0 },
      { month: "2025-05", total_tokens: 0 },
      { month: "2025-06", total_tokens: 0 },
      { month: "2025-07", total_tokens: 0 },
      { month: "2025-08", total_tokens: 0 },
      { month: "2025-09", total_tokens: 15_000_000 },
      { month: "2025-10", total_tokens: 0 },
      { month: "2025-11", total_tokens: 45_000_000 },
      { month: "2025-12", total_tokens: 0 },
      { month: "2026-01", total_tokens: 120_000_000 },
      { month: "2026-02", total_tokens: 0 },
      { month: "2026-03", total_tokens: 800_000_000 },
      { month: "2026-04", total_tokens: 0 },
      { month: "2026-05", total_tokens: 450_000_000 },
      { month: "2026-06", total_tokens: 890_000_000 },
      { month: "2026-07", total_tokens: 720_000_000 },
      { month: "2026-08", total_tokens: 0 },
      { month: "2026-09", total_tokens: 1_291_000_000 },
    ];

    render(
      <DashboardHero
        period="total"
        summaryValue="4,089.7M"
        summaryCostValue="$2,371.02"
        onPeriodChange={() => {}}
        onRefresh={() => {}}
        trendRows={months}
      />,
    );

    const chart = screen.getByTestId("hero-chart");
    // 确保绝对不出现重复的 0M
    expect(within(chart).queryByText("0M")).toBeNull();
    // 确保底部刻度为 "0"
    expect(within(chart).getByText("0")).toBeInTheDocument();
    // 最大柱为 1291M，规整阶梯为 1500M、1000M、500M、0
    expect(within(chart).getByText("1500M")).toBeInTheDocument();
    expect(within(chart).getByText("1000M")).toBeInTheDocument();
    expect(within(chart).getByText("500M")).toBeInTheDocument();
  });
});
