import { NextResponse } from "next/server";

import { api as apiGenerated } from "@convex-config/_generated/api";

import { getConvexHttpClient } from "~/server/convexHttp";
import { requireVerifiedMondaySession } from "~/server/monday/session";

export const runtime = "nodejs";

const MASTER_ADMIN_USER_ID = "53441186";

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

interface FeatureFlagsBody {
  emailMarketingEnabled?: boolean;
}

export const GET = async (request: Request) => {
  try {
    await requireVerifiedMondaySession(request);
    const convex = getConvexHttpClient();
    const featureFlags = await convex.query(apiGenerated.mondaySettings.getFeatureFlags, {});
    return toJson({ ok: true, featureFlags });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load feature flags";
    return toJson({ ok: false, error: message }, 401);
  }
};

export const POST = async (request: Request) => {
  let body: FeatureFlagsBody = {};
  try {
    body = (await request.json()) as FeatureFlagsBody;
  } catch {
    body = {};
  }

  if (typeof body.emailMarketingEnabled !== "boolean") {
    return toJson({ ok: false, error: "emailMarketingEnabled must be a boolean" }, 400);
  }

  try {
    const identity = await requireVerifiedMondaySession(request);
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

    const featureFlags = await convex.mutation(apiGenerated.mondaySettings.setFeatureFlags, {
      emailMarketingEnabled: body.emailMarketingEnabled,
      updatedByMondayUserId: identity.userId,
    });

    return toJson({ ok: true, featureFlags });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update feature flags";
    return toJson({ ok: false, error: message }, 500);
  }
};
