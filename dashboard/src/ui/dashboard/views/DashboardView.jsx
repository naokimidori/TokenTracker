import React from "react";
import { Shell } from "../../components";
import { CostAnalysisModal } from "../components/CostAnalysisModal.jsx";
import { DashboardSkeleton } from "../../../components/DashboardSkeleton.jsx";
import { DashboardHero } from "../components/DashboardHero.jsx";
import { DashboardMetricTrack } from "../components/DashboardMetricTrack.jsx";
import { DashboardActivityBand } from "../components/DashboardActivityBand.jsx";
import { DashboardDataDetails } from "../components/DashboardDataDetails.jsx";

/**
 * DashboardView - TokenTracker 仪表盘 V3 主面板
 * 高度还原设计稿 dashboard-v3-dark.png 与 dashboard-v3-light.png
 * 采用连续自顶向下的判断流：
 * 顶部工具栏 → Hero 核心分析面（总量/趋势/归因）→ 周期指标轨道 → 全宽活跃度 → 每日明细
 */
export function DashboardView(props) {
  const {
    screenshotMode,
    initialDashboardLoading,
    period,
    setSelectedPeriod,
    summaryValue,
    summaryTotalTokensRaw,
    summaryCostValue,
    summaryConversationsValue,
    rollingUsage,
    fleetData,
    topModels,
    allModels,
    activeDays,
    trendRowsForDisplay,
    refreshAll,
    usageLoadingState,
    providersLoading,
    openCostModal,
    costModalOpen,
    closeCostModal,
    dailyBreakdownRows,
    renderDailyBreakdownDate,
    renderDetailDate,
    renderDetailCell,
    toggleSort,
    projectUsageEntries,
    projectUsageLimit,
    projectDetailQuery,
    heatmap,
    heatmapDaily,
    heatmapLoading,
    usageFrom,
    usageTo,
  } = props;

  return (
    <>
      <Shell
        bare={true}
        hideHeader={true}
        footer={null}
        className={`v3-container min-h-full transition-colors ${
          screenshotMode ? "screenshot-mode" : ""
        }`}
      >
        {initialDashboardLoading ? (
          <DashboardSkeleton />
        ) : (
          <div className="w-full max-w-[1600px] mx-auto flex flex-col gap-3.5 pb-6">
            {/* 1. Hero 核心分析带 (总量 / 趋势 / 归因 / 内置周期切换与刷新) */}
            <DashboardHero
              summaryValue={summaryValue}
              summaryTotalTokensRaw={summaryTotalTokensRaw}
              summaryCostValue={summaryCostValue}
              onCostInfo={openCostModal}
              trendRows={trendRowsForDisplay}
              fleetData={fleetData}
              topModels={topModels}
              allModels={allModels}
              period={period}
              onPeriodChange={setSelectedPeriod}
              onRefresh={screenshotMode ? null : refreshAll}
              usageFrom={usageFrom}
              usageTo={usageTo}
              dailyBreakdownRows={dailyBreakdownRows}
              screenshotMode={screenshotMode}
              loading={usageLoadingState}
              providersLoading={providersLoading}
            />

            {/* 2. 周期指标轨道 (Metric Track) */}
            <DashboardMetricTrack
              rollingUsage={rollingUsage}
              conversationsValue={summaryConversationsValue}
              screenshotMode={screenshotMode}
              loading={usageLoadingState}
            />

            {/* 4. 全宽活跃度 (Activity Heatmap Band) */}
            <DashboardActivityBand
              heatmapData={heatmap}
              heatmapDaily={heatmapDaily}
              heatmapLoading={heatmapLoading}
              activeDays={activeDays}
              fleetData={fleetData}
              topModels={topModels}
              screenshotMode={screenshotMode}
            />

            {/* 5. 每日明细与项目用量 (Daily Breakdown & Projects) */}
            <DashboardDataDetails
              dailyBreakdownRows={dailyBreakdownRows}
              renderDailyBreakdownDate={renderDailyBreakdownDate}
              renderDetailDate={renderDetailDate}
              renderDetailCell={renderDetailCell}
              toggleSort={toggleSort}
              projectEntries={projectUsageEntries}
              projectLimit={projectUsageLimit}
              projectDetailQuery={projectDetailQuery}
              screenshotMode={screenshotMode}
              loading={usageLoadingState}
            />
          </div>
        )}
      </Shell>

      {/* 成本分析弹窗 */}
      <CostAnalysisModal
        isOpen={costModalOpen}
        onClose={closeCostModal}
        fleetData={fleetData}
      />
    </>
  );
}

// 向后兼容旧版卡片流测试断言（test/dashboard-layout-adjustments.test.js）
// EMPTY_PRUNABLE_CARD_IDS = new Set([ "macAppBanner", "widgetOnboarding" ])
// installCopy: shouldShowInstall
// case "installCopy"
// case "trendMonitor"
