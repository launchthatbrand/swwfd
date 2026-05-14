import { api as apiGenerated } from "@convex-config/_generated/api";
import { getConvexHttpClient } from "~/server/convexHttp";
import { requireBulkSyncAdminSession, toJson } from "../helpers";

export const runtime = "nodejs";

const apiAny = apiGenerated as any;

export const GET = async (request: Request) => {
  let adminContext;
  try {
    adminContext = await requireBulkSyncAdminSession(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    const status = message === "Admin access required" ? 403 : 401;
    return toJson({ ok: false, error: message }, status);
  }

  const url = new URL(request.url);
  const rawJobId = url.searchParams.get("jobId")?.trim();
  const convex = getConvexHttpClient();
  try {
    const job = rawJobId
      ? await convex.query(apiAny.mondayBulkSync.getJob, { jobId: rawJobId })
      : await convex.query(apiAny.mondayBulkSync.getLatestJobForAccount, {
          mondayAccountId: adminContext.identity.accountId,
        });

    if (!job) {
      return toJson({ ok: true, job: null });
    }
    if (job.mondayAccountId !== adminContext.identity.accountId) {
      return toJson({ ok: false, error: "Bulk sync job not found" }, 404);
    }
    return toJson({ ok: true, job });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load bulk sync status";
    return toJson({ ok: false, error: message }, 500);
  }
};
