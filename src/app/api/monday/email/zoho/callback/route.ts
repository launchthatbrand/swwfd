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

const toHashRecoveryResponse = (args: {
  appOrigin: string;
  requestUrl: URL;
  fallbackUrl: string;
}) => {
  const escapedFallback = args.fallbackUrl.replace(/"/g, '\\"');
  const escapedPathname = args.requestUrl.pathname.replace(/"/g, '\\"');
  const escapedSearch = args.requestUrl.search.replace(/"/g, '\\"');
  const escapedOrigin = args.appOrigin.replace(/"/g, '\\"');
  const html = `<!doctype html>
<html>
  <body style="font-family: system-ui, sans-serif; padding: 24px;">
    <p>Completing Zoho OAuth...</p>
    <script>
      (function () {
        var origin = "${escapedOrigin}";
        var fallback = "${escapedFallback}";
        var pathname = "${escapedPathname}";
        var originalSearch = "${escapedSearch}";
        var hash = window.location.hash || "";
        var hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
        var searchParams = new URLSearchParams(originalSearch.startsWith("?") ? originalSearch.slice(1) : originalSearch);
        var code = searchParams.get("code") || hashParams.get("code");
        var state = searchParams.get("state") || hashParams.get("state");
        if (code && state) {
          var recovered = new URL(pathname, window.location.origin);
          recovered.searchParams.set("code", code);
          recovered.searchParams.set("state", state);
          var locationValue = searchParams.get("location") || hashParams.get("location");
          var accountsServer = searchParams.get("accounts-server") || hashParams.get("accounts-server");
          if (locationValue) recovered.searchParams.set("location", locationValue);
          if (accountsServer) recovered.searchParams.set("accounts-server", accountsServer);
          window.location.replace(recovered.toString());
          return;
        }
        var hasImplicitToken = !!(hashParams.get("access_token") || searchParams.get("access_token"));
        var diag = new URL(pathname, window.location.origin);
        if (searchParams.get("state")) {
          diag.searchParams.set("state", searchParams.get("state"));
        } else if (hashParams.get("state")) {
          diag.searchParams.set("state", hashParams.get("state"));
        }
        var locationValueForDiag = searchParams.get("location") || hashParams.get("location");
        var accountsServerForDiag = searchParams.get("accounts-server") || hashParams.get("accounts-server");
        if (locationValueForDiag) diag.searchParams.set("location", locationValueForDiag);
        if (accountsServerForDiag) diag.searchParams.set("accounts-server", accountsServerForDiag);
        diag.searchParams.set("hashRecoveryAttempted", "1");
        diag.searchParams.set("diagHasSearchCode", searchParams.get("code") ? "1" : "0");
        diag.searchParams.set("diagHasHashCode", hashParams.get("code") ? "1" : "0");
        diag.searchParams.set("diagHasSearchState", searchParams.get("state") ? "1" : "0");
        diag.searchParams.set("diagHasHashState", hashParams.get("state") ? "1" : "0");
        diag.searchParams.set("diagHasSearchAccessToken", searchParams.get("access_token") ? "1" : "0");
        diag.searchParams.set("diagHasHashAccessToken", hashParams.get("access_token") ? "1" : "0");
        if (hasImplicitToken) {
          window.location.replace(diag.toString());
          return;
        }
        window.location.replace(diag.toString());
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
  try {
    const requestUrl = new URL(request.url);
    const baseOrigin = getRequestOrigin(request);
    const hashRecoveryAttempted = requestUrl.searchParams.get("hashRecoveryAttempted") === "1";
    const params = bodyParams ?? requestUrl.searchParams;
    const code = params.get("code");
    const stateToken = params.get("state");
    const oauthError = params.get("error");
    const oauthErrorDescription = params.get("error_description");
    console.info("[ZohoOAuth][callback] received", {
      method: request.method,
      origin: baseOrigin,
      pathname: requestUrl.pathname,
      hasCode: !!code,
      hasState: !!stateToken,
      hasError: !!oauthError,
      hasErrorDescription: !!oauthErrorDescription,
      hasLocation: !!params.get("location"),
      hasAccountsServer: !!params.get("accounts-server"),
      hashRecoveryAttempted,
      diagHasSearchCode: params.get("diagHasSearchCode"),
      diagHasHashCode: params.get("diagHasHashCode"),
      diagHasSearchState: params.get("diagHasSearchState"),
      diagHasHashState: params.get("diagHasHashState"),
      diagHasSearchAccessToken: params.get("diagHasSearchAccessToken"),
      diagHasHashAccessToken: params.get("diagHasHashAccessToken"),
      queryKeys: Array.from(params.keys()),
    });

    if (oauthError) {
      console.warn("[ZohoOAuth][callback] oauth error response", {
        error: oauthError,
        errorDescription: oauthErrorDescription ?? null,
      });
      const statusParams = new URLSearchParams({
        status: "error",
        message: oauthErrorDescription ?? oauthError,
      });
      const fallbackUrl = getFinalRedirectUrl(baseOrigin, statusParams);
      return toPopupResponse({
        appOrigin: baseOrigin,
        status: "error",
        message: oauthErrorDescription ?? oauthError,
        fallbackUrl,
      });
    }
    if (!code || !stateToken) {
      if (hashRecoveryAttempted) {
        throw new Error(
          "Zoho callback did not provide authorization code. Confirm this is a Server-based Zoho OAuth client (not client/implicit) and that the app/scopes are approved.",
        );
      }
      console.warn("[ZohoOAuth][callback] missing code/state in query; attempting hash recovery", {
        hasCode: !!code,
        hasState: !!stateToken,
        location: params.get("location"),
        accountsServer: params.get("accounts-server"),
      });
      const statusParams = new URLSearchParams({
        status: "error",
        message: "Missing OAuth callback code/state",
      });
      const fallbackUrl = getFinalRedirectUrl(baseOrigin, statusParams);
      return toHashRecoveryResponse({
        appOrigin: baseOrigin,
        requestUrl,
        fallbackUrl,
      });
    }

    const state = await verifyZohoOAuthState(stateToken);
    const appOrigin = new URL(state.redirectUri).origin;
    const oauth = getZohoOAuthConfig(baseOrigin);
    const redirectUri = state.redirectUri || oauth.redirectUri;
    console.info("[ZohoOAuth][callback] state verified", {
      mondayAccountId: state.mondayAccountId,
      mondayUserId: state.mondayUserId,
      redirectUri,
      appOrigin,
    });

    const body = new URLSearchParams();
    body.set("client_id", oauth.clientId);
    body.set("client_secret", oauth.clientSecret);
    body.set("grant_type", "authorization_code");
    body.set("redirect_uri", redirectUri);
    body.set("code", code);

    const accountsServer = params.get("accounts-server")?.trim();
    const tokenUrl =
      accountsServer && /^https?:\/\/[^/]+$/i.test(accountsServer)
        ? `${accountsServer}/oauth/v2/token`
        : oauth.tokenUrl;
    console.info("[ZohoOAuth][callback] exchanging token", {
      tokenHost: new URL(tokenUrl).host,
      usedAccountsServer: Boolean(accountsServer),
      hasCode: !!code,
      redirectUri,
    });
    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      cache: "no-store",
    });
    const tokenData = (await tokenResponse.json()) as ZohoTokenResponse;
    console.info("[ZohoOAuth][callback] token response", {
      status: tokenResponse.status,
      ok: tokenResponse.ok,
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      error: tokenData.error ?? null,
      errorDescription: tokenData.error_description ?? null,
    });
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
    console.info("[ZohoOAuth][callback] connection upserted", {
      mondayAccountId: state.mondayAccountId,
      mondayUserId: state.mondayUserId,
      senderEmail: profile?.senderEmail ?? oauth.defaultSenderEmail ?? null,
      scopeCount: scopes.length,
    });

    const statusParams = new URLSearchParams({ status: "connected" });
    const fallbackUrl = getFinalRedirectUrl(appOrigin, statusParams);
    return toPopupResponse({
      appOrigin,
      status: "connected",
      fallbackUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zoho callback failed";
    const baseOrigin = getRequestOrigin(request);
    console.error("[ZohoOAuth][callback] failed", {
      message,
      url: request.url,
    });
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

export const POST = async (request: Request) => {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  let bodyParams: URLSearchParams | undefined;
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const rawBody = await request.text();
    bodyParams = new URLSearchParams(rawBody);
  } else {
    try {
      const formData = await request.formData();
      bodyParams = new URLSearchParams();
      for (const [key, value] of formData.entries()) {
        if (typeof value === "string") {
          bodyParams.append(key, value);
        }
      }
    } catch (error) {
      console.warn("[ZohoOAuth][callback] failed to parse POST body", {
        contentType,
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  }
  return await handleCallback(request, bodyParams);
};
