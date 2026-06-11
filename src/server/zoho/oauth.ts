import "server-only";

import { encryptToken } from "~/server/outlook/crypto";
import { getZohoOAuthConfig } from "~/server/zoho/config";
import type { ZohoConnection } from "~/server/zoho/store";
import { getDecryptedZohoRefreshToken, upsertZohoConnection } from "~/server/zoho/store";

interface ZohoTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface ZohoUserInfoResponse {
  Email?: string;
  Display_Name?: string;
  email?: string;
  name?: string;
}

export const refreshZohoAccessToken = async (args: {
  connection: ZohoConnection;
  requestOrigin: string;
}) => {
  const oauth = getZohoOAuthConfig(args.requestOrigin);
  const body = new URLSearchParams();
  body.set("client_id", oauth.clientId);
  body.set("client_secret", oauth.clientSecret);
  body.set("refresh_token", getDecryptedZohoRefreshToken(args.connection));
  body.set("grant_type", "refresh_token");

  const tokenResponse = await fetch(oauth.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  });
  const tokenData = (await tokenResponse.json()) as ZohoTokenResponse;
  if (!tokenResponse.ok || !tokenData.access_token) {
    const message =
      tokenData.error_description ??
      tokenData.error ??
      "Failed to refresh Zoho access token";
    throw new Error(message);
  }

  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token || getDecryptedZohoRefreshToken(args.connection);
  const expiresInSeconds = Number.isFinite(tokenData.expires_in)
    ? Number(tokenData.expires_in)
    : 3600;
  const accessTokenExpiresAt = Date.now() + expiresInSeconds * 1000;
  const scopes = (tokenData.scope ?? args.connection.scopes.join(" "))
    .split(/[,\s]+/)
    .map((scope) => scope.trim())
    .filter((scope) => scope.length > 0);

  await upsertZohoConnection({
    mondayAccountId: args.connection.mondayAccountId,
    mondayAppClientId: args.connection.mondayAppClientId,
    connectedByMondayUserId: args.connection.connectedByMondayUserId,
    senderEmail: args.connection.senderEmail,
    senderName: args.connection.senderName,
    encryptedAccessToken: encryptToken(accessToken),
    encryptedRefreshToken: encryptToken(refreshToken),
    accessTokenExpiresAt,
    scopes,
  });

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt,
    scopes,
  };
};

export const fetchZohoUserInfo = async (args: {
  accessToken: string;
  requestOrigin: string;
}) => {
  const oauth = getZohoOAuthConfig(args.requestOrigin);
  const response = await fetch(oauth.userInfoUrl, {
    method: "GET",
    headers: {
      Authorization: `Zoho-oauthtoken ${args.accessToken}`,
    },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const data = (await response.json()) as ZohoUserInfoResponse;
  const senderEmail = (data.Email ?? data.email ?? "").trim().toLowerCase() || null;
  const senderName = (data.Display_Name ?? data.name ?? "").trim() || null;
  return { senderEmail, senderName };
};
