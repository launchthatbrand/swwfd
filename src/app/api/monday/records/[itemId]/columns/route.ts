import { NextResponse } from "next/server";

import { updateMondayRecordColumnValue } from "~/server/monday/client";
import { requireVerifiedMondaySession } from "~/server/monday/session";

export const runtime = "nodejs";

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

interface UpdateColumnBody {
  columnId?: string;
  columnType?: string;
  value?: string | null;
}

export const PATCH = async (
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

  let payload: UpdateColumnBody;
  try {
    payload = (await request.json()) as UpdateColumnBody;
  } catch {
    return toJson({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const columnId = payload.columnId?.trim();
  const columnType = payload.columnType?.trim();
  if (!columnId) {
    return toJson({ ok: false, error: "Missing columnId" }, 400);
  }
  if (!columnType) {
    return toJson({ ok: false, error: "Missing columnType" }, 400);
  }

  try {
    await updateMondayRecordColumnValue({
      itemId: itemId.trim(),
      columnId,
      columnType,
      value: typeof payload.value === "string" ? payload.value : null,
    });
    return toJson({
      ok: true,
      itemId: itemId.trim(),
      columnId,
      columnType,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update column value";
    return toJson({ ok: false, error: message }, 500);
  }
};
