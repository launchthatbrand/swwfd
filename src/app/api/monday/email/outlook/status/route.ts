import { NextResponse } from "next/server";
import { requireVerifiedMondaySession } from "~/server/monday/session";
import { getOutlookConnection } from "~/server/outlook/store";

export const runtime = "nodejs";
const isOutlookDebugLoggingEnabled = process.env.NODE_ENV !== "production";

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

export const GET = async (request: Request) => {
  try {
    const identity = await requireVerifiedMondaySession(request);
    if (isOutlookDebugLoggingEnabled) {
      console.info("[OutlookOAuth][status][debug] checking connection", {
        requestUrl: request.url,
        mondayAccountId: identity.accountId,
        mondayUserId: identity.userId,
        mondayAppClientId: identity.appClientId ?? null,
      });
    }
    const connection = await getOutlookConnection({
      mondayAccountId: identity.accountId,
      mondayUserId: identity.userId,
      mondayAppClientId: identity.appClientId,
    });
    if (isOutlookDebugLoggingEnabled) {
      console.info("[OutlookOAuth][status][debug] lookup result", {
        connected: !!connection,
        email: connection?.email ?? null,
        updatedAt: connection?.updatedAt ?? null,
      });
    }

    return toJson({
      ok: true,
      connected: !!connection,
      connection: connection
        ? {
            email: connection.email ?? null,
            displayName: connection.displayName ?? null,
            accessTokenExpiresAt: connection.accessTokenExpiresAt,
            scopes: connection.scopes,
            updatedAt: connection.updatedAt,
          }
        : null,
      callbackPath: "/api/monday/email/outlook/callback",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    if (isOutlookDebugLoggingEnabled) {
      console.error("[OutlookOAuth][status][debug] failed", {
        message,
      });
    }
    return toJson({ ok: false, error: message }, 401);
  }
};
