import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { isAuthenticatedNextjs } from "@convex-dev/auth/nextjs/server";

import { env } from "~/env";
import { getRequestOrigin } from "~/server/http/requestOrigin";
import {
  getMondayApiKeyServiceIdentity,
  requireVerifiedMondaySession,
} from "~/server/monday/session";
import { getZohoOAuthConfig } from "~/server/zoho/config";
import { signZohoOAuthState } from "~/server/zoho/state";

export const runtime = "nodejs";

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
    const origin = getRequestOrigin(request);
    const oauth = getZohoOAuthConfig(origin);
    const state = await signZohoOAuthState({
      mondayAccountId: identity.accountId,
      mondayUserId: identity.userId,
      mondayAppClientId: identity.appClientId,
      redirectUri: oauth.redirectUri,
      nonce: randomUUID(),
    });

    const url = new URL(oauth.authorizeUrl);
    url.searchParams.set("client_id", oauth.clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("response_mode", "query");
    url.searchParams.set("redirect_uri", oauth.redirectUri);
    url.searchParams.set("scope", oauth.scopes.join(","));
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", state);
    console.info("[ZohoOAuth][connect] initialized", {
      origin,
      mondayAccountId: identity.accountId,
      mondayUserId: identity.userId,
      redirectUri: oauth.redirectUri,
      authorizeHost: new URL(oauth.authorizeUrl).host,
      scopeCount: oauth.scopes.length,
      scopes: oauth.scopes,
      hasState: state.length > 0,
    });

    return NextResponse.json({
      ok: true,
      authorizeUrl: url.toString(),
      callbackPath: "/api/monday/email/zoho/callback",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to initialize Zoho OAuth flow";
    console.error("[ZohoOAuth][connect] failed", { message });
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
};
