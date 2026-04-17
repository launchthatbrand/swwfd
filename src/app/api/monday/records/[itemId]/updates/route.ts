import { NextResponse } from "next/server";

import {
  createMondayRecordUpdate,
  isMondayUpdateType,
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
  if (!itemId.trim()) {
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
  if (!itemId.trim()) {
    return toJson({ ok: false, error: "Missing monday item id" }, 400);
  }

  let body: CreateUpdateBody = {};
  try {
    body = (await request.json()) as CreateUpdateBody;
  } catch {
    return toJson({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const updateBody = body.body?.trim() ?? "";
  if (!updateBody) {
    return toJson({ ok: false, error: "Update body cannot be empty" }, 400);
  }
  const updateTypeRaw = body.updateType?.trim().toLowerCase();
  if (updateTypeRaw && !isMondayUpdateType(updateTypeRaw)) {
    return toJson(
      {
        ok: false,
        error:
          "Invalid update type. Use one of: general, welcome_email, followup, questionnaire, resume, resume_referral.",
      },
      400,
    );
  }
  const updateType = updateTypeRaw && isMondayUpdateType(updateTypeRaw)
    ? updateTypeRaw
    : undefined;

  try {
    const update = await createMondayRecordUpdate({
      itemId,
      body: updateBody,
      updateType,
    });
    return toJson({ ok: true, update });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create Monday update";
    return toJson({ ok: false, error: message }, 500);
  }
};
