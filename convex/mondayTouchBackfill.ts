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

type BackfillStatus = "running" | "done" | "failed" | "cancelled";
type CsvExportStatus = "running" | "done" | "failed" | "cancelled";
const CSV_RELATION_COLUMN_ID = "board_relation_mm0wbvrb";

type CsvContact = {
  id: string;
  name: string;
  email: string | null;
  ownerIds: string[];
  createdAtDate: string | null;
};

const getMondayBackfillEnv = () => {
  const contactBoardId = process.env.MONDAY_BOARD_ID?.trim() ?? "";
  const touchBoardId = process.env.MONDAY_CONTACT_TOUCHED_BOARD_ID?.trim() ?? "";
  if (!contactBoardId) throw new Error("MONDAY_BOARD_ID is missing for backfill job");
  if (!touchBoardId) {
    throw new Error("MONDAY_CONTACT_TOUCHED_BOARD_ID is missing for backfill job");
  }
  return { contactBoardId, touchBoardId };
};

const normalizeDateOnly = (value: string) => {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error("baselineDate must be YYYY-MM-DD");
  }
  return trimmed;
};

const toBaselineTouchKey = (args: {
  sourceTag: string;
  baselineDate: string;
  contactItemId: string;
  ownerId: string | null;
}) => {
  return `baseline:${args.sourceTag}:${args.baselineDate}:${args.contactItemId}:${args.ownerId ?? "unassigned"}`;
};

const touchKeySuffix = (key: string) => ` [bk:${key}]`;

const csvEscape = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }
  return stringValue;
};

const csvHeaderLine = [
  "item_name",
  "email",
  "owner_id",
  "touch_date",
  "source_tag",
  "contact_item_id",
  CSV_RELATION_COLUMN_ID,
  "baseline_key",
].join(",");

const buildCsvChunk = (args: {
  contacts: CsvContact[];
  baselineDate: string;
  sourceTag: string;
}) => {
  const lines: string[] = [];
  let rowCount = 0;
  for (const contact of args.contacts) {
    const ownerIds = contact.ownerIds.length > 0 ? contact.ownerIds : [null];
    for (const ownerId of ownerIds) {
      const touchDate = contact.createdAtDate ?? args.baselineDate;
      const touchKey = toBaselineTouchKey({
        sourceTag: args.sourceTag,
        baselineDate: args.baselineDate,
        contactItemId: contact.id,
        ownerId,
      });
      const ownerLabel = ownerId ? `owner:${ownerId}` : "owner:unassigned";
      const identityLabel =
        contact.name.trim().length > 0
          ? contact.name
          : contact.email && contact.email.trim().length > 0
            ? contact.email
            : contact.id;
      const emailLabel = contact.email ? ` · ${contact.email}` : "";
      const itemName = `${identityLabel}${emailLabel} · baseline (${ownerLabel})${touchKeySuffix(touchKey)}`;
      lines.push(
        [
          csvEscape(itemName),
          csvEscape(contact.email),
          csvEscape(ownerId ?? ""),
          csvEscape(touchDate),
          csvEscape(args.sourceTag),
          csvEscape(contact.id),
          csvEscape(contact.id),
          csvEscape(touchKey),
        ].join(","),
      );
      rowCount += 1;
    }
  }
  return { csvChunk: lines.join("\n"), rowCount };
};

