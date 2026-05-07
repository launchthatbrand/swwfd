import { NextResponse } from "next/server";
import { api as apiGenerated } from "@convex-config/_generated/api";

import { getConvexHttpClient } from "~/server/convexHttp";
import { requireVerifiedMondaySession } from "~/server/monday/session";
import { syncContactFromConnectedBoards } from "~/server/monday/sync";

export const runtime = "nodejs";

const MASTER_ADMIN_USER_ID = "53441186";

const toJson = (body: unknown, status = 200) =>
  NextResponse.json(body, { status });

interface SyncBody {
  dryRun?: boolean;
  ownerId?: string;
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
  const isAdmin =
    identity.userId === MASTER_ADMIN_USER_ID ||
    platformSettings.adminUserIds.includes(identity.userId);
  if (!isAdmin) {
    return toJson({ ok: false, error: "Admin access required" }, 403);
  }

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
    const result = await syncContactFromConnectedBoards(itemId.trim(), {
      dryRun: body.dryRun ?? false,
      ownerId: body.ownerId ?? identity.userId,
    });
    return toJson(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Sync failed";
    return toJson({ ok: false, error: message }, 500);
  }
};
