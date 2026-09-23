import React from "react";
import { Tabs } from "@base-ui/react/tabs";
import { RefreshCw } from "lucide-react";
import { copy } from "../../../lib/copy";

/**
 * PillTabs — 复刻 Appica Tabs pill 风格的本地组件
 * 基于 @base-ui/react Tabs 原语 + 纯内联 CSS
 * 效果：圆角灰底容器 + 白色滑动指示器(shadow) + 弹性缩放动画
 *
 * 支持亮色/暗色主题，通过 v3 CSS 变量 (--v3-*) 自动适配
 */

/* ─── 容器样式 (TabsList) ─── */
const listStyle = {
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  gap: "2px",
  padding: "3px",
  borderRadius: "10px",
  backgroundColor: "color-mix(in srgb, var(--v3-text-primary) 8%, transparent)",
};

/* ─── 滑动指示器样式 ─── */
const indicatorStyle = {
  position: "absolute",
  zIndex: 0,
  left: "0px",
  top: "3px",
  height: "calc(100% - 6px)",
  borderRadius: "7px",
  /* 使用 Base UI 注入的 CSS 变量做平滑滑动 */
  transform: "translateX(var(--active-tab-left, 0px))",
  width: "var(--active-tab-width, 0px)",
  transition: "transform 250ms cubic-bezier(0.25, 1, 0.5, 1), width 250ms cubic-bezier(0.25, 1, 0.5, 1)",
  /* 指示器：在 bg-surface 基础上混入白色，暗色下提亮凸起、亮色下趋近纯白 */
  backgroundColor: "color-mix(in srgb, var(--v3-bg-surface) 75%, white)",
  border: "1px solid var(--v3-border)",
  boxShadow: "0 1px 3px var(--v3-border-light)",
};

/* ─── 单个触发器样式 ─── */
const triggerBaseStyle = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "6px 14px",
  borderRadius: "6px",
  fontSize: "13px",
  fontWeight: 500,
  lineHeight: 1,
  whiteSpace: "nowrap",
  cursor: "pointer",
  border: "none",
  outline: "none",
  background: "transparent",
  color: "var(--v3-text-secondary)",
  transition: "color 200ms, transform 200ms",
  userSelect: "none",
  WebkitTapHighlightColor: "transparent",
};

/**
 * DashboardToolbar - 仪表盘 V3 周期切换与数据刷新控制器
 * 使用 @base-ui/react Tabs 原语 + 纯 CSS 内联样式复刻 Appica pill 风格
 */
export function DashboardToolbar({
  period = "day",
  onPeriodChange,
  onRefresh,
  loading = false,
  className = "",
}) {
  // 周期选项：日 / 周 / 月 / 总计
  const periodOptions = [
    { key: "day", label: copy("usage.period.day") },
    { key: "week", label: copy("usage.period.week") },
    { key: "month", label: copy("usage.period.month") },
    { key: "total", label: copy("usage.period.total") },
  ];

  const refreshText = copy("dashboard.v3.refresh");

  return (
    <div
      data-testid="dashboard-toolbar"
      className={`flex items-center justify-between w-full gap-3 ${className}`}
    >
      {/* 使用 Base UI Tabs 原语实现 Appica 风格的 pill tabs */}
      <Tabs.Root
        value={period}
        onValueChange={(val) => {
          if (val && onPeriodChange) {
            onPeriodChange(val);
          }
        }}
      >
        <Tabs.List style={listStyle}>
          {/* 滑动指示器 — Base UI 自动设置 --active-tab-left 和 --active-tab-width */}
          <Tabs.Indicator
            renderBeforeHydration
            style={indicatorStyle}
          />
          {periodOptions.map((opt) => (
            <Tabs.Tab
              key={opt.key}
              value={opt.key}
              style={{
                ...triggerBaseStyle,
                ...(period === opt.key
                  ? {
                      color: "var(--v3-text-primary)",
                      fontWeight: 600,
                    }
                  : {}),
              }}
              /* 按下缩放效果 */
              onPointerDown={(e) => {
                e.currentTarget.style.transform = "scale(0.97) translateY(0.5px)";
              }}
              onPointerUp={(e) => {
                e.currentTarget.style.transform = "";
              }}
              onPointerLeave={(e) => {
                e.currentTarget.style.transform = "";
              }}
            >
              {opt.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.Root>

      {/* 图标本身作为刷新操作；保留语义按钮供键盘和屏幕阅读器使用 */}
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        title={refreshText}
        aria-label={refreshText}
        aria-busy={loading}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-0 bg-transparent p-0 text-[var(--v3-text-secondary)] transition-colors hover:text-[var(--v3-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--v3-emerald)] disabled:cursor-default disabled:opacity-60"
      >
        <RefreshCw
          className={`h-[18px] w-[18px] shrink-0 motion-reduce:animate-none ${loading ? "animate-spin" : ""}`}
          strokeWidth={1.8}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
