import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardHero } from "./DashboardHero.jsx";

describe("DashboardHero provider share", () => {
  it("renders every provider inside a three-row scroll area", () => {
    render(
      <DashboardHero
        summaryValue="1B"
        summaryCostValue="$1.00"
        onPeriodChange={() => {}}
        onRefresh={() => {}}
        fleetData={[
          { label: "ANTIGRAVITY", usage: 400 },
          { label: "CODEX", usage: 300 },
          { label: "CLAUDE", usage: 200 },
          { label: "OPENCODE", usage: 100 },
        ]}
      />,
    );

    const list = screen.getByTestId("provider-share-list");
    expect(list).toHaveClass("h-[100px]", "overflow-y-auto");
    expect(list).toHaveAttribute("tabindex", "0");
    expect(list.children).toHaveLength(4);
    for (const name of ["ANTIGRAVITY", "CODEX", "CLAUDE", "OPENCODE"]) {
      expect(within(list).getByText(name)).toBeInTheDocument();
    }
  });
});
