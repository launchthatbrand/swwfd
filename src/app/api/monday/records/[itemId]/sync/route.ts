import { NextResponse } from "next/server";
import { api as apiGenerated } from "@convex-config/_generated/api";

import { getConvexHttpClient } from "~/server/convexHttp";
import { requireVerifiedMondaySession } from "~/server/monday/session";

export const runtime = "nodejs";

const toJson = (body: unknown, status = 200) =>
  NextResponse.json(body, { status });

interface SyncBody {
  ownerId?: string;
  monthlyBoardId?: string;
}

export const POST = async (
  request: Request,
  context: { params: Promise<{ itemId: string }> },
) => {
  let identity;
  try {
    identity = await requireVerifiedMondaySession(request);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unauthorized Monday session";
    return toJson({ ok: false, error: message }, 401);
  }

  const convex = getConvexHttpClient();
  const platformSettings = await convex.query(
    apiGenerated.mondaySettings.getPlatformSettings,
    {},
  );
  const monthlyBoardMappings = Array.isArray(platformSettings.monthlyBoardMappings)
    ? platformSettings.monthlyBoardMappings
    : [];

  const { itemId } = await context.params;
  if (!itemId?.trim()) {
    return toJson({ ok: false, error: "Missing item id" }, 400);
  }

  let body: SyncBody = {};
  try {
    body = (await request.json()) as SyncBody;
  } catch {
    body = {};
  }

  try {
    const selectedMonthlyBoardId = body.monthlyBoardId?.trim() ?? "";
    const ownerId = body.ownerId?.trim() || identity.userId;
    const job = await convex.mutation(apiGenerated.mondayBulkSync.createJob, {
      mondayAccountId: identity.accountId,
      requestedByMondayUserId: identity.userId,
      requestedByMondayAppClientId: identity.appClientId ?? undefined,
      ownerId,
      monthlyBoardIdOverride: selectedMonthlyBoardId.length > 0 ? selectedMonthlyBoardId : undefined,
      contactItemIds: [itemId.trim()],
      monthlyBoardMappings,
    });
    return toJson({ ok: true, job });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Sync failed";
    return toJson({ ok: false, error: message }, 500);
  }
};
