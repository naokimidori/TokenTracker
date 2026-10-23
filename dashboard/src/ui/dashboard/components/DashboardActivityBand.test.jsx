import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardActivityBand } from "./DashboardActivityBand.jsx";

vi.mock("motion/react", () => ({
  useReducedMotion: () => false,
}));

const tools = [
  { source: "antigravity", label: "Antigravity", usage: 400 },
  { source: "codex", label: "Codex", usage: 300 },
  { source: "claude", label: "Claude", usage: 200 },
  { source: "gemini", label: "Gemini", usage: 100 },
];

describe("DashboardActivityBand active-tool icons", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("slides one icon slot every three seconds when more than three tools are active", () => {
    render(<DashboardActivityBand fleetData={tools} />);

    const track = screen.getByTestId("active-tools-icon-track");
    expect(screen.getAllByTestId("active-tools-icon")).toHaveLength(7);
    expect(track).toHaveStyle({ transform: "translate3d(-0px, 0, 0)" });

    act(() => vi.advanceTimersByTime(3000));

    expect(track).toHaveAttribute("data-slide-index", "1");
    expect(track).toHaveStyle({ transform: "translate3d(-14px, 0, 0)" });
    expect(track.style.transition).toContain("560ms");
  });

  it("loops seamlessly after the final tool and stays static for three tools", () => {
    const { rerender } = render(<DashboardActivityBand fleetData={tools} />);
    const track = screen.getByTestId("active-tools-icon-track");

    act(() => vi.advanceTimersByTime(12000));
    expect(track).toHaveAttribute("data-slide-index", "4");

    fireEvent.transitionEnd(track);
    expect(track).toHaveAttribute("data-slide-index", "0");
    expect(track.style.transition).toBe("none");

    rerender(<DashboardActivityBand fleetData={tools.slice(0, 3)} />);
    expect(screen.getAllByTestId("active-tools-icon")).toHaveLength(3);

    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByTestId("active-tools-icon-track")).toHaveAttribute("data-slide-index", "0");
  });
});
