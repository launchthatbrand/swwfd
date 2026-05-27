/* eslint-disable @typescript-eslint/no-explicit-any */
import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { workflow } from "./workflow";

const workflowAny = workflow as any;
const internalAny = internal as any;

type RangeBackfillStatus = "running" | "done" | "failed" | "cancelled";
const DEFAULT_HISTORY_LIMIT = 25;
const MAX_HISTORY_LIMIT = 200;

const rangeBackfillStatusValidator = v.union(
  v.literal("running"),
  v.literal("done"),
  v.literal("failed"),
  v.literal("cancelled"),
);

const unifiedMigrationJobRowValidator = v.object({
  toolType: v.literal("touch_range_backfill"),
  toolLabel: v.string(),
  legacy: v.boolean(),
  jobId: v.string(),
  status: rangeBackfillStatusValidator,
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

const getMondayRangeBackfillEnv = () => {
  const contactBoardId = process.env.MONDAY_BOARD_ID?.trim() ?? "";
  const touchBoardId = process.env.MONDAY_CONTACT_TOUCHED_BOARD_ID?.trim() ?? "";
  if (!contactBoardId) throw new Error("MONDAY_BOARD_ID is missing");
  if (!touchBoardId) throw new Error("MONDAY_CONTACT_TOUCHED_BOARD_ID is missing");
  return { contactBoardId, touchBoardId };
};

const normalizeDateOnly = (value: string) => {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error(`Date must be YYYY-MM-DD, got: ${trimmed}`);
  }
  return trimmed;
};

const clampPageSize = (value: number | undefined) =>
  Math.max(25, Math.min(200, Math.floor(value ?? 50)));

const clampHistoryLimit = (value: number | undefined) => {
  if (!Number.isFinite(value)) return DEFAULT_HISTORY_LIMIT;
  return Math.min(MAX_HISTORY_LIMIT, Math.max(1, Math.floor(value!)));
};

// ---------------------------------------------------------------------------
// Public queries
// ---------------------------------------------------------------------------

export const getLatestJob = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      jobId: v.id("mondayTouchRangeBackfillJobs"),
      status: v.union(
        v.literal("running"),
        v.literal("done"),
        v.literal("failed"),
        v.literal("cancelled"),
      ),
      workflowId: v.optional(v.string()),
      dateFrom: v.string(),
      dateTo: v.string(),
      dryRun: v.boolean(),
      contactBoardId: v.string(),
      touchBoardId: v.string(),
      pageSize: v.number(),
      currentCursor: v.optional(v.union(v.string(), v.null())),
      processedContacts: v.number(),
      inRangeContacts: v.number(),
      createdTouches: v.number(),
      updatedTouches: v.number(),
      skippedTouches: v.number(),
      errorsCount: v.number(),
      startedAt: v.number(),
      updatedAt: v.number(),
      finishedAt: v.optional(v.union(v.number(), v.null())),
      lastError: v.optional(v.union(v.string(), v.null())),
    }),
  ),
  handler: async (ctx) => {
    const latest = await ctx.db
      .query("mondayTouchRangeBackfillJobs")
      .withIndex("by_startedAt", (q) => q)
      .order("desc")
      .first();
    if (!latest) return null;
    return {
      jobId: latest._id,
      status: latest.status,
      workflowId: latest.workflowId,
      dateFrom: latest.dateFrom,
      dateTo: latest.dateTo,
      dryRun: latest.dryRun,
      contactBoardId: latest.contactBoardId,
      touchBoardId: latest.touchBoardId,
      pageSize: latest.pageSize,
      currentCursor: latest.currentCursor,
      processedContacts: latest.processedContacts,
      inRangeContacts: latest.inRangeContacts,
      createdTouches: latest.createdTouches,
      updatedTouches: latest.updatedTouches,
      skippedTouches: latest.skippedTouches,
      errorsCount: latest.errorsCount,
      startedAt: latest.startedAt,
      updatedAt: latest.updatedAt,
      finishedAt: latest.finishedAt,
      lastError: latest.lastError,
    };
  },
});

export const listRecentJobs = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(unifiedMigrationJobRowValidator),
  handler: async (ctx, args) => {
    const limit = clampHistoryLimit(args.limit);
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
  },
});

// ---------------------------------------------------------------------------
// Public mutations
// ---------------------------------------------------------------------------

export const startRangeBackfill = mutation({
  args: {
    dateFrom: v.string(),
    dateTo: v.string(),
    dryRun: v.optional(v.boolean()),
    pageSize: v.optional(v.number()),
  },
  returns: v.object({
    jobId: v.id("mondayTouchRangeBackfillJobs"),
    workflowId: v.string(),
  }),
  handler: async (ctx, args) => {
    const { contactBoardId, touchBoardId } = getMondayRangeBackfillEnv();
    const dateFrom = normalizeDateOnly(args.dateFrom);
    const dateTo = normalizeDateOnly(args.dateTo);
    if (dateFrom > dateTo) throw new Error("dateFrom must be on or before dateTo");

    const running = await ctx.db
      .query("mondayTouchRangeBackfillJobs")
      .withIndex("by_status", (q) => q.eq("status", "running"))
      .first();
    if (running) throw new Error("A touch range backfill is already running");

    const now = Date.now();
    const pageSize = clampPageSize(args.pageSize);
    const dryRun = args.dryRun ?? true;
    const jobId = await ctx.db.insert("mondayTouchRangeBackfillJobs", {
      status: "running" satisfies RangeBackfillStatus,
      dateFrom,
      dateTo,
      dryRun,
      contactBoardId,
      touchBoardId,
      pageSize,
      currentCursor: null,
      processedContacts: 0,
      inRangeContacts: 0,
      createdTouches: 0,
      updatedTouches: 0,
      skippedTouches: 0,
      errorsCount: 0,
      startedAt: now,
      updatedAt: now,
      finishedAt: null,
      lastError: null,
    });

    const workflowId = await workflowAny.start(
      ctx,
      internalAny.mondayTouchRangeBackfill.runWorkflow,
      { jobId },
    );
    await ctx.db.patch(jobId, { workflowId, updatedAt: Date.now() });
    return { jobId, workflowId };
  },
});