export const getLatestJob = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      jobId: v.id("mondayTouchBackfillJobs"),
      status: v.union(
        v.literal("running"),
        v.literal("done"),
        v.literal("failed"),
        v.literal("cancelled"),
      ),
      workflowId: v.optional(v.string()),
      sourceTag: v.string(),
      baselineDate: v.string(),
      contactBoardId: v.string(),
      touchBoardId: v.string(),
      pageSize: v.number(),
      currentCursor: v.optional(v.union(v.string(), v.null())),
      processedContacts: v.number(),
      createdTouches: v.number(),
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
      .query("mondayTouchBackfillJobs")
      .withIndex("by_startedAt", (q) => q)
      .order("desc")
      .first();
    if (!latest) return null;
    return {
      jobId: latest._id,
      status: latest.status,
      workflowId: latest.workflowId,
      sourceTag: latest.sourceTag,
      baselineDate: latest.baselineDate,
      contactBoardId: latest.contactBoardId,
      touchBoardId: latest.touchBoardId,
      pageSize: latest.pageSize,
      currentCursor: latest.currentCursor,
      processedContacts: latest.processedContacts,
      createdTouches: latest.createdTouches,
      skippedTouches: latest.skippedTouches,
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
    baselineDate: v.optional(v.string()),
    sourceTag: v.optional(v.string()),
    pageSize: v.optional(v.number()),
  },
  returns: v.object({
    jobId: v.id("mondayTouchBackfillJobs"),
    workflowId: v.string(),
  }),
  handler: async (ctx, args) => {
    const { contactBoardId, touchBoardId } = getMondayBackfillEnv();
    const baselineDate = normalizeDateOnly(
      args.baselineDate ?? new Date().toISOString().slice(0, 10),
    );
    const sourceTag = (args.sourceTag?.trim() || `baseline_${baselineDate}`).slice(0, 120);
    const pageSize = Math.max(25, Math.min(250, Math.floor(args.pageSize ?? 100)));

    const runningJob = await ctx.db
      .query("mondayTouchBackfillJobs")
      .withIndex("by_status", (q) => q.eq("status", "running"))
      .first();
    if (runningJob) {
      throw new Error("A monday touch backfill job is already running");
    }

    const now = Date.now();
    const jobId = await ctx.db.insert("mondayTouchBackfillJobs", {
      status: "running",
      sourceTag,
      baselineDate,
      contactBoardId,
      touchBoardId,
      pageSize,
      currentCursor: null,
      processedContacts: 0,
      createdTouches: 0,
      skippedTouches: 0,
      errorsCount: 0,
      startedAt: now,
      updatedAt: now,
      finishedAt: null,
      lastError: null,
    });

    const workflowId = await workflowAny.start(
      ctx,
      internalAny.mondayTouchBackfill.backfillTouchesWorkflow,
      { jobId, pageSize },
    );
    await ctx.db.patch(jobId, { workflowId, updatedAt: Date.now() });
    return { jobId, workflowId };
  },
});

export const cancelBackfill = mutation({
  args: {
    jobId: v.optional(v.id("mondayTouchBackfillJobs")),
  },
  returns: v.object({
    jobId: v.id("mondayTouchBackfillJobs"),
    status: v.string(),
  }),
  handler: async (ctx, args) => {
    let jobId = args.jobId;
    if (!jobId) {
      const latest = await ctx.db
        .query("mondayTouchBackfillJobs")
        .withIndex("by_startedAt", (q) => q)
        .order("desc")
        .first();
      if (!latest) throw new Error("No backfill job found");
      jobId = latest._id;
    }
    const job = await ctx.db.get(jobId);
    if (!job) throw new Error("Backfill job not found");
    if (job.status !== "running") {
      return { jobId, status: job.status };
    }
    await ctx.db.patch(jobId, {
      status: "cancelled" satisfies BackfillStatus,
      updatedAt: Date.now(),
      finishedAt: Date.now(),
      lastError: "Cancelled by user",
    });
    return { jobId, status: "cancelled" };
  },
});

export const getJobForWorkflow = internalQuery({
  args: { jobId: v.id("mondayTouchBackfillJobs") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("mondayTouchBackfillJobs"),
      status: v.union(
        v.literal("running"),
        v.literal("done"),
        v.literal("failed"),
        v.literal("cancelled"),
      ),
      sourceTag: v.string(),
      baselineDate: v.string(),
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
      sourceTag: job.sourceTag,
      baselineDate: job.baselineDate,
      contactBoardId: job.contactBoardId,
      touchBoardId: job.touchBoardId,
      pageSize: job.pageSize,
      currentCursor: job.currentCursor,
    };
  },
});

