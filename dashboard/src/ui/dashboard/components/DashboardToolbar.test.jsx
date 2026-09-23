import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { copy } from "../../../lib/copy";
import { DashboardToolbar } from "./DashboardToolbar.jsx";

describe("DashboardToolbar refresh control", () => {
  it("uses an icon-only control that spins during refresh", () => {
    const onRefresh = vi.fn();
    const { rerender } = render(<DashboardToolbar onRefresh={onRefresh} />);
    const refresh = screen.getByRole("button", { name: copy("dashboard.v3.refresh") });

    expect(refresh.textContent).toBe("");
    expect(refresh.querySelector("svg")).toBeInTheDocument();
    fireEvent.click(refresh);
    expect(onRefresh).toHaveBeenCalledOnce();

    rerender(<DashboardToolbar onRefresh={onRefresh} loading />);
    expect(refresh).toBeDisabled();
    expect(refresh).toHaveAttribute("aria-busy", "true");
    expect(refresh.querySelector("svg")).toHaveClass("animate-spin");
  });
});
