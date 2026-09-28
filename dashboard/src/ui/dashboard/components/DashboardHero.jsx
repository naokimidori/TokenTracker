import React, { useEffect, useMemo, useRef, useState } from "react";
import { Info, ArrowUp, ArrowDown, ChevronRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { copy } from "../../../lib/copy";
import { formatUsdCurrency } from "../../../lib/format";
import { AnimatedMetric } from "./AnimatedMetric.jsx";
import { DashboardToolbar } from "./DashboardToolbar.jsx";
import { ModelRankingModal } from "./ModelRankingModal.jsx";

/**
 * 设计稿默认基准数据（仅在显式 screenshotMode 下启用）
 */
const BASELINE_HOURLY_DATA = [
  { hour: "00:00", antigravity: 0.1, codex: 0.05, total: 0.15 },
  { hour: "01:00", antigravity: 1.8, codex: 0.4, total: 2.2 },
  { hour: "02:00", antigravity: 4.2, codex: 0.8, total: 5.0 },
  { hour: "03:00", antigravity: 6.9, codex: 1.5, total: 8.4 },
  { hour: "04:00", antigravity: 4.1, codex: 1.2, total: 5.3 },
  { hour: "05:00", antigravity: 3.8, codex: 1.1, total: 4.9 },
  { hour: "06:00", antigravity: 2.1, codex: 0.7, total: 2.8 },
  { hour: "07:00", antigravity: 4.8, codex: 1.2, total: 6.0 },
  { hour: "08:00", antigravity: 7.9, codex: 2.6, total: 10.5 },
  { hour: "09:00", antigravity: 10.2, codex: 3.1, total: 13.3 },
  { hour: "10:00", antigravity: 12.1, codex: 4.2, total: 16.3 },
  { hour: "11:00", antigravity: 9.6, codex: 3.0, total: 12.6 },
  { hour: "12:00", antigravity: 5.8, codex: 2.2, total: 8.0 },
  { hour: "13:00", antigravity: 3.4, codex: 1.5, total: 4.9 },
  { hour: "14:00", antigravity: 2.0, codex: 0.9, total: 2.9 },
  { hour: "15:00", antigravity: 0.8, codex: 0.3, total: 1.1 },
  { hour: "16:00", antigravity: 1.9, codex: 0.6, total: 2.5 },
  { hour: "17:00", antigravity: 3.7, codex: 1.2, total: 4.9 },
  { hour: "18:00", antigravity: 7.5, codex: 2.8, total: 10.3 },
  { hour: "19:00", antigravity: 10.5, codex: 3.8, total: 14.3 },
  { hour: "20:00", antigravity: 12.8, codex: 4.5, total: 17.3 },
  { hour: "21:00", antigravity: 15.2, codex: 5.2, total: 20.4 },
  { hour: "22:00", antigravity: 18.4, codex: 6.1, total: 24.5 },
  { hour: "23:00", antigravity: 6.2, codex: 1.8, total: 8.0 },
];
const EMPTY_TREND_ROWS = [];

function chartRowsMatchPeriod(rows, period, from, to) {
  if (!Array.isArray(rows) || rows.length === 0) return false;
  if (period === "day") {
    return rows.some((row) => row?.hour && (!to || String(row.hour).slice(0, 10) === to));
  }
  if (period === "total") return rows.some((row) => row?.month);
  if (period === "week" || period === "month") {
    const days = rows.map((row) => row?.day).filter(Boolean).sort();
    return days.length > 0 && (!from || days[0] === from) && (!to || days[days.length - 1] === to);
  }
  return true;
}

/**
 * 格式化 Token 简写辅助函数
 */
function formatTokenMetric(val) {
  if (val == null) return "0";
  const num = Number(val);
  if (!Number.isFinite(num) || num <= 0) return "0";
  if (num > 10000000000) return `${(num / 1000000000).toFixed(1)}B`;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}

/**
 * 规整化图表 Y 轴刻度及标签辅助函数
 * 固定输出 4 个等距规整刻度，自适应 K / M / B 量纲，杜绝重复 0M
 */
function calculateChartScale(maxValM) {
  if (!maxValM || maxValM <= 0) {
    return {
      chartMaxY: 12,
      yTicks: ["12M", "8M", "4M", "0"],
    };
  }

  // 预留约 12% 呼吸空间，避免最高柱紧贴图表顶部
  const rawTarget = maxValM / 0.88;
  const rawStep = rawTarget / 3;

  const exponent = Math.floor(Math.log10(rawStep));
  const magnitude = Math.pow(10, exponent);
  const fraction = rawStep / magnitude;

  // 选用工整阶梯 (1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10)
  let niceFraction = 10;
  const stepLadders = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8];
  for (const ladder of stepLadders) {
    if (fraction <= ladder) {
      niceFraction = ladder;
      break;
    }
  }

  let step = niceFraction * magnitude;
  let maxY = step * 3;

  // 确保规整后的 maxY 大于等于实际最大值（保留至少 5% 顶部间距）
  while (maxY < maxValM * 1.05) {
    step = Number((step * 1.2).toFixed(4));
    maxY = step * 3;
  }

  // 格式化刻度标签函数，自适应量纲，杜绝重复 0M
  function formatTick(val, max) {
    if (val <= 0.0001) return "0";
    if (max < 0.1) {
      return `${Math.round(val * 1000)}K`;
    }
    if (max < 1) {
      return `${val.toFixed(1).replace(/\.0$/, "")}M`;
    }
    const rounded = Math.round(val);
    if (Math.abs(val - rounded) < 0.05) {
      return `${rounded}M`;
    }
    return `${val.toFixed(1)}M`;
  }

  const rawTicks = [maxY, step * 2, step, 0];
  const ticks = rawTicks.map((v) => formatTick(v, maxY));

  // 防重兜底校验：若四舍五入后相邻刻度文本相同，增加 1 位精度消除重复
  [0, 1, 2].forEach((idx) => {
    if (ticks[idx] === ticks[idx + 1]) {
      ticks[idx] = `${rawTicks[idx].toFixed(1)}M`;
    }
  });

  return { chartMaxY: maxY, yTicks: ticks };
}

