/* eslint-disable @typescript-eslint/array-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable no-restricted-properties */
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

type MigrationStatus = "running" | "done" | "failed" | "cancelled";

const DEFAULT_PAGE_SIZE = 20;
const MIN_PAGE_SIZE = 5;
const MAX_PAGE_SIZE = 50;

const normalizeMonthTag = (value: string | undefined, sourceBoardId: string) => {
  const raw = (value ?? "").trim();
  if (raw.length > 0) return raw.slice(0, 120);
  const date = new Date().toISOString().slice(0, 10);
  return `board_${sourceBoardId}_${date}`;
};

const clampPageSize = (value: number | undefined) => {
  if (!Number.isFinite(value)) return DEFAULT_PAGE_SIZE;
  return Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, Math.floor(value!)));
};

export const getLatestJob = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      jobId: v.id("mondayMonthlyMigrationJobs"),
      status: v.union(
        v.literal("running"),
        v.literal("done"),
        v.literal("failed"),
        v.literal("cancelled"),
      ),
      workflowId: v.optional(v.string()),
      sourceBoardId: v.string(),
      sourceBoardName: v.optional(v.union(v.string(), v.null())),
      targetBoardId: v.string(),
      monthTag: v.string(),
      dryRun: v.boolean(),
      includeParentUpdates: v.boolean(),
      includeSubitems: v.boolean(),
      includeSubitemUpdates: v.boolean(),
      pageSize: v.number(),
      currentCursor: v.optional(v.union(v.string(), v.null())),
      processedContacts: v.number(),
      mappedContacts: v.number(),
      skippedContacts: v.number(),
      createdParentUpdates: v.number(),
      createdSubitems: v.number(),
      createdSubitemUpdates: v.number(),
      updateProgressColumns: v.optional(v.boolean()),
      updatedProgressColumns: v.optional(v.number()),
      errorsCount: v.number(),
      warningsCount: v.number(),
      startedAt: v.number(),
      updatedAt: v.number(),
      finishedAt: v.optional(v.union(v.number(), v.null())),
      lastError: v.optional(v.union(v.string(), v.null())),
    }),
  ),
  handler: async (ctx) => {
    const latest = await ctx.db
      .query("mondayMonthlyMigrationJobs")
      .withIndex("by_startedAt", (q) => q)
      .order("desc")
      .first();
    if (!latest) return null;
    return {
      jobId: latest._id,
      status: latest.status,
      workflowId: latest.workflowId,
      sourceBoardId: latest.sourceBoardId,
      sourceBoardName: latest.sourceBoardName,
      targetBoardId: latest.targetBoardId,
      monthTag: latest.monthTag,
      dryRun: latest.dryRun,
      includeParentUpdates: latest.includeParentUpdates,
      includeSubitems: latest.includeSubitems,
      includeSubitemUpdates: latest.includeSubitemUpdates,
      pageSize: latest.pageSize,
      currentCursor: latest.currentCursor,
      processedContacts: latest.processedContacts,
      mappedContacts: latest.mappedContacts,
      skippedContacts: latest.skippedContacts,
      createdParentUpdates: latest.createdParentUpdates,
      createdSubitems: latest.createdSubitems,
      createdSubitemUpdates: latest.createdSubitemUpdates,
      updateProgressColumns: latest.updateProgressColumns,
      updatedProgressColumns: latest.updatedProgressColumns,
      errorsCount: latest.errorsCount,
      warningsCount: latest.warningsCount,
      startedAt: latest.startedAt,
      updatedAt: latest.updatedAt,
      finishedAt: latest.finishedAt,
      lastError: latest.lastError,
    };
  },
});

