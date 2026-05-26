import { getRequestOrigin } from "~/server/http/requestOrigin";
import { api as apiGenerated } from "@convex-config/_generated/api";
import { getConvexHttpClient } from "~/server/convexHttp";
import { encryptToken } from "~/server/outlook/crypto";
import { verifyOutlookOAuthState } from "~/server/outlook/state";
import { getOutlookOAuthConfig } from "~/server/outlook/config";
import { getOutlookConnection, upsertOutlookConnection } from "~/server/outlook/store";
import {
  createAndStoreOutlookSubscription,
  deleteAndMarkOutlookSubscription,
} from "~/server/outlook/subscriptions";

export const runtime = "nodejs";
const isOutlookDebugLoggingEnabled = process.env.NODE_ENV !== "production";

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
    <p id="status-text">${args.status === "connected" ? "Outlook connected." : "OAuth failed."}</p>
    <div id="return-help" style="display:none; margin-top: 12px;">
      <p style="margin: 0 0 8px 0;">Return to your monday.com tab to continue.</p>
      <a id="open-app-link" href="#" style="font-size: 12px;">Open app directly</a>
    </div>
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
        var returnHelp = document.getElementById("return-help");
        if (returnHelp) returnHelp.style.display = "block";
        var openAppLink = document.getElementById("open-app-link");
        if (openAppLink) openAppLink.setAttribute("href", fallback);
      })();
    </script>
  </body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
};

const toHashRecoveryResponse = (baseOrigin: string) => {
  const fallbackMessage =
    "Missing OAuth callback code/state. Ensure Azure redirect URI is configured under Web platform and points to /api/monday/email/outlook/callback.";
  const fallbackLocation = new URL("/monday", baseOrigin);
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
          var code = hashParams.get("code") || current.searchParams.get("code");
          var state = hashParams.get("state") || current.searchParams.get("state");
          var oauthError = hashParams.get("error") || current.searchParams.get("error");
          var oauthErrorDescription =
            hashParams.get("error_description") || current.searchParams.get("error_description");
          if ((code && state) || oauthError) {
            current.hash = "";
            if (code) current.searchParams.set("code", code);
            if (state) current.searchParams.set("state", state);
            if (oauthError) current.searchParams.set("error", oauthError);
            if (oauthErrorDescription) {
              current.searchParams.set("error_description", oauthErrorDescription);
            }
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
  if (isOutlookDebugLoggingEnabled) {
    console.info("[OutlookOAuth][callback][debug] request metadata", {
      method: request.method,
      url: requestUrl.toString(),
      baseOrigin,
      host: request.headers.get("host"),
      xForwardedHost: request.headers.get("x-forwarded-host"),
      xForwardedProto: request.headers.get("x-forwarded-proto"),
      referer: request.headers.get("referer"),
      originHeader: request.headers.get("origin"),
      userAgent: request.headers.get("user-agent"),
      secFetchDest: request.headers.get("sec-fetch-dest"),
      secFetchMode: request.headers.get("sec-fetch-mode"),
      secFetchSite: request.headers.get("sec-fetch-site"),
      queryString: requestUrl.search,
    });
  }
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
    if (isOutlookDebugLoggingEnabled) {
      console.info("[OutlookOAuth][callback][debug] oauth provider returned error", {
        oauthError,
        oauthErrorDescription,
        fallbackUrl,
      });
    }
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
    if (request.method === "GET") {
      if (isOutlookDebugLoggingEnabled) {
        console.info("[OutlookOAuth][callback][debug] serving hash recovery page", {
          fullUrl: requestUrl.toString(),
          baseOrigin,
          hasCode: !!code,
          hasState: !!stateToken,
          oauthError: oauthError ?? null,
        });
      }
      return toHashRecoveryResponse(baseOrigin);
    }
    const redirectParams = new URLSearchParams({
      status: "error",
      message:
        "Missing OAuth callback code/state. Ensure Azure redirect URI is configured under Web platform and points to /api/monday/email/outlook/callback.",
    });
    const fallbackUrl = getFinalRedirectUrl(baseOrigin, redirectParams);
    if (isOutlookDebugLoggingEnabled) {
      console.warn("[OutlookOAuth][callback][debug] unable to recover missing code/state", {
        method: request.method,
        fallbackUrl,
      });
    }
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
    try {
      const connection = await getOutlookConnection({
        mondayAccountId: state.mondayAccountId,
        mondayUserId: state.mondayUserId,
        mondayAppClientId: state.mondayAppClientId,
      });
      if (connection) {
        const convex = getConvexHttpClient();
        const existingSubscriptions = await convex.query(
          apiGenerated.outlookInbound.listGraphSubscriptionsByIdentity,
          {
            mondayAccountId: state.mondayAccountId,
            mondayUserId: state.mondayUserId,
            mondayAppClientId: state.mondayAppClientId,
          },
        );
        for (const existingSubscription of existingSubscriptions) {
          if (existingSubscription.status === "deleted") continue;
          try {
            await deleteAndMarkOutlookSubscription({
              accessToken,
              subscriptionId: existingSubscription.subscriptionId,
            });
          } catch (deleteError) {
            await convex.mutation(
              apiGenerated.outlookInbound.markGraphSubscriptionStatus,
              {
                subscriptionId: existingSubscription.subscriptionId,
                status: "error",
                lastError:
                  deleteError instanceof Error
                    ? deleteError.message
                    : String(deleteError),
              },
            );
          }
        }
        await createAndStoreOutlookSubscription({
          connection,
          accessToken,
          requestOrigin: baseOrigin,
        });
      }
    } catch (subscriptionError) {
      console.warn("[OutlookOAuth][callback] subscription provisioning failed", {
        message:
          subscriptionError instanceof Error
            ? subscriptionError.message
            : String(subscriptionError),
      });
    }
    if (isOutlookDebugLoggingEnabled) {
      console.info("[OutlookOAuth][callback][debug] outlook connection stored", {
        mondayAccountId: state.mondayAccountId,
        mondayUserId: state.mondayUserId,
        mondayAppClientId: state.mondayAppClientId ?? null,
        email: email ?? null,
        scopesCount: scopes.length,
      });
    }

    const params = new URLSearchParams({
      status: "connected",
    });
    const fallbackUrl = getFinalRedirectUrl(appOrigin, params);
    if (isOutlookDebugLoggingEnabled) {
      console.info("[OutlookOAuth][callback][debug] success response prepared", {
        appOrigin,
        fallbackUrl,
      });
    }
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
      if (isOutlookDebugLoggingEnabled) {
        console.warn("[OutlookOAuth][callback][debug] failed to parse POST body", {
          message: error instanceof Error ? error.message : "unknown error",
          contentType,
        });
      }
    }
  }
  return await handleCallback(request, bodyParams);
};
