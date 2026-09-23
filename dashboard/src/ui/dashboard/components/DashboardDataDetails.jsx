import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { copy } from "../../../lib/copy";
import { toFiniteNumber } from "../../../lib/format";
import { ProjectDetailModal } from "./ProjectDetailModal.jsx";
import { ProjectAvatar, githubOwnerFor, splitProjectKey } from "./project-usage-utils.jsx";

/**
 * 视觉稿基准数据行（仅在 screenshotMode 下启用）
 */
const BASELINE_DAILY_ROWS = [
  {
    date: "2026-09-22",
    total: "289.3M",
    input: "36M",
    output: "545.6K",
    cache: "252.3M",
    reasoning: "570.6K",
    conversations: "2,196",
  },
  {
    date: "2026-09-21",
    total: "271.8M",
    input: "35.8M",
    output: "417.3K",
    cache: "235.1M",
    reasoning: "555.8K",
    conversations: "2,092",
  },
  {
    date: "2026-09-20",
    total: "39.5M",
    input: "10.4M",
    output: "96K",
    cache: "29M",
    reasoning: "31.7K",
    conversations: "200",
  },
  {
    date: "2026-09-19",
    total: "71M",
    input: "10.2M",
    output: "244.1K",
    cache: "60.6M",
    reasoning: "16.7K",
    conversations: "317",
  },
];

/**
 * 格式化 Token 简写
 */
function formatTokenCount(num) {
  if (num == null) return "—";
  const n = Number(num);
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n === 0) return "0";
  if (n >= 1000000000) return `${(n / 1000000000).toFixed(1)}B`;
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

/**
 * DashboardDataDetails - 仪表盘 V3 全宽每日明细与项目用量卡片
 * 移除 0/1 行回退假数据逻辑，稳定 key 索引，补齐空态
 */
