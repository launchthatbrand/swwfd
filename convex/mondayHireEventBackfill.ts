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

type HireEventBackfillStatus = "running" | "done" | "failed" | "cancelled";

const getHireEventBackfillEnv = () => {
  const contactBoardId = process.env.MONDAY_BOARD_ID?.trim() ?? "";
  if (!contactBoardId) throw new Error("MONDAY_BOARD_ID is missing");
  return { contactBoardId };
};

const normalizeMonthKey = (value: string) => {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}$/.test(trimmed)) {
    throw new Error(`monthKey must be YYYY-MM, got: ${trimmed}`);
  }
  return trimmed;
};

const monthKeyToRange = (monthKey: string) => {
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

const clampPageSize = (value: number | undefined) =>
  Math.max(25, Math.min(200, Math.floor(value ?? 50)));

export const getLatestJob = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      jobId: v.id("mondayHireEventBackfillJobs"),
      status: v.union(
        v.literal("running"),
        v.literal("done"),
        v.literal("failed"),
        v.literal("cancelled"),
      ),
      workflowId: v.optional(v.string()),
      monthKey: v.string(),
      dateFrom: v.string(),
      dateTo: v.string(),
      dryRun: v.boolean(),
      contactBoardId: v.string(),
      subitemBoardId: v.optional(v.union(v.string(), v.null())),
      pageSize: v.number(),
      currentCursor: v.optional(v.union(v.string(), v.null())),
      processedContacts: v.number(),
      inRangeContacts: v.number(),
      createdEvents: v.number(),
      skippedEvents: v.number(),
      errorsCount: v.number(),
      startedAt: v.number(),
      updatedAt: v.number(),
      finishedAt: v.optional(v.union(v.number(), v.null())),
      lastError: v.optional(v.union(v.string(), v.null())),
    }),
  ),
  handler: async (ctx) => {
    const latest = await ctx.db
      .query("mondayHireEventBackfillJobs")
      .withIndex("by_startedAt", (q) => q)
      .order("desc")
      .first();
    if (!latest) return null;
    return {
      jobId: latest._id,
      status: latest.status,
      workflowId: latest.workflowId,
      monthKey: latest.monthKey,
      dateFrom: latest.dateFrom,
      dateTo: latest.dateTo,
      dryRun: latest.dryRun,
      contactBoardId: latest.contactBoardId,
      subitemBoardId: latest.subitemBoardId,
      pageSize: latest.pageSize,
      currentCursor: latest.currentCursor,
      processedContacts: latest.processedContacts,
      inRangeContacts: latest.inRangeContacts,
      createdEvents: latest.createdEvents,
      skippedEvents: latest.skippedEvents,
      errorsCount: latest.errorsCount,
      startedAt: latest.startedAt,
      updatedAt: latest.updatedAt,
      finishedAt: latest.finishedAt,
      lastError: latest.lastError,
    };
  },
});

export const startBackfill = mutation({
  args: {
    monthKey: v.string(),
    dryRun: v.optional(v.boolean()),
    pageSize: v.optional(v.number()),
  },
  returns: v.object({
    jobId: v.id("mondayHireEventBackfillJobs"),
    workflowId: v.string(),
  }),
  handler: async (ctx, args) => {
    const { contactBoardId } = getHireEventBackfillEnv();
    const monthKey = normalizeMonthKey(args.monthKey);
    const { dateFrom, dateTo } = monthKeyToRange(monthKey);

    const running = await ctx.db
      .query("mondayHireEventBackfillJobs")
      .withIndex("by_status", (q) => q.eq("status", "running"))
      .first();
    if (running) throw new Error("A hire event backfill is already running");

    const now = Date.now();
    const pageSize = clampPageSize(args.pageSize);
    const dryRun = args.dryRun ?? true;
    const jobId = await ctx.db.insert("mondayHireEventBackfillJobs", {
      status: "running" satisfies HireEventBackfillStatus,
      monthKey,
      dateFrom,
      dateTo,
      dryRun,
      contactBoardId,
      subitemBoardId: null,
      pageSize,
      currentCursor: null,
      processedContacts: 0,
      inRangeContacts: 0,
      createdEvents: 0,
      skippedEvents: 0,
      errorsCount: 0,
      startedAt: now,
      updatedAt: now,
      finishedAt: null,
      lastError: null,
    });

    const workflowId = await workflowAny.start(
      ctx,
      internalAny.mondayHireEventBackfill.runWorkflow,
      { jobId },
    );
    await ctx.db.patch(jobId, { workflowId, updatedAt: Date.now() });
    return { jobId, workflowId };
  },
});

