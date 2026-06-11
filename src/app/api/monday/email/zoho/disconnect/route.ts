import { NextResponse } from "next/server";

import { requireVerifiedMondaySession } from "~/server/monday/session";
import { removeZohoConnection } from "~/server/zoho/store";

export const runtime = "nodejs";

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

export const POST = async (request: Request) => {
  try {
    const identity = await requireVerifiedMondaySession(request);
    await removeZohoConnection({
      mondayAccountId: identity.accountId,
      mondayAppClientId: identity.appClientId,
    });
    return toJson({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return toJson({ ok: false, error: message }, 401);
  }
};
