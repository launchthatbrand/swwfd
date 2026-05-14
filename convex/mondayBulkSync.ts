import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

const bulkSyncStatusValidator = v.union(
  v.literal("running"),
  v.literal("done"),
  v.literal("failed"),
  v.literal("cancelled"),
);

const monthlyBoardMappingValidator = v.object({
  monthKey: v.string(),
  boardId: v.string(),
});

const bulkSyncJobSummaryValidator = v.object({
  jobId: v.id("mondayBulkSyncJobs"),
  status: bulkSyncStatusValidator,
  mondayAccountId: v.string(),
  requestedByMondayUserId: v.string(),
  requestedByMondayAppClientId: v.union(v.string(), v.null()),
  ownerId: v.string(),
  totalContacts: v.number(),
  nextIndex: v.number(),
  processedContacts: v.number(),
  succeededContacts: v.number(),
  failedContacts: v.number(),
  warningsCount: v.number(),
  startedAt: v.number(),
  updatedAt: v.number(),
  finishedAt: v.union(v.number(), v.null()),
  lastError: v.union(v.string(), v.null()),
});

const normalizeContactIds = (values: string[]) => {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );
};

const normalizeMonthlyBoardMappings = (
  values: Array<{ monthKey: string; boardId: string }>,
) => {
  const deduped = new Map<string, { monthKey: string; boardId: string }>();
  for (const value of values) {
    const monthKey = value.monthKey.trim();
    const boardId = value.boardId.trim();
    if (!/^\d{4}-\d{2}$/.test(monthKey) || boardId.length === 0) continue;
    deduped.set(monthKey, { monthKey, boardId });
  }
  return Array.from(deduped.values()).sort((left, right) =>
    left.monthKey.localeCompare(right.monthKey),
  );
};

const toJobSummary = (
  job: {
    _id: Id<"mondayBulkSyncJobs">;
    status: "running" | "done" | "failed" | "cancelled";
    mondayAccountId: string;
    requestedByMondayUserId: string;
    requestedByMondayAppClientId: string | null;
    ownerId: string;
    totalContacts: number;
    nextIndex: number;
    processedContacts: number;
    succeededContacts: number;
    failedContacts: number;
    warningsCount: number;
    startedAt: number;
    updatedAt: number;
    finishedAt?: number | null;
    lastError?: string | null;
  },
) => {
  return {
    jobId: job._id,
    status: job.status,
    mondayAccountId: job.mondayAccountId,
    requestedByMondayUserId: job.requestedByMondayUserId,
    requestedByMondayAppClientId: job.requestedByMondayAppClientId ?? null,
    ownerId: job.ownerId,
    totalContacts: job.totalContacts,
    nextIndex: job.nextIndex,
    processedContacts: job.processedContacts,
    succeededContacts: job.succeededContacts,
    failedContacts: job.failedContacts,
    warningsCount: job.warningsCount,
    startedAt: job.startedAt,
    updatedAt: job.updatedAt,
    finishedAt: job.finishedAt ?? null,
    lastError: job.lastError ?? null,
  };
};