export const cancelRangeBackfill = mutation({
  args: { jobId: v.optional(v.id("mondayTouchRangeBackfillJobs")) },
  returns: v.object({ jobId: v.id("mondayTouchRangeBackfillJobs"), status: v.string() }),
  handler: async (ctx, args) => {
    let jobId = args.jobId;
    if (!jobId) {
      const latest = await ctx.db
        .query("mondayTouchRangeBackfillJobs")
        .withIndex("by_startedAt", (q) => q)
        .order("desc")
        .first();
      if (!latest) throw new Error("No range backfill job found");
      jobId = latest._id;
    }
    const job = await ctx.db.get(jobId);
    if (!job) throw new Error("Job not found");
    if (job.status !== "running") return { jobId, status: job.status };
    await ctx.db.patch(jobId, {
      status: "cancelled" satisfies RangeBackfillStatus,
      finishedAt: Date.now(),
      updatedAt: Date.now(),
      lastError: "Cancelled by user",
    });
    return { jobId, status: "cancelled" };
  },
});

// ---------------------------------------------------------------------------
// Internal queries / mutations used by the workflow
// ---------------------------------------------------------------------------

export const getJobForWorkflow = internalQuery({
  args: { jobId: v.id("mondayTouchRangeBackfillJobs") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("mondayTouchRangeBackfillJobs"),
      status: v.union(
        v.literal("running"),
        v.literal("done"),
        v.literal("failed"),
        v.literal("cancelled"),
      ),
      dateFrom: v.string(),
      dateTo: v.string(),
      dryRun: v.boolean(),
      contactBoardId: v.string(),
      touchBoardId: v.string(),
      pageSize: v.number(),
      currentCursor: v.optional(v.union(v.string(), v.null())),
    }),
  ),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    return {
      _id: job._id,
      status: job.status,
      dateFrom: job.dateFrom,
      dateTo: job.dateTo,
      dryRun: job.dryRun,
      contactBoardId: job.contactBoardId,
      touchBoardId: job.touchBoardId,
      pageSize: job.pageSize,
      currentCursor: job.currentCursor,
    };
  },
});

export const updateJobProgress = internalMutation({
  args: {
    jobId: v.id("mondayTouchRangeBackfillJobs"),
    nextCursor: v.union(v.string(), v.null()),
    processedContactsDelta: v.number(),
    inRangeContactsDelta: v.number(),
    createdTouchesDelta: v.number(),
    updatedTouchesDelta: v.number(),
    skippedTouchesDelta: v.number(),
    errorsDelta: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    await ctx.db.patch(args.jobId, {
      currentCursor: args.nextCursor,
      processedContacts: job.processedContacts + args.processedContactsDelta,
      inRangeContacts: job.inRangeContacts + args.inRangeContactsDelta,
      createdTouches: job.createdTouches + args.createdTouchesDelta,
      updatedTouches: job.updatedTouches + args.updatedTouchesDelta,
      skippedTouches: job.skippedTouches + args.skippedTouchesDelta,
      errorsCount: job.errorsCount + args.errorsDelta,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const finishJob = internalMutation({
  args: {
    jobId: v.id("mondayTouchRangeBackfillJobs"),
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

// ---------------------------------------------------------------------------
// Workflow
// ---------------------------------------------------------------------------

export const runWorkflow = workflowAny.define({
  args: { jobId: v.id("mondayTouchRangeBackfillJobs") },
  returns: v.null(),
  handler: async (step: any, args: { jobId: Id<"mondayTouchRangeBackfillJobs"> }) => {
    while (true) {
      const job = await step.runQuery(
        internalAny.mondayTouchRangeBackfill.getJobForWorkflow,
        { jobId: args.jobId },
      );
      if (!job) break;
      if (job.status !== "running") {
        await step.runMutation(internalAny.mondayTouchRangeBackfill.finishJob, {
          jobId: args.jobId,
          status: "cancelled",
          lastError: "Stopped before completion",
        });
        break;
      }

      const page = await step.runAction(
        internalAny.mondayTouchRangeBackfillNode.fetchAndUpsertPageAction,
        {
          boardId: job.contactBoardId,
          touchBoardId: job.touchBoardId,
          cursor: job.currentCursor ?? null,
          pageSize: job.pageSize,
          dateFrom: job.dateFrom,
          dateTo: job.dateTo,
          dryRun: job.dryRun,
        },
      );

      await step.runMutation(internalAny.mondayTouchRangeBackfill.updateJobProgress, {
        jobId: args.jobId,
        nextCursor: page.nextCursor,
        processedContactsDelta: page.processedContacts,
        inRangeContactsDelta: page.inRangeContacts,
        createdTouchesDelta: page.createdTouches,
        updatedTouchesDelta: page.updatedTouches,
        skippedTouchesDelta: page.skippedTouches,
        errorsDelta: page.errors,
      });

      if (!page.nextCursor) {
        await step.runMutation(internalAny.mondayTouchRangeBackfill.finishJob, {
          jobId: args.jobId,
          status: "done",
          lastError: null,
        });
        break;
      }
    }
    return null;
  },
});
