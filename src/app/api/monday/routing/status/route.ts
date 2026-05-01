import { NextResponse } from "next/server";

import { getMondayDistrictRoutingStatus } from "~/server/monday/routing";
import { requireVerifiedMondaySession } from "~/server/monday/session";

export const runtime = "nodejs";

const MONDAY_SETTINGS_ADMIN_USER_ID = "53441186";

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

export const GET = async (request: Request) => {
  try {
    const identity = await requireVerifiedMondaySession(request);
    if (identity.userId !== MONDAY_SETTINGS_ADMIN_USER_ID) {
      return toJson({ ok: false, error: "Admin access required" }, 403);
    }

    const status = await getMondayDistrictRoutingStatus();
    return toJson({ ok: true, status });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load routing status";
    return toJson({ ok: false, error: message }, 500);
  }
};
