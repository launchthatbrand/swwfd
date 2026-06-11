import { NextResponse } from "next/server";
import { isAuthenticatedNextjs } from "@convex-dev/auth/nextjs/server";

import { env } from "~/env";
import {
  getMondayApiKeyServiceIdentity,
  requireVerifiedMondaySession,
} from "~/server/monday/session";
import { getZohoConnection } from "~/server/zoho/store";

export const runtime = "nodejs";

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

const resolveZohoOAuthIdentity = async (request: Request) => {
  try {
    return await requireVerifiedMondaySession(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    if (
      env.MONDAY_ALLOW_OUTSIDE_IFRAME_OAUTH_TOOLS === "true" &&
      (message.includes("Missing Monday session token") ||
        message.includes("signature verification failed"))
    ) {
      const isAuthed = await isAuthenticatedNextjs();
      if (!isAuthed) {
        throw new Error("Unauthorized");
      }
      return await getMondayApiKeyServiceIdentity();
    }
    throw error;
  }
};

export const GET = async (request: Request) => {
  try {
    const identity = await resolveZohoOAuthIdentity(request);
    const connection = await getZohoConnection({
      mondayAccountId: identity.accountId,
      mondayAppClientId: identity.appClientId,
    });
    const envRefreshTokenConfigured = !!env.ZOHO_OAUTH_REFRESH_TOKEN?.trim();
    const connected = !!connection || envRefreshTokenConfigured;
    return toJson({
      ok: true,
      connected,
      connection: connection
        ? {
            senderEmail: connection.senderEmail ?? null,
            senderName: connection.senderName ?? null,
            accessTokenExpiresAt: connection.accessTokenExpiresAt,
            scopes: connection.scopes,
            updatedAt: connection.updatedAt,
          }
        : envRefreshTokenConfigured
          ? {
              senderEmail: env.ZOHO_CAMPAIGNS_DEFAULT_SENDER_EMAIL ?? null,
              senderName: env.ZOHO_CAMPAIGNS_DEFAULT_SENDER_NAME ?? null,
              accessTokenExpiresAt: null,
              scopes: [],
              updatedAt: null,
            }
          : null,
      connectionSource: connection ? "oauth_connection" : envRefreshTokenConfigured ? "env_refresh_token" : "none",
      callbackPath: "/api/monday/email/zoho/callback",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return toJson({ ok: false, error: message }, 401);
  }
};
