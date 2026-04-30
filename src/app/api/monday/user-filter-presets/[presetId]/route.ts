import { NextResponse } from "next/server";

import { api as apiGenerated } from "@convex-config/_generated/api";

import { getConvexHttpClient } from "~/server/convexHttp";
import { requireVerifiedMondaySession } from "~/server/monday/session";

export const runtime = "nodejs";

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

const normalizeValue = (value: string | null | undefined) => {
  if (!value) return "";
  return value.trim();
};

export const DELETE = async (
  request: Request,
  context: { params: Promise<{ presetId: string }> },
) => {
  const identity = await requireVerifiedMondaySession(request).catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Unauthorized Monday session";
    return { error: message };
  });

  if ("error" in identity) {
    return toJson({ ok: false, error: identity.error }, 401);
  }

  const { presetId } = await context.params;
  const normalizedPresetId = normalizeValue(presetId);
  const ownerId = normalizeValue(new URL(request.url).searchParams.get("ownerId"));

  if (!normalizedPresetId) {
    return toJson({ ok: false, error: "presetId is required" }, 400);
  }
  if (!ownerId) {
    return toJson({ ok: false, error: "ownerId is required" }, 400);
  }

  try {
    const convex = getConvexHttpClient();
    await convex.mutation(apiGenerated.mondayUserFilterPresets.removeForOwnerBoard, {
      accountId: identity.accountId,
      ownerMondayUserId: ownerId,
      presetId: normalizedPresetId,
    });
    return toJson({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete filter preset";
    return toJson({ ok: false, error: message }, 500);
  }
};
