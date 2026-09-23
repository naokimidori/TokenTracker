import React, { useMemo, useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { copy } from "../../../lib/copy";
import { generate2026BaselineHeatmap } from "./activity-baseline-utils.js";
import { ProviderIcon } from "./ProviderIcon.jsx";

/**
 * 格式化 Token 辅助函数
 */
function formatTokenVal(val) {
  if (val == null) return "0";
  const num = Number(val);
  if (!Number.isFinite(num) || num <= 0) return "0";
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}

/**
 * DashboardActivityBand - 仪表盘 V3 全宽活跃度卡片
 * 独占一行，横向包含 1–12 月按周对齐标头和 7 行星期标签
 * 右上角具备主要活跃工具抽屉面板切换，右下角包含 RareUI 署名外链
 */
export function DashboardActivityBand({
  heatmapData,
  heatmapDaily,
  heatmapLoading = false,
  activeDays,
  fleetData = [],
  topModels = [],
  screenshotMode = false,
  className = "",
}) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const [hoveredCell, setHoveredCell] = useState(null);

  // 1. 基准演示数据（仅在 screenshotMode 下启用）
  const baseline = useMemo(() => {
    return generate2026BaselineHeatmap();
  }, []);

  // 2. 真实或基准网格
  const weeks = useMemo(() => {
    if (screenshotMode) {
      return baseline.weeks;
    }

    if (heatmapData && Array.isArray(heatmapData.weeks) && heatmapData.weeks.length > 0) {
      // 规范化单元格结构，确保 day、value、level 字段存在
      return heatmapData.weeks.map((week) => {
        if (!Array.isArray(week)) return [];
        return week.map((cell) => {
          if (!cell) {
            return { day: "", value: 0, level: 0, isFuture: true };
          }
          const day = cell.day || cell.date || "";
          const value = Number(cell.value ?? cell.tokens ?? cell.total_tokens ?? 0);
          const level = Number(cell.level ?? (value > 0 ? 1 : 0));
          return { day, value, level, models: cell.models };
        });
      });
    }

    // 默认空网格（53 周 × 7 天）
    return Array.from({ length: 53 }, () =>
      Array.from({ length: 7 }, () => ({
        day: "",
        value: 0,
        level: 0,
      }))
    );
  }, [heatmapData, screenshotMode, baseline]);

  // 3. 动态获取年份
  const displayYear = useMemo(() => {
    if (screenshotMode) return 2026;
    if (heatmapData?.from && typeof heatmapData.from === "string") {
      const match = heatmapData.from.match(/^(\d{4})/);
      if (match) return Number(match[1]);
    }
    return new Date().getFullYear();
  }, [heatmapData, screenshotMode]);

  // 4. 动态活跃天数
  const displayActiveDays = useMemo(() => {
    if (screenshotMode) return 104;
    if (typeof activeDays === "number" && Number.isFinite(activeDays)) {
      return activeDays;
    }
    // 从网格中数有效天数
    let count = 0;
    for (const week of weeks) {
      for (const cell of week) {
        if (cell && cell.value > 0) count += 1;
      }
    }
    return count;
  }, [activeDays, weeks, screenshotMode]);

  // 5. 精确计算各月份第一天所对应的周索引（避免 justify-between 错位并防止首尾重叠）
  const monthMarkers = useMemo(() => {
    const markers = [];
    let lastMonth = null;
    let lastWeekIdx = -10;

    weeks.forEach((week, wIdx) => {
      // 取当周中间天（周三，dIdx=3）作为本周的代表日期，避免跨周交界误差
      const representativeCell = week[3] || week[0];
      if (representativeCell?.day && typeof representativeCell.day === "string") {
        const match = representativeCell.day.match(/^\d{4}-(\d{2})-\d{2}$/);
        if (match) {
          const mNum = Number(match[1]);
          if (mNum !== lastMonth && wIdx - lastWeekIdx >= 3) {
            lastMonth = mNum;
            lastWeekIdx = wIdx;
            markers.push({
              month: mNum,
              label: `${mNum}月`,
              weekIndex: wIdx,
            });
          }
        }
      }
    });

    if (markers.length > 0) return markers;

    // 若无日期字段（如未加载），按 53 周平均生成 12 个标记
    const standardMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    return standardMonths.map((m) => ({
      month: m,
      label: `${m}月`,
      weekIndex: Math.min(52, Math.floor(((m - 1) / 12) * 53)),
    }));
  }, [weeks]);

  // 构建月份周索引哈希表，用于与 53 列 CSS Grid 精确对齐
  const monthMarkerMap = useMemo(() => {
    const map = new Map();
    monthMarkers.forEach((m) => {
      map.set(m.weekIndex, m);
    });
    return map;
  }, [monthMarkers]);

  // 6. 真实活跃工具数据（用于右上角抽屉面板与胶囊 Logo）
  const activeToolsData = useMemo(() => {
    if (screenshotMode) {
      return [
        {
          source: "antigravity",
          name: "ANTIGRAVITY",
          usage: "229.8M",
          desc: "活跃 92 天 · gemini-3.8-flash 主力",
          colorClass: "text-[var(--v3-emerald)]",
          borderClass: "border-[var(--v3-border)]",
        },
        {
          source: "codex",
          name: "CODEX",
          usage: "59.5M",
          desc: "活跃 48 天 · gpt-5.6-sol 主力",
          colorClass: "text-[var(--v3-blue)]",
          borderClass: "border-[var(--v3-border)]",
        },
        {
          source: "claude",
          name: "CLAUDE",
          usage: "4.9M",
          desc: "活跃 16 天 · claude-opus-4-6",
          colorClass: "text-[var(--v3-text-secondary)]",
          borderClass: "border-[var(--v3-border)]",
        },
      ];
    }

    if (Array.isArray(fleetData) && fleetData.length > 0) {
      return fleetData.slice(0, 3).map((item, idx) => {
        const source = item.source || item.label || "unknown";
        const name = (item.label || item.source || "UNKNOWN").toUpperCase();
        const usage = formatTokenVal(item.usage ?? item.totalTokens);
        const topModel = item.models?.[0]?.name || topModels[idx]?.name || "主力模型";
        const colorClass = idx === 0
          ? "text-[var(--v3-emerald)]"
          : idx === 1
          ? "text-[var(--v3-blue)]"
          : "text-[var(--v3-text-secondary)]";

        return {
          source,
          name,
          usage: `${usage}`,
          desc: `${topModel} 主力`,
          colorClass,
          borderClass: "border-[var(--v3-border)]",
        };
      });
    }

    return [];
  }, [fleetData, topModels, screenshotMode]);

  const weekDays = ["一", "二", "三", "四", "五", "六", "日"];
  const activityTitle = copy("dashboard.v3.activity_title");
  const lessText = copy("dashboard.v3.activity_less");
  const moreText = copy("dashboard.v3.activity_more");
  const topActiveToolsText = copy("dashboard.v3.top_active_tools");

  return (
    <div
      className={`rounded-2xl border border-[var(--v3-border)] bg-[var(--v3-bg-surface)] p-4 lg:p-5 transition-colors shadow-xs relative overflow-hidden ${className}`}
    >
      {/* 头部：标题、活跃天数、图例与工具面板切换 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
        {/* 左侧：标题与已累计活跃天数（近 52 周滚动语义） */}
        <div>
          <h2 className="text-[16px] font-bold text-[var(--v3-text-primary)] leading-none">
            {activityTitle}
          </h2>
          <div className="text-[13px] text-[var(--v3-text-secondary)] mt-1.5">
            {copy("dashboard.v3.activity_days", { days: displayActiveDays })}
          </div>
        </div>

        {/* 右侧：图例与“主要活跃工具”胶囊 */}
        <div className="flex items-center gap-4 self-start sm:self-auto">
          {/* 色阶图例 */}
          <div className="flex items-center gap-1.5 text-[12px] text-[var(--v3-text-secondary)] select-none">
            <span>{lessText}</span>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs v3-level-0" />
              <span className="w-2.5 h-2.5 rounded-xs v3-level-1" />
              <span className="w-2.5 h-2.5 rounded-xs v3-level-2" />
              <span className="w-2.5 h-2.5 rounded-xs v3-level-3" />
              <span className="w-2.5 h-2.5 rounded-xs v3-level-4" />
            </div>
            <span>{moreText}</span>
          </div>

          {/* 主要活跃工具药丸胶囊 */}
          <button
            type="button"
            onClick={() => setToolsOpen((prev) => !prev)}
            aria-expanded={toolsOpen}
            className="flex items-center gap-2 pl-3 pr-1.5 py-1 rounded-full bg-[var(--v3-bg-elevated)] border border-[var(--v3-border)] hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-[var(--v3-emerald)]/50 focus-visible:outline-none"
          >
            <span className="text-[12px] font-medium text-[var(--v3-text-primary)]">
              {topActiveToolsText}
            </span>

            {/* 叠放头像组：真实活跃工具 Logo */}
            <div className="flex items-center -space-x-1.5">
              {activeToolsData.length > 0 ? (
                activeToolsData.slice(0, 3).map((tool, tIdx) => (
                  <div
                    key={tool.source || tIdx}
                    className="w-5 h-5 rounded-full bg-[var(--v3-bg-surface)] flex items-center justify-center border border-[var(--v3-border)] overflow-hidden shadow-xs shrink-0"
                    title={tool.name}
                  >
                    <ProviderIcon provider={tool.source} size={12} className="shrink-0" />
                  </div>
                ))
              ) : (
                <div className="w-5 h-5 rounded-full bg-[var(--v3-bg-surface)] flex items-center justify-center border border-[var(--v3-border)] text-[10px] text-[var(--v3-text-secondary)]">
                  {"—"}
                </div>
              )}
            </div>

            <div className="w-5 h-5 rounded-full bg-[var(--v3-bg-surface)] flex items-center justify-center text-[var(--v3-text-secondary)]">
              {toolsOpen ? (
                <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </div>
          </button>
        </div>
      </div>

      {/* 主视图区域：网格视图 或 活跃工具面板覆盖视图 */}
      <div className="relative min-h-[145px]">
        {toolsOpen ? (
          <div className="p-4 rounded-xl bg-[var(--v3-bg-elevated)] border border-[var(--v3-border)] animate-fade-in">
            <div className="text-[13px] font-semibold text-[var(--v3-text-primary)] mb-3">
              {topActiveToolsText}
            </div>
            {activeToolsData.length === 0 ? (
              <div className="py-6 text-center text-[12px] text-[var(--v3-text-secondary)]">
                {"暂无活跃工具使用记录"}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {activeToolsData.map((tool) => (
                  <div
                    key={tool.name}
                    className={`p-3 rounded-lg bg-[var(--v3-bg-surface)] ${tool.borderClass} border`}
                  >
                    <div className="flex items-center justify-between text-xs font-medium">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-5 h-5 rounded-md bg-[var(--v3-bg-elevated)] border border-[var(--v3-border)] flex items-center justify-center shrink-0 overflow-hidden">
                          <ProviderIcon provider={tool.source} size={13} className="shrink-0" />
                        </div>
                        <span className={`${tool.colorClass} font-semibold truncate`}>{tool.name}</span>
                      </div>
                      <span className="v3-mono-num font-bold shrink-0 ml-2">{tool.usage}</span>
                    </div>
                    <div className="text-[11px] text-[var(--v3-text-secondary)] mt-1 truncate">
                      {tool.desc}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="min-w-[760px] w-full">
              {/* 月份横向标头（与下方周列共享完全相同的 CSS Grid 53 列，确保 100% 绝对对齐） */}
              <div className="flex items-center gap-2 mb-1.5 text-[11px] text-[var(--v3-text-secondary)] select-none">
                <div className="w-4 shrink-0" aria-hidden="true" />
                <div className="flex-1 grid grid-cols-[repeat(53,minmax(0,1fr))] gap-[3px]">
                  {Array.from({ length: weeks.length }).map((_, wIdx) => {
                    const marker = monthMarkerMap.get(wIdx);
                    return (
                      <div key={wIdx} className="relative h-4 overflow-visible">
                        {marker && (
                          <span className="absolute left-0 top-0 whitespace-nowrap">
                            {marker.label}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 星期标签 + 53 周热力图网格 */}
              <div className="flex items-start gap-2">
                {/* 星期一至星期日 7 行标签 */}
                <div className="flex flex-col gap-[3px] text-[10px] text-[var(--v3-text-secondary)] pt-0.5 select-none w-4 shrink-0">
                  {weekDays.map((d) => (
                    <span key={d} className="h-3 leading-3 text-center">{d}</span>
                  ))}
                </div>

                {/* 53 周网格（CSS Grid 铺满可用卡片宽度，每个单元格保持 1:1 正方形） */}
                <div
                  className="flex-1 grid grid-cols-[repeat(53,minmax(0,1fr))] gap-[3px] items-center"
                  onMouseLeave={() => setHoveredCell(null)}
                >
                  {weeks.map((week, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-[3px]">
                      {week.map((cell, dIdx) => {
                        const cellDay = cell?.day || "";
                        const cellVal = cell?.value || 0;
                        const cellLevel = cell?.level ?? 0;
                        const isHovered = hoveredCell === cell && cellDay;

                        const ariaText = cellDay
                          ? `${cellDay}: ${cellVal > 0 ? `${formatTokenVal(cellVal)} Tokens` : "无活动"}`
                          : "未发生";

                        return (
                          <div
                            key={cellDay || `${wIdx}-${dIdx}`}
                            role="gridcell"
                            tabIndex={cellDay ? 0 : -1}
                            aria-label={ariaText}
                            onMouseEnter={() => cellDay && setHoveredCell(cell)}
                            onFocus={() => cellDay && setHoveredCell(cell)}
                            onBlur={() => setHoveredCell(null)}
                            className={`w-full aspect-square max-w-[16px] mx-auto rounded-[2px] v3-level-${cellLevel} transition-all cursor-pointer focus-visible:ring-1 focus-visible:ring-[var(--v3-emerald)] focus-visible:outline-none ${
                              isHovered ? "ring-1 ring-[var(--v3-emerald)] scale-110" : "hover:opacity-90"
                            }`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 悬停 Tooltip 浮层 */}
        {hoveredCell && hoveredCell.day && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none bg-[var(--v3-bg-elevated)] text-[var(--v3-text-primary)] border border-[var(--v3-border)] rounded-md px-3 py-1.5 shadow-xl text-[12px] whitespace-nowrap animate-fade-in">
            <span className="font-mono text-[var(--v3-text-secondary)] mr-2">
              {`${hoveredCell.day}:`}
            </span>
            <span className="font-semibold v3-mono-num">
              {hoveredCell.value > 0
                ? `${formatTokenVal(hoveredCell.value)} Tokens`
                : "无活动"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
