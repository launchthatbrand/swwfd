import "server-only";

import { env } from "~/env";

const DEFAULT_SCOPES = [
  "openid",
  "profile",
  "offline_access",
  "User.Read",
  "Mail.Send",
] as const;

export const getOutlookOAuthConfig = (requestOrigin?: string) => {
  const clientId = env.OUTLOOK_OAUTH_CLIENT_ID?.trim();
  const clientSecret = env.OUTLOOK_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      "Outlook OAuth is not configured. Set OUTLOOK_OAUTH_CLIENT_ID and OUTLOOK_OAUTH_CLIENT_SECRET.",
    );
  }

  const tenantId = env.OUTLOOK_OAUTH_TENANT_ID?.trim() || "common";
  const redirectUri =
    env.OUTLOOK_OAUTH_REDIRECT_URI?.trim() ||
    (requestOrigin
      ? `${requestOrigin.replace(/\/+$/, "")}/api/monday/email/outlook/callback`
      : null);
  if (!redirectUri) {
    throw new Error(
      "Outlook redirect URI is missing. Set OUTLOOK_OAUTH_REDIRECT_URI or provide request origin.",
    );
  }

  return {
    clientId,
    clientSecret,
    tenantId,
    redirectUri,
    scopes: [...DEFAULT_SCOPES],
    authorizeUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
    tokenUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
  };
};

export type OutlookOAuthConfig = ReturnType<typeof getOutlookOAuthConfig>;
