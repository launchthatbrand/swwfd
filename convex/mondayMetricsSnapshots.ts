import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";

export const MONDAY_METRICS_SNAPSHOT_REFRESH_MS = 5 * 60 * 1000;
export const MONDAY_METRICS_SNAPSHOT_BUILD_POLL_MS = 10 * 1000;

const mondayMetricsSnapshotStatusValidator = v.union(
  v.literal("ready"),
  v.literal("building"),
  v.literal("failed"),
);

const mondayMetricsScanJobStatusValidator = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("done"),
  v.literal("failed"),
  v.literal("cancelled"),
);

const mondayMetricsSnapshotValidator = v.object({
  snapshotId: v.id("mondayMetricsSnapshots"),
  scopeKey: v.string(),
  boardId: v.string(),
  fiscalYear: v.string(),
  ownerId: v.union(v.string(), v.null()),
  status: mondayMetricsSnapshotStatusValidator,
  summaryJson: v.union(v.string(), v.null()),
  summaryGeneratedAt: v.union(v.string(), v.null()),
  readyAt: v.union(v.number(), v.null()),
  updatedAt: v.number(),
  activeJobId: v.union(v.id("mondayMetricsScanJobs"), v.null()),
  lastError: v.union(v.string(), v.null()),
});

const toSnapshotRecord = (
  snapshot: {
    _id: Id<"mondayMetricsSnapshots">;
    scopeKey: string;
    boardId: string;
    fiscalYear: string;
    ownerId: string | null;
    status: "ready" | "building" | "failed";
    summaryJson?: string;
    summaryGeneratedAt?: string | null;
    readyAt?: number | null;
    updatedAt: number;
    activeJobId?: Id<"mondayMetricsScanJobs"> | null;
    lastError?: string | null;
  },
) => ({
  snapshotId: snapshot._id,
  scopeKey: snapshot.scopeKey,
  boardId: snapshot.boardId,
  fiscalYear: snapshot.fiscalYear,
  ownerId: snapshot.ownerId ?? null,
  status: snapshot.status,
  summaryJson: snapshot.summaryJson ?? null,
  summaryGeneratedAt: snapshot.summaryGeneratedAt ?? null,
  readyAt: snapshot.readyAt ?? null,
  updatedAt: snapshot.updatedAt,
  activeJobId: snapshot.activeJobId ?? null,
  lastError: snapshot.lastError ?? null,
});

export const getSnapshotByScope = query({
  args: {
    scopeKey: v.string(),
  },
  returns: v.union(v.null(), mondayMetricsSnapshotValidator),
  handler: async (ctx, args) => {
    const scopeKey = args.scopeKey.trim();
    if (!scopeKey) return null;
    const snapshot = await ctx.db
      .query("mondayMetricsSnapshots")
      .withIndex("by_scopeKey", (q) => q.eq("scopeKey", scopeKey))
      .first();
    if (!snapshot) return null;
    return toSnapshotRecord(snapshot);
  },
});

export const getSnapshotByScopeInternal = internalQuery({
  args: {
    scopeKey: v.string(),
  },
  returns: v.union(v.null(), mondayMetricsSnapshotValidator),
  handler: async (ctx, args) => {
    const scopeKey = args.scopeKey.trim();
    if (!scopeKey) return null;
    const snapshot = await ctx.db
      .query("mondayMetricsSnapshots")
      .withIndex("by_scopeKey", (q) => q.eq("scopeKey", scopeKey))
      .first();
    if (!snapshot) return null;
    return toSnapshotRecord(snapshot);
  },
});

