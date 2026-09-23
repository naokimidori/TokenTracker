import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { copy } from "../../../lib/copy";
import { DashboardMetricTrack } from "./DashboardMetricTrack.jsx";

vi.mock("./AnimatedMetric.jsx", () => ({
  AnimatedMetric: ({ value, className }) => <span className={className}>{value}</span>,
}));

describe("DashboardMetricTrack", () => {
  it("uses concise metric labels without redundant captions or generic icons", () => {
    const { container } = render(
      <DashboardMetricTrack
        rollingUsage={{
          last_7d: { totals: { billable_total_tokens: 1_200_000_000 } },
          last_30d: {
            totals: { billable_total_tokens: 1_300_000_000 },
            avg_per_active_day: 96_700_000,
          },
        }}
        conversationsValue={2500}
      />
    );

    for (const key of ["7d", "30d", "daily_avg", "conversations"]) {
      expect(screen.getByText(copy(`dashboard.v3.metric_${key}`))).toBeInTheDocument();
    }
    for (const value of ["1200.0M", "1300.0M", "96.7M", "2.5K"]) {
      expect(screen.getByText(value)).toHaveClass("v3-display-num");
    }
    for (const metric of container.querySelector(".grid").children) {
      expect(metric).not.toHaveClass("border-l", "border-t");
    }
    expect(screen.queryByText("Token / Day")).not.toBeInTheDocument();
    expect(screen.queryByText("Total Tokens")).not.toBeInTheDocument();
    expect(container.querySelector("svg")).toBeNull();
  });

  it("keeps M through exactly 10B and switches to B only above it", () => {
    render(
      <DashboardMetricTrack
        rollingUsage={{
          last_7d: { totals: { billable_total_tokens: 10_000_000_000 } },
          last_30d: {
            totals: { billable_total_tokens: 10_100_000_000 },
            avg_per_active_day: "1.2B",
          },
        }}
        conversationsValue={2500}
      />
    );

    expect(screen.getByText("10000.0M")).toBeInTheDocument();
    expect(screen.getByText("10.1B")).toBeInTheDocument();
    expect(screen.getByText("1200.0M")).toBeInTheDocument();
  });
});
