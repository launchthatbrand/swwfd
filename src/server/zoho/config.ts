import "server-only";

import { env } from "~/env";

const getCallbackFromOrigin = (origin: string) =>
  `${origin.replace(/\/+$/, "")}/api/monday/email/zoho/callback`;

const resolveRedirectUri = (args: {
  configuredRedirectUri?: string;
  requestOrigin?: string;
}) => {
  const configured = args.configuredRedirectUri?.trim();
  const requestOrigin = args.requestOrigin?.trim();
  if (!configured) {
    return requestOrigin ? getCallbackFromOrigin(requestOrigin) : null;
  }
  return configured;
};

const splitScopes = (value: string | undefined, fallback: string[]) => {
  const raw = value?.trim();
  if (!raw) return fallback;
  return raw
    .split(/[,\s]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};

const DEFAULT_ZOHO_SCOPES = [
  "ZohoCampaigns.campaign.READ",
  "ZohoCampaigns.campaign.CREATE",
  "ZohoCampaigns.contact.CREATE",
  "ZohoCampaigns.contact.UPDATE",
];

export const getZohoOAuthConfig = (requestOrigin?: string) => {
  const clientId = env.ZOHO_OAUTH_CLIENT_ID?.trim();
  const clientSecret = env.ZOHO_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      "Zoho OAuth is not configured. Set ZOHO_OAUTH_CLIENT_ID and ZOHO_OAUTH_CLIENT_SECRET.",
    );
  }

  const accountsBaseUrl = (
    env.ZOHO_OAUTH_ACCOUNTS_BASE_URL?.trim() || "https://accounts.zoho.com"
  ).replace(/\/+$/, "");
  const redirectUri = resolveRedirectUri({
    configuredRedirectUri: env.ZOHO_OAUTH_REDIRECT_URI,
    requestOrigin,
  });
  if (!redirectUri) {
    throw new Error(
      "Zoho redirect URI is missing. Set ZOHO_OAUTH_REDIRECT_URI or provide request origin.",
    );
  }

  const scopes = splitScopes(undefined, DEFAULT_ZOHO_SCOPES);

  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes,
    accountsBaseUrl,
    authorizeUrl: `${accountsBaseUrl}/oauth/v2/auth`,
    tokenUrl: `${accountsBaseUrl}/oauth/v2/token`,
    userInfoUrl: `${accountsBaseUrl}/oauth/user/info`,
    campaignsApiBaseUrl: (
      env.ZOHO_CAMPAIGNS_API_BASE_URL?.trim() ||
      "https://campaigns.zoho.com/api/v1.1"
    ).replace(/\/+$/, ""),
    campaignsSendPath: env.ZOHO_CAMPAIGNS_SEND_PATH?.trim() || "/campaigns/email/send",
    defaultSenderEmail:
      env.ZOHO_CAMPAIGNS_DEFAULT_SENDER_EMAIL?.trim().toLowerCase() || null,
    defaultSenderName: env.ZOHO_CAMPAIGNS_DEFAULT_SENDER_NAME?.trim() || null,
  };
};

export type ZohoOAuthConfig = ReturnType<typeof getZohoOAuthConfig>;