export const startMigration = mutation({
  args: {
    sourceBoardId: v.string(),
    targetBoardId: v.optional(v.string()),
    monthTag: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
    includeParentUpdates: v.optional(v.boolean()),
    includeSubitems: v.optional(v.boolean()),
    includeSubitemUpdates: v.optional(v.boolean()),
    updateProgressColumns: v.optional(v.boolean()),
    pageSize: v.optional(v.number()),
  },
  returns: v.object({
    jobId: v.id("mondayMonthlyMigrationJobs"),
    workflowId: v.string(),
  }),
  handler: async (ctx, args) => {
    const sourceBoardId = args.sourceBoardId.trim();
    if (!sourceBoardId) {
      throw new Error("sourceBoardId is required");
    }
    const targetBoardId = (args.targetBoardId?.trim() ||
      process.env.MONDAY_BOARD_ID?.trim() ||
      "").trim();
    if (!targetBoardId) {
      throw new Error("targetBoardId is required (or set MONDAY_BOARD_ID)");
    }

    const runningJob = await ctx.db
      .query("mondayMonthlyMigrationJobs")
      .withIndex("by_status", (q) => q.eq("status", "running"))
      .first();
    if (runningJob) {
      throw new Error("A monthly migration job is already running");
    }

    const now = Date.now();
    const includeParentUpdates = args.includeParentUpdates ?? true;
    const includeSubitems = args.includeSubitems ?? true;
    const includeSubitemUpdates = args.includeSubitemUpdates ?? true;
    const updateProgressColumns = args.updateProgressColumns ?? true;

    const jobId = await ctx.db.insert("mondayMonthlyMigrationJobs", {
      status: "running" satisfies MigrationStatus,
      sourceBoardId,
      sourceBoardName: null,
      targetBoardId,
      monthTag: normalizeMonthTag(args.monthTag, sourceBoardId),
      dryRun: args.dryRun ?? true,
      includeParentUpdates,
      includeSubitems,
      includeSubitemUpdates,
      updateProgressColumns,
      updatedProgressColumns: 0,
      pageSize: clampPageSize(args.pageSize),
      currentCursor: null,
      processedContacts: 0,
      mappedContacts: 0,
      skippedContacts: 0,
      createdParentUpdates: 0,
      createdSubitems: 0,
      createdSubitemUpdates: 0,
      errorsCount: 0,
      warningsCount: 0,
      startedAt: now,
      updatedAt: now,
      finishedAt: null,
      lastError: null,
    });

    const workflowId = await workflowAny.start(
      ctx,
      internalAny.mondayMonthlyMigration.runMonthlyMigrationWorkflow,
      { jobId },
    );
    await ctx.db.patch(jobId, { workflowId, updatedAt: Date.now() });
    return { jobId, workflowId };
  },
});

export const cancelMigration = mutation({
  args: {
    jobId: v.optional(v.id("mondayMonthlyMigrationJobs")),
  },
  returns: v.object({
    jobId: v.id("mondayMonthlyMigrationJobs"),
    status: v.string(),
  }),
  handler: async (ctx, args) => {
    let jobId = args.jobId;
    if (!jobId) {
      const latest = await ctx.db
        .query("mondayMonthlyMigrationJobs")
        .withIndex("by_startedAt", (q) => q)
        .order("desc")
        .first();
      if (!latest) throw new Error("No monthly migration job found");
      jobId = latest._id;
    }
    const job = await ctx.db.get(jobId);
    if (!job) throw new Error("Monthly migration job not found");
    if (job.status !== "running") {
      return { jobId, status: job.status };
    }
    await ctx.db.patch(jobId, {
      status: "cancelled" satisfies MigrationStatus,
      updatedAt: Date.now(),
      finishedAt: Date.now(),
      lastError: "Cancelled by user",
    });
    return { jobId, status: "cancelled" };
  },
});

export const getJobForWorkflow = internalQuery({
  args: { jobId: v.id("mondayMonthlyMigrationJobs") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("mondayMonthlyMigrationJobs"),
      status: v.union(
        v.literal("running"),
        v.literal("done"),
        v.literal("failed"),
        v.literal("cancelled"),
      ),
      sourceBoardId: v.string(),
      sourceBoardName: v.optional(v.union(v.string(), v.null())),
      targetBoardId: v.string(),
      monthTag: v.string(),
      dryRun: v.boolean(),
      includeParentUpdates: v.boolean(),
      includeSubitems: v.boolean(),
      includeSubitemUpdates: v.boolean(),
      updateProgressColumns: v.optional(v.boolean()),
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
      sourceBoardId: job.sourceBoardId,
      sourceBoardName: job.sourceBoardName,
      targetBoardId: job.targetBoardId,
      monthTag: job.monthTag,
      dryRun: job.dryRun,
      includeParentUpdates: job.includeParentUpdates,
      includeSubitems: job.includeSubitems,
      includeSubitemUpdates: job.includeSubitemUpdates,
      updateProgressColumns: job.updateProgressColumns,
      pageSize: job.pageSize,
      currentCursor: job.currentCursor,
    };
  },
});

