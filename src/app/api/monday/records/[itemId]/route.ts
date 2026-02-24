import { NextResponse } from "next/server";

import { updateMondayRecordFields } from "~/server/monday/client";
import { requireVerifiedMondaySession } from "~/server/monday/session";

export const runtime = "nodejs";

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

interface UpdateRecordBody {
  referredToContractors?: string | null;
  hiredWithContractor?: string | null;
  hireDate?: string | null;
  retentionPeriod?: string | null;
  tags?: string[] | null;
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

  let body: UpdateRecordBody;
  try {
    body = (await request.json()) as UpdateRecordBody;
  } catch {
    return toJson({ ok: false, error: "Invalid JSON body" }, 400);
  }

  try {
    await updateMondayRecordFields({
      itemId,
      referredToContractors: body.referredToContractors,
      hiredWithContractor: body.hiredWithContractor,
      hireDate: body.hireDate,
      retentionPeriod: body.retentionPeriod,
      tags: body.tags,
    });
    return toJson({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update monday item";
    return toJson({ ok: false, error: message }, 500);
  }
};
