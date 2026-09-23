import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import React, { useMemo } from "react";
import { copy } from "../../../lib/copy";
import { formatCompactNumber, formatUsdCurrency, toFiniteNumber } from "../../../lib/format";
import { useCurrency } from "../../../hooks/useCurrency.js";
import { CURRENCY_USD, getCurrencySymbol } from "../../../lib/currency";

function formatHeroTotal(value, currency, rate) {
  if (!Number.isFinite(value)) return copy("shared.placeholder.short");
  const formatted = formatUsdCurrency(value, { decimals: 2, currency, rate });
  return formatted === "-" ? copy("shared.placeholder.short") : formatted;
}

function formatCostCell(value, currency, rate) {
  if (!Number.isFinite(value) || value <= 0) return null;
  const symbol = getCurrencySymbol(currency);
  const converted = currency === CURRENCY_USD ? value : value * rate;
  if (converted < 0.01) return `<${symbol}0.01`;
  return formatUsdCurrency(value, { decimals: 2, currency, rate });
}

function formatTokensCell(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return formatCompactNumber(n, { decimals: 1 });
}

export const CostAnalysisModal = React.memo(function CostAnalysisModal({
  isOpen,
  onClose,
  fleetData = [],
}) {
  const { currency, rate } = useCurrency();

  // Memoized so parent re-renders don't re-walk fleetData each tick
  const normalizedFleet = useMemo(() => {
    return (Array.isArray(fleetData) ? fleetData : [])
      .map((fleet) => {
        const usdValue = toFiniteNumber(fleet?.usd) ?? 0;
        const tokenValue = toFiniteNumber(fleet?.usage) ?? 0;
        const models = Array.isArray(fleet?.models) ? fleet.models : [];
        return {
          label: fleet?.label ? String(fleet.label) : "",
          usdValue,
          costLabel: formatCostCell(usdValue, currency, rate),
          tokensLabel: formatTokensCell(tokenValue),
          models: models
            .map((model) => {
              const tokens = toFiniteNumber(model?.usage) ?? 0;
              const cost = toFiniteNumber(model?.cost) ?? 0;
              return {
                id: model?.id ? String(model.id) : "",
                name: model?.name ? String(model.name) : "",
                tokensLabel: formatTokensCell(tokens),
                costLabel: formatCostCell(cost, currency, rate),
                sortCost: cost,
              };
            })
            .filter((m) => m.costLabel || m.tokensLabel)
            .sort((a, b) => b.sortCost - a.sortCost),
        };
      })
      .filter((fleet) => fleet.usdValue > 0 || fleet.models.length > 0)
      .sort((a, b) => b.usdValue - a.usdValue);
  }, [fleetData, currency, rate]);

  const totalUsd = useMemo(() => {
    return normalizedFleet.reduce((acc, fleet) => acc + fleet.usdValue, 0);
  }, [normalizedFleet]);
  const positiveTotalUsd = Math.max(totalUsd, 0);
  const totalLabel = formatHeroTotal(totalUsd, currency, rate);

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose?.();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="cost-modal-backdrop" data-cost-analysis-backdrop="true" />
        <Dialog.Viewport className="fixed inset-0 z-[101] flex items-end justify-center p-0 sm:items-center sm:p-5">
          <Dialog.Popup className="cost-modal-popup relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-[20px] border border-b-0 border-[var(--v3-border)] bg-[var(--v3-bg-surface)] shadow-2xl sm:max-h-[82vh] sm:max-w-[640px] sm:rounded-[20px] sm:border-b">
            <div className="v3-sans-font shrink-0 border-b border-[var(--v3-border)] px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Dialog.Title className="text-[18px] font-semibold leading-6 tracking-tight text-[var(--v3-text-primary)]">
                    {copy("dashboard.cost_breakdown.title")}
                  </Dialog.Title>
                  <Dialog.Description className="mt-1 text-[12px] text-[var(--v3-text-secondary)]">
                    {copy("dashboard.cost_breakdown.total_label")}
                  </Dialog.Description>
                </div>
                <Dialog.Close
                  type="button"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-[var(--v3-text-secondary)] transition-colors hover:border-[var(--v3-border)] hover:bg-[var(--v3-bg-elevated)] hover:text-[var(--v3-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--v3-emerald)]/50"
                  aria-label={copy("dashboard.cost_breakdown.close")}
                >
                  <X className="h-[18px] w-[18px] stroke-[1.8]" aria-hidden="true" />
                </Dialog.Close>
              </div>
              <p className="mt-5 text-[40px] font-semibold leading-none text-[var(--v3-emerald)] v3-display-num sm:text-[46px]">
                {totalLabel}
              </p>
            </div>

            <div
              role={normalizedFleet.length > 0 ? "table" : undefined}
              aria-label={normalizedFleet.length > 0 ? copy("dashboard.cost_breakdown.title") : undefined}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain oai-scrollbar"
            >
              {normalizedFleet.length === 0 ? (
                <div className="flex min-h-[180px] items-center justify-center px-6 py-10 text-center text-[13px] text-[var(--v3-text-secondary)]">
                  {copy("dashboard.cost_breakdown.empty")}
                </div>
              ) : (
                <>
                  <div role="rowgroup" className="sticky top-0 z-10 border-b border-[var(--v3-border)] bg-[var(--v3-bg-elevated)] px-5 py-2 text-[11px] font-semibold text-[var(--v3-text-secondary)] sm:px-6">
                    <div role="row" className="grid grid-cols-[minmax(0,1fr)_104px] gap-4">
                      <span role="columnheader">{copy("dashboard.cost_breakdown.model_column")}</span>
                      <span role="columnheader" className="text-right">{copy("dashboard.cost_breakdown.cost_column")}</span>
                    </div>
                  </div>
                  <div className="divide-y divide-[var(--v3-border)]">
                  {normalizedFleet.map((fleet, index) => {
                    const rowGroupId = `fleet-${index}`;
                    const share = positiveTotalUsd ? (fleet.usdValue / positiveTotalUsd) * 100 : 0;
                    return (
                      <div
                        key={`${fleet.label}-${index}`}
                        role="rowgroup"
                        aria-labelledby={rowGroupId}
                        className="px-5 py-4 sm:px-6 sm:py-5"
                      >
                        <div role="row" className="grid grid-cols-[minmax(0,1fr)_104px] items-baseline gap-4">
                          <span
                            id={rowGroupId}
                            role="rowheader"
                            className="min-w-0 truncate text-[13px] font-semibold tracking-[0.02em] text-[var(--v3-text-primary)]"
                            title={fleet.label}
                          >
                            {fleet.label}
                          </span>
                          <span role="cell" className="text-right text-[15px] font-semibold text-[var(--v3-text-primary)] v3-mono-num">
                            {fleet.costLabel || "—"}
                          </span>
                        </div>

                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--v3-bg-elevated)]" aria-hidden="true">
                          <div
                            className={`h-full rounded-full ${index === 0 ? "bg-[var(--v3-emerald)]" : "bg-[var(--v3-blue)]"}`}
                            style={{ width: `${Math.min(100, Math.max(share, 0))}%` }}
                          />
                        </div>

                        {Boolean(fleet.models.length) && (
                          <div className="mt-3 space-y-0.5 border-l border-[var(--v3-border)] pl-3">
                            {fleet.models.map((model, mi) => (
                              <div
                                key={model.id || `${model.name}-${mi}`}
                                role="row"
                                className="grid grid-cols-[minmax(0,1fr)_104px] items-baseline gap-4 py-1.5"
                              >
                                <span
                                  role="cell"
                                  className="min-w-0 truncate font-mono text-[12px] text-[var(--v3-text-secondary)]"
                                  title={model.name}
                                >
                                  {model.name}
                                </span>
                                <span role="cell" className="text-right text-[12px] font-medium text-[var(--v3-text-secondary)] v3-mono-num">
                                  {model.costLabel || ""}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  </div>
                </>
              )}
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
});
