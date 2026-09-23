import { Dialog } from "@base-ui/react/dialog";
import { BarChart3, X } from "lucide-react";
import React, { useMemo } from "react";
import { copy } from "../../../lib/copy";
import { formatTokenCount } from "../../../lib/token-format";

function formatModalTokens(value) {
  const tokens = Number(value);
  if (!Number.isFinite(tokens)) return "—";
  if (tokens > 10_000_000_000) return `${(tokens / 1_000_000_000).toFixed(1)}B`;
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  return formatTokenCount(tokens);
}

/**
 * ModelRankingModal - 全部模型用量排行与占比详情弹窗
 * 解除主面板仅展示 Top 3 的限制，完整呈现当前时间周期内的所有活跃模型
 */
export const ModelRankingModal = React.memo(function ModelRankingModal({
  isOpen,
  onClose,
  models = [],
}) {
  // 规范化并计算全量模型列表
  const normalizedModels = useMemo(() => {
    if (!Array.isArray(models) || models.length === 0) return [];
    return models.map((m, idx) => {
      const tokens = Number(m.tokens ?? m.usage) || 0;
      const percentNum = Number(m.percent) || 0;
      const rank = idx + 1;

      // 进度条样式映射：Top 1 为翡翠绿，Top 2 为科技蓝，其余保持中性，避免过多强调色
      const barClass =
        rank === 1
          ? "bg-[var(--v3-emerald)]"
          : rank === 2
          ? "bg-[var(--v3-blue)]"
          : rank === 3
          ? "bg-[var(--v3-text-secondary)]"
          : "bg-[var(--v3-border)]";

      // 排名角标使用浅色面和细边框，在深浅主题中保持相同层级
      const rankBadgeClass =
        rank === 1
          ? "border-[var(--v3-border)] bg-[var(--v3-bg-elevated)] text-[var(--v3-emerald)]"
          : rank === 2
          ? "border-[var(--v3-border)] bg-[var(--v3-bg-elevated)] text-[var(--v3-blue)]"
          : rank === 3
          ? "border-[var(--v3-border)] bg-[var(--v3-bg-elevated)] text-[var(--v3-text-primary)]"
          : "border-[var(--v3-border)] bg-transparent text-[var(--v3-text-secondary)]";

      return {
        rank,
        id: m.id || m.name || String(idx),
        name: m.name || m.model || "unknown",
        tokens,
        tokensDisplay: formatModalTokens(tokens),
        percent: `${percentNum.toFixed(1)}%`,
        percentNum,
        barClass,
        rankBadgeClass,
      };
    });
  }, [models]);

  const totalTokensSum = useMemo(() => {
    return normalizedModels.reduce((acc, m) => acc + m.tokens, 0);
  }, [normalizedModels]);

  const hasModels = normalizedModels.length !== 0;

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose?.();
      }}
    >
      <Dialog.Portal>
        {/* 背景遮罩仅用于聚焦弹窗，避免过重的毛玻璃效果 */}
        <Dialog.Backdrop className="fixed inset-0 z-[100] bg-black/45 dark:bg-black/70 backdrop-blur-[2px] transition-opacity animate-fade-in" />

        {/* 窄屏使用底部弹层，桌面回到居中对话框 */}
        <Dialog.Viewport className="fixed inset-0 z-[101] flex items-end sm:items-center justify-center p-0 sm:p-5">
          <Dialog.Popup
            data-testid="model-ranking-modal"
            className="relative flex max-h-[88dvh] w-full flex-col overflow-hidden border border-[var(--v3-border)] bg-[var(--v3-bg-surface)] shadow-2xl transition-all animate-scale-in sm:max-h-[82vh] sm:max-w-[640px] sm:rounded-[20px] max-sm:rounded-t-[20px] max-sm:border-x-0 max-sm:border-b-0"
          >
            {/* 弹窗头部：标题、周期说明与统计摘要 */}
            <div className="shrink-0 border-b border-[var(--v3-border)] bg-[var(--v3-bg-surface)] px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Dialog.Title className="text-[18px] font-semibold leading-6 tracking-tight text-[var(--v3-text-primary)]">
                    {copy("dashboard.v3.model_details_title")}
                  </Dialog.Title>
                  <Dialog.Description className="mt-1 text-[12px] leading-5 text-[var(--v3-text-secondary)]">
                    {copy("dashboard.v3.model_details_subtitle")}
                  </Dialog.Description>
                </div>

                <Dialog.Close
                  type="button"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-[var(--v3-text-secondary)] transition-colors hover:border-[var(--v3-border)] hover:bg-[var(--v3-bg-elevated)] hover:text-[var(--v3-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--v3-emerald)]/50"
                  aria-label={copy("dashboard.v3.close")}
                >
                  <X className="h-[18px] w-[18px] stroke-[1.8]" aria-hidden="true" />
                </Dialog.Close>
              </div>

              <div className="mt-4 flex items-center gap-4 text-[12px] text-[var(--v3-text-secondary)]">
                <span className="inline-flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5 stroke-[1.8]" aria-hidden="true" />
                  {copy("dashboard.v3.model_count", { count: normalizedModels.length })}
                </span>
                <span className="h-3.5 w-px bg-[var(--v3-border)]" aria-hidden="true" />
                <span>
                  {copy("dashboard.v3.total_usage_prefix")}
                  <strong className="ml-1.5 font-semibold text-[var(--v3-text-primary)] v3-mono-num">
                    {formatModalTokens(totalTokensSum)}
                  </strong>
                </span>
              </div>
            </div>

            {/* 列标题与数据采用同一网格，避免模型名和数字随内容漂移 */}
            {hasModels && (
              <div className="grid shrink-0 grid-cols-[32px_minmax(0,1fr)_88px_56px] items-center gap-3 border-b border-[var(--v3-border)] bg-[var(--v3-bg-elevated)]/55 px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--v3-text-secondary)] sm:grid-cols-[32px_minmax(0,1fr)_104px_64px] sm:px-6">
                <span className="text-center">{copy("dashboard.v3.col_rank")}</span>
                <span>{copy("dashboard.v3.col_model")}</span>
                <span className="text-right">{copy("dashboard.v3.col_tokens")}</span>
                <span className="text-right">{copy("dashboard.v3.col_share")}</span>
              </div>
            )}

            {/* 模型列表滚动区 */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {hasModels ? (
                <div className="divide-y divide-[var(--v3-border)]">
                  {normalizedModels.map((item) => (
                    <div key={item.id} className="px-5 py-3.5 sm:px-6 sm:py-4">
                      <div className="grid grid-cols-[32px_minmax(0,1fr)_88px_56px] items-center gap-3 sm:grid-cols-[32px_minmax(0,1fr)_104px_64px]">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold v3-mono-num ${item.rankBadgeClass}`}
                          aria-label={`${copy("dashboard.v3.col_rank")} ${item.rank}`}
                        >
                          {item.rank}
                        </span>

                        <span
                          className="min-w-0 truncate font-mono text-[13px] font-medium text-[var(--v3-text-primary)]"
                          title={item.name}
                        >
                          {item.name}
                        </span>

                        <span className="text-right text-[12px] font-medium text-[var(--v3-text-secondary)] v3-mono-num">
                          {item.tokensDisplay}
                        </span>

                        <span className="text-right text-[13px] font-semibold text-[var(--v3-text-primary)] v3-mono-num">
                          {item.percent}
                        </span>
                      </div>

                      <div className="mt-2.5 grid grid-cols-[32px_minmax(0,1fr)_88px_56px] gap-3 sm:grid-cols-[32px_minmax(0,1fr)_104px_64px]">
                        <div
                          className="col-start-2 col-end-5 h-1 overflow-hidden rounded-full bg-[var(--v3-bg-elevated)]"
                          role="meter"
                          aria-label={`${item.name} ${copy("dashboard.v3.col_share")}`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={item.percentNum}
                        >
                          <div
                            className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${item.barClass}`}
                            style={{ width: `${Math.min(100, Math.max(item.percentNum, 0))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[220px] flex-col items-center justify-center px-6 py-12 text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--v3-border)] bg-[var(--v3-bg-elevated)] text-[var(--v3-text-secondary)]">
                    <BarChart3 className="h-5 w-5 stroke-[1.6]" aria-hidden="true" />
                  </div>
                  <p className="text-[13px] font-medium text-[var(--v3-text-primary)]">
                    {copy("dashboard.v3.model_empty")}
                  </p>
                  <p className="mt-1 max-w-[280px] text-[12px] leading-5 text-[var(--v3-text-secondary)]">
                    {copy("dashboard.v3.model_details_subtitle")}
                  </p>
                </div>
              )}
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
});
