import { v } from "convex/values";

export const DEFAULT_HISTORY_LIMIT = 25;
export const MAX_HISTORY_LIMIT = 200;

export type BackfillJobStatus = "running" | "done" | "failed" | "cancelled";

export const backfillJobStatusValidator = v.union(
  v.literal("running"),
  v.literal("done"),
  v.literal("failed"),
  v.literal("cancelled"),
);

export const clampHistoryLimit = (value: number | undefined) => {
  if (!Number.isFinite(value)) return DEFAULT_HISTORY_LIMIT;
  return Math.min(MAX_HISTORY_LIMIT, Math.max(1, Math.floor(value!)));
};

export const clampPageSize = (
  value: number | undefined,
  opts?: { min?: number; max?: number; fallback?: number },
) => {
  const min = opts?.min ?? 25;
  const max = opts?.max ?? 200;
  const fallback = opts?.fallback ?? 50;
  return Math.max(min, Math.min(max, Math.floor(value ?? fallback)));
};

export const normalizeDateOnly = (value: string, label = "Date") => {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error(`${label} must be YYYY-MM-DD, got: ${trimmed}`);
  }
  return trimmed;
};

export const normalizeMonthKey = (value: string) => {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}$/.test(trimmed)) {
    throw new Error(`monthKey must be YYYY-MM, got: ${trimmed}`);
  }
  return trimmed;
};

export const monthKeyToRange = (monthKey: string) => {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    throw new Error("Invalid monthKey");
  }
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  const dateFrom = start.toISOString().slice(0, 10);
  const dateTo = end.toISOString().slice(0, 10);
  return { dateFrom, dateTo };
};

export const getMondayBackfillEnv = (opts?: { requireTouchBoard?: boolean }) => {
  const contactBoardId = process.env.MONDAY_BOARD_ID?.trim() ?? "";
  if (!contactBoardId) throw new Error("MONDAY_BOARD_ID is missing");

  if (opts?.requireTouchBoard !== false) {
    const touchBoardId = process.env.MONDAY_CONTACT_TOUCHED_BOARD_ID?.trim() ?? "";
    if (!touchBoardId) {
      throw new Error("MONDAY_CONTACT_TOUCHED_BOARD_ID is missing");
    }
    return { contactBoardId, touchBoardId };
  }
  return { contactBoardId, touchBoardId: "" };
};

/**
 * Shared validator shape for the unified migration job row displayed in the tools UI.
 * Each backfill module provides its own `toolType` literal via the factory.
 */
export const createUnifiedMigrationJobRowValidator = (
  toolType: ReturnType<typeof v.union> | ReturnType<typeof v.literal>,
) =>
  v.object({
    toolType,
    toolLabel: v.string(),
    legacy: v.boolean(),
    jobId: v.string(),
    status: backfillJobStatusValidator,
    workflowId: v.optional(v.union(v.string(), v.null())),
    startedAt: v.number(),
    updatedAt: v.number(),
    finishedAt: v.optional(v.union(v.number(), v.null())),
    dryRun: v.optional(v.boolean()),
    sourceBoardId: v.optional(v.union(v.string(), v.null())),
    sourceBoardName: v.optional(v.union(v.string(), v.null())),
    targetBoardId: v.optional(v.union(v.string(), v.null())),
    sourceTag: v.optional(v.union(v.string(), v.null())),
    baselineDate: v.optional(v.union(v.string(), v.null())),
    monthTag: v.optional(v.union(v.string(), v.null())),
    monthKey: v.optional(v.union(v.string(), v.null())),
    dateFrom: v.optional(v.union(v.string(), v.null())),
    dateTo: v.optional(v.union(v.string(), v.null())),
    pageSize: v.optional(v.number()),
    processedCount: v.number(),
    mappedCount: v.number(),
    skippedCount: v.number(),
    createdCount: v.number(),
    updatedCount: v.number(),
    errorCount: v.number(),
    warningCount: v.number(),
    lastError: v.optional(v.union(v.string(), v.null())),
    searchText: v.string(),
  });