export const createJob = mutation({
  args: {
    mondayAccountId: v.string(),
    requestedByMondayUserId: v.string(),
    requestedByMondayAppClientId: v.optional(v.string()),
    ownerId: v.string(),
    contactItemIds: v.array(v.string()),
    monthlyBoardMappings: v.array(monthlyBoardMappingValidator),
  },
  returns: bulkSyncJobSummaryValidator,
  handler: async (ctx, args) => {
    const mondayAccountId = args.mondayAccountId.trim();
    const requestedByMondayUserId = args.requestedByMondayUserId.trim();
    const ownerId = args.ownerId.trim();
    const requestedByMondayAppClientId =
      args.requestedByMondayAppClientId?.trim() || null;
    if (!mondayAccountId || !requestedByMondayUserId || !ownerId) {
      throw new Error("Missing required sync job identity values");
    }
    const normalizedContactIds = normalizeContactIds(args.contactItemIds);
    if (normalizedContactIds.length === 0) {
      throw new Error("No contact IDs provided for bulk sync");
    }
    const latestForAccount = await ctx.db
      .query("mondayBulkSyncJobs")
      .withIndex("by_account_and_startedAt", (q) =>
        q.eq("mondayAccountId", mondayAccountId),
      )
      .order("desc")
      .first();
    if (latestForAccount?.status === "running") {
      throw new Error("A bulk sync job is already running");
    }
    const now = Date.now();
    const jobId = await ctx.db.insert("mondayBulkSyncJobs", {
      status: "running",
      mondayAccountId,
      requestedByMondayUserId,
      requestedByMondayAppClientId,
      ownerId,
      contactItemIds: normalizedContactIds,
      monthlyBoardMappings: normalizeMonthlyBoardMappings(args.monthlyBoardMappings),
      totalContacts: normalizedContactIds.length,
      nextIndex: 0,
      processedContacts: 0,
      succeededContacts: 0,
      failedContacts: 0,
      warningsCount: 0,
      startedAt: now,
      updatedAt: now,
      finishedAt: null,
      lastError: null,
    });
    const created = await ctx.db.get(jobId);
    if (!created) {
      throw new Error("Failed to create bulk sync job");
    }
    return toJobSummary(created);
  },
});

export const getJob = query({
  args: {
    jobId: v.id("mondayBulkSyncJobs"),
  },
  returns: v.union(v.null(), bulkSyncJobSummaryValidator),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    return toJobSummary(job);
  },
});

export const getLatestJobForAccount = query({
  args: {
    mondayAccountId: v.string(),
  },
  returns: v.union(v.null(), bulkSyncJobSummaryValidator),
  handler: async (ctx, args) => {
    const mondayAccountId = args.mondayAccountId.trim();
    if (!mondayAccountId) return null;
    const candidates = await ctx.db
      .query("mondayBulkSyncJobs")
      .withIndex("by_account_and_startedAt", (q) =>
        q.eq("mondayAccountId", mondayAccountId),
      )
      .order("desc")
      .take(1);
    const latest = candidates[0];
    if (!latest) return null;
    return toJobSummary(latest);
  },
});

export const claimNextBatch = mutation({
  args: {
    jobId: v.id("mondayBulkSyncJobs"),
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    status: bulkSyncStatusValidator,
    contactItemIds: v.array(v.string()),
    ownerId: v.string(),
    monthlyBoardMappings: v.array(monthlyBoardMappingValidator),
  }),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new Error("Bulk sync job not found");
    if (job.status !== "running") {
      return {
        status: job.status as "running" | "done" | "failed" | "cancelled",
        contactItemIds: [],
        ownerId: job.ownerId,
        monthlyBoardMappings: job.monthlyBoardMappings,
      };
    }
    const batchSize = Math.min(Math.max(Math.floor(args.batchSize ?? 6), 1), 25);
    const start = Math.max(0, Math.min(job.nextIndex, job.totalContacts));
    const end = Math.min(start + batchSize, job.totalContacts);
    const contactItemIds = job.contactItemIds.slice(start, end);
    return {
      status: "running" as const,
      contactItemIds,
      ownerId: job.ownerId,
      monthlyBoardMappings: job.monthlyBoardMappings,
    };
  },
});

