import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardHero } from "./DashboardHero.jsx";

vi.mock("./AnimatedMetric.jsx", () => ({
  AnimatedMetric: ({ value, className }) => <span className={className}>{value}</span>,
}));

function renderHero(summaryTotalTokensRaw) {
  return (
    <DashboardHero
      summaryValue="1.3B"
      summaryTotalTokensRaw={summaryTotalTokensRaw}
      summaryCostValue="$1.00"
      onPeriodChange={() => {}}
      onRefresh={() => {}}
    />
  );
}

describe("DashboardHero summary", () => {
  it("keeps M through 10B and uses B only above 10B", () => {
    const { rerender } = render(renderHero(1_300_000_000));
    const summary = screen.getByTestId("hero-summary");
    expect(within(summary).getByText("1300.0M")).toBeInTheDocument();
    expect(within(summary).getByText("1300.0M")).toHaveClass("v3-display-num");
    expect(within(summary).getByText("$1.00")).toHaveClass("v3-display-num");

    rerender(renderHero(10_000_000_000));
    expect(within(summary).getByText("10000.0M")).toBeInTheDocument();

    rerender(renderHero(10_100_000_000));
    expect(within(summary).getByText("10.1B")).toBeInTheDocument();
  });

  it("keeps the card outline without internal section dividers", () => {
    render(renderHero(1_300_000_000));

    const hero = screen.getByTestId("dashboard-hero");
    expect(hero).toHaveClass("border");
    for (const section of [
      screen.getByTestId("dashboard-toolbar").parentElement,
      screen.getByTestId("hero-summary"),
      screen.getByTestId("hero-chart"),
      screen.getByTestId("hero-attribution").lastElementChild,
    ]) {
      for (const side of ["border-t", "border-r", "border-b", "border-l"]) {
        expect(section).not.toHaveClass(side);
      }
    }
  });
});
