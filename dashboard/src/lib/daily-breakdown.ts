import { formatDateUTC } from "./date-range";

type DailyBreakdownRangeOptions = {
  period?: string;
  selectedFrom?: string;
  selectedTo?: string;
  todayKey?: string;
};

type DailyBreakdownRow = {
  day?: string;
  missing?: boolean;
  future?: boolean;
  [key: string]: unknown;
};

function parseUtcDateKey(value?: string): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return formatDateUTC(date) === value ? date : null;
}

export function buildDailyBreakdownRange({
  period,
  selectedFrom,
  selectedTo,
  todayKey,
}: DailyBreakdownRangeOptions = {}) {
  if (period === "total" && selectedFrom && selectedTo) {
    return { from: selectedFrom, to: selectedTo };
  }

  const end = parseUtcDateKey(todayKey) || new Date();
  const start = new Date(Date.UTC(
    end.getUTCFullYear(),
    end.getUTCMonth(),
    end.getUTCDate() - 29,
  ));
  return { from: formatDateUTC(start), to: formatDateUTC(end) };
}

function hasActualUsage(row: DailyBreakdownRow): boolean {
  if (row?.missing || row?.future) return false;
  const totalTokens = Number(row?.total_tokens ?? 0);
  const billableTokens = Number(row?.billable_total_tokens ?? 0);
  const inputTokens = Number(row?.input_tokens ?? 0);
  const outputTokens = Number(row?.output_tokens ?? 0);
  const conversationCount = Number(row?.conversation_count ?? 0);
  return (
    totalTokens > 0 ||
    billableTokens > 0 ||
    inputTokens > 0 ||
    outputTokens > 0 ||
    conversationCount > 0
  );
}

export function selectDailyBreakdownRows(
  rows: DailyBreakdownRow[] | null | undefined,
  { period }: { period?: string } = {},
) {
  const list = Array.isArray(rows) ? rows : [];
  const validRows = list.filter(
    (row) => Boolean(row?.day) && !row?.future && !row?.missing && hasActualUsage(row),
  );
  return validRows.slice(-30);
}
