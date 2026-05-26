import { api as apiGenerated } from "@convex-config/_generated/api";
import { getConvexHttpClient } from "~/server/convexHttp";
import {
  normalizeMonthlyBoardMappings,
  requireBulkSyncAdminSession,
  toJson,
} from "../helpers";

export const runtime = "nodejs";

const apiAny = apiGenerated as any;

interface RetryBody {
  jobId?: string;
}

export const POST = async (request: Request) => {
  let adminContext;
  try {
    adminContext = await requireBulkSyncAdminSession(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    const status = message === "Admin access required" ? 403 : 401;
    return toJson({ ok: false, error: message }, status);
  }

  let body: RetryBody = {};
  try {
    body = (await request.json()) as RetryBody;
  } catch {
    body = {};
  }

  const convex = getConvexHttpClient();
  try {
    const sourceJobId = body.jobId?.trim();
    const sourceJob = sourceJobId
      ? await convex.query(apiAny.mondayBulkSync.getJob, { jobId: sourceJobId })
      : await convex.query(apiAny.mondayBulkSync.getLatestJobForAccount, {
          mondayAccountId: adminContext.identity.accountId,
        });
    if (!sourceJob || sourceJob.mondayAccountId !== adminContext.identity.accountId) {
      return toJson({ ok: false, error: "Bulk sync job not found" }, 404);
    }
    const failedContactIds = await convex.query(
      apiAny.mondayBulkSync.listFailedContactIds,
      { jobId: sourceJob.jobId },
    );
    if (failedContactIds.length === 0) {
      return toJson({ ok: false, error: "No failed contacts to retry" }, 400);
    }
    const job = await convex.mutation(apiAny.mondayBulkSync.createJob, {
      mondayAccountId: adminContext.identity.accountId,
      requestedByMondayUserId: adminContext.identity.userId,
      requestedByMondayAppClientId: adminContext.identity.appClientId,
      ownerId: sourceJob.ownerId,
      contactItemIds: failedContactIds,
      monthlyBoardMappings: normalizeMonthlyBoardMappings(
        adminContext.platformSettings.monthlyBoardMappings,
      ),
    });
    console.log("[bulk-sync] retry job started", {
      sourceJobId: sourceJob.jobId,
      retryJobId: job.jobId,
      retriedContacts: failedContactIds.length,
      mondayAccountId: adminContext.identity.accountId,
    });
    return toJson({
      ok: true,
      job,
      retriedContacts: failedContactIds.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to retry failed bulk sync contacts";
    return toJson({ ok: false, error: message }, 500);
  }
};
