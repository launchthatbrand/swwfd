/* eslint-disable @typescript-eslint/no-explicit-any */
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { workflow } from "./workflow";

const workflowAny = workflow as any;
const internalAny = internal as any;

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
  workflowId: v.union(v.string(), v.null()),
  mondayAccountId: v.string(),
  requestedByMondayUserId: v.string(),
  requestedByMondayAppClientId: v.union(v.string(), v.null()),
  ownerId: v.string(),
  monthlyBoardIdOverride: v.union(v.string(), v.null()),
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

const bulkSyncJobResultValidator = v.object({
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
  attemptedAt: v.number(),
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
    workflowId?: string | null;
    monthlyBoardIdOverride?: string | null;
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
    workflowId: job.workflowId ?? null,
    monthlyBoardIdOverride: job.monthlyBoardIdOverride ?? null,
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
    monthlyBoardIdOverride: v.optional(v.string()),
    contactItemIds: v.array(v.string()),
    monthlyBoardMappings: v.array(monthlyBoardMappingValidator),
  },
  returns: bulkSyncJobSummaryValidator,
  handler: async (ctx, args) => {
    const mondayAccountId = args.mondayAccountId.trim();
    const requestedByMondayUserId = args.requestedByMondayUserId.trim();
    const ownerId = args.ownerId.trim();
    const monthlyBoardIdOverride = args.monthlyBoardIdOverride?.trim() || null;
    const requestedByMondayAppClientId =
      args.requestedByMondayAppClientId?.trim() || null;
    if (!mondayAccountId || !requestedByMondayUserId || !ownerId) {
      throw new Error("Missing required sync job identity values");
    }
    const normalizedContactIds = normalizeContactIds(args.contactItemIds);
    if (normalizedContactIds.length === 0) {
      throw new Error("No contact IDs provided for bulk sync");
    }
    const now = Date.now();
    const jobId = await ctx.db.insert("mondayBulkSyncJobs", {
      status: "running",
      mondayAccountId,
      requestedByMondayUserId,
      requestedByMondayAppClientId,
      ownerId,
      workflowId: null,
      monthlyBoardIdOverride,
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
    const workflowId = await workflowAny.start(
      ctx,
      internalAny.mondayBulkSync.runWorkflow,
      { jobId },
    );
    await ctx.db.patch(jobId, {
      workflowId,
      updatedAt: Date.now(),
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

export const listJobsForAccount = query({
  args: {
    mondayAccountId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(bulkSyncJobSummaryValidator),
  handler: async (ctx, args) => {
    const mondayAccountId = args.mondayAccountId.trim();
    if (!mondayAccountId) return [];
    const limit = Math.min(Math.max(Math.floor(args.limit ?? 20), 1), 100);
    const jobs = await ctx.db
      .query("mondayBulkSyncJobs")
      .withIndex("by_account_and_startedAt", (q) =>
        q.eq("mondayAccountId", mondayAccountId),
      )
      .order("desc")
      .take(limit);
    return jobs.map((job) => toJobSummary(job));
  },
});

export const listRecentJobs = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(bulkSyncJobSummaryValidator),
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(Math.floor(args.limit ?? 100), 1), 500);
    const jobs = await ctx.db
      .query("mondayBulkSyncJobs")
      .withIndex("by_startedAt", (q) => q)
      .order("desc")
      .take(limit);
    return jobs.map((job) => toJobSummary(job));
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
    attemptedCount: v.optional(v.number()),
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
    return await applyBatchResultsToJob(ctx, args.jobId, args.results, args.attemptedCount);
  },
});

export const recordBatchResultsInternal = internalMutation({
  args: {
    jobId: v.id("mondayBulkSyncJobs"),
    attemptedCount: v.optional(v.number()),
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
    return await applyBatchResultsToJob(ctx, args.jobId, args.results, args.attemptedCount);
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

export const listJobResults = query({
  args: {
    jobId: v.id("mondayBulkSyncJobs"),
    limit: v.optional(v.number()),
    status: v.optional(v.union(v.literal("success"), v.literal("failed"))),
  },
  returns: v.array(bulkSyncJobResultValidator),
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(Math.floor(args.limit ?? 200), 1), 2000);
    const entries = await ctx.db
      .query("mondayBulkSyncJobResults")
      .withIndex("by_jobId", (q) => q.eq("jobId", args.jobId))
      .order("desc")
      .take(limit);
    const filtered = args.status
      ? entries.filter((entry) => entry.status === args.status)
      : entries;
    return filtered.map((entry) => ({
      contactItemId: entry.contactItemId,
      status: entry.status,
      linkedItemCount: entry.linkedItemCount,
      createdParentUpdates: entry.createdParentUpdates,
      createdSubitems: entry.createdSubitems,
      createdSubitemUpdates: entry.createdSubitemUpdates,
      updatedProgressColumns: entry.updatedProgressColumns,
      skippedSubitems: entry.skippedSubitems,
      warnings: entry.warnings,
      error: entry.error,
      attemptedAt: entry.attemptedAt,
    }));
  },
});

export const getJobForWorkflow = internalQuery({
  args: { jobId: v.id("mondayBulkSyncJobs") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("mondayBulkSyncJobs"),
      status: bulkSyncStatusValidator,
      ownerId: v.string(),
      monthlyBoardIdOverride: v.union(v.string(), v.null()),
      monthlyBoardMappings: v.array(monthlyBoardMappingValidator),
      contactItemIds: v.array(v.string()),
      totalContacts: v.number(),
      nextIndex: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    return {
      _id: job._id,
      status: job.status,
      ownerId: job.ownerId,
      monthlyBoardIdOverride: job.monthlyBoardIdOverride ?? null,
      monthlyBoardMappings: job.monthlyBoardMappings,
      contactItemIds: job.contactItemIds,
      totalContacts: job.totalContacts,
      nextIndex: job.nextIndex,
    };
  },
});

export const finishJobInternal = internalMutation({
  args: {
    jobId: v.id("mondayBulkSyncJobs"),
    status: v.union(v.literal("done"), v.literal("failed"), v.literal("cancelled")),
    lastError: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: args.status,
      finishedAt: Date.now(),
      updatedAt: Date.now(),
      lastError: args.lastError ?? null,
    });
    return null;
  },
});

export const runWorkflow = workflowAny.define({
  args: { jobId: v.id("mondayBulkSyncJobs") },
  returns: v.null(),
  handler: async (step: any, args: { jobId: Id<"mondayBulkSyncJobs"> }) => {
    try {
      while (true) {
        const job = await step.runQuery(
          internalAny.mondayBulkSync.getJobForWorkflow,
          { jobId: args.jobId },
        );
        if (!job) break;
        if (job.status !== "running") break;

        const start = Math.max(0, Math.min(job.nextIndex, job.totalContacts));
        const end = Math.min(start + 25, job.totalContacts);
        const contactItemIds = job.contactItemIds.slice(start, end);
        if (contactItemIds.length === 0) {
          await step.runMutation(internalAny.mondayBulkSync.finishJobInternal, {
            jobId: args.jobId,
            status: "done",
            lastError: null,
          });
          break;
        }

        const batch = await step.runAction(
          internalAny.mondayBulkSyncNode.syncContactBatchAction,
          {
            jobId: String(args.jobId),
            ownerId: job.ownerId,
            monthlyBoardIdOverride: job.monthlyBoardIdOverride ?? undefined,
            monthlyBoardMappings: job.monthlyBoardMappings,
            contactItemIds,
          },
        );

        const updated = await step.runMutation(
          internalAny.mondayBulkSync.recordBatchResultsInternal,
          {
            jobId: args.jobId,
            attemptedCount: contactItemIds.length,
            results: batch.results,
          },
        );

        if (!updated) {
          await step.runMutation(internalAny.mondayBulkSync.finishJobInternal, {
            jobId: args.jobId,
            status: "failed",
            lastError: "Bulk sync job disappeared while processing",
          });
          break;
        }
        if (updated.status !== "running" || updated.nextIndex >= updated.totalContacts) {
          if (updated.status === "running") {
            await step.runMutation(internalAny.mondayBulkSync.finishJobInternal, {
              jobId: args.jobId,
              status: "done",
              lastError: null,
            });
          }
          break;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown workflow failure";
      await step.runMutation(internalAny.mondayBulkSync.finishJobInternal, {
        jobId: args.jobId,
        status: "failed",
        lastError: message,
      });
    }
    return null;
  },
});

const applyBatchResultsToJob = async (
  ctx: any,
  jobId: Id<"mondayBulkSyncJobs">,
  results: Array<{
    contactItemId: string;
    status: "success" | "failed";
    linkedItemCount: number;
    createdParentUpdates: number;
    createdSubitems: number;
    createdSubitemUpdates: number;
    updatedProgressColumns: number;
    skippedSubitems: number;
    warnings: string[];
    error: string | null;
  }>,
  attemptedCount?: number,
) => {
  const job = await ctx.db.get(jobId);
  if (!job) return null;
  if (job.status !== "running") {
    return toJobSummary(job);
  }
  let processedDelta = 0;
  let successDelta = 0;
  let failedDelta = 0;
  let warningsDelta = 0;
  const now = Date.now();

  for (const result of results) {
    const contactItemId = result.contactItemId.trim();
    if (!contactItemId) continue;
    const existing = await ctx.db
      .query("mondayBulkSyncJobResults")
      .withIndex("by_jobId_and_contactItemId", (q: any) =>
        q.eq("jobId", jobId).eq("contactItemId", contactItemId),
      )
      .first();
    if (existing) continue;
    await ctx.db.insert("mondayBulkSyncJobResults", {
      jobId,
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
  const indexDelta = Math.max(0, attemptedCount ?? processedDelta);
  const nextIndex = Math.min(job.totalContacts, job.nextIndex + indexDelta);
  const shouldFinish = nextIndex >= job.totalContacts && job.status === "running";

  await ctx.db.patch(jobId, {
    nextIndex,
    processedContacts: nextProcessed,
    succeededContacts: nextSucceeded,
    failedContacts: nextFailed,
    warningsCount: nextWarnings,
    status: shouldFinish ? "done" : job.status,
    finishedAt: shouldFinish ? now : job.finishedAt ?? null,
    updatedAt: now,
  });
  const updated = await ctx.db.get(jobId);
  if (!updated) return null;
  return toJobSummary(updated);
};
