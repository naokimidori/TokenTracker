import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardHero } from "./DashboardHero.jsx";

describe("DashboardHero chart scale", () => {
  it("uses 90% of the bar plot for the largest value", () => {
    render(
      <DashboardHero
        summaryValue="150M"
        summaryCostValue="$1.00"
        onPeriodChange={() => {}}
        onRefresh={() => {}}
        trendRows={[
          { label: "00:00", total_tokens: 100_000_000 },
          { label: "01:00", total_tokens: 50_000_000 },
        ]}
      />,
    );

    const chart = screen.getByTestId("hero-chart");
    const largestBar = within(chart).getByRole("button", { name: "00:00 用量 100M" });
    const smallerBar = within(chart).getByRole("button", { name: "01:00 用量 50M" });

    expect(largestBar.firstElementChild).toHaveStyle({ height: "90%" });
    expect(smallerBar.firstElementChild).toHaveStyle({ height: "45%" });
  });
});