export const ensureSnapshotScan = mutation({
  args: {
    scopeKey: v.string(),
    boardId: v.string(),
    fiscalYear: v.string(),
    ownerId: v.optional(v.string()),
    forceRefresh: v.optional(v.boolean()),
  },
  returns: v.object({
    snapshot: v.union(v.null(), mondayMetricsSnapshotValidator),
    queued: v.boolean(),
    refreshAfterMs: v.number(),
  }),
  handler: async (ctx, args) => {
    const scopeKey = args.scopeKey.trim();
    const boardId = args.boardId.trim();
    const fiscalYear = args.fiscalYear.trim();
    const ownerId = args.ownerId?.trim() || null;
    const forceRefresh = args.forceRefresh ?? false;
    if (!scopeKey || !boardId || !fiscalYear) {
      throw new Error("Missing required snapshot scope values");
    }

    const now = Date.now();
    const snapshot = await ctx.db
      .query("mondayMetricsSnapshots")
      .withIndex("by_scopeKey", (q) => q.eq("scopeKey", scopeKey))
      .first();

    if (snapshot && snapshot.status === "building" && snapshot.activeJobId) {
      return {
        snapshot: toSnapshotRecord(snapshot),
        queued: false,
        refreshAfterMs: MONDAY_METRICS_SNAPSHOT_BUILD_POLL_MS,
      };
    }

    const isFreshReady =
      !forceRefresh &&
      snapshot?.status === "ready" &&
      !!snapshot.readyAt &&
      now - snapshot.readyAt < MONDAY_METRICS_SNAPSHOT_REFRESH_MS;
    if (isFreshReady && snapshot) {
      return {
        snapshot: toSnapshotRecord(snapshot),
        queued: false,
        refreshAfterMs: MONDAY_METRICS_SNAPSHOT_REFRESH_MS,
      };
    }

    let snapshotId: Id<"mondayMetricsSnapshots">;
    if (snapshot) {
      snapshotId = snapshot._id;
      await ctx.db.patch(snapshot._id, {
        boardId,
        fiscalYear,
        ownerId,
        status: "building",
        updatedAt: now,
        lastError: null,
      });
    } else {
      snapshotId = await ctx.db.insert("mondayMetricsSnapshots", {
        scopeKey,
        boardId,
        fiscalYear,
        ownerId,
        status: "building",
        summaryJson: undefined,
        summaryGeneratedAt: null,
        activeJobId: null,
        readyAt: null,
        lastError: null,
        updatedAt: now,
      });
    }

    const jobId = await ctx.db.insert("mondayMetricsScanJobs", {
      scopeKey,
      boardId,
      fiscalYear,
      ownerId,
      snapshotId,
      status: "queued",
      startedAt: now,
      updatedAt: now,
      finishedAt: null,
      lastError: null,
    });

    await ctx.db.patch(snapshotId, {
      status: "building",
      activeJobId: jobId,
      updatedAt: now,
      lastError: null,
    });

    await ctx.scheduler.runAfter(0, internal.mondayMetricsScanNode.runScanJob, {
      jobId,
    });

    const nextSnapshot = await ctx.db.get(snapshotId);
    return {
      snapshot: nextSnapshot ? toSnapshotRecord(nextSnapshot) : null,
      queued: true,
      refreshAfterMs: MONDAY_METRICS_SNAPSHOT_BUILD_POLL_MS,
    };
  },
});

export const markScanJobRunning = internalMutation({
  args: {
    jobId: v.id("mondayMetricsScanJobs"),
  },
  returns: v.union(
    v.null(),
    v.object({
      jobId: v.id("mondayMetricsScanJobs"),
      snapshotId: v.id("mondayMetricsSnapshots"),
      status: mondayMetricsScanJobStatusValidator,
      scopeKey: v.string(),
      boardId: v.string(),
      fiscalYear: v.string(),
      ownerId: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    if (job.status === "done" || job.status === "failed" || job.status === "cancelled") {
      return null;
    }
    await ctx.db.patch(args.jobId, {
      status: "running",
      updatedAt: Date.now(),
    });
    const updated = await ctx.db.get(args.jobId);
    if (!updated) return null;
    return {
      jobId: updated._id,
      snapshotId: updated.snapshotId,
      status: updated.status,
      scopeKey: updated.scopeKey,
      boardId: updated.boardId,
      fiscalYear: updated.fiscalYear,
      ownerId: updated.ownerId ?? null,
    };
  },
});

export const markScanJobCompleted = internalMutation({
  args: {
    jobId: v.id("mondayMetricsScanJobs"),
    summaryJson: v.string(),
    summaryGeneratedAt: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    const now = Date.now();
    await ctx.db.patch(args.jobId, {
      status: "done",
      updatedAt: now,
      finishedAt: now,
      lastError: null,
    });
    await ctx.db.patch(job.snapshotId, {
      status: "ready",
      summaryJson: args.summaryJson,
      summaryGeneratedAt: args.summaryGeneratedAt,
      readyAt: now,
      activeJobId: null,
      lastError: null,
      updatedAt: now,
    });
    return null;
  },
});

export const markScanJobFailed = internalMutation({
  args: {
    jobId: v.id("mondayMetricsScanJobs"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    const now = Date.now();
    const message = args.error.trim() || "Unknown metrics scan error";
    await ctx.db.patch(args.jobId, {
      status: "failed",
      updatedAt: now,
      finishedAt: now,
      lastError: message,
    });
    await ctx.db.patch(job.snapshotId, {
      status: "failed",
      activeJobId: null,
      updatedAt: now,
      lastError: message,
    });
    return null;
  },
});