export const updateJobProgress = internalMutation({
  args: {
    jobId: v.id("mondayTouchBackfillJobs"),
    nextCursor: v.union(v.string(), v.null()),
    processedContactsDelta: v.number(),
    createdTouchesDelta: v.number(),
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
      createdTouches: job.createdTouches + args.createdTouchesDelta,
      skippedTouches: job.skippedTouches + args.skippedTouchesDelta,
      errorsCount: job.errorsCount + args.errorsDelta,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const finishJob = internalMutation({
  args: {
    jobId: v.id("mondayTouchBackfillJobs"),
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

export const backfillTouchesWorkflow = workflowAny.define({
  args: {
    jobId: v.id("mondayTouchBackfillJobs"),
    pageSize: v.number(),
  },
  returns: v.null(),
  handler: async (step: any, args: { jobId: Id<"mondayTouchBackfillJobs">; pageSize: number }) => {
    const startingJob = await step.runQuery(internalAny.mondayTouchBackfill.getJobForWorkflow, {
      jobId: args.jobId,
    });
    if (!startingJob || startingJob.status !== "running") {
      return null;
    }
    const existing = await step.runAction(
      internalAny.mondayTouchBackfillNode.fetchExistingBaselineKeysAction,
      {
        touchBoardId: startingJob.touchBoardId,
        sourceTag: startingJob.sourceTag,
        baselineDate: startingJob.baselineDate,
      },
    );
    const dedupeKeys = new Set<string>(existing.keys);

    while (true) {
      const job = await step.runQuery(internalAny.mondayTouchBackfill.getJobForWorkflow, {
        jobId: args.jobId,
      });
      if (!job) break;
      if (job.status !== "running") {
        await step.runMutation(internalAny.mondayTouchBackfill.finishJob, {
          jobId: args.jobId,
          status: "cancelled",
          lastError: "Stopped before completion",
        });
        break;
      }

      const page = await step.runAction(internalAny.mondayTouchBackfillNode.fetchContactsPageAction, {
        cursor: job.currentCursor ?? null,
        pageSize: job.pageSize || args.pageSize,
        boardId: job.contactBoardId,
      });

      if (page.contacts.length === 0) {
        await step.runMutation(internalAny.mondayTouchBackfill.finishJob, {
          jobId: args.jobId,
          status: "done",
          lastError: null,
        });
        break;
      }

      const written = await step.runAction(internalAny.mondayTouchBackfillNode.writeTouchRowsAction, {
        jobId: args.jobId,
        touchBoardId: job.touchBoardId,
        baselineDate: job.baselineDate,
        sourceTag: job.sourceTag,
        dedupeKeys: Array.from(dedupeKeys),
        contacts: page.contacts,
      });
      for (const key of written.createdKeys) {
        dedupeKeys.add(key);
      }

      await step.runMutation(internalAny.mondayTouchBackfill.updateJobProgress, {
        jobId: args.jobId,
        nextCursor: page.nextCursor,
        processedContactsDelta: page.contacts.length,
        createdTouchesDelta: written.created,
        skippedTouchesDelta: written.skipped + written.deduped,
        errorsDelta: written.errors,
      });

      if (!page.nextCursor) {
        await step.runMutation(internalAny.mondayTouchBackfill.finishJob, {
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

export const getLatestCsvExportJob = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      jobId: v.id("mondayTouchCsvExportJobs"),
      status: v.union(
        v.literal("running"),
        v.literal("done"),
        v.literal("failed"),
        v.literal("cancelled"),
      ),
      workflowId: v.optional(v.string()),
      sourceTag: v.string(),
      baselineDate: v.string(),
      contactBoardId: v.string(),
      pageSize: v.number(),
      currentCursor: v.optional(v.union(v.string(), v.null())),
      processedContacts: v.number(),
      rowCount: v.number(),
      chunkCount: v.number(),
      startedAt: v.number(),
      updatedAt: v.number(),
      finishedAt: v.optional(v.union(v.number(), v.null())),
      lastError: v.optional(v.union(v.string(), v.null())),
    }),
  ),
  handler: async (ctx) => {
    const latest = await ctx.db
      .query("mondayTouchCsvExportJobs")
      .withIndex("by_startedAt", (q) => q)
      .order("desc")
      .first();
    if (!latest) return null;
    return {
      jobId: latest._id,
      status: latest.status,
      workflowId: latest.workflowId,
      sourceTag: latest.sourceTag,
      baselineDate: latest.baselineDate,
      contactBoardId: latest.contactBoardId,
      pageSize: latest.pageSize,
      currentCursor: latest.currentCursor,
      processedContacts: latest.processedContacts,
      rowCount: latest.rowCount,
      chunkCount: latest.chunkCount,
      startedAt: latest.startedAt,
      updatedAt: latest.updatedAt,
      finishedAt: latest.finishedAt,
      lastError: latest.lastError,
    };
  },
});

export const startCsvExport = mutation({
  args: {
    baselineDate: v.optional(v.string()),
    sourceTag: v.optional(v.string()),
    pageSize: v.optional(v.number()),
  },
  returns: v.object({
    jobId: v.id("mondayTouchCsvExportJobs"),
    workflowId: v.string(),
  }),
  handler: async (ctx, args) => {
    const { contactBoardId } = getMondayBackfillEnv();
    const baselineDate = normalizeDateOnly(
      args.baselineDate ?? new Date().toISOString().slice(0, 10),
    );
    const sourceTag = (args.sourceTag?.trim() || `baseline_${baselineDate}`).slice(0, 120);
    const pageSize = Math.max(25, Math.min(250, Math.floor(args.pageSize ?? 100)));

    const runningJob = await ctx.db
      .query("mondayTouchCsvExportJobs")
      .withIndex("by_status", (q) => q.eq("status", "running"))
      .first();
    if (runningJob) {
      throw new Error("A CSV export job is already running");
    }

    const now = Date.now();
    const jobId = await ctx.db.insert("mondayTouchCsvExportJobs", {
      status: "running",
      sourceTag,
      baselineDate,
      contactBoardId,
      pageSize,
      currentCursor: null,
      processedContacts: 0,
      rowCount: 0,
      chunkCount: 0,
      startedAt: now,
      updatedAt: now,
      finishedAt: null,
      lastError: null,
    });

    const workflowId = await workflowAny.start(
      ctx,
      internalAny.mondayTouchBackfill.exportTouchesCsvWorkflow,
      { jobId, pageSize },
    );
    await ctx.db.patch(jobId, { workflowId, updatedAt: Date.now() });
    return { jobId, workflowId };
  },
});

export const cancelCsvExport = mutation({
  args: {
    jobId: v.optional(v.id("mondayTouchCsvExportJobs")),
  },
  returns: v.object({
    jobId: v.id("mondayTouchCsvExportJobs"),
    status: v.string(),
  }),
  handler: async (ctx, args) => {
    let jobId = args.jobId;
    if (!jobId) {
      const latest = await ctx.db
        .query("mondayTouchCsvExportJobs")
        .withIndex("by_startedAt", (q) => q)
        .order("desc")
        .first();
      if (!latest) throw new Error("No CSV export job found");
      jobId = latest._id;
    }
    const job = await ctx.db.get(jobId);
    if (!job) throw new Error("CSV export job not found");
    if (job.status !== "running") {
      return { jobId, status: job.status };
    }
    await ctx.db.patch(jobId, {
      status: "cancelled" satisfies CsvExportStatus,
      updatedAt: Date.now(),
      finishedAt: Date.now(),
      lastError: "Cancelled by user",
    });
    return { jobId, status: "cancelled" };
  },
});

export const getCsvExportCsv = query({
  args: { jobId: v.id("mondayTouchCsvExportJobs") },
  returns: v.union(
    v.null(),
    v.object({
      status: v.union(
        v.literal("running"),
        v.literal("done"),
        v.literal("failed"),
        v.literal("cancelled"),
      ),
      fileName: v.string(),
      csv: v.optional(v.string()),
      lastError: v.optional(v.union(v.string(), v.null())),
    }),
  ),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    const fileName = `monday-touch-backfill-${job.baselineDate}.csv`;
    if (job.status !== "done") {
      return {
        status: job.status,
        fileName,
        lastError: job.lastError ?? null,
      };
    }
    const chunks = await ctx.db
      .query("mondayTouchCsvExportChunks")
      .withIndex("by_jobId_and_chunkIndex", (q) => q.eq("jobId", args.jobId))
      .collect();
    const csv = `${chunks.map((chunk) => chunk.content).join("\n")}\n`;
    return {
      status: job.status,
      fileName,
      csv,
      lastError: job.lastError ?? null,
    };
  },
});

export const getCsvJobForWorkflow = internalQuery({
  args: { jobId: v.id("mondayTouchCsvExportJobs") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("mondayTouchCsvExportJobs"),
      status: v.union(
        v.literal("running"),
        v.literal("done"),
        v.literal("failed"),
        v.literal("cancelled"),
      ),
      sourceTag: v.string(),
      baselineDate: v.string(),
      contactBoardId: v.string(),
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
      sourceTag: job.sourceTag,
      baselineDate: job.baselineDate,
      contactBoardId: job.contactBoardId,
      pageSize: job.pageSize,
      currentCursor: job.currentCursor,
    };
  },
});

export const appendCsvChunk = internalMutation({
  args: {
    jobId: v.id("mondayTouchCsvExportJobs"),
    nextCursor: v.union(v.string(), v.null()),
    processedContactsDelta: v.number(),
    rowCountDelta: v.number(),
    chunkContent: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    await ctx.db.insert("mondayTouchCsvExportChunks", {
      jobId: args.jobId,
      chunkIndex: job.chunkCount,
      content: args.chunkContent,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.jobId, {
      chunkCount: job.chunkCount + 1,
      currentCursor: args.nextCursor,
      processedContacts: job.processedContacts + args.processedContactsDelta,
      rowCount: job.rowCount + args.rowCountDelta,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const finishCsvJob = internalMutation({
  args: {
    jobId: v.id("mondayTouchCsvExportJobs"),
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

export const exportTouchesCsvWorkflow = workflowAny.define({
  args: {
    jobId: v.id("mondayTouchCsvExportJobs"),
    pageSize: v.number(),
  },
  returns: v.null(),
  handler: async (step: any, args: { jobId: Id<"mondayTouchCsvExportJobs">; pageSize: number }) => {
    const startingJob = await step.runQuery(internalAny.mondayTouchBackfill.getCsvJobForWorkflow, {
      jobId: args.jobId,
    });
    if (!startingJob || startingJob.status !== "running") {
      return null;
    }

    await step.runMutation(internalAny.mondayTouchBackfill.appendCsvChunk, {
      jobId: args.jobId,
      nextCursor: startingJob.currentCursor ?? null,
      processedContactsDelta: 0,
      rowCountDelta: 0,
      chunkContent: csvHeaderLine,
    });

    while (true) {
      const job = await step.runQuery(internalAny.mondayTouchBackfill.getCsvJobForWorkflow, {
        jobId: args.jobId,
      });
      if (!job) break;
      if (job.status !== "running") {
        await step.runMutation(internalAny.mondayTouchBackfill.finishCsvJob, {
          jobId: args.jobId,
          status: "cancelled",
          lastError: "Stopped before completion",
        });
        break;
      }

      const page = await step.runAction(internalAny.mondayTouchBackfillNode.fetchContactsPageAction, {
        cursor: job.currentCursor ?? null,
        pageSize: job.pageSize || args.pageSize,
        boardId: job.contactBoardId,
      });

      if (page.contacts.length === 0) {
        await step.runMutation(internalAny.mondayTouchBackfill.finishCsvJob, {
          jobId: args.jobId,
          status: "done",
          lastError: null,
        });
        break;
      }

      const chunk = buildCsvChunk({
        contacts: page.contacts as CsvContact[],
        baselineDate: job.baselineDate,
        sourceTag: job.sourceTag,
      });
      if (chunk.csvChunk.trim().length > 0) {
        await step.runMutation(internalAny.mondayTouchBackfill.appendCsvChunk, {
          jobId: args.jobId,
          nextCursor: page.nextCursor,
          processedContactsDelta: page.contacts.length,
          rowCountDelta: chunk.rowCount,
          chunkContent: chunk.csvChunk,
        });
      } else {
        await step.runMutation(internalAny.mondayTouchBackfill.appendCsvChunk, {
          jobId: args.jobId,
          nextCursor: page.nextCursor,
          processedContactsDelta: page.contacts.length,
          rowCountDelta: 0,
          chunkContent: "",
        });
      }

      if (!page.nextCursor) {
        await step.runMutation(internalAny.mondayTouchBackfill.finishCsvJob, {
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
