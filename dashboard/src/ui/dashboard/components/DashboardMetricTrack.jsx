import React from "react";
import { copy } from "../../../lib/copy";
import { AnimatedMetric } from "./AnimatedMetric.jsx";

/**
 * 格式化 Token 辅助函数
 * 生产模式下严禁将合法数值（如 0）判定为 fallback；缺失值展示 —
 */
function formatMetricTokens(val, fallback, screenshotMode) {
  if (screenshotMode) return fallback;
  if (val == null) return "—";
  let num = Number(val);
  if (typeof val === "string") {
    const text = val.trim();
    if (!text) return "—";
    const unitMatch = text.match(/^([\d,]+(?:\.\d+)?)\s*([KMB])?$/i);
    if (!unitMatch) return val;
    const unitScale = { K: 1000, M: 1000000, B: 1000000000 };
    num = Number(unitMatch[1].replace(/,/g, "")) * (unitScale[unitMatch[2]?.toUpperCase()] ?? 1);
  }
  if (!Number.isFinite(num)) return "—";
  if (num === 0) return "0";
  if (num > 10000000000) return `${(num / 1000000000).toFixed(1)}B`;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}

/**
 * 格式化对话次数辅助函数
 * 修复单次对话被误渲染为 2.2K 的 bug
 */
function formatConversationsCount(val, fallback, screenshotMode) {
  if (screenshotMode) return fallback;
  if (val == null) return "—";
  if (typeof val === "string" && val.trim()) return val;
  const num = Number(val);
  if (!Number.isFinite(num)) return "—";
  if (num === 0) return "0";
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}

/**
 * DashboardMetricTrack - 仪表盘 V3 周期指标轨道
 * 三项 Token 周期指标与对话数共享一条数值基线
 * 接入真实数据流，使用 AnimatedMetric 提供平滑数值过渡
 */
export function DashboardMetricTrack({
  rollingUsage,
  conversationsValue,
  screenshotMode = false,
  loading = false,
  className = "",
}) {
  const raw7d =
    rollingUsage?.last_7d?.totals?.billable_total_tokens ??
    rollingUsage?.last_7d?.totals?.total_tokens ??
    rollingUsage?.last7d ??
    rollingUsage?.seven_days;

  const raw30d =
    rollingUsage?.last_30d?.totals?.billable_total_tokens ??
    rollingUsage?.last_30d?.totals?.total_tokens ??
    rollingUsage?.last30d ??
    rollingUsage?.thirty_days;

  const rawDailyAvg =
    rollingUsage?.last_30d?.avg_per_active_day ??
    rollingUsage?.daily_average;

  const metrics = [
    {
      id: "7d",
      label: copy("dashboard.v3.metric_7d"),
      value: formatMetricTokens(raw7d, "795.5M", screenshotMode),
    },
    {
      id: "30d",
      label: copy("dashboard.v3.metric_30d"),
      value: formatMetricTokens(raw30d, "881M", screenshotMode),
    },
    {
      id: "daily_avg",
      label: copy("dashboard.v3.metric_daily_avg"),
      value: formatMetricTokens(rawDailyAvg, "73.4M", screenshotMode),
    },
    {
      id: "conversations",
      label: copy("dashboard.v3.metric_conversations"),
      value: formatConversationsCount(
        conversationsValue,
        "2.2K",
        screenshotMode
      ),
    },
  ];

  return (
    <div
      className={`rounded-xl border border-[var(--v3-border)] bg-[var(--v3-bg-surface)] transition-colors shadow-xs overflow-hidden ${className}`}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          return (
            <div
              key={metric.id}
              className="min-w-0 px-5 py-4 sm:px-6 lg:px-7 lg:py-5"
            >
              <div className="flex min-h-5 items-center text-[12px] font-medium tracking-[0.04em] text-[var(--v3-text-secondary)]">
                {metric.label}
              </div>
              <div className="mt-2.5 min-w-0 text-[clamp(1.5rem,2.2vw,2rem)] font-semibold leading-none tracking-tight text-[var(--v3-text-primary)]">
                <AnimatedMetric value={metric.value} className="v3-display-num" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
