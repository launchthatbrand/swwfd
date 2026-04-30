import { NextResponse } from "next/server";

import { assignMondayContactOwnerByDistrict } from "~/server/monday/routing";
import { requireVerifiedMondaySession } from "~/server/monday/session";

export const runtime = "nodejs";

const MONDAY_SETTINGS_ADMIN_USER_ID = "53441186";

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

interface AssignRoutingBody {
  itemId?: string;
  force?: boolean;
}

const normalizeValue = (value: string | null | undefined) => {
  if (!value) return "";
  return value.trim();
};

export const POST = async (request: Request) => {
  let body: AssignRoutingBody = {};
  try {
    body = (await request.json()) as AssignRoutingBody;
  } catch {
    body = {};
  }

  const itemId = normalizeValue(body.itemId);
  if (!itemId) {
    return toJson({ ok: false, error: "itemId is required" }, 400);
  }

  try {
    const identity = await requireVerifiedMondaySession(request);
    if (identity.userId !== MONDAY_SETTINGS_ADMIN_USER_ID) {
      return toJson({ ok: false, error: "Admin access required" }, 403);
    }

    const result = await assignMondayContactOwnerByDistrict({
      itemId,
      source: "manual",
      force: body.force ?? true,
    });
    return toJson({ ok: result.ok, result });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to run routing assignment";
    return toJson({ ok: false, error: message }, 500);
  }
};
