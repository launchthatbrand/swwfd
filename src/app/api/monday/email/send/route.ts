import { NextResponse } from "next/server";
import { getOutlookOAuthConfig } from "~/server/outlook/config";
import { decryptToken, encryptToken } from "~/server/outlook/crypto";
import {
  getOutlookConnection,
  upsertOutlookConnection,
} from "~/server/outlook/store";
import { requireVerifiedMondaySession } from "~/server/monday/session";

export const runtime = "nodejs";

interface SendEmailBody {
  to: string;
  subject: string;
  html: string;
}

interface OutlookTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const getValidAccessToken = async (args: {
  refreshToken: string;
  requestOrigin: string;
}) => {
  const oauth = getOutlookOAuthConfig(args.requestOrigin);
  const tokenBody = new URLSearchParams();
  tokenBody.set("client_id", oauth.clientId);
  tokenBody.set("scope", oauth.scopes.join(" "));
  tokenBody.set("refresh_token", args.refreshToken);
  tokenBody.set("grant_type", "refresh_token");
  tokenBody.set("client_secret", oauth.clientSecret);

  const tokenResponse = await fetch(oauth.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: tokenBody.toString(),
    cache: "no-store",
  });
  const tokenData = (await tokenResponse.json()) as OutlookTokenResponse;
  if (!tokenResponse.ok || !tokenData.access_token || !tokenData.refresh_token) {
    const message =
      tokenData.error_description ??
      tokenData.error ??
      "Failed to refresh Outlook access token";
    throw new Error(message);
  }
  const expiresInSeconds = Number.isFinite(tokenData.expires_in)
    ? Number(tokenData.expires_in)
    : 3600;

  return {
    oauth,
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    accessTokenExpiresAt: Date.now() + expiresInSeconds * 1000,
    scopes: (tokenData.scope ?? oauth.scopes.join(" "))
      .split(" ")
      .map((scope) => scope.trim())
      .filter((scope) => scope.length > 0),
  };
};

export const POST = async (request: Request) => {
  try {
    const identity = await requireVerifiedMondaySession(request);
    let body: SendEmailBody;
    try {
      body = (await request.json()) as SendEmailBody;
    } catch {
      return toJson({ ok: false, error: "Invalid JSON body" }, 400);
    }

    const to = normalizeEmail(body.to ?? "");
    const subject = (body.subject ?? "").trim();
    const html = (body.html ?? "").trim();
    if (!to || !subject || !html) {
      return toJson(
        { ok: false, error: "Missing required fields: to, subject, html" },
        400,
      );
    }

    const connection = await getOutlookConnection({
      mondayAccountId: identity.accountId,
      mondayUserId: identity.userId,
      mondayAppClientId: identity.appClientId,
    });
    if (!connection) {
      return toJson(
        { ok: false, error: "Outlook is not connected. Connect it in Settings first." },
        400,
      );
    }

    const requestOrigin = new URL(request.url).origin;
    const refreshed = await getValidAccessToken({
      refreshToken: decryptToken(connection.encryptedRefreshToken),
      requestOrigin,
    });

    await upsertOutlookConnection({
      mondayAccountId: identity.accountId,
      mondayUserId: identity.userId,
      mondayAppClientId: identity.appClientId,
      email: connection.email,
      displayName: connection.displayName,
      tenantId: refreshed.oauth.tenantId,
      clientId: refreshed.oauth.clientId,
      encryptedAccessToken: encryptToken(refreshed.accessToken),
      encryptedRefreshToken: encryptToken(refreshed.refreshToken),
      accessTokenExpiresAt: refreshed.accessTokenExpiresAt,
      scopes: refreshed.scopes,
    });

    const sendResponse = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
      method: "POST",
      headers: {
        authorization: `Bearer ${refreshed.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject,
          body: {
            contentType: "HTML",
            content: html,
          },
          toRecipients: [
            {
              emailAddress: {
                address: to,
              },
            },
          ],
        },
        saveToSentItems: true,
      }),
      cache: "no-store",
    });

    if (!sendResponse.ok) {
      const errorText = await sendResponse.text();
      throw new Error(
        `Microsoft Graph sendMail failed (${sendResponse.status}): ${errorText}`,
      );
    }

    return toJson({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email";
    return toJson({ ok: false, error: message }, 500);
  }
};
