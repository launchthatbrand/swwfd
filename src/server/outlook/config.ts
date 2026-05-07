import "server-only";

import { env } from "~/env";

const DEFAULT_SCOPES = [
  "openid",
  "profile",
  "offline_access",
  "User.Read",
  "Mail.Read",
  "Mail.Send",
] as const;

const getCallbackFromOrigin = (origin: string) =>
  `${origin.replace(/\/+$/, "")}/api/monday/email/outlook/callback`;

const isLocalHostName = (hostname: string) => {
  return hostname === "localhost" || hostname === "127.0.0.1";
};

const resolveRedirectUri = (args: {
  configuredRedirectUri?: string;
  requestOrigin?: string;
}) => {
  const configured = args.configuredRedirectUri?.trim();
  const requestOrigin = args.requestOrigin?.trim();
  if (!configured) {
    return requestOrigin ? getCallbackFromOrigin(requestOrigin) : null;
  }
  if (!requestOrigin) {
    return configured;
  }

  try {
    const configuredUrl = new URL(configured);
    const requestOriginUrl = new URL(requestOrigin);
    // In local development, keep callback port aligned with the running app
    // even when a stale OUTLOOK_OAUTH_REDIRECT_URI still points at :3000.
    if (
      isLocalHostName(configuredUrl.hostname) &&
      isLocalHostName(requestOriginUrl.hostname)
    ) {
      return getCallbackFromOrigin(requestOrigin);
    }
  } catch {
    // Fall back to configured value if parsing fails.
  }

  return configured;
};

export const getOutlookOAuthConfig = (requestOrigin?: string) => {
  const clientId = env.OUTLOOK_OAUTH_CLIENT_ID?.trim();
  const clientSecret = env.OUTLOOK_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      "Outlook OAuth is not configured. Set OUTLOOK_OAUTH_CLIENT_ID and OUTLOOK_OAUTH_CLIENT_SECRET.",
    );
  }

  const tenantId = env.OUTLOOK_OAUTH_TENANT_ID?.trim() || "common";
  const redirectUri = resolveRedirectUri({
    configuredRedirectUri: env.OUTLOOK_OAUTH_REDIRECT_URI,
    requestOrigin,
  });
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