export const getExistingEntriesForSourceItem = internalQuery({
  args: {
    sourceBoardId: v.string(),
    sourceItemId: v.string(),
  },
  returns: v.object({
    parentUpdateEntityIds: v.array(v.string()),
    subitemEntityIds: v.array(v.string()),
    subitemUpdateEntityIds: v.array(v.string()),
    sourceSubitemToTargetSubitem: v.array(
      v.object({
        sourceSubitemId: v.string(),
        targetSubitemId: v.string(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("mondayMonthlyMigrationEntries")
      .withIndex("by_sourceBoardId_and_sourceItemId", (q) =>
        q.eq("sourceBoardId", args.sourceBoardId).eq("sourceItemId", args.sourceItemId),
      )
      .collect();
    const parentUpdateEntityIds: string[] = [];
    const subitemEntityIds: string[] = [];
    const subitemUpdateEntityIds: string[] = [];
    const sourceSubitemToTargetSubitem: Array<{
      sourceSubitemId: string;
      targetSubitemId: string;
    }> = [];
    for (const entry of entries) {
      if (entry.sourceEntityType === "parent_update") {
        parentUpdateEntityIds.push(entry.sourceEntityId);
      } else if (entry.sourceEntityType === "subitem") {
        subitemEntityIds.push(entry.sourceEntityId);
        if (entry.targetEntityId && entry.targetEntityId.trim().length > 0) {
          sourceSubitemToTargetSubitem.push({
            sourceSubitemId: entry.sourceEntityId,
            targetSubitemId: entry.targetEntityId,
          });
        }
      } else if (entry.sourceEntityType === "subitem_update") {
        subitemUpdateEntityIds.push(entry.sourceEntityId);
      }
    }
    return {
      parentUpdateEntityIds,
      subitemEntityIds,
      subitemUpdateEntityIds,
      sourceSubitemToTargetSubitem,
    };
  },
});

export const getExistingEntriesForSourceItemsBatch = internalQuery({
  args: {
    sourceBoardId: v.string(),
    sourceItemIds: v.array(v.string()),
  },
  returns: v.array(
    v.object({
      sourceItemId: v.string(),
      parentUpdateEntityIds: v.array(v.string()),
      subitemEntityIds: v.array(v.string()),
      subitemUpdateEntityIds: v.array(v.string()),
      sourceSubitemToTargetSubitem: v.array(
        v.object({
          sourceSubitemId: v.string(),
          targetSubitemId: v.string(),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const results = [];
    for (const sourceItemId of args.sourceItemIds) {
      const entries = await ctx.db
        .query("mondayMonthlyMigrationEntries")
        .withIndex("by_sourceBoardId_and_sourceItemId", (q) =>
          q.eq("sourceBoardId", args.sourceBoardId).eq("sourceItemId", sourceItemId),
        )
        .collect();
      const parentUpdateEntityIds: string[] = [];
      const subitemEntityIds: string[] = [];
      const subitemUpdateEntityIds: string[] = [];
      const sourceSubitemToTargetSubitem: Array<{
        sourceSubitemId: string;
        targetSubitemId: string;
      }> = [];
      for (const entry of entries) {
        if (entry.sourceEntityType === "parent_update") {
          parentUpdateEntityIds.push(entry.sourceEntityId);
        } else if (entry.sourceEntityType === "subitem") {
          subitemEntityIds.push(entry.sourceEntityId);
          if (entry.targetEntityId && entry.targetEntityId.trim().length > 0) {
            sourceSubitemToTargetSubitem.push({
              sourceSubitemId: entry.sourceEntityId,
              targetSubitemId: entry.targetEntityId,
            });
          }
        } else if (entry.sourceEntityType === "subitem_update") {
          subitemUpdateEntityIds.push(entry.sourceEntityId);
        }
      }
      results.push({
        sourceItemId,
        parentUpdateEntityIds,
        subitemEntityIds,
        subitemUpdateEntityIds,
        sourceSubitemToTargetSubitem,
      });
    }
    return results;
  },
});

export const recordCreatedEntries = internalMutation({
  args: {
    jobId: v.id("mondayMonthlyMigrationJobs"),
    sourceBoardId: v.string(),
    entries: v.array(
      v.object({
        sourceEntityType: v.union(
          v.literal("parent_update"),
          v.literal("subitem"),
          v.literal("subitem_update"),
        ),
        sourceEntityId: v.string(),
        sourceItemId: v.string(),
        targetItemId: v.string(),
        targetEntityId: v.union(v.string(), v.null()),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const entry of args.entries) {
      const existing = await ctx.db
        .query("mondayMonthlyMigrationEntries")
        .withIndex("by_sourceBoardId_and_sourceEntityType_and_sourceEntityId", (q) =>
          q
            .eq("sourceBoardId", args.sourceBoardId)
            .eq("sourceEntityType", entry.sourceEntityType)
            .eq("sourceEntityId", entry.sourceEntityId),
        )
        .first();
      if (existing) continue;
      await ctx.db.insert("mondayMonthlyMigrationEntries", {
        jobId: args.jobId,
        sourceBoardId: args.sourceBoardId,
        sourceEntityType: entry.sourceEntityType,
        sourceEntityId: entry.sourceEntityId,
        sourceItemId: entry.sourceItemId,
        targetItemId: entry.targetItemId,
        targetEntityId: entry.targetEntityId ?? null,
        createdAt: Date.now(),
      });
    }
    return null;
  },
});

export const updateJobProgress = internalMutation({
  args: {
    jobId: v.id("mondayMonthlyMigrationJobs"),
    sourceBoardName: v.optional(v.union(v.string(), v.null())),
    nextCursor: v.union(v.string(), v.null()),
    processedContactsDelta: v.number(),
    mappedContactsDelta: v.number(),
    skippedContactsDelta: v.number(),
    createdParentUpdatesDelta: v.number(),
    createdSubitemsDelta: v.number(),
    createdSubitemUpdatesDelta: v.number(),
    updatedProgressColumnsDelta: v.number(),
    errorsDelta: v.number(),
    warningsDelta: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    await ctx.db.patch(args.jobId, {
      sourceBoardName:
        args.sourceBoardName !== undefined ? args.sourceBoardName : job.sourceBoardName,
      currentCursor: args.nextCursor,
      processedContacts: job.processedContacts + args.processedContactsDelta,
      mappedContacts: job.mappedContacts + args.mappedContactsDelta,
      skippedContacts: job.skippedContacts + args.skippedContactsDelta,
      createdParentUpdates: job.createdParentUpdates + args.createdParentUpdatesDelta,
      createdSubitems: job.createdSubitems + args.createdSubitemsDelta,
      createdSubitemUpdates: job.createdSubitemUpdates + args.createdSubitemUpdatesDelta,
      updatedProgressColumns: (job.updatedProgressColumns ?? 0) + args.updatedProgressColumnsDelta,
      errorsCount: job.errorsCount + args.errorsDelta,
      warningsCount: job.warningsCount + args.warningsDelta,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const finishJob = internalMutation({
  args: {
    jobId: v.id("mondayMonthlyMigrationJobs"),
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

export const runMonthlyMigrationWorkflow = workflowAny.define({
  args: {
    jobId: v.id("mondayMonthlyMigrationJobs"),
  },
  returns: v.null(),
  handler: async (step: any, args: { jobId: Id<"mondayMonthlyMigrationJobs"> }) => {
    while (true) {
      const job = await step.runQuery(internalAny.mondayMonthlyMigration.getJobForWorkflow, {
        jobId: args.jobId,
      });
      if (!job) break;
      if (job.status !== "running") {
        await step.runMutation(internalAny.mondayMonthlyMigration.finishJob, {
          jobId: args.jobId,
          status: "cancelled",
          lastError: "Stopped before completion",
        });
        break;
      }

      const page = await step.runAction(
        internalAny.mondayMonthlyMigrationNode.fetchSourcePageAction,
        {
          sourceBoardId: job.sourceBoardId,
          targetBoardId: job.targetBoardId,
          cursor: job.currentCursor ?? null,
          pageSize: job.pageSize,
        },
      );

      if (page.items.length === 0) {
        await step.runMutation(internalAny.mondayMonthlyMigration.finishJob, {
          jobId: args.jobId,
          status: "done",
          lastError: null,
        });
        break;
      }

      // Batch-fetch existing dedup entries for all items on this page in one step.
      const existingEntriesBatch = await step.runQuery(
        internalAny.mondayMonthlyMigration.getExistingEntriesForSourceItemsBatch,
        {
          sourceBoardId: job.sourceBoardId,
          sourceItemIds: page.items.map((item: any) => item.id),
        },
      );
      const existingEntriesMap = new Map<string, any>(
        existingEntriesBatch.map((entry: any) => [entry.sourceItemId, entry]),
      );

      let processedContactsDelta = 0;
      let mappedContactsDelta = 0;
      let skippedContactsDelta = 0;
      let createdParentUpdatesDelta = 0;
      let createdSubitemsDelta = 0;
      let createdSubitemUpdatesDelta = 0;
      let updatedProgressColumnsDelta = 0;
      let errorsDelta = 0;
      let warningsDelta = 0;

      const emptyEntries = {
        parentUpdateEntityIds: [],
        subitemEntityIds: [],
        subitemUpdateEntityIds: [],
        sourceSubitemToTargetSubitem: [],
      };

      for (const sourceItem of page.items) {
        const { sourceItemId: _sid, ...existingEntries } =
          existingEntriesMap.get(sourceItem.id) ?? { sourceItemId: sourceItem.id, ...emptyEntries };

        const migrated = await step.runAction(
          internalAny.mondayMonthlyMigrationNode.migrateSourceItemAction,
          {
            sourceBoardId: job.sourceBoardId,
            sourceBoardName: page.sourceBoardName ?? job.sourceBoardName ?? null,
            targetBoardId: job.targetBoardId,
            monthTag: job.monthTag,
            dryRun: job.dryRun,
            includeParentUpdates: job.includeParentUpdates,
            includeSubitems: job.includeSubitems,
            includeSubitemUpdates: job.includeSubitemUpdates,
            updateProgressColumns: job.updateProgressColumns ?? false,
            sourceSubitemBoardId: page.sourceSubitemBoardId ?? null,
            cachedTargetSubitemBoardId: page.targetSubitemBoardId ?? null,
            cachedSourceSubitemBoardColumns: page.sourceSubitemBoardColumns ?? [],
            cachedTargetSubitemBoardColumns: page.targetSubitemBoardColumns ?? [],
            sourceItem,
            existingEntries,
          },
        );

        if (!job.dryRun && migrated.createdEntries.length > 0) {
          await step.runMutation(internalAny.mondayMonthlyMigration.recordCreatedEntries, {
            jobId: args.jobId,
            sourceBoardId: job.sourceBoardId,
            entries: migrated.createdEntries,
          });
        }

        processedContactsDelta += migrated.processedContacts;
        mappedContactsDelta += migrated.mappedContacts;
        skippedContactsDelta += migrated.skippedContacts;
        createdParentUpdatesDelta += migrated.createdParentUpdates;
        createdSubitemsDelta += migrated.createdSubitems;
        createdSubitemUpdatesDelta += migrated.createdSubitemUpdates;
        updatedProgressColumnsDelta += migrated.updatedProgressColumns;
        errorsDelta += migrated.errors;
        warningsDelta += migrated.warnings.length;
      }

      await step.runMutation(internalAny.mondayMonthlyMigration.updateJobProgress, {
        jobId: args.jobId,
        sourceBoardName: page.sourceBoardName ?? null,
        nextCursor: page.nextCursor,
        processedContactsDelta,
        mappedContactsDelta,
        skippedContactsDelta,
        createdParentUpdatesDelta,
        createdSubitemsDelta,
        createdSubitemUpdatesDelta,
        updatedProgressColumnsDelta,
        errorsDelta,
        warningsDelta,
      });

      if (!page.nextCursor) {
        await step.runMutation(internalAny.mondayMonthlyMigration.finishJob, {
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
