import { NextResponse } from "next/server";

import {
  deleteMondaySubitem,
  updateMondaySubitemDate,
} from "~/server/monday/client";
import { requireVerifiedMondaySession } from "~/server/monday/session";

export const runtime = "nodejs";

const toJson = (body: unknown, status = 200) =>
  NextResponse.json(body, { status });

interface DeleteBody {
  subitemId?: string;
}

export const DELETE = async (request: Request) => {
  try {
    await requireVerifiedMondaySession(request);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unauthorized Monday session";
    return toJson({ ok: false, error: message }, 401);
  }

  let payload: DeleteBody;
  try {
    payload = (await request.json()) as DeleteBody;
  } catch {
    return toJson({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const subitemId = payload.subitemId?.trim();
  if (!subitemId) {
    return toJson({ ok: false, error: "Missing subitemId" }, 400);
  }

  try {
    const result = await deleteMondaySubitem({ subitemId });
    return toJson({ ok: true, deletedId: result.deletedId });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete subitem";
    return toJson({ ok: false, error: message }, 500);
  }
};

interface PatchBody {
  subitemId?: string;
  date?: string;
}

export const PATCH = async (request: Request) => {
  try {
    await requireVerifiedMondaySession(request);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unauthorized Monday session";
    return toJson({ ok: false, error: message }, 401);
  }

  let payload: PatchBody;
  try {
    payload = (await request.json()) as PatchBody;
  } catch {
    return toJson({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const subitemId = payload.subitemId?.trim();
  const date = payload.date?.trim();
  if (!subitemId) {
    return toJson({ ok: false, error: "Missing subitemId" }, 400);
  }
  if (!date) {
    return toJson({ ok: false, error: "Missing date" }, 400);
  }

  try {
    const result = await updateMondaySubitemDate({ subitemId, date });
    return toJson({ ok: true, updatedId: result.updatedId, date: result.date });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update date";
    return toJson({ ok: false, error: message }, 500);
  }
};
