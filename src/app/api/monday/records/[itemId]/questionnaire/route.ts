import { NextResponse } from "next/server";

import {
  parseQuestionnaireBody,
  saveQuestionnaireToContact,
} from "~/server/monday/questionnaire";
import { requireVerifiedMondaySession } from "~/server/monday/session";

export const runtime = "nodejs";

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};


export const POST = async (
  request: Request,
  context: { params: Promise<{ itemId: string }> },
) => {
  let sessionIdentity:
    | Awaited<ReturnType<typeof requireVerifiedMondaySession>>
    | null = null;
  try {
    sessionIdentity = await requireVerifiedMondaySession(request);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unauthorized Monday session";
    return toJson({ ok: false, error: message }, 401);
  }

  const { itemId } = await context.params;
  if (!itemId?.trim()) {
    return toJson({ ok: false, error: "Missing monday item id" }, 400);
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return toJson({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const body = parseQuestionnaireBody(rawBody);

  try {
    await saveQuestionnaireToContact({
      itemId: itemId.trim(),
      actorMondayUserId: sessionIdentity?.userId ?? null,
      body,
    });
    return toJson({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save questionnaire";
    return toJson({ ok: false, error: message }, 500);
  }
};
