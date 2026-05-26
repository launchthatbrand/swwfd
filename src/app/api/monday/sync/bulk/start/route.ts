import { api as apiGenerated } from "@convex-config/_generated/api";
import { getConvexHttpClient } from "~/server/convexHttp";
import {
  normalizeMonthlyBoardMappings,
  requireBulkSyncAdminSession,
  toJson,
} from "../helpers";

export const runtime = "nodejs";

const apiAny = apiGenerated as any;

interface StartBulkSyncBody {
  contactItemIds?: string[];
  ownerId?: string;
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

  let body: StartBulkSyncBody = {};
  try {
    body = (await request.json()) as StartBulkSyncBody;
  } catch {
    body = {};
  }

  const ownerId = body.ownerId?.trim() || adminContext.identity.userId;
  const contactItemIds = Array.isArray(body.contactItemIds) ? body.contactItemIds : [];
  const convex = getConvexHttpClient();
  try {
    const job = await convex.mutation(apiAny.mondayBulkSync.createJob, {
      mondayAccountId: adminContext.identity.accountId,
      requestedByMondayUserId: adminContext.identity.userId,
      requestedByMondayAppClientId: adminContext.identity.appClientId,
      ownerId,
      contactItemIds,
      monthlyBoardMappings: normalizeMonthlyBoardMappings(
        adminContext.platformSettings.monthlyBoardMappings,
      ),
    });
    console.log("[bulk-sync] job started", {
      jobId: job.jobId,
      totalContacts: job.totalContacts,
      requestedByMondayUserId: adminContext.identity.userId,
      mondayAccountId: adminContext.identity.accountId,
    });
    return toJson({ ok: true, job });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start bulk sync";
    return toJson({ ok: false, error: message }, 500);
  }
};
