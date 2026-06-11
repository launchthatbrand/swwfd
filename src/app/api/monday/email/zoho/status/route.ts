import { NextResponse } from "next/server";

import { requireVerifiedMondaySession } from "~/server/monday/session";
import { getZohoConnection } from "~/server/zoho/store";

export const runtime = "nodejs";

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

export const GET = async (request: Request) => {
  try {
    const identity = await requireVerifiedMondaySession(request);
    const connection = await getZohoConnection({
      mondayAccountId: identity.accountId,
      mondayAppClientId: identity.appClientId,
    });
    return toJson({
      ok: true,
      connected: !!connection,
      connection: connection
        ? {
            senderEmail: connection.senderEmail ?? null,
            senderName: connection.senderName ?? null,
            accessTokenExpiresAt: connection.accessTokenExpiresAt,
            scopes: connection.scopes,
            updatedAt: connection.updatedAt,
          }
        : null,
      callbackPath: "/api/monday/email/zoho/callback",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return toJson({ ok: false, error: message }, 401);
  }
};
