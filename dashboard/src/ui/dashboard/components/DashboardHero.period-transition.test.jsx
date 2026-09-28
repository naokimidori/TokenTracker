import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardHero } from "./DashboardHero.jsx";

const monthRows = Array.from({ length: 28 }, (_, index) => ({
  day: `2026-09-${String(index + 1).padStart(2, "0")}`,
  total_tokens: (index + 1) * 1_000_000,
}));
const weekRows = monthRows.slice(-7);
const monthlyRows = [
  { month: "2026-08", total_tokens: 80_000_000 },
  { month: "2026-09", total_tokens: 120_000_000 },
];

describe("DashboardHero period transitions", () => {
  it("keeps the previous chart until the selected grain has finished loading", async () => {
    const common = {
      summaryValue: "120M",
      summaryCostValue: "$1.00",
      onPeriodChange: () => {},
      onRefresh: () => {},
    };
    const { rerender } = render(
      <DashboardHero {...common} period="month" trendRows={monthRows}
        usageFrom="2026-09-01" usageTo="2026-09-28" />,
    );

    expect(screen.getByText("每日 Token 使用量")).toBeInTheDocument();
    expect(within(screen.getByTestId("hero-chart-scene")).getAllByRole("button")).toHaveLength(28);

    // The period prop changes before its new API rows arrive. The old month
    // rows must not be painted as a seven-day chart in that intermediate frame.
    rerender(
      <DashboardHero {...common} period="week" trendRows={monthRows}
        usageFrom="2026-09-22" usageTo="2026-09-28" chartLoading={false} />,
    );
    expect(screen.getByText("每日 Token 使用量")).toBeInTheDocument();
    expect(within(screen.getByTestId("hero-chart-scene")).getAllByRole("button")).toHaveLength(28);

    rerender(
      <DashboardHero {...common} period="week" trendRows={monthRows}
        usageFrom="2026-09-22" usageTo="2026-09-28" chartLoading />,
    );
    rerender(
      <DashboardHero {...common} period="week" trendRows={weekRows}
        usageFrom="2026-09-22" usageTo="2026-09-28" chartLoading={false} />,
    );
    await waitFor(() => {
      expect(screen.getByText("7 日 Token 使用量")).toBeInTheDocument();
      const scenes = screen.getAllByTestId("hero-chart-scene");
      expect(within(scenes.at(-1)).getAllByRole("button")).toHaveLength(7);
    });

    rerender(
      <DashboardHero {...common} period="total" trendRows={weekRows}
        usageFrom="2026-09-22" usageTo="2026-09-28" chartLoading />,
    );
    expect(screen.getByText("7 日 Token 使用量")).toBeInTheDocument();

    rerender(
      <DashboardHero {...common} period="total" trendRows={monthlyRows}
        usageFrom="2026-08-01" usageTo="2026-09-28" chartLoading={false} />,
    );
    await waitFor(() => {
      expect(screen.getByText("月度使用趋势")).toBeInTheDocument();
      const scenes = screen.getAllByTestId("hero-chart-scene");
      expect(within(scenes.at(-1)).getAllByRole("button")).toHaveLength(2);
    });
  });
});
