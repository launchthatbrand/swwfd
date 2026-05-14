import { api as apiGenerated } from "@convex-config/_generated/api";
import { getConvexHttpClient } from "~/server/convexHttp";
import { syncContactFromConnectedBoards } from "~/server/monday/sync";
import { requireBulkSyncAdminSession, toJson } from "../helpers";

export const runtime = "nodejs";

const apiAny = apiGenerated as any;

interface TickBody {
  jobId?: string;
  batchSize?: number;
  concurrency?: number;
}

interface ClaimedSyncBatch {
  status: "running" | "done" | "failed" | "cancelled";
  contactItemIds: string[];
  ownerId: string;
  monthlyBoardMappings: Array<{ monthKey: string; boardId: string }>;
}

const mapWithConcurrency = async <TValue, TResult>(
  values: TValue[],
  concurrency: number,
  worker: (value: TValue, index: number) => Promise<TResult>,
) => {
  if (values.length === 0) return [] as TResult[];
  const safeConcurrency = Math.max(1, Math.min(concurrency, values.length));
  const results = new Array<TResult>(values.length);
  let nextIndex = 0;
  await Promise.all(
    Array.from({ length: safeConcurrency }, async () => {
      while (nextIndex < values.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await worker(values[index] as TValue, index);
      }
    }),
  );
  return results;
};

export const POST = async (request: Request) => {
  const tickStartedAt = Date.now();
  let adminContext;
  try {
    adminContext = await requireBulkSyncAdminSession(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    const status = message === "Admin access required" ? 403 : 401;
    return toJson({ ok: false, error: message }, status);
  }

  let body: TickBody = {};
  try {
    body = (await request.json()) as TickBody;
  } catch {
    body = {};
  }
  const jobId = body.jobId?.trim();
  if (!jobId) {
    return toJson({ ok: false, error: "jobId is required" }, 400);
  }

  const convex = getConvexHttpClient();
  const requestedBatchSize = Math.min(Math.max(Math.floor(body.batchSize ?? 6), 1), 25);
  const requestedConcurrency = Math.min(Math.max(Math.floor(body.concurrency ?? 3), 1), 8);

  try {
    const currentJob = await convex.query(apiAny.mondayBulkSync.getJob, { jobId });
    if (!currentJob) {
      return toJson({ ok: false, error: "Bulk sync job not found" }, 404);
    }
    if (currentJob.mondayAccountId !== adminContext.identity.accountId) {
      return toJson({ ok: false, error: "Bulk sync job not found" }, 404);
    }
    if (currentJob.status !== "running") {
      return toJson({ ok: true, job: currentJob, processed: 0 });
    }

    const claimedBatch = (await convex.mutation(apiAny.mondayBulkSync.claimNextBatch, {
      jobId,
      batchSize: requestedBatchSize,
    })) as ClaimedSyncBatch;
    if (claimedBatch.status !== "running") {
      const latest = await convex.query(apiAny.mondayBulkSync.getJob, { jobId });
      return toJson({ ok: true, job: latest, processed: 0 });
    }

    if (claimedBatch.contactItemIds.length === 0) {
      await convex.mutation(apiAny.mondayBulkSync.recordBatchResults, {
        jobId,
        results: [],
      });
      const latest = await convex.query(apiAny.mondayBulkSync.getJob, { jobId });
      return toJson({ ok: true, job: latest, processed: 0 });
    }

    const batchResults = await mapWithConcurrency(
      claimedBatch.contactItemIds,
      requestedConcurrency,
      async (contactItemId) => {
        try {
          const result = await syncContactFromConnectedBoards(contactItemId, {
            ownerId: claimedBatch.ownerId,
            monthlyBoardMappings: claimedBatch.monthlyBoardMappings,
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
            error: error instanceof Error ? error.message : "Sync failed",
          };
        }
      },
    );

    const updatedJob = await convex.mutation(apiAny.mondayBulkSync.recordBatchResults, {
      jobId,
      results: batchResults,
    });
    console.log("[bulk-sync] batch complete", {
      jobId,
      processed: batchResults.length,
      succeeded: batchResults.filter((entry) => entry.status === "success").length,
      failed: batchResults.filter((entry) => entry.status === "failed").length,
      retryableWarnings: batchResults.reduce(
        (total, entry) => total + entry.warnings.length,
        0,
      ),
      elapsedMs: Date.now() - tickStartedAt,
    });
    return toJson({
      ok: true,
      job: updatedJob,
      processed: batchResults.length,
      succeeded: batchResults.filter((entry) => entry.status === "success").length,
      failed: batchResults.filter((entry) => entry.status === "failed").length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to process bulk sync batch";
    await convex
      .mutation(apiAny.mondayBulkSync.markJobFailed, { jobId, error: message })
      .catch(() => null);
    return toJson({ ok: false, error: message }, 500);
  }
};