/**
 * 为日统计视图生成整齐的 X 轴刻度标签
 * 确保起始刻度精确对齐最早产生活动的时间（首根柱子），末尾刻度对齐最后一根柱子，
 * 中间均匀分布整齐的整点时间（例如间隔 2 / 3 / 4 小时），总数保持在 4 ~ 6 个。
 */
function generateHourlyTicks(hourlyList) {
  if (!Array.isArray(hourlyList) || hourlyList.length === 0) return [];
  const len = hourlyList.length;
  // 6 根或以下柱子时，刻度直接对应每根柱子，整齐清晰
  if (len <= 6) {
    return hourlyList.map((d) => d.hour);
  }

  // 目标采样步长：根据剩余小时数自适应选择 2、3 或 4 小时
  let step = 4;
  if (len <= 10) step = 2;
  else if (len <= 16) step = 3;
  else step = 4;

  const tickIndices = [0];
  const middleIndices = Array.from({ length: len - 2 }, (_, i) => i + 1);
  for (const i of middleIndices) {
    const hourNum = parseInt(hourlyList[i].hour, 10);
    if (!Number.isNaN(hourNum) && hourNum % step === 0) {
      const lastIdx = tickIndices[tickIndices.length - 1];
      if (i - lastIdx >= Math.max(2, step - 1) && len - 1 - i >= 1) {
        tickIndices.push(i);
      }
    }
  }

  const lastTickIdx = tickIndices[tickIndices.length - 1];
  if (lastTickIdx !== len - 1) {
    if (len - 1 - lastTickIdx <= 1 && tickIndices.length > 2) {
      tickIndices[tickIndices.length - 1] = len - 1;
    } else {
      tickIndices.push(len - 1);
    }
  }

  return tickIndices.map((idx) => hourlyList[idx].hour);
}

/**
 * 辅助函数：根据模型名或来源推断主力提供商归属
 */
function resolveProviderKey(str) {
  const s = String(str || "").toLowerCase();
  if (s.includes("gemini") || s.includes("antigravity")) return "antigravity";
  if (s.includes("gpt") || s.includes("codex") || s.includes("openai") || s.includes("o1") || s.includes("o3")) return "codex";
  if (s.includes("claude") || s.includes("anthropic")) return "claude";
  return "other";
}

/**
 * 格式化日期字符串为 MM.DD 格式
 */
function formatToMmDd(dateStr) {
  if (!dateStr) return "";
  const str = String(dateStr).trim();
  const match = str.match(/(?:^|\D)(\d{1,2})[-/.](\d{1,2})(?:\D|$)/);
  if (match) {
    return `${String(match[1]).padStart(2, "0")}.${String(match[2]).padStart(2, "0")}`;
  }
  return str;
}

/**
 * 格式化单日日期为中文
 */
function formatDateLabel(dateStr) {
  if (!dateStr || typeof dateStr !== "string") {
    const now = new Date();
    return `${now.getMonth() + 1} 月 ${now.getDate()} 日`;
  }
  const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return dateStr;
  return `${Number(match[2])} 月 ${Number(match[3])} 日`;
}

/**
 * 格式化月份标签为中文
 */
function formatMonthLabel(dateStr) {
  if (!dateStr || typeof dateStr !== "string") {
    const now = new Date();
    return `${now.getFullYear()} 年 ${now.getMonth() + 1} 月`;
  }
  const match = dateStr.match(/^(\d{4})-(\d{1,2})/);
  if (!match) return dateStr;
  return `${match[1]} 年 ${Number(match[2])} 月`;
}

function parseMonthKey(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/);
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year: Number(match[1]), month };
}

function formatMonthAxisLabel(value, includeYear = false) {
  const parsed = parseMonthKey(value);
  if (!parsed) return String(value || "");
  return `${includeYear ? `${parsed.year}年` : ""}${parsed.month}月`;
}

/**
 * DashboardHero - 仪表盘 V3 核心 Hero 分析带
 * 采用三列连续分析面布局（约 24% / 50% / 26% 比例）
 * 全面去除生产 Mock 假数据，按真实周期与数据源动态呈现
 */
