import { v } from "convex/values";

import { query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import {
  MAX_HISTORY_LIMIT,
  clampHistoryLimit,
  createUnifiedMigrationJobRowValidator,
} from "./lib/mondayBackfillShared";

const DEFAULT_AGGREGATE_LIMIT = 200;
const MIN_PER_TOOL_FETCH = 50;

const unifiedToolHistoryRowValidator = createUnifiedMigrationJobRowValidator(
  v.union(
    v.literal("monthly_migration"),
    v.literal("hire_event_backfill"),
    v.literal("touch_range_backfill"),
    v.literal("touch_backfill"),
    v.literal("touch_csv_export"),
    v.literal("bulk_sync"),
  ),
);

type UnifiedToolHistoryRow = {
  toolType:
    | "monthly_migration"
    | "hire_event_backfill"
    | "touch_range_backfill"
    | "touch_backfill"
    | "touch_csv_export"
    | "bulk_sync";
  toolLabel: string;
  legacy: boolean;
  jobId: string;
  status: "running" | "done" | "failed" | "cancelled";
  workflowId?: string | null;
  startedAt: number;
  updatedAt: number;
  finishedAt?: number | null;
  dryRun?: boolean;
  sourceBoardId?: string | null;
  sourceBoardName?: string | null;
  targetBoardId?: string | null;
  sourceTag?: string | null;
  baselineDate?: string | null;
  monthTag?: string | null;
  monthKey?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  pageSize?: number;
  processedCount: number;
  mappedCount: number;
  skippedCount: number;
  createdCount: number;
  updatedCount: number;
  errorCount: number;
  warningCount: number;
  lastError?: string | null;
  searchText: string;
};

const perToolFetchLimit = (limit: number) =>
  Math.min(MAX_HISTORY_LIMIT, Math.max(MIN_PER_TOOL_FETCH, limit * 3));

const listMonthlyMigrationJobs = async (
  ctx: QueryCtx,
  limit: number,
): Promise<UnifiedToolHistoryRow[]> => {
  const jobs = await ctx.db
    .query("mondayMonthlyMigrationJobs")
    .withIndex("by_startedAt", (q) => q)
    .order("desc")
    .take(limit);

  return jobs.map((job) => {
    const searchText = [
      "monthly migration",
      "monthly_migration",
      job._id,
      job.workflowId ?? "",
      job.sourceBoardId,
      job.sourceBoardName ?? "",
      job.targetBoardId,
      job.monthTag,
      job.monthKey ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return {
      toolType: "monthly_migration" as const,
      toolLabel: "Monthly Migration",
      legacy: false,
      jobId: String(job._id),
      status: job.status,
      workflowId: job.workflowId ?? null,
      startedAt: job.startedAt,
      updatedAt: job.updatedAt,
      finishedAt: job.finishedAt ?? null,
      dryRun: job.dryRun,
      sourceBoardId: job.sourceBoardId,
      sourceBoardName: job.sourceBoardName ?? null,
      targetBoardId: job.targetBoardId,
      sourceTag: null,
      baselineDate: null,
      monthTag: job.monthTag,
      monthKey: job.monthKey ?? null,
      dateFrom: null,
      dateTo: null,
      pageSize: job.pageSize,
      processedCount: job.processedContacts,
      mappedCount: job.mappedContacts,
      skippedCount: job.skippedContacts,
      createdCount:
        job.createdParentUpdates + job.createdSubitems + job.createdSubitemUpdates,
      updatedCount: job.updatedProgressColumns ?? 0,
      errorCount: job.errorsCount,
      warningCount: job.warningsCount,
      lastError: job.lastError ?? null,
      searchText,
    };
  });
};

const listHireEventBackfillJobs = async (
  ctx: QueryCtx,
  limit: number,
): Promise<UnifiedToolHistoryRow[]> => {
  const jobs = await ctx.db
    .query("mondayHireEventBackfillJobs")
    .withIndex("by_startedAt", (q) => q)
    .order("desc")
    .take(limit);

  return jobs.map((job) => {
    const searchText = [
      "hire event backfill",
      "hire_event_backfill",
      job._id,
      job.workflowId ?? "",
      job.monthKey,
      job.dateFrom,
      job.dateTo,
      job.contactBoardId,
      job.subitemBoardId ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return {
      toolType: "hire_event_backfill" as const,
      toolLabel: "Hire Event Backfill",
      legacy: false,
      jobId: String(job._id),
      status: job.status,
      workflowId: job.workflowId ?? null,
      startedAt: job.startedAt,
      updatedAt: job.updatedAt,
      finishedAt: job.finishedAt ?? null,
      dryRun: job.dryRun,
      sourceBoardId: job.contactBoardId,
      sourceBoardName: null,
      targetBoardId: job.subitemBoardId ?? null,
      sourceTag: null,
      baselineDate: null,
      monthTag: null,
      monthKey: job.monthKey,
      dateFrom: job.dateFrom,
      dateTo: job.dateTo,
      pageSize: job.pageSize,
      processedCount: job.processedContacts,
      mappedCount: job.inRangeContacts,
      skippedCount: job.skippedEvents,
      createdCount: job.createdEvents,
      updatedCount: 0,
      errorCount: job.errorsCount,
      warningCount: 0,
      lastError: job.lastError ?? null,
      searchText,
    };
  });
};

const listTouchRangeBackfillJobs = async (
  ctx: QueryCtx,
  limit: number,
): Promise<UnifiedToolHistoryRow[]> => {
  const jobs = await ctx.db
    .query("mondayTouchRangeBackfillJobs")
    .withIndex("by_startedAt", (q) => q)
    .order("desc")
    .take(limit);

  return jobs.map((job) => {
    const searchText = [
      "touch range backfill",
      "touch_range_backfill",
      job._id,
      job.workflowId ?? "",
      job.dateFrom,
      job.dateTo,
      job.contactBoardId,
      job.touchBoardId,
    ]
      .join(" ")
      .toLowerCase();

    return {
      toolType: "touch_range_backfill" as const,
      toolLabel: "Touch Range Backfill",
      legacy: true,
      jobId: String(job._id),
      status: job.status,
      workflowId: job.workflowId ?? null,
      startedAt: job.startedAt,
      updatedAt: job.updatedAt,
      finishedAt: job.finishedAt ?? null,
      dryRun: job.dryRun,
      sourceBoardId: job.contactBoardId,
      sourceBoardName: null,
      targetBoardId: job.touchBoardId,
      sourceTag: null,
      baselineDate: null,
      monthTag: null,
      monthKey: null,
      dateFrom: job.dateFrom,
      dateTo: job.dateTo,
      pageSize: job.pageSize,
      processedCount: job.processedContacts,
      mappedCount: job.inRangeContacts,
      skippedCount: job.skippedTouches,
      createdCount: job.createdTouches,
      updatedCount: job.updatedTouches,
      errorCount: job.errorsCount,
      warningCount: 0,
      lastError: job.lastError ?? null,
      searchText,
    };
  });
};

const listTouchBackfillJobs = async (
  ctx: QueryCtx,
  limit: number,
): Promise<UnifiedToolHistoryRow[]> => {
  const jobs = await ctx.db
    .query("mondayTouchBackfillJobs")
    .withIndex("by_startedAt", (q) => q)
    .order("desc")
    .take(limit);

  return jobs.map((job) => {
    const searchText = [
      "touch backfill",
      "touch_backfill",
      "baseline",
      job._id,
      job.workflowId ?? "",
      job.sourceTag,
      job.baselineDate,
      job.contactBoardId,
      job.touchBoardId,
    ]
      .join(" ")
      .toLowerCase();

    return {
      toolType: "touch_backfill" as const,
      toolLabel: "Baseline Touch Backfill",
      legacy: true,
      jobId: String(job._id),
      status: job.status,
      workflowId: job.workflowId ?? null,
      startedAt: job.startedAt,
      updatedAt: job.updatedAt,
      finishedAt: job.finishedAt ?? null,
      dryRun: false,
      sourceBoardId: job.contactBoardId,
      sourceBoardName: null,
      targetBoardId: job.touchBoardId,
      sourceTag: job.sourceTag,
      baselineDate: job.baselineDate,
      monthTag: null,
      monthKey: null,
      dateFrom: null,
      dateTo: null,
      pageSize: job.pageSize,
      processedCount: job.processedContacts,
      mappedCount: 0,
      skippedCount: job.skippedTouches,
      createdCount: job.createdTouches,
      updatedCount: 0,
      errorCount: job.errorsCount,
      warningCount: 0,
      lastError: job.lastError ?? null,
      searchText,
    };
  });
};

const listTouchCsvExportJobs = async (
  ctx: QueryCtx,
  limit: number,
): Promise<UnifiedToolHistoryRow[]> => {
  const jobs = await ctx.db
    .query("mondayTouchCsvExportJobs")
    .withIndex("by_startedAt", (q) => q)
    .order("desc")
    .take(limit);

  return jobs.map((job) => {
    const searchText = [
      "touch csv export",
      "touch_csv_export",
      job._id,
      job.workflowId ?? "",
      job.sourceTag,
      job.baselineDate,
      job.contactBoardId,
    ]
      .join(" ")
      .toLowerCase();

    return {
      toolType: "touch_csv_export" as const,
      toolLabel: "Touch CSV Export",
      legacy: true,
      jobId: String(job._id),
      status: job.status,
      workflowId: job.workflowId ?? null,
      startedAt: job.startedAt,
      updatedAt: job.updatedAt,
      finishedAt: job.finishedAt ?? null,
      dryRun: true,
      sourceBoardId: job.contactBoardId,
      sourceBoardName: null,
      targetBoardId: null,
      sourceTag: job.sourceTag,
      baselineDate: job.baselineDate,
      monthTag: null,
      monthKey: null,
      dateFrom: null,
      dateTo: null,
      pageSize: job.pageSize,
      processedCount: job.processedContacts,
      mappedCount: 0,
      skippedCount: 0,
      createdCount: job.rowCount,
      updatedCount: job.chunkCount,
      errorCount: 0,
      warningCount: 0,
      lastError: job.lastError ?? null,
      searchText,
    };
  });
};

const listBulkSyncJobs = async (
  ctx: QueryCtx,
  limit: number,
): Promise<UnifiedToolHistoryRow[]> => {
  const jobs = await ctx.db
    .query("mondayBulkSyncJobs")
    .withIndex("by_startedAt", (q) => q)
    .order("desc")
    .take(limit);

  return jobs.map((job) => {
    const searchText = [
      "bulk sync",
      "bulk_sync",
      job._id,
      job.workflowId ?? "",
      job.mondayAccountId,
      job.ownerId,
      job.requestedByMondayUserId,
    ]
      .join(" ")
      .toLowerCase();

    return {
      toolType: "bulk_sync" as const,
      toolLabel: "Contact Sync",
      legacy: false,
      jobId: String(job._id),
      status: job.status,
      workflowId: job.workflowId ?? null,
      startedAt: job.startedAt,
      updatedAt: job.updatedAt,
      finishedAt: job.finishedAt ?? null,
      dryRun: false,
      sourceBoardId: null,
      sourceBoardName: null,
      targetBoardId: job.monthlyBoardIdOverride ?? null,
      sourceTag: null,
      baselineDate: null,
      monthTag: null,
      monthKey: null,
      dateFrom: null,
      dateTo: null,
      pageSize: 25,
      processedCount: job.processedContacts,
      mappedCount: job.succeededContacts,
      skippedCount: 0,
      createdCount: job.succeededContacts,
      updatedCount: 0,
      errorCount: job.failedContacts,
      warningCount: job.warningsCount,
      lastError: job.lastError ?? null,
      searchText,
    };
  });
};

/** Aggregates recent jobs across all Monday tool tables, sorted by startedAt descending. */
export const listRecentJobs = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(unifiedToolHistoryRowValidator),
  handler: async (ctx, args) => {
    const limit = clampHistoryLimit(args.limit ?? DEFAULT_AGGREGATE_LIMIT);
    const perToolLimit = perToolFetchLimit(limit);

    const [monthlyJobs, hireEventJobs, touchRangeJobs, touchBackfillJobs, touchCsvJobs, bulkSyncJobs] =
      await Promise.all([
        listMonthlyMigrationJobs(ctx, perToolLimit),
        listHireEventBackfillJobs(ctx, perToolLimit),
        listTouchRangeBackfillJobs(ctx, perToolLimit),
        listTouchBackfillJobs(ctx, perToolLimit),
        listTouchCsvExportJobs(ctx, perToolLimit),
        listBulkSyncJobs(ctx, perToolLimit),
      ]);

    return [
      ...monthlyJobs,
      ...hireEventJobs,
      ...touchRangeJobs,
      ...touchBackfillJobs,
      ...touchCsvJobs,
      ...bulkSyncJobs,
    ]
      .sort((a, b) => {
        if (b.startedAt !== a.startedAt) return b.startedAt - a.startedAt;
        return b.updatedAt - a.updatedAt;
      })
      .slice(0, limit);
  },
});