export const recordBatchResults = mutation({
  args: {
    jobId: v.id("mondayBulkSyncJobs"),
    results: v.array(
      v.object({
        contactItemId: v.string(),
        status: v.union(v.literal("success"), v.literal("failed")),
        linkedItemCount: v.number(),
        createdParentUpdates: v.number(),
        createdSubitems: v.number(),
        createdSubitemUpdates: v.number(),
        updatedProgressColumns: v.number(),
        skippedSubitems: v.number(),
        warnings: v.array(v.string()),
        error: v.union(v.string(), v.null()),
      }),
    ),
  },
  returns: v.union(v.null(), bulkSyncJobSummaryValidator),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    if (job.status !== "running") {
      return toJobSummary(job);
    }
    let processedDelta = 0;
    let successDelta = 0;
    let failedDelta = 0;
    let warningsDelta = 0;
    const now = Date.now();

    for (const result of args.results) {
      const contactItemId = result.contactItemId.trim();
      if (!contactItemId) continue;
      const existing = await ctx.db
        .query("mondayBulkSyncJobResults")
        .withIndex("by_jobId_and_contactItemId", (q) =>
          q.eq("jobId", args.jobId).eq("contactItemId", contactItemId),
        )
        .first();
      if (existing) continue;
      await ctx.db.insert("mondayBulkSyncJobResults", {
        jobId: args.jobId,
        contactItemId,
        status: result.status,
        linkedItemCount: result.linkedItemCount,
        createdParentUpdates: result.createdParentUpdates,
        createdSubitems: result.createdSubitems,
        createdSubitemUpdates: result.createdSubitemUpdates,
        updatedProgressColumns: result.updatedProgressColumns,
        skippedSubitems: result.skippedSubitems,
        warnings: result.warnings,
        error: result.error,
        attemptedAt: now,
      });
      processedDelta += 1;
      warningsDelta += result.warnings.length;
      if (result.status === "success") successDelta += 1;
      else failedDelta += 1;
    }

    const nextProcessed = job.processedContacts + processedDelta;
    const nextSucceeded = job.succeededContacts + successDelta;
    const nextFailed = job.failedContacts + failedDelta;
    const nextWarnings = job.warningsCount + warningsDelta;
    const nextIndex = Math.min(job.totalContacts, job.nextIndex + processedDelta);
    const shouldFinish = nextProcessed >= job.totalContacts && job.status === "running";

    await ctx.db.patch(args.jobId, {
      nextIndex,
      processedContacts: nextProcessed,
      succeededContacts: nextSucceeded,
      failedContacts: nextFailed,
      warningsCount: nextWarnings,
      status: shouldFinish ? "done" : job.status,
      finishedAt: shouldFinish ? now : job.finishedAt ?? null,
      updatedAt: now,
    });
    const updated = await ctx.db.get(args.jobId);
    if (!updated) return null;
    return toJobSummary(updated);
  },
});

export const markJobFailed = mutation({
  args: {
    jobId: v.id("mondayBulkSyncJobs"),
    error: v.string(),
  },
  returns: v.union(v.null(), bulkSyncJobSummaryValidator),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    const now = Date.now();
    await ctx.db.patch(args.jobId, {
      status: "failed",
      lastError: args.error.trim() || "Unknown error",
      finishedAt: now,
      updatedAt: now,
    });
    const updated = await ctx.db.get(args.jobId);
    if (!updated) return null;
    return toJobSummary(updated);
  },
});

export const cancelJob = mutation({
  args: {
    jobId: v.id("mondayBulkSyncJobs"),
  },
  returns: v.union(v.null(), bulkSyncJobSummaryValidator),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    if (job.status !== "running") {
      return toJobSummary(job);
    }
    const now = Date.now();
    await ctx.db.patch(args.jobId, {
      status: "cancelled",
      finishedAt: now,
      updatedAt: now,
      lastError: "Cancelled by user",
    });
    const updated = await ctx.db.get(args.jobId);
    if (!updated) return null;
    return toJobSummary(updated);
  },
});

export const listFailedContactIds = query({
  args: {
    jobId: v.id("mondayBulkSyncJobs"),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("mondayBulkSyncJobResults")
      .withIndex("by_jobId", (q) => q.eq("jobId", args.jobId))
      .collect();
    return entries
      .filter((entry) => entry.status === "failed")
      .map((entry) => entry.contactItemId);
  },
});