export function DashboardDataDetails({
  projectEntries = [],
  projectLimit = 5,
  projectDetailQuery = {},
  dailyBreakdownRows = [],
  renderDailyBreakdownDate,
  renderDetailDate,
  renderDetailCell,
  toggleSort,
  screenshotMode = false,
  loading = false,
  className = "",
}) {
  const [activeTab, setActiveTab] = useState("daily");
  const [detailEntry, setDetailEntry] = useState(null);

  // 严格限定：仅在显式 screenshotMode 且没有传入真实数据时使用基线数据
  const useBaseline = screenshotMode && (!dailyBreakdownRows || dailyBreakdownRows.length === 0);

  const dailyDetailsTitle = copy("dashboard.v3.daily_details");
  const projectUsageTitle = copy("dashboard.v3.project_usage");
  const colDate = copy("dashboard.v3.col_date");
  const colTotal = copy("dashboard.v3.col_total");
  const colInput = copy("dashboard.v3.col_input");
  const colOutput = copy("dashboard.v3.col_output");
  const colCache = copy("dashboard.v3.col_cache");
  const colReasoning = copy("dashboard.v3.col_reasoning");
  const colConversations = copy("dashboard.v3.col_conversations");
  const emptyProjectsText = copy("dashboard.projects.empty");

  const handleTabKeyDown = (e) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setActiveTab("projects");
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setActiveTab("daily");
    }
  };

  return (
    <div
      className={`rounded-2xl border border-[var(--v3-border)] bg-[var(--v3-bg-surface)] p-4 lg:p-5 transition-colors shadow-xs ${className}`}
    >
      {/* 头部 Tab 分段切换 */}
      <div className="flex items-center justify-between gap-4 mb-3">
        <div
          role="tablist"
          aria-label={dailyDetailsTitle}
          className="flex items-center p-1 rounded-lg bg-[var(--v3-bg-elevated)] border border-[var(--v3-border)]"
        >
          <button
            id="tab-daily"
            type="button"
            role="tab"
            tabIndex={activeTab === "daily" ? 0 : -1}
            aria-selected={activeTab === "daily"}
            aria-controls="panel-daily"
            onKeyDown={handleTabKeyDown}
            onClick={() => setActiveTab("daily")}
            className={`px-3 py-1 text-[13px] rounded-md transition-all font-medium focus-visible:ring-2 focus-visible:ring-[var(--v3-emerald)]/50 focus-visible:outline-none ${
              activeTab === "daily"
                ? "bg-[var(--v3-bg-surface)] text-[var(--v3-text-primary)] shadow-xs"
                : "text-[var(--v3-text-secondary)] hover:text-[var(--v3-text-primary)]"
            }`}
          >
            {dailyDetailsTitle}
          </button>
          <button
            id="tab-projects"
            type="button"
            role="tab"
            tabIndex={activeTab === "projects" ? 0 : -1}
            aria-selected={activeTab === "projects"}
            aria-controls="panel-projects"
            onKeyDown={handleTabKeyDown}
            onClick={() => setActiveTab("projects")}
            className={`px-3 py-1 text-[13px] rounded-md transition-all font-medium focus-visible:ring-2 focus-visible:ring-[var(--v3-emerald)]/50 focus-visible:outline-none ${
              activeTab === "projects"
                ? "bg-[var(--v3-bg-surface)] text-[var(--v3-text-primary)] shadow-xs"
                : "text-[var(--v3-text-secondary)] hover:text-[var(--v3-text-primary)]"
            }`}
          >
            {projectUsageTitle}
          </button>
        </div>
      </div>

      {/* 每日明细表格视图 */}
      {activeTab === "daily" && (
        <div
          id="panel-daily"
          role="tabpanel"
          tabIndex={0}
          aria-labelledby="tab-daily"
          className="overflow-x-auto -mx-5 px-5 lg:-mx-6 lg:px-6 focus-visible:outline-none"
        >
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--v3-border)] text-[12px] font-semibold text-[var(--v3-text-secondary)]">
                <th
                  aria-sort="descending"
                  className="py-2.5 pr-4 pl-1 font-semibold whitespace-nowrap"
                >
                  <button
                    type="button"
                    onClick={() => toggleSort?.("day")}
                    className="inline-flex items-center gap-1 hover:text-[var(--v3-text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--v3-emerald)]/50 focus-visible:outline-none rounded-sm"
                  >
                    <span>{colDate}</span>
                    <ChevronDown className="h-3.5 w-3.5 stroke-[2] opacity-70" aria-hidden="true" />
                  </button>
                </th>
                <th
                  aria-sort="none"
                  className="py-2.5 px-3 text-right font-semibold whitespace-nowrap"
                >
                  <button
                    type="button"
                    onClick={() => toggleSort?.("total_tokens")}
                    className="inline-flex items-center gap-1 hover:text-[var(--v3-text-primary)] ml-auto focus-visible:ring-2 focus-visible:ring-[var(--v3-emerald)]/50 focus-visible:outline-none rounded-sm"
                  >
                    <span>{colTotal}</span>
                    <ChevronDown className="h-3.5 w-3.5 stroke-[2] opacity-70" aria-hidden="true" />
                  </button>
                </th>
                <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">{colInput}</th>
                <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">{colOutput}</th>
                <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">{colCache}</th>
                <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">{colReasoning}</th>
                <th className="py-2.5 pl-3 pr-1 text-right font-semibold whitespace-nowrap">{colConversations}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--v3-border)] text-[13px]">
              {useBaseline ? (
                BASELINE_DAILY_ROWS.map((row) => (
                  <tr
                    key={row.date}
                    className="hover:bg-[var(--v3-bg-elevated)] transition-colors"
                  >
                    <td className="py-2 pr-4 pl-1 font-mono text-[var(--v3-text-secondary)] whitespace-nowrap">
                      {row.date}
                    </td>
                    <td className="py-2 px-3 text-right font-medium text-[var(--v3-text-primary)] v3-mono-num whitespace-nowrap">
                      {row.total}
                    </td>
                    <td className="py-2 px-3 text-right text-[var(--v3-text-secondary)] v3-mono-num whitespace-nowrap">
                      {row.input}
                    </td>
                    <td className="py-2 px-3 text-right text-[var(--v3-text-secondary)] v3-mono-num whitespace-nowrap">
                      {row.output}
                    </td>
                    <td className="py-2 px-3 text-right text-[var(--v3-text-secondary)] v3-mono-num whitespace-nowrap">
                      {row.cache}
                    </td>
                    <td className="py-2 px-3 text-right text-[var(--v3-text-secondary)] v3-mono-num whitespace-nowrap">
                      {row.reasoning}
                    </td>
                    <td className="py-2 pl-3 pr-1 text-right text-[var(--v3-text-secondary)] v3-mono-num whitespace-nowrap">
                      {row.conversations}
                    </td>
                  </tr>
                ))
              ) : dailyBreakdownRows && dailyBreakdownRows.length > 0 ? (
                dailyBreakdownRows.map((row, idx) => {
                  const dateStr = renderDailyBreakdownDate
                    ? renderDailyBreakdownDate(row)
                    : renderDetailDate
                    ? renderDetailDate(row)
                    : row.day || row.date || "—";
                  const stableKey = String(row.day || row.date || row.id || `daily-row-${idx}`);
                  return (
                    <tr
                      key={stableKey}
                      className="hover:bg-[var(--v3-bg-elevated)] transition-colors"
                    >
                      <td className="py-2 pr-4 pl-1 font-mono text-[var(--v3-text-secondary)] whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-[var(--v3-text-primary)] v3-mono-num whitespace-nowrap">
                        {renderDetailCell ? renderDetailCell(row, "total_tokens") : formatTokenCount(row.total_tokens)}
                      </td>
                      <td className="py-2 px-3 text-right text-[var(--v3-text-secondary)] v3-mono-num whitespace-nowrap">
                        {renderDetailCell ? renderDetailCell(row, "input_tokens") : formatTokenCount(row.input_tokens)}
                      </td>
                      <td className="py-2 px-3 text-right text-[var(--v3-text-secondary)] v3-mono-num whitespace-nowrap">
                        {renderDetailCell ? renderDetailCell(row, "output_tokens") : formatTokenCount(row.output_tokens)}
                      </td>
                      <td className="py-2 px-3 text-right text-[var(--v3-text-secondary)] v3-mono-num whitespace-nowrap">
                        {renderDetailCell ? renderDetailCell(row, "cached_input_tokens") : formatTokenCount(row.cached_input_tokens)}
                      </td>
                      <td className="py-2 px-3 text-right text-[var(--v3-text-secondary)] v3-mono-num whitespace-nowrap">
                        {renderDetailCell ? renderDetailCell(row, "reasoning_output_tokens") : formatTokenCount(row.reasoning_output_tokens)}
                      </td>
                      <td className="py-2 pl-3 pr-1 text-right text-[var(--v3-text-secondary)] v3-mono-num whitespace-nowrap">
                        {renderDetailCell ? renderDetailCell(row, "conversation_count") : (row.conversation_count ?? "—")}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[13px] text-[var(--v3-text-secondary)]">
                    {"当前选定时间范围内暂无使用明细"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 项目用量视图 */}
      {activeTab === "projects" && (
        <div
          id="panel-projects"
          role="tabpanel"
          tabIndex={0}
          aria-labelledby="tab-projects"
          className="space-y-2 focus-visible:outline-none"
        >
          {projectEntries.length === 0 ? (
            <div className="text-[13px] text-[var(--v3-text-secondary)] py-6 text-center">
              {emptyProjectsText}
            </div>
          ) : (
            projectEntries.slice(0, projectLimit).map((entry, idx) => {
              const projectKey = String(entry?.project_key || "");
              const { owner, repo } = splitProjectKey(projectKey);
              const tokens = toFiniteNumber(entry?.billable_total_tokens ?? entry?.total_tokens) ?? 0;
              const stableProjectKey = projectKey || `project-${idx}`;
              return (
                <button
                  key={stableProjectKey}
                  type="button"
                  onClick={() => setDetailEntry(entry)}
                  className="w-full text-left p-3 rounded-xl border border-[var(--v3-border)] bg-[var(--v3-bg-elevated)]/40 hover:bg-[var(--v3-bg-elevated)] transition-colors flex items-center justify-between gap-4 focus-visible:ring-2 focus-visible:ring-[var(--v3-emerald)]/50 focus-visible:outline-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ProjectAvatar owner={owner} repo={repo} />
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-[var(--v3-text-primary)] truncate">
                        {repo || projectKey}
                      </div>
                      {owner && (
                        <div className="text-[11px] text-[var(--v3-text-secondary)] truncate">
                          {owner}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-[14px] font-semibold text-[var(--v3-text-primary)] v3-mono-num shrink-0">
                    {formatTokenCount(tokens)}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* 项目详情下钻弹窗 */}
      {detailEntry && (
        <ProjectDetailModal
          isOpen={Boolean(detailEntry)}
          onClose={() => setDetailEntry(null)}
          entry={detailEntry}
          query={projectDetailQuery}
        />
      )}
    </div>
  );
}
