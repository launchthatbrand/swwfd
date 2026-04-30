import { NextResponse } from "next/server";

import {
  createMondayRecordUpdate,
  listMondayRecordUpdates,
} from "~/server/monday/client";
import { requireVerifiedMondaySession } from "~/server/monday/session";

export const runtime = "nodejs";

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

export const GET = async (
  request: Request,
  context: { params: Promise<{ itemId: string }> },
) => {
  try {
    await requireVerifiedMondaySession(request);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unauthorized Monday session";
    return toJson({ ok: false, error: message }, 401);
  }

  const { itemId } = await context.params;
  if (!itemId?.trim()) {
    return toJson({ ok: false, error: "Missing monday item id" }, 400);
  }

  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") ?? "100");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), 200)
    : 100;

  try {
    const result = await listMondayRecordUpdates({ itemId, limit });
    return toJson({
      ok: true,
      itemId: result.itemId,
      itemName: result.itemName,
      updates: result.updates,
      subitems: result.subitems,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load Monday updates";
    return toJson({ ok: false, error: message }, 500);
  }
};

interface CreateUpdateBody {
  body?: string;
  updateType?: string;
  date?: string;
}

export const POST = async (
  request: Request,
  context: { params: Promise<{ itemId: string }> },
) => {
  try {
    await requireVerifiedMondaySession(request);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unauthorized Monday session";
    return toJson({ ok: false, error: message }, 401);
  }

  const { itemId } = await context.params;
  if (!itemId?.trim()) {
    return toJson({ ok: false, error: "Missing monday item id" }, 400);
  }

  let payload: CreateUpdateBody;
  try {
    payload = (await request.json()) as CreateUpdateBody;
  } catch {
    return toJson({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const updateBody = payload.body?.trim();
  if (!updateBody) {
    return toJson({ ok: false, error: "Update body cannot be empty" }, 400);
  }

  try {
    const result = await createMondayRecordUpdate({
      itemId: itemId.trim(),
      body: updateBody,
      updateType: (payload.updateType as "general") ?? "general",
      date: payload.date,
    });
    return toJson({
      ok: true,
      update: {
        id: result.id,
        body: result.body,
        updateType: result.updateType,
        source: result.source,
        subitemName: result.subitemName,
        approvalStepMarked: result.approvalStepMarked,
        warning: result.warning,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create update";
    return toJson({ ok: false, error: message }, 500);
  }
};
