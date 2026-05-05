import { getRequestOrigin } from "~/server/http/requestOrigin";
import { encryptToken } from "~/server/outlook/crypto";
import { verifyOutlookOAuthState } from "~/server/outlook/state";
import { getOutlookOAuthConfig } from "~/server/outlook/config";
import { upsertOutlookConnection } from "~/server/outlook/store";

export const runtime = "nodejs";

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface GraphMeResponse {
  mail?: string | null;
  userPrincipalName?: string | null;
  displayName?: string | null;
}

const getFinalRedirectUrl = (baseOrigin: string, params: URLSearchParams) => {
  const target = new URL("/monday", baseOrigin);
  const status = params.get("status");
  if (status) target.searchParams.set("outlook", status);
  const message = params.get("message");
  if (message) target.searchParams.set("outlookMessage", message);
  return target.toString();
};

const toPopupResponse = (args: {
  appOrigin: string;
  status: "connected" | "error";
  message?: string;
  fallbackUrl: string;
}) => {
  const payload = JSON.stringify({
    type: "outlook-oauth-result",
    status: args.status,
    message: args.message ?? null,
  });
  const escapedFallback = args.fallbackUrl.replace(/"/g, '\\"');
  const escapedOrigin = args.appOrigin.replace(/"/g, '\\"');
  const html = `<!doctype html>
<html>
  <body style="font-family: system-ui, sans-serif; padding: 24px;">
    <p>${args.status === "connected" ? "Outlook connected. Closing…" : "OAuth failed. Closing…"}</p>
    <script>
      (function () {
        var payload = ${payload};
        var origin = "${escapedOrigin}";
        var fallback = "${escapedFallback}";
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(payload, origin);
            window.close();
            return;
          }
        } catch (e) {}
        window.location.replace(fallback);
      })();
    </script>
  </body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
};

const toHashRecoveryResponse = (requestUrl: URL) => {
  const fallbackMessage =
    "Missing OAuth callback code/state. Ensure Azure redirect URI is configured under Web platform and points to /api/monday/email/outlook/callback.";
  const fallbackLocation = new URL("/monday", requestUrl.origin);
  fallbackLocation.searchParams.set("outlook", "error");
  fallbackLocation.searchParams.set("outlookMessage", fallbackMessage);

  const html = `<!doctype html>
<html>
  <body style="font-family: system-ui, sans-serif; padding: 24px;">
    <p>Completing Outlook sign-in…</p>
    <script>
      (function () {
        try {
          var current = new URL(window.location.href);
          var hash = current.hash ? current.hash.slice(1) : "";
          var hashParams = new URLSearchParams(hash);
          var code = hashParams.get("code");
          var state = hashParams.get("state") || current.searchParams.get("state");
          if (code && state) {
            current.hash = "";
            current.searchParams.set("code", code);
            current.searchParams.set("state", state);
            if (hashParams.get("session_state")) {
              current.searchParams.set("session_state", hashParams.get("session_state"));
            }
            window.location.replace(current.toString());
            return;
          }
        } catch (e) {}
        window.location.replace(${JSON.stringify(fallbackLocation.toString())});
      })();
    </script>
  </body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
};

const handleCallback = async (request: Request, bodyParams?: URLSearchParams) => {
  const requestUrl = new URL(request.url);
  const baseOrigin = getRequestOrigin(request);
  const params = bodyParams ?? requestUrl.searchParams;
  const code = params.get("code");
  const stateToken = params.get("state");
  const oauthError = params.get("error");
  const oauthErrorDescription = params.get("error_description");
  console.info("[OutlookOAuth][callback] received", {
    method: request.method,
    path: requestUrl.pathname,
    queryKeys: Array.from(params.keys()),
    hasCode: !!code,
    hasState: !!stateToken,
    oauthError: oauthError ?? null,
    oauthErrorDescription: oauthErrorDescription ?? null,
    fullUrl: requestUrl.toString(),
  });

  if (oauthError) {
    const params = new URLSearchParams({
      status: "error",
      message: oauthErrorDescription ?? oauthError,
    });
    const fallbackUrl = getFinalRedirectUrl(baseOrigin, params);
    return toPopupResponse({
      appOrigin: baseOrigin,
      status: "error",
      message: oauthErrorDescription ?? oauthError,
      fallbackUrl,
    });
  }

  if (!code || !stateToken) {
    console.warn("[OutlookOAuth][callback] missing code/state", {
      hasCode: !!code,
      hasState: !!stateToken,
      query: params.toString(),
    });
    // Some Azure app setups return code in URL hash (#code=...),
    // which is not sent to the server. Recover it client-side if present.
    if (request.method === "GET" && stateToken) {
      return toHashRecoveryResponse(requestUrl);
    }
    const redirectParams = new URLSearchParams({
      status: "error",
      message:
        "Missing OAuth callback code/state. Ensure Azure redirect URI is configured under Web platform and points to /api/monday/email/outlook/callback.",
    });
    const fallbackUrl = getFinalRedirectUrl(baseOrigin, redirectParams);
    return toPopupResponse({
      appOrigin: baseOrigin,
      status: "error",
      message: "Missing OAuth callback code/state",
      fallbackUrl,
    });
  }

  try {
    const state = await verifyOutlookOAuthState(stateToken);
    console.info("[OutlookOAuth][callback] state verified", {
      mondayAccountId: state.mondayAccountId,
      mondayUserId: state.mondayUserId,
      mondayAppClientId: state.mondayAppClientId ?? null,
      redirectUri: state.redirectUri,
    });
    const appOrigin = new URL(state.redirectUri).origin;
    const oauth = getOutlookOAuthConfig(baseOrigin);
    const redirectUri = state.redirectUri || oauth.redirectUri;
    console.info("[OutlookOAuth][callback] exchanging code", {
      tokenUrl: oauth.tokenUrl,
      redirectUri,
    });

    const tokenBody = new URLSearchParams();
    tokenBody.set("client_id", oauth.clientId);
    tokenBody.set("scope", oauth.scopes.join(" "));
    tokenBody.set("code", code);
    tokenBody.set("redirect_uri", redirectUri);
    tokenBody.set("grant_type", "authorization_code");
    tokenBody.set("client_secret", oauth.clientSecret);

    const tokenResponse = await fetch(oauth.tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: tokenBody.toString(),
      cache: "no-store",
    });

    const tokenData = (await tokenResponse.json()) as TokenResponse;
    if (!tokenResponse.ok || !tokenData.refresh_token) {
      const message =
        tokenData.error_description ??
        tokenData.error ??
        "Failed to exchange Outlook authorization code";
      throw new Error(message);
    }

    const accessToken = tokenData.access_token ?? "";
    const meResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      method: "GET",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });
    const me = (await meResponse.json()) as GraphMeResponse;
    const email = me.mail ?? me.userPrincipalName ?? undefined;
    console.info("[OutlookOAuth][callback] token exchange succeeded", {
      tokenStatus: tokenResponse.status,
      hasAccessToken: accessToken.length > 0,
      hasRefreshToken: !!tokenData.refresh_token,
      graphMeStatus: meResponse.status,
      email: email ?? null,
      displayName: me.displayName ?? null,
    });

    const now = Date.now();
    const expiresInSeconds = Number.isFinite(tokenData.expires_in)
      ? Number(tokenData.expires_in)
      : 3600;
    const accessTokenExpiresAt = now + expiresInSeconds * 1000;
    const scopes = (tokenData.scope ?? oauth.scopes.join(" "))
      .split(" ")
      .map((scope) => scope.trim())
      .filter((scope) => scope.length > 0);

    await upsertOutlookConnection({
      mondayAccountId: state.mondayAccountId,
      mondayUserId: state.mondayUserId,
      mondayAppClientId: state.mondayAppClientId,
      email,
      displayName: me.displayName ?? undefined,
      tenantId: oauth.tenantId,
      clientId: oauth.clientId,
      encryptedAccessToken: accessToken ? encryptToken(accessToken) : undefined,
      encryptedRefreshToken: encryptToken(tokenData.refresh_token),
      accessTokenExpiresAt,
      scopes,
    });

    const params = new URLSearchParams({
      status: "connected",
    });
    const fallbackUrl = getFinalRedirectUrl(appOrigin, params);
    return toPopupResponse({
      appOrigin,
      status: "connected",
      fallbackUrl,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Outlook callback failed";
    console.error("[OutlookOAuth][callback] failed", { message });
    const params = new URLSearchParams({
      status: "error",
      message,
    });
    const fallbackUrl = getFinalRedirectUrl(baseOrigin, params);
    return toPopupResponse({
      appOrigin: baseOrigin,
      status: "error",
      message,
      fallbackUrl,
    });
  }
};

export const GET = async (request: Request) => {
  return await handleCallback(request);
};
