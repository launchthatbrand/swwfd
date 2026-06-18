"use node";

import { v } from "convex/values";

import { internalAction } from "./_generated/server";

type SyncContactFromConnectedBoards = (
  itemId: string,
  options?: {
    dryRun?: boolean;
    ownerId?: string;
    monthlyBoardId?: string;
    monthlyBoardMappings?: Array<{ monthKey: string; boardId: string }>;
  },
) => Promise<{
  ok: boolean;
  linkedItemCount: number;
  createdParentUpdates: number;
  createdSubitems: number;
  createdSubitemUpdates: number;
  updatedProgressColumns: number;
  skippedSubitems: number;
  warnings: string[];
}>;

let syncContactFromConnectedBoardsCached: SyncContactFromConnectedBoards | null = null;
const getSyncContactFromConnectedBoards = async (): Promise<SyncContactFromConnectedBoards> => {
  if (syncContactFromConnectedBoardsCached) return syncContactFromConnectedBoardsCached;
  process.env.NEXT_PUBLIC_CONVEX_URL ||= "https://example.convex.cloud";
  const module = (await import("../src/server/monday/sync")) as {
    syncContactFromConnectedBoards: SyncContactFromConnectedBoards;
  };
  syncContactFromConnectedBoardsCached = module.syncContactFromConnectedBoards;
  return syncContactFromConnectedBoardsCached;
};

const monthlyBoardMappingValidator = v.object({
  monthKey: v.string(),
  boardId: v.string(),
});

const mapWithConcurrency = async <T, R>(
  values: readonly T[],
  concurrency: number,
  worker: (value: T, index: number) => Promise<R>,
): Promise<R[]> => {
  if (values.length === 0) return [];
  const limit = Math.max(1, Math.floor(concurrency));
  const results: R[] = new Array(values.length);
  let index = 0;
  const runWorker = async () => {
    while (true) {
      const currentIndex = index;
      if (currentIndex >= values.length) return;
      index = currentIndex + 1;
      results[currentIndex] = await worker(values[currentIndex]!, currentIndex);
    }
  };
  const workers = Array.from({ length: Math.min(limit, values.length) }, () => runWorker());
  await Promise.all(workers);
  return results;
};

export const syncContactBatchAction = internalAction({
  args: {
    jobId: v.string(),
    ownerId: v.string(),
    monthlyBoardIdOverride: v.optional(v.string()),
    monthlyBoardMappings: v.array(monthlyBoardMappingValidator),
    contactItemIds: v.array(v.string()),
    concurrency: v.optional(v.number()),
  },
  returns: v.object({
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
  }),
  handler: async (_ctx, args) => {
    const syncContactFromConnectedBoards = await getSyncContactFromConnectedBoards();
    const ownerId = args.ownerId.trim();
    const monthlyBoardIdOverride = args.monthlyBoardIdOverride?.trim() || undefined;
    const monthlyBoardMappings = args.monthlyBoardMappings.map((mapping) => ({
      monthKey: mapping.monthKey.trim(),
      boardId: mapping.boardId.trim(),
    }));
    const contactItemIds = Array.from(
      new Set(args.contactItemIds.map((itemId) => itemId.trim()).filter(Boolean)),
    );
    const concurrency = Math.min(Math.max(Math.floor(args.concurrency ?? 3), 1), 6);

    const results = await mapWithConcurrency(contactItemIds, concurrency, async (contactItemId) => {
      try {
        const result = await syncContactFromConnectedBoards(contactItemId, {
          ownerId,
          monthlyBoardId: monthlyBoardIdOverride,
          monthlyBoardMappings,
        });
        return {
          contactItemId,
          status: "success" as const,
          linkedItemCount: result.linkedItemCount,
          createdParentUpdates: result.createdParentUpdates,
          createdSubitems: result.createdSubitems,
          createdSubitemUpdates: result.createdSubitemUpdates,
          updatedProgressColumns: result.updatedProgressColumns,
          skippedSubitems: result.skippedSubitems,
          warnings: result.warnings,
          error: null,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown sync error";
        return {
          contactItemId,
          status: "failed" as const,
          linkedItemCount: 0,
          createdParentUpdates: 0,
          createdSubitems: 0,
          createdSubitemUpdates: 0,
          updatedProgressColumns: 0,
          skippedSubitems: 0,
          warnings: [],
          error: message,
        };
      }
    });

    console.log("[monday.bulkSync.workflow] batch complete", {
      jobId: args.jobId,
      attempted: contactItemIds.length,
      succeeded: results.filter((result) => result.status === "success").length,
      failed: results.filter((result) => result.status === "failed").length,
      concurrency,
    });

    return { results };
  },
});