export function DashboardHero({
  summaryValue,
  summaryTotalTokensRaw,
  summaryCostValue,
  onCostInfo,
  trendRows = EMPTY_TREND_ROWS,
  chartLoading = false,
  fleetData = [],
  topModels = [],
  allModels = [],
  period = "day",
  onPeriodChange,
  onRefresh,
  usageFrom,
  usageTo,
  dailyBreakdownRows = [],
  screenshotMode = false,
  loading = false,
  providersLoading = false,
  className = "",
}) {
  // 当前柱图悬停选中项（生产模式下默认不常驻，仅在 hover 或触屏点击时激活）
  const [hoveredIndex, setHoveredIndex] = useState(screenshotMode ? 22 : null);
  const prefersReducedMotion = useReducedMotion();

  // 全量模型详情弹窗显隐状态与数据源
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const modalModels = useMemo(() => {
    return Array.isArray(allModels) && allModels.length > 0 ? allModels : topModels;
  }, [allModels, topModels]);

  // 解析并构建真实趋势数据（含提供商分段堆叠）
  const hourlyData = useMemo(() => {
    if (screenshotMode) {
      return BASELINE_HOURLY_DATA.map((item) => ({
        ...item,
        rawDate: "",
        fullDateLabel: `今日 ${item.hour}`,
        segments: [
          {
            name: "ANTIGRAVITY",
            tokens: item.antigravity * 1000000,
            mTokens: item.antigravity,
            heightPct: item.total > 0 ? (item.antigravity / item.total) * 100 : 0,
            barClass: "bg-[var(--v3-emerald)]",
            dotClass: "bg-[var(--v3-emerald)]",
          },
          {
            name: "CODEX",
            tokens: item.codex * 1000000,
            mTokens: item.codex,
            heightPct: item.total > 0 ? (item.codex / item.total) * 100 : 0,
            barClass: "bg-[var(--v3-blue)]",
            dotClass: "bg-[var(--v3-blue)]",
          },
        ],
      }));
    }

    if (Array.isArray(trendRows) && trendRows.length > 0) {
      const mappedRows = trendRows.map((r, i) => {
        const totalRaw = Number(r.total_tokens ?? r.total ?? 0);
        const mTotal = Number(((totalRaw / 1000000) || 0).toFixed(2));
        const rawDate = r.month || r.day || r.hour_start || r.hour || r.label || "";

        let hour = period === "total"
          ? formatMonthAxisLabel(rawDate)
          : r.label || "";
        if (!hour) {
          if (period === "week" || period === "month") {
            hour = formatToMmDd(r.day || rawDate) || `D${i + 1}`;
          } else if (r.hour && r.hour.includes("T")) {
            hour = r.hour.slice(11, 16);
          } else {
            hour = `${String(i).padStart(2, "0")}:00`;
          }
        }

        // 完整日期标签用于 Tooltip
        let fullDateLabel = period === "total"
          ? formatMonthAxisLabel(rawDate, true)
          : hour;
        if (rawDate && (period === "week" || period === "month")) {
          fullDateLabel = String(rawDate).slice(0, 10);
        }

        // 提取各提供商真实用量
        const providerMap = new Map();
        if (r.sources && typeof r.sources === "object") {
          for (const [src, tokens] of Object.entries(r.sources)) {
            const normKey = resolveProviderKey(src);
            const val = Number(tokens) || 0;
            if (val > 0) providerMap.set(normKey, (providerMap.get(normKey) || 0) + val);
          }
        }
        if (providerMap.size === 0 && r.models && typeof r.models === "object") {
          for (const [model, tokens] of Object.entries(r.models)) {
            const normKey = resolveProviderKey(model);
            const val = Number(tokens) || 0;
            if (val > 0) providerMap.set(normKey, (providerMap.get(normKey) || 0) + val);
          }
        }

        const agTokens = providerMap.get("antigravity") || 0;
        const codexTokens = providerMap.get("codex") || 0;
        const knownSum = agTokens + codexTokens;
        const otherTokens = totalRaw > knownSum ? totalRaw - knownSum : 0;

        const segments = [];
        if (totalRaw > 0) {
          // 第一主力：ANTIGRAVITY 翡翠绿
          if (agTokens > 0) {
            segments.push({
              name: "ANTIGRAVITY",
              tokens: agTokens,
              mTokens: Number(((agTokens / 1000000) || 0).toFixed(2)),
              heightPct: (agTokens / totalRaw) * 100,
              barClass: "bg-[var(--v3-emerald)]",
              dotClass: "bg-[var(--v3-emerald)]",
            });
          }
          // 第二主力：CODEX 科技蓝
          if (codexTokens > 0) {
            segments.push({
              name: "CODEX",
              tokens: codexTokens,
              mTokens: Number(((codexTokens / 1000000) || 0).toFixed(2)),
              heightPct: (codexTokens / totalRaw) * 100,
              barClass: "bg-[var(--v3-blue)]",
              dotClass: "bg-[var(--v3-blue)]",
            });
          }
          // 其他提供商分段
          if (otherTokens > 0) {
            segments.push({
              name: "OTHER",
              tokens: otherTokens,
              mTokens: Number(((otherTokens / 1000000) || 0).toFixed(2)),
              heightPct: (otherTokens / totalRaw) * 100,
              barClass: "bg-[var(--v3-text-secondary)]/50",
              dotClass: "bg-[var(--v3-text-secondary)]",
            });
          }
        }

        // 单系列回退保障（若未能拆分提供商但有总量）
        if (segments.length === 0 && totalRaw > 0) {
          segments.push({
            name: "ANTIGRAVITY",
            tokens: totalRaw,
            mTokens: mTotal,
            heightPct: 100,
            barClass: "bg-[var(--v3-emerald)]",
            dotClass: "bg-[var(--v3-emerald)]",
          });
        }

        return {
          hour,
          rawDate,
          fullDateLabel,
          total: mTotal,
          rawTotal: totalRaw,
          future: r.future,
          segments,
          antigravity: Number(((agTokens / 1000000) || 0).toFixed(2)),
          codex: Number(((codexTokens / 1000000) || 0).toFixed(2)),
        };
      });

      if (period === "day") {
        // 1. 查找当天所有产生活动（Token 消耗 > 0）的小时索引
        const activeIndices = mappedRows
          .map((item, idx) => (item.total > 0 || item.rawTotal > 0 ? idx : -1))
          .filter((idx) => idx !== -1);
        const firstActiveIdx = activeIndices.length > 0 ? activeIndices[0] : -1;
        const lastActiveIdx = activeIndices.length > 0 ? activeIndices[activeIndices.length - 1] : -1;

        // 2. 左侧起始：首次活动时间再往前推 1 小时（预留 1 小时呼吸缓冲）
        let startIdx = 0;
        if (firstActiveIdx > 0) {
          startIdx = Math.max(0, firstActiveIdx - 1);
        }

        // 3. 右侧截止：空余 2 个小时的刻度，直到今日结束（最多至 23:00）
        const elapsedIndices = mappedRows
          .map((item, idx) => (item.future === false ? idx : -1))
          .filter((idx) => idx !== -1);
        const lastElapsedIdx = elapsedIndices.length > 0 ? elapsedIndices[elapsedIndices.length - 1] : -1;

        let baseHour = -1;
        if (lastElapsedIdx !== -1) {
          baseHour = Math.max(lastElapsedIdx, lastActiveIdx);
        } else if (lastActiveIdx !== -1) {
          baseHour = lastActiveIdx;
        } else {
          baseHour = new Date().getHours();
        }

        const targetEndHour = Math.min(mappedRows.length - 1, Math.min(23, baseHour + 2));
        const endIdx = Math.max(startIdx, targetEndHour);

        return mappedRows.slice(startIdx, endIdx + 1);
      }

      return mappedRows;
    }

    // 若无数据，生成对应周期的 0 值骨架柱，保持网格结构平稳
    const count = period === "day" ? 24 : period === "week" ? 7 : 30;
    return Array.from({ length: count }, (_, i) => ({
      hour: period === "day" ? `${String(i).padStart(2, "0")}:00` : `T${i + 1}`,
      rawDate: "",
      fullDateLabel: "",
      total: 0,
      rawTotal: 0,
      segments: [],
      antigravity: 0,
      codex: 0,
    }));
  }, [trendRows, screenshotMode, period]);

  // 柱图整体最大值计算（统一缩放刻度，单位：M）
  const maxBarValue = useMemo(() => {
    if (hourlyData.length === 0) return 0;
    const maxVal = Math.max(...hourlyData.map((d) => d.total));
    return maxVal > 0 ? maxVal : 0;
  }, [hourlyData]);

  // 计算规整化 Y 轴最大值与 4 个等距刻度标签
  const { chartMaxY, yTicks } = useMemo(
    () => calculateChartScale(maxBarValue),
    [maxBarValue],
  );

  // 供应商占比数据处理（生产模式完全基于真实 fleetData 动态计算）
  const providerStats = useMemo(() => {
    if (screenshotMode) {
      return [
        { name: "ANTIGRAVITY", percent: "79.48%", percentNum: 79.48, barClass: "bg-[var(--v3-emerald)]" },
        { name: "CODEX", percent: "20.52%", percentNum: 20.52, barClass: "bg-[var(--v3-blue)]" },
      ];
    }

    if (Array.isArray(fleetData) && fleetData.length > 0) {
      const totalTokens = fleetData.reduce((acc, p) => acc + (Number(p.usage ?? p.totalTokens) || 0), 0);
      if (totalTokens > 0) {
        return fleetData.map((p, idx) => {
          const usage = Number(p.usage ?? p.totalTokens) || 0;
          let percentNum = 0;
          if (p.totalPercent != null && !Number.isNaN(Number(p.totalPercent))) {
            percentNum = Number(p.totalPercent);
          } else {
            percentNum = Number(((usage / totalTokens) * 100).toFixed(1));
          }
          const barClass = idx === 0
            ? "bg-[var(--v3-emerald)]"
            : idx === 1
            ? "bg-[var(--v3-blue)]"
            : "bg-[var(--v3-text-secondary)]";

          return {
            name: (p.label || p.source || "UNKNOWN").toUpperCase(),
            percent: `${percentNum.toFixed(1)}%`,
            percentNum,
            barClass,
          };
        });
      }
    }

    return [];
  }, [fleetData, screenshotMode]);

  // 模型排行数据处理（生产模式完全基于真实 topModels 动态计算）
  const modelStats = useMemo(() => {
    if (screenshotMode) {
      return [
        { rank: 1, name: "gemini-3.8-flash", percent: "77.8%", percentNum: 77.8 },
        { rank: 2, name: "gpt-5.6-sol", percent: "19.1%", percentNum: 19.1 },
        { rank: 3, name: "claude-opus-4-6", percent: "1.7%", percentNum: 1.7 },
      ];
    }

    if (Array.isArray(topModels) && topModels.length > 0) {
      const top3 = topModels.slice(0, 3);
      const totalTokens = topModels.reduce(
        (acc, m) => acc + (Number(m.tokens ?? m.usage) || 0),
        0
      );

      return top3.map((m, idx) => {
        let percentNum = 0;
        if (m.percent != null && !Number.isNaN(Number(m.percent))) {
          percentNum = Number(m.percent);
        } else if (totalTokens > 0) {
          const itemTokens = Number(m.tokens ?? m.usage) || 0;
          percentNum = Number(((itemTokens / totalTokens) * 100).toFixed(1));
        }

        return {
          rank: idx + 1,
          name: m.name || m.model || "unknown",
          percent: `${percentNum.toFixed(1)}%`,
          percentNum,
        };
      });
    }

    return [];
  }, [topModels, screenshotMode]);

  // 标题与文案跟随周期联动
  const { dateDisplayLabel, comparisonLabel, comparisonValue, comparisonDirection, trendTitle } = useMemo(() => {
    // 1. 周期趋势标题
    let title = copy("dashboard.v3.hours_trend");
    if (period === "week") title = "7 日 Token 使用量";
    else if (period === "month") title = "每日 Token 使用量";
    else if (period === "total") title = "月度使用趋势";
    else if (period === "custom") title = "区间 Token 使用量";

    // 2. 主日期显示
    let dateStr = "";
    if (period === "day") {
      dateStr = formatDateLabel(usageTo || usageFrom);
    } else if (period === "week") {
      dateStr = usageFrom && usageTo
        ? `${formatDateLabel(usageFrom)} — ${formatDateLabel(usageTo)}`
        : "最近 7 天";
    } else if (period === "month") {
      dateStr = formatMonthLabel(usageTo || usageFrom);
    } else if (period === "total") {
      dateStr = "全部周期";
    } else if (period === "custom") {
      dateStr = usageFrom && usageTo ? `${usageFrom} — ${usageTo}` : "自定义区间";
    }

    // 3. 对比基准与变化率
    let compLabel = copy("dashboard.v3.vs_yesterday");
    if (period === "week") compLabel = "较上周";
    else if (period === "month") compLabel = "较上月";
    else if (period === "total") compLabel = "";
    else if (period === "custom") compLabel = "较前一周期";

    let compVal = "—";
    let compDir = "neutral";

    if (screenshotMode) {
      compVal = "+6.4%";
      compDir = "up";
    } else {
      // 提取单行 Token 消耗辅助函数
      const getRowTokens = (row) =>
        Number(row?.total_tokens ?? row?.billable_total_tokens ?? row?.total ?? 0);

      // 将每日数据行严格按日期降序排列（最新日期在最前，避免受表格排序影响）
      const sortedDaily = Array.isArray(dailyBreakdownRows)
        ? [...dailyBreakdownRows]
            .filter((r) => Boolean(r?.day && !r?.future && !r?.missing))
            .sort((a, b) => String(b.day).localeCompare(String(a.day)))
        : [];

      // 增长率计算辅助函数
      const calcDiff = (cur, prev) => {
        if (prev > 0) {
          const diff = ((cur - prev) / prev) * 100;
          if (diff > 0) return { val: `+${diff.toFixed(1)}%`, dir: "up" };
          if (diff < 0) return { val: `${diff.toFixed(1)}%`, dir: "down" };
          return { val: "0.0%", dir: "neutral" };
        }
        if (cur > 0) return { val: "+100%", dir: "up" };
        return { val: "0.0%", dir: "neutral" };
      };

      if (period === "day" && sortedDaily.length >= 2) {
        // 1. 日视图：今日与昨日对比
        const todayTotal = getRowTokens(sortedDaily[0]);
        const yesterdayTotal = getRowTokens(sortedDaily[1]);
        const res = calcDiff(todayTotal, yesterdayTotal);
        compVal = res.val;
        compDir = res.dir;
      } else if (period === "week" && sortedDaily.length >= 4) {
        // 2. 周视图：最近 7 天对比前一个 7 天周期（按日均对比，兼容数据不满 14 天的场景）
        const curWeekRows = sortedDaily.slice(0, 7);
        const prevWeekRows = sortedDaily.slice(7, 14);

        if (curWeekRows.length > 0 && prevWeekRows.length > 0) {
          const curWeekTotal = curWeekRows.reduce((acc, r) => acc + getRowTokens(r), 0);
          const prevWeekTotal = prevWeekRows.reduce((acc, r) => acc + getRowTokens(r), 0);
          const curDaily = curWeekTotal / curWeekRows.length;
          const prevDaily = prevWeekTotal / prevWeekRows.length;
          const res = calcDiff(curDaily, prevDaily);
          compVal = res.val;
          compDir = res.dir;
        }
      } else if (period === "month" && sortedDaily.length > 0) {
        // 3. 月视图：当月（至今日）对比上月同等历史天数（按日均对比）
        const latestDay = String(sortedDaily[0].day || "");
        const curMonthKey = latestDay.slice(0, 7); // 如 "2026-09"

        const curMonthRows = sortedDaily.filter((r) => String(r.day).startsWith(curMonthKey));
        const prevMonthRows = sortedDaily.filter((r) => !String(r.day).startsWith(curMonthKey));

        if (curMonthRows.length > 0 && prevMonthRows.length > 0) {
          const curMonthTotal = curMonthRows.reduce((acc, r) => acc + getRowTokens(r), 0);
          const prevMonthTotal = prevMonthRows.reduce((acc, r) => acc + getRowTokens(r), 0);
          const curDaily = curMonthTotal / curMonthRows.length;
          const prevDaily = prevMonthTotal / prevMonthRows.length;
          const res = calcDiff(curDaily, prevDaily);
          compVal = res.val;
          compDir = res.dir;
        } else if (sortedDaily.length >= 10) {
          // 若全量数据均在一个自然月内，采用前后半程等长对比
          const half = Math.floor(sortedDaily.length / 2);
          const curHalf = sortedDaily.slice(0, half).reduce((acc, r) => acc + getRowTokens(r), 0);
          const prevHalf = sortedDaily.slice(half, half * 2).reduce((acc, r) => acc + getRowTokens(r), 0);
          const res = calcDiff(curHalf / half, prevHalf / half);
          compVal = res.val;
          compDir = res.dir;
        }
      }
    }

    return {
      dateDisplayLabel: dateStr,
      comparisonLabel: compLabel,
      comparisonValue: compVal,
      comparisonDirection: compDir,
      trendTitle: title,
    };
  }, [period, usageFrom, usageTo, dailyBreakdownRows, screenshotMode]);

  const tokenTotalTitle = copy("dashboard.v3.token_total");
  const providerShareTitle = copy("dashboard.v3.provider_share");
  const modelRankingTitle = copy("dashboard.v3.model_ranking");
  const emptyDataLabel = copy("trend.monitor.empty");

  // X 轴刻度标注（跟随当前数据粒度）
  const xTicks = useMemo(() => {
    if (period === "day") {
      return generateHourlyTicks(hourlyData);
    }
    if (period === "week") {
      // 周视图（近 7 日）：提取近 7 日对应的真实 MM.DD 日期
      if (Array.isArray(hourlyData) && hourlyData.length > 0) {
        return hourlyData.map((d, i) => {
          const raw = d.rawDate || d.hour;
          const formatted = formatToMmDd(raw);
          return formatted || `0${i + 1}`;
        });
      }
      return ["01", "02", "03", "04", "05", "06", "07"];
    }
    if (period === "month") {
      // 月视图（约 30 天）：等距采样 5 个关键日期点（MM.DD）
      if (Array.isArray(hourlyData) && hourlyData.length > 0) {
        const len = hourlyData.length;
        const indices = [
          0,
          Math.floor(len * 0.25),
          Math.floor(len * 0.5),
          Math.floor(len * 0.75),
          len - 1,
        ];
        const uniqueIndices = Array.from(new Set(indices));
        return uniqueIndices.map((idx) => {
          const item = hourlyData[idx];
          return formatToMmDd(item?.rawDate || item?.hour) || `0${idx + 1}`;
        });
      }
      return ["01", "08", "15", "22", "30"];
    }
    if (period === "total") {
      const monthlyRows = hourlyData.filter((row) => parseMonthKey(row.rawDate));
      if (monthlyRows.length === 0) return [];
      const crossesYears = new Set(monthlyRows.map((row) => parseMonthKey(row.rawDate).year)).size > 1;
      const lastIndex = monthlyRows.length - 1;
      const indices = Array.from(new Set([0, Math.floor(lastIndex / 2), lastIndex]));
      return indices.map((index) => formatMonthAxisLabel(monthlyRows[index].rawDate, crossesYears));
    }
    return [];
  }, [period, hourlyData]);

  // Keep the previous chart intact while the next grain loads. Otherwise a
  // period switch briefly renders old rows under a new axis (or an empty
  // skeleton), and CSS height transitions cannot connect the two charts.
  const [chartSnapshot, setChartSnapshot] = useState(() => ({
    period, data: hourlyData, xTicks, yTicks, chartMaxY, title: trendTitle,
  }));
  const pendingChartRef = useRef(null);
  useEffect(() => {
    const next = { period, data: hourlyData, xTicks, yTicks, chartMaxY, title: trendTitle };
    if (period !== chartSnapshot.period) {
      if (pendingChartRef.current?.period !== period) {
        pendingChartRef.current = { period, sawLoading: false };
      }
      if (chartLoading) pendingChartRef.current.sawLoading = true;
      const ready = screenshotMode || chartRowsMatchPeriod(trendRows, period, usageFrom, usageTo);
      if (!chartLoading && (ready || pendingChartRef.current.sawLoading)) {
        pendingChartRef.current = null;
        setChartSnapshot(next);
      }
      return;
    }
    pendingChartRef.current = null;
    if (!chartLoading) {
      setChartSnapshot((previous) =>
        previous.data === hourlyData && previous.chartMaxY === chartMaxY && previous.title === trendTitle
          ? previous
          : next,
      );
    }
  }, [chartLoading, chartMaxY, chartSnapshot.period, hourlyData, period, screenshotMode,
    trendRows, trendTitle, usageFrom, usageTo, xTicks, yTicks]);

  useEffect(() => {
    if (!screenshotMode) setHoveredIndex(null);
  }, [chartSnapshot.period, screenshotMode]);

  const visibleData = chartSnapshot.data;
  const visibleXTicks = chartSnapshot.xTicks;
  const visibleYTicks = chartSnapshot.yTicks;
  const visibleMaxY = chartSnapshot.chartMaxY;
  const activeItem = hoveredIndex != null ? visibleData[hoveredIndex] : null;

  // 规范化总量和金额的展示值
  const displaySummaryValue = screenshotMode
    ? "289.3M"
    : summaryTotalTokensRaw == null
      ? (summaryValue ?? "0")
      : formatTokenMetric(summaryTotalTokensRaw);
  const displayCostValue = screenshotMode
    ? "$58.91"
    : typeof summaryCostValue === "number"
    ? formatUsdCurrency(summaryCostValue)
    : (summaryCostValue || "$0.00");

  const showTopProvidersLegend = screenshotMode || Boolean(providerStats.length);
  const showActiveSegments = Boolean(activeItem?.segments && activeItem.segments.length > 1);

  const renderProviderShareContent = () => {
    // 1. 若已有真实数据：切换周期加载中时保持展示并加平滑半透明，绝不卸载 DOM，彻底杜绝高度坍塌闪烁
    if (providerStats.length > 0) {
      return (
        <div
          data-testid="provider-share-list"
          role={providerStats.length > 3 ? "region" : undefined}
          aria-label={providerStats.length > 3 ? providerShareTitle : undefined}
          tabIndex={providerStats.length > 3 ? 0 : undefined}
          className={`h-[100px] flex flex-col gap-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin] transition-opacity duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--v3-emerald)] ${providersLoading ? "opacity-60" : "opacity-100"}`}
        >
          {providerStats.map((item) => (
            <div key={item.name} className="flex shrink-0 flex-col gap-1">
              <div className="flex items-center justify-between text-[12px]">
                <div className="flex min-w-0 items-center gap-1.5 font-medium text-[var(--v3-text-primary)]">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${item.barClass}`} />
                  <span className="truncate" title={item.name}>{item.name}</span>
                </div>
                <span className="shrink-0 pl-2 font-semibold text-[var(--v3-text-primary)]">
                  <AnimatedMetric value={item.percent} />
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[var(--v3-bg-elevated)] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${item.barClass}`}
                  style={{ width: `${item.percentNum}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      );
    }

    // 2. 无旧数据且正在加载中：保持与三行列表等高，避免高度跳动
    if (providersLoading) {
      return (
        <div className="flex h-[100px] flex-col gap-2">
          {[1, 2, 3].map((index) => (
            <div key={index} className="flex shrink-0 flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="h-[18px] w-20 animate-pulse rounded bg-[var(--v3-bg-elevated)]" />
                <div className="h-[18px] w-10 animate-pulse rounded bg-[var(--v3-bg-elevated)]" />
              </div>
              <div className="h-1.5 w-full animate-pulse rounded-full bg-[var(--v3-bg-elevated)]" />
            </div>
          ))}
        </div>
      );
    }

    // 3. 确实无数据：展示等高空态
    return (
      <div className="h-[100px] flex items-center justify-center text-[12px] text-[var(--v3-text-secondary)] bg-[var(--v3-bg-elevated)]/40 rounded-lg border border-dashed border-[var(--v3-border)]">
        {emptyDataLabel}
      </div>
    );
  };

  const renderModelRankingContent = () => {
    // 1. 若已有真实数据：切换周期加载中时保持展示并加平滑半透明，绝不卸载 DOM，彻底杜绝高度坍塌闪烁
    if (modelStats.length > 0) {
      return (
        <div className={`h-[96px] flex flex-col justify-between transition-opacity duration-200 ${providersLoading ? "opacity-60" : "opacity-100"}`}>
          {modelStats.map((item) => (
            <div key={item.name} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-[var(--v3-bg-elevated)] text-[var(--v3-text-secondary)] text-[10px] font-semibold flex items-center justify-center shrink-0">
                    {item.rank}
                  </span>
                  <span className="text-[var(--v3-text-primary)] truncate font-mono text-[11px]">
                    {item.name}
                  </span>
                </div>
                <span className="font-semibold text-[var(--v3-text-primary)] shrink-0">
                  <AnimatedMetric value={item.percent} />
                </span>
              </div>
              <div className="h-1 w-full rounded-full bg-[var(--v3-bg-elevated)] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    item.rank === 1
                      ? "bg-[var(--v3-emerald)]"
                      : item.rank === 2
                      ? "bg-[var(--v3-blue)]"
                      : "bg-[var(--v3-border)]"
                  }`}
                  style={{ width: `${item.percentNum}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      );
    }

    // 2. 无旧数据且正在加载中：展示 1:1 像素级等高（96px）Top 3 仿真骨架
    if (providersLoading) {
      return (
        <div className="h-[96px] flex flex-col justify-between py-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-[var(--v3-bg-elevated)] animate-pulse shrink-0" />
                  <div className="h-3 w-28 bg-[var(--v3-bg-elevated)] animate-pulse rounded" />
                </div>
                <div className="h-3 w-8 bg-[var(--v3-bg-elevated)] animate-pulse rounded" />
              </div>
              <div className="h-1 w-full bg-[var(--v3-bg-elevated)] animate-pulse rounded-full" />
            </div>
          ))}
        </div>
      );
    }

    // 3. 确实无数据：展示等高（96px）居中空态
    return (
      <div className="h-[96px] flex items-center justify-center text-[12px] text-[var(--v3-text-secondary)] bg-[var(--v3-bg-elevated)]/40 rounded-lg border border-dashed border-[var(--v3-border)]">
        {emptyDataLabel}
      </div>
    );
  };

  return (
    <div
      data-testid="dashboard-hero"
      className={`rounded-2xl border border-[var(--v3-border)] bg-[var(--v3-bg-surface)] p-4 lg:p-5 transition-colors shadow-xs ${className}`}
    >
      {/* 卡片内置控制栏：周期选择器居左，刷新操作按钮居右 */}
      <div className="w-full mb-5">
        <DashboardToolbar
          period={period}
          onPeriodChange={onPeriodChange}
          onRefresh={onRefresh}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 hero:grid-cols-12 gap-6 items-stretch hero:min-h-[256px]">
        {/* ================= 左列：总量指标 (~24% / col-span-3) ================= */}
        <div data-testid="hero-summary" className="md:col-start-1 md:row-start-1 hero:col-span-3 flex flex-col justify-between hero:h-full">
          <div>
            {/* 顶标 */}
            <div className="text-[12px] font-semibold tracking-wider uppercase text-[var(--v3-text-secondary)]">
              {tokenTotalTitle}
            </div>

            {/* 大号 AnimatedMetric 总数值 */}
            <div className="mt-2 text-[40px] lg:text-[42px] font-semibold tracking-tight text-[var(--v3-text-primary)] leading-none">
              <AnimatedMetric value={displaySummaryValue} className="v3-display-num" />
            </div>

            {/* 成本金额与 Info 弹窗图标 */}
            <div className="mt-2.5 flex items-center gap-1.5">
              <span className="text-[22px] lg:text-[24px] font-semibold text-[var(--v3-emerald)] leading-tight">
                <AnimatedMetric value={displayCostValue} className="v3-display-num" />
              </span>
              <button
                type="button"
                onClick={onCostInfo}
                aria-label="查看成本分析详情"
                className="inline-flex items-center justify-center p-0.5 text-[var(--v3-emerald)] hover:opacity-80 transition-opacity focus-visible:ring-2 focus-visible:ring-[var(--v3-emerald)]/50 focus-visible:outline-none rounded-sm"
              >
                <Info className="h-4 w-4 stroke-[2]" aria-hidden="true" />
              </button>
            </div>

            {/* 当前日期标注（动态联动，固定单行防折行抖动） */}
            <div className="mt-2 text-[13px] text-[var(--v3-text-secondary)] h-5 truncate whitespace-nowrap">
              {dateDisplayLabel}
            </div>
          </div>

          {/* 周期环比数据（总计视图不显示，其余周期动态联动，保留高度占位防止抖动） */}
          {period !== "total" && comparisonLabel ? (
            <div className="mt-6 hero:mt-auto flex items-center gap-2 text-[13px] h-5 truncate whitespace-nowrap">
              <span className="text-[var(--v3-text-secondary)] shrink-0">
                {comparisonLabel}
              </span>
              <span
                className={`inline-flex items-center gap-0.5 font-semibold v3-mono-num ${
                  comparisonDirection === "up"
                    ? "text-[var(--v3-emerald)]"
                    : comparisonDirection === "down"
                    ? "text-rose-500"
                    : "text-[var(--v3-text-secondary)]"
                }`}
              >
                {comparisonValue}
                {comparisonDirection === "up" && (
                  <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
                )}
                {comparisonDirection === "down" && (
                  <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
                )}
              </span>
            </div>
          ) : (
            <div className="mt-6 hero:mt-auto h-5" aria-hidden="true" />
          )}
        </div>

        {/* ================= 中列：趋势柱图 (~50% / col-span-6) ================= */}
        <div data-testid="hero-chart" className="md:col-span-2 md:col-start-1 md:row-start-2 hero:col-span-6 hero:col-start-4 hero:row-start-1 flex flex-col justify-between md:min-h-[220px] hero:min-h-0 hero:h-full">
          {/* 柱图顶部栏：标题与图例 */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-[14px] font-semibold text-[var(--v3-text-primary)]">
              {chartSnapshot.title}
            </h2>
            <div className="flex items-center gap-3 text-[11px] font-medium tracking-wide">
              {showTopProvidersLegend ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-xs bg-[var(--v3-emerald)]" />
                    <span className="text-[var(--v3-text-secondary)]">{"ANTIGRAVITY"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-xs bg-[var(--v3-blue)]" />
                    <span className="text-[var(--v3-text-secondary)]">{"CODEX"}</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-xs bg-[var(--v3-emerald)]" />
                  <span className="text-[var(--v3-text-secondary)]">{"Token 用量"}</span>
                </div>
              )}
            </div>
          </div>

          {/* 柱图展示区与网格线 */}
          <div className="relative flex-1 min-h-[145px]">
            <AnimatePresence initial={false}>
              <motion.div
                key={chartSnapshot.period}
                data-testid="hero-chart-scene"
                className="absolute inset-0 flex flex-col"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 7 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -5 }}
                transition={prefersReducedMotion
                  ? { duration: 0 }
                  : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
            <div className="relative flex-1 min-h-[125px] flex">
              {/* 左侧 Y 轴刻度：与柱体绘图区等高，固定 4 个刻度，避免溢出与重复 key */}
              <div className="h-full shrink-0 flex flex-col justify-between text-[11px] text-[var(--v3-text-secondary)] pr-2.5 v3-mono-num select-none min-w-[36px] text-right py-0.5 pointer-events-none overflow-hidden">
                {visibleYTicks.map((yt, idx) => (
                  <span key={`${yt}-${idx}`} className="leading-none">{yt}</span>
                ))}
              </div>

              {/* 柱子容器及虚线网格 */}
              <div
                className="relative flex-1"
                onMouseLeave={() => !screenshotMode && setHoveredIndex(null)}
              >
              {/* 背景水平参考线（已根据需求移除底部 0 刻度细横线） */}
              <div className="absolute inset-x-0 top-1 border-b border-[var(--v3-border)] opacity-40 pointer-events-none" />
              <div className="absolute inset-x-0 top-[35%] border-b border-[var(--v3-border)] opacity-40 pointer-events-none" />
              <div className="absolute inset-x-0 top-[68%] border-b border-[var(--v3-border)] opacity-40 pointer-events-none" />

              {/* 柱子列表：平滑增减与过渡 */}
              <div className="absolute inset-0 flex items-end justify-between gap-[2px] lg:gap-[3px]">
                {visibleData.map((item, idx) => {
                  const isHovered = hoveredIndex === idx;
                  const totalHeightPct = visibleMaxY > 0
                    ? Math.min(100, Math.max(0, (item.total / visibleMaxY) * 100))
                    : 0;

                  const ariaLabel = `${item.hour} 用量 ${item.total > 0 ? `${item.total}M` : "0"}`;

                  const hasSegments = Boolean(item.total && Array.isArray(item.segments) && item.segments.length);

                  return (
                    <div
                      key={item.rawDate || item.hour || idx}
                      role="button"
                      tabIndex={0}
                      aria-label={ariaLabel}
                      className="relative flex-1 h-full flex flex-col justify-end items-center cursor-pointer group focus-visible:outline-none transition-all duration-300"
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onFocus={() => setHoveredIndex(idx)}
                      onBlur={() => !screenshotMode && setHoveredIndex(null)}
                      onClick={() => setHoveredIndex((prev) => (prev === idx ? null : idx))}
                    >
                      {/* 选中高亮准线（垂直细虚线） */}
                      {isHovered && (
                        <div className="absolute top-0 bottom-0 w-px border-l border-dashed border-[var(--v3-emerald)] opacity-60 pointer-events-none z-10" />
                      )}

                      {/* 柱体组合：支持提供商分段堆叠与平滑缓动 */}
                      <div
                        className={`w-full max-w-[14px] rounded-t-xs overflow-hidden transition-[height,opacity,transform] duration-300 ease-out ${
                          isHovered ? "opacity-100 scale-x-110" : "opacity-90 group-hover:opacity-100"
                        }`}
                        style={{ height: `${item.total > 0 || screenshotMode ? Math.max(totalHeightPct, 2) : 2}%` }}
                      >
                        <motion.div
                          className="flex h-full w-full flex-col-reverse justify-start"
                          style={{ transformOrigin: "bottom center" }}
                          initial={prefersReducedMotion ? false : { scaleY: 0.55, opacity: 0.45 }}
                          animate={{ scaleY: 1, opacity: 1 }}
                          transition={prefersReducedMotion
                            ? { duration: 0 }
                            : { duration: 0.38, delay: Math.min(idx * 0.012, 0.12), ease: [0.22, 1, 0.36, 1] }}
                        >
                        {hasSegments ? (
                          item.segments.map((seg, sIdx) => (
                            <div
                              key={sIdx}
                              className={`w-full transition-all duration-300 ${seg.barClass}`}
                              style={{ height: `${seg.heightPct}%` }}
                            />
                          ))
                        ) : (
                          <div
                            className={`w-full h-full ${
                              item.total > 0 ? "bg-[var(--v3-emerald)]" : "bg-[var(--v3-border)] opacity-30"
                            }`}
                          />
                        )}
                        </motion.div>
                      </div>
                    </div>
                  );
                })}

                {/* 悬浮 Tooltip 状态卡片 */}
                {activeItem && hoveredIndex != null && (
                  <div
                    className="absolute z-20 pointer-events-none bg-[var(--v3-bg-elevated)] text-[var(--v3-text-primary)] border border-[var(--v3-border)] rounded-lg px-2.5 py-1.5 shadow-xl text-[11px] whitespace-nowrap transition-all duration-150 animate-fade-in"
                    style={{
                      left: `${Math.min(
                        Math.max((hoveredIndex / Math.max(1, visibleData.length - 1)) * 100, 15),
                        85
                      )}%`,
                      top: "2px",
                      transform: "translateX(-50%)",
                    }}
                  >
                    <div className="text-[var(--v3-text-secondary)] font-mono mb-1 font-medium">
                      {activeItem.fullDateLabel || activeItem.hour}
                    </div>

                    {/* 总量显示 */}
                    <div className="flex items-center justify-between gap-3 leading-tight font-semibold">
                      <span className="text-[var(--v3-text-secondary)] font-normal">{copy("dashboard.v3.total_usage_prefix")}</span>
                      <span className="v3-mono-num">{activeItem.total > 0 ? `${activeItem.total}M` : "0"}</span>
                    </div>

                    {/* 各提供商分段细分显示 */}
                    {showActiveSegments && (
                      <div className="mt-1.5 pt-1.5 border-t border-[var(--v3-border)]/60 flex flex-col gap-1">
                        {activeItem.segments.map((seg) => (
                          <div key={seg.name} className="flex items-center justify-between gap-3 leading-tight">
                            <span className="flex items-center gap-1.5 text-[var(--v3-text-secondary)]">
                              <span className={`w-1.5 h-1.5 rounded-full ${seg.dotClass}`} />
                              {seg.name}
                            </span>
                            <span className="font-medium v3-mono-num">{`${seg.mTokens}M`}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              </div>
            </div>

            {/* X 轴时间/日期刻度标注 */}
            <div
              data-testid="hero-x-ticks"
              className={`ml-8 flex ${visibleXTicks.length === 1 ? "justify-center" : "justify-between"} text-[11px] text-[var(--v3-text-secondary)] pt-1.5 v3-mono-num select-none`}
            >
              {visibleXTicks.map((xt, i) => (
                <span key={`${xt}-${i}`}>{xt}</span>
              ))}
            </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ================= 右列：提供商占比与模型排行 (~26% / col-span-3) ================= */}
        <div data-testid="hero-attribution" className="md:col-start-2 md:row-start-1 hero:col-span-3 hero:col-start-10 flex flex-col justify-between gap-5 hero:h-full">
          {/* 上半部分：提供商占比 */}
          <div>
            <div className="text-[13px] font-semibold text-[var(--v3-text-primary)] mb-2.5">
              {providerShareTitle}
            </div>
            {renderProviderShareContent()}
          </div>

          {/* 下半部分：模型排行 */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-[13px] font-semibold text-[var(--v3-text-primary)]">
                {modelRankingTitle}
              </div>
              <button
                type="button"
                onClick={() => setIsModelModalOpen(true)}
                aria-label={copy("dashboard.v3.view_details")}
                className="text-[11px] font-medium text-[var(--v3-emerald)] hover:opacity-80 transition-opacity inline-flex items-center gap-0.5 focus-visible:outline-none"
              >
                <span>{copy("dashboard.v3.view_details")}</span>
                <ChevronRight className="w-3.5 h-3.5 stroke-[2]" aria-hidden="true" />
              </button>
            </div>
            {renderModelRankingContent()}
          </div>
        </div>
      </div>

      {/* 全量模型排行榜详情弹窗 */}
      <ModelRankingModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        models={modalModels}
      />
    </div>
  );
}