export const cancelBackfill = mutation({
  args: { jobId: v.optional(v.id("mondayHireEventBackfillJobs")) },
  returns: v.object({ jobId: v.id("mondayHireEventBackfillJobs"), status: v.string() }),
  handler: async (ctx, args) => {
    let jobId = args.jobId;
    if (!jobId) {
      const latest = await ctx.db
        .query("mondayHireEventBackfillJobs")
        .withIndex("by_startedAt", (q) => q)
        .order("desc")
        .first();
      if (!latest) throw new Error("No hire event backfill job found");
      jobId = latest._id;
    }
    const job = await ctx.db.get(jobId);
    if (!job) throw new Error("Job not found");
    if (job.status !== "running") return { jobId, status: job.status };
    await ctx.db.patch(jobId, {
      status: "cancelled" satisfies HireEventBackfillStatus,
      finishedAt: Date.now(),
      updatedAt: Date.now(),
      lastError: "Cancelled by user",
    });
    return { jobId, status: "cancelled" };
  },
});

export const getJobForWorkflow = internalQuery({
  args: { jobId: v.id("mondayHireEventBackfillJobs") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("mondayHireEventBackfillJobs"),
      status: v.union(
        v.literal("running"),
        v.literal("done"),
        v.literal("failed"),
        v.literal("cancelled"),
      ),
      monthKey: v.string(),
      dateFrom: v.string(),
      dateTo: v.string(),
      dryRun: v.boolean(),
      contactBoardId: v.string(),
      subitemBoardId: v.optional(v.union(v.string(), v.null())),
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
      monthKey: job.monthKey,
      dateFrom: job.dateFrom,
      dateTo: job.dateTo,
      dryRun: job.dryRun,
      contactBoardId: job.contactBoardId,
      subitemBoardId: job.subitemBoardId,
      pageSize: job.pageSize,
      currentCursor: job.currentCursor,
    };
  },
});

export const updateJobProgress = internalMutation({
  args: {
    jobId: v.id("mondayHireEventBackfillJobs"),
    nextCursor: v.union(v.string(), v.null()),
    subitemBoardId: v.optional(v.union(v.string(), v.null())),
    processedContactsDelta: v.number(),
    inRangeContactsDelta: v.number(),
    createdEventsDelta: v.number(),
    skippedEventsDelta: v.number(),
    errorsDelta: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    await ctx.db.patch(args.jobId, {
      currentCursor: args.nextCursor,
      subitemBoardId: args.subitemBoardId ?? job.subitemBoardId ?? null,
      processedContacts: job.processedContacts + args.processedContactsDelta,
      inRangeContacts: job.inRangeContacts + args.inRangeContactsDelta,
      createdEvents: job.createdEvents + args.createdEventsDelta,
      skippedEvents: job.skippedEvents + args.skippedEventsDelta,
      errorsCount: job.errorsCount + args.errorsDelta,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const finishJob = internalMutation({
  args: {
    jobId: v.id("mondayHireEventBackfillJobs"),
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
  args: { jobId: v.id("mondayHireEventBackfillJobs") },
  returns: v.null(),
  handler: async (step: any, args: { jobId: Id<"mondayHireEventBackfillJobs"> }) => {
    while (true) {
      const job = await step.runQuery(internalAny.mondayHireEventBackfill.getJobForWorkflow, {
        jobId: args.jobId,
      });
      if (!job) break;
      if (job.status !== "running") {
        await step.runMutation(internalAny.mondayHireEventBackfill.finishJob, {
          jobId: args.jobId,
          status: "cancelled",
          lastError: "Stopped before completion",
        });
        break;
      }

      const page = await step.runAction(
        internalAny.mondayHireEventBackfillNode.fetchAndUpsertHireEventPageAction,
        {
          boardId: job.contactBoardId,
          cursor: job.currentCursor ?? null,
          pageSize: job.pageSize,
          dateFrom: job.dateFrom,
          dateTo: job.dateTo,
          dryRun: job.dryRun,
        },
      );

      await step.runMutation(internalAny.mondayHireEventBackfill.updateJobProgress, {
        jobId: args.jobId,
        nextCursor: page.nextCursor,
        subitemBoardId: page.subitemBoardId ?? null,
        processedContactsDelta: page.processedContacts,
        inRangeContactsDelta: page.inRangeContacts,
        createdEventsDelta: page.createdEvents,
        skippedEventsDelta: page.skippedEvents,
        errorsDelta: page.errors,
      });

      if (!page.nextCursor) {
        await step.runMutation(internalAny.mondayHireEventBackfill.finishJob, {
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
