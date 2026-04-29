import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getOutlookOAuthConfig } from "~/server/outlook/config";
import { signOutlookOAuthState } from "~/server/outlook/state";
import { requireVerifiedMondaySession } from "~/server/monday/session";

export const runtime = "nodejs";

export const GET = async (request: Request) => {
  try {
    const identity = await requireVerifiedMondaySession(request);
    const origin = new URL(request.url).origin;
    const oauth = getOutlookOAuthConfig(origin);
    const state = await signOutlookOAuthState({
      mondayAccountId: identity.accountId,
      mondayUserId: identity.userId,
      mondayAppClientId: identity.appClientId,
      redirectUri: oauth.redirectUri,
      nonce: randomUUID(),
    });
    const url = new URL(oauth.authorizeUrl);
    url.searchParams.set("client_id", oauth.clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", oauth.redirectUri);
    url.searchParams.set("response_mode", "query");
    url.searchParams.set("scope", oauth.scopes.join(" "));
    url.searchParams.set("state", state);
    url.searchParams.set("prompt", "select_account");
    console.info("[OutlookOAuth][connect] generated authorize URL", {
      origin,
      redirectUri: oauth.redirectUri,
      tenantId: oauth.tenantId,
      hasState: state.length > 0,
      stateLength: state.length,
      mondayAccountId: identity.accountId,
      mondayUserId: identity.userId,
      mondayAppClientId: identity.appClientId ?? null,
    });
    return NextResponse.json({
      ok: true,
      authorizeUrl: url.toString(),
      callbackPath: "/api/monday/email/outlook/callback",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to initialize Outlook OAuth flow";
    console.error("[OutlookOAuth][connect] failed", { message });
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
};
