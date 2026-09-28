import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardHero } from "./DashboardHero.jsx";

describe("DashboardHero chart scale", () => {
  it("uses nice rounded scale for bar plots and aligns ticks", () => {
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

    // 100M 在 120M 规整刻度下高度占比为 100 / 120 ≈ 83.33%
    expect(largestBar.firstElementChild).toHaveStyle({ height: "83.33333333333334%" });
    expect(smallerBar.firstElementChild).toHaveStyle({ height: "41.66666666666667%" });

    // 验证 Y 轴 4 个刻度整齐递减，绝不出现重复
    expect(within(chart).getByText("120M")).toBeInTheDocument();
    expect(within(chart).getByText("80M")).toBeInTheDocument();
    expect(within(chart).getByText("40M")).toBeInTheDocument();
    expect(within(chart).getByText("0")).toBeInTheDocument();
  });

  it("produces clean ticks without repeated 0M when most months are 0", () => {
    // 仿真 24 个月跨度，大量月份为 0 的场景
    const sparseMonths = Array.from({ length: 24 }, (_, idx) => ({
      month: `2025-${String(idx + 1).padStart(2, "0")}`,
      total_tokens: idx === 23 ? 1_345_087_187 : 0,
    }));

    render(
      <DashboardHero
        period="total"
        summaryValue="1,345.1M"
        summaryCostValue="$500.00"
        onPeriodChange={() => {}}
        onRefresh={() => {}}
        trendRows={sparseMonths}
      />,
    );

    const chart = screen.getByTestId("hero-chart");
    // 确保绝对不出现 "0M" 文本
    expect(within(chart).queryByText("0M")).toBeNull();
    // 确保底部为干净的 "0"
    expect(within(chart).getByText("0")).toBeInTheDocument();
    // 1345.1M 向上规整至 1800M 刻度，步长 600M
    expect(within(chart).getByText("1800M")).toBeInTheDocument();
    expect(within(chart).getByText("1200M")).toBeInTheDocument();
    expect(within(chart).getByText("600M")).toBeInTheDocument();
  });

  it("trims daily view: starts 1 hour before first activity and keeps 2 hours buffer on right", () => {
    // 仿真用户场景：00:00 ~ 07:00 无使用量，08:00 开始活动，10:00 结束活动，后续为未来/无用量时间
    const dayRows = Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, "0")}:00`,
      total_tokens: i === 8 ? 1_000_000 : i === 9 ? 65_000_000 : i === 10 ? 10_000_000 : 0,
      future: i > 10,
    }));

    render(
      <DashboardHero
        period="day"
        summaryValue="76.0M"
        summaryCostValue="$12.00"
        onPeriodChange={() => {}}
        onRefresh={() => {}}
        trendRows={dayRows}
      />,
    );

    const chart = screen.getByTestId("hero-chart");
    const xTicks = within(chart).getByTestId("hero-x-ticks");

    // 1. 左侧起始：08:00 首次活动前推 1 小时为 07:00，首根柱子与首刻度均为 07:00
    expect(xTicks.firstElementChild).toHaveTextContent("07:00");
    expect(within(xTicks).queryByText("00:00")).toBeNull();
    expect(within(xTicks).queryByText("06:00")).toBeNull();

    // 2. 右侧截止：10:00 结束活动后保留 2 个小时刻度，截止至 12:00
    expect(xTicks.lastElementChild).toHaveTextContent("12:00");
    expect(within(xTicks).queryByText("13:00")).toBeNull();
    expect(within(xTicks).queryByText("23:00")).toBeNull();

    // 3. 柱子列表：包含 07:00 至 12:00 共 6 根柱子
    const buttons = within(chart).getAllByRole("button");
    expect(buttons).toHaveLength(6);
    expect(buttons[0].getAttribute("aria-label")).toContain("07:00");
    expect(buttons[5].getAttribute("aria-label")).toContain("12:00");
  });

  it("handles boundary cases: midnight activity and evening end of day cap", () => {
    // 仿真场景：00:00 产生活动（无法前推至负数，停留在 00:00），活动持续到 22:00（+2小时上限到 23:00 直到今日结束）
    const dayRows = Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, "0")}:00`,
      total_tokens: i === 0 || i === 22 ? 5_000_000 : 0,
      future: i > 22,
    }));

    render(
      <DashboardHero
        period="day"
        summaryValue="10.0M"
        summaryCostValue="$2.00"
        onPeriodChange={() => {}}
        onRefresh={() => {}}
        trendRows={dayRows}
      />,
    );

    const chart = screen.getByTestId("hero-chart");
    const xTicks = within(chart).getByTestId("hero-x-ticks");

    // 左侧起始：00:00 活动前推下限为 00:00
    expect(xTicks.firstElementChild).toHaveTextContent("00:00");

    // 右侧截止：22:00 活动往后空余 2 小时直到今日结束，上限锁定在 23:00
    expect(xTicks.lastElementChild).toHaveTextContent("23:00");

    // 柱子列表：从 00:00 到 23:00 共 24 根
    const buttons = within(chart).getAllByRole("button");
    expect(buttons).toHaveLength(24);
  });
});
