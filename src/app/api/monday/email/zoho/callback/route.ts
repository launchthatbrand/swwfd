import { getRequestOrigin } from "~/server/http/requestOrigin";
import { encryptToken } from "~/server/outlook/crypto";
import { getZohoOAuthConfig } from "~/server/zoho/config";
import { verifyZohoOAuthState } from "~/server/zoho/state";
import { fetchZohoUserInfo } from "~/server/zoho/oauth";
import { upsertZohoConnection } from "~/server/zoho/store";

export const runtime = "nodejs";

interface ZohoTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

const getFinalRedirectUrl = (baseOrigin: string, params: URLSearchParams) => {
  const target = new URL("/monday", baseOrigin);
  const status = params.get("status");
  if (status) target.searchParams.set("zoho", status);
  const message = params.get("message");
  if (message) target.searchParams.set("zohoMessage", message);
  return target.toString();
};

const toPopupResponse = (args: {
  appOrigin: string;
  status: "connected" | "error";
  message?: string;
  fallbackUrl: string;
}) => {
  const payload = JSON.stringify({
    type: "zoho-oauth-result",
    status: args.status,
    message: args.message ?? null,
  });
  const escapedFallback = args.fallbackUrl.replace(/"/g, '\\"');
  const escapedOrigin = args.appOrigin.replace(/"/g, '\\"');
  const html = `<!doctype html>
<html>
  <body style="font-family: system-ui, sans-serif; padding: 24px;">
    <p>${args.status === "connected" ? "Zoho connected." : "OAuth failed."}</p>
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

export const GET = async (request: Request) => {
  try {
    const requestUrl = new URL(request.url);
    const baseOrigin = getRequestOrigin(request);
    const code = requestUrl.searchParams.get("code");
    const stateToken = requestUrl.searchParams.get("state");
    const oauthError = requestUrl.searchParams.get("error");
    const oauthErrorDescription = requestUrl.searchParams.get("error_description");

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
      throw new Error("Missing OAuth callback code/state");
    }

    const state = await verifyZohoOAuthState(stateToken);
    const appOrigin = new URL(state.redirectUri).origin;
    const oauth = getZohoOAuthConfig(baseOrigin);
    const redirectUri = state.redirectUri || oauth.redirectUri;

    const body = new URLSearchParams();
    body.set("client_id", oauth.clientId);
    body.set("client_secret", oauth.clientSecret);
    body.set("grant_type", "authorization_code");
    body.set("redirect_uri", redirectUri);
    body.set("code", code);

    const tokenResponse = await fetch(oauth.tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      cache: "no-store",
    });
    const tokenData = (await tokenResponse.json()) as ZohoTokenResponse;
    if (!tokenResponse.ok || !tokenData.access_token || !tokenData.refresh_token) {
      const message =
        tokenData.error_description ??
        tokenData.error ??
        "Failed to exchange Zoho authorization code";
      throw new Error(message);
    }

    const profile = await fetchZohoUserInfo({
      accessToken: tokenData.access_token,
      requestOrigin: baseOrigin,
    });
    const scopes = (tokenData.scope ?? oauth.scopes.join(","))
      .split(/[,\s]+/)
      .map((scope) => scope.trim())
      .filter((scope) => scope.length > 0);
    const expiresInSeconds = Number.isFinite(tokenData.expires_in)
      ? Number(tokenData.expires_in)
      : 3600;
    const accessTokenExpiresAt = Date.now() + expiresInSeconds * 1000;

    await upsertZohoConnection({
      mondayAccountId: state.mondayAccountId,
      mondayAppClientId: state.mondayAppClientId,
      connectedByMondayUserId: state.mondayUserId,
      senderEmail: profile?.senderEmail ?? oauth.defaultSenderEmail ?? undefined,
      senderName: profile?.senderName ?? oauth.defaultSenderName ?? undefined,
      encryptedAccessToken: encryptToken(tokenData.access_token),
      encryptedRefreshToken: encryptToken(tokenData.refresh_token),
      accessTokenExpiresAt,
      scopes,
    });

    const params = new URLSearchParams({ status: "connected" });
    const fallbackUrl = getFinalRedirectUrl(appOrigin, params);
    return toPopupResponse({
      appOrigin,
      status: "connected",
      fallbackUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zoho callback failed";
    const baseOrigin = getRequestOrigin(request);
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
