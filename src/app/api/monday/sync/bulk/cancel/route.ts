import { api as apiGenerated } from "@convex-config/_generated/api";
import { getConvexHttpClient } from "~/server/convexHttp";
import { requireBulkSyncAdminSession, toJson } from "../helpers";

export const runtime = "nodejs";

const apiAny = apiGenerated as any;

interface CancelBody {
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

  let body: CancelBody = {};
  try {
    body = (await request.json()) as CancelBody;
  } catch {
    body = {};
  }

  const convex = getConvexHttpClient();
  try {
    const jobId = body.jobId?.trim();
    if (!jobId) {
      return toJson({ ok: false, error: "jobId is required" }, 400);
    }
    const job = await convex.query(apiAny.mondayBulkSync.getJob, { jobId });
    if (!job || job.mondayAccountId !== adminContext.identity.accountId) {
      return toJson({ ok: false, error: "Bulk sync job not found" }, 404);
    }
    const cancelled = await convex.mutation(apiAny.mondayBulkSync.cancelJob, {
      jobId,
    });
    console.log("[bulk-sync] job cancelled", {
      jobId,
      mondayAccountId: adminContext.identity.accountId,
      requestedByMondayUserId: adminContext.identity.userId,
    });
    return toJson({ ok: true, job: cancelled });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to cancel bulk sync job";
    return toJson({ ok: false, error: message }, 500);
  }
};
