import "server-only";

import { getZohoOAuthConfig } from "~/server/zoho/config";

export interface ZohoCampaignSendResult {
  messageId: string | null;
  campaignId: string | null;
  raw: unknown;
}

const normalizeOptional = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
};

export const sendZohoCampaignEmail = async (args: {
  accessToken: string;
  requestOrigin: string;
  to: string;
  subject: string;
  html: string;
  text?: string | null;
  fromEmail: string;
  fromName?: string | null;
  replyToEmail?: string | null;
}) => {
  const oauth = getZohoOAuthConfig(args.requestOrigin);
  const sendUrl = `${oauth.campaignsApiBaseUrl}${oauth.campaignsSendPath}`;

  const response = await fetch(sendUrl, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${args.accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: normalizeOptional(args.text),
      from: {
        email: args.fromEmail,
        name: normalizeOptional(args.fromName),
      },
      replyTo: normalizeOptional(args.replyToEmail),
    }),
    cache: "no-store",
  });

  const raw = await response.json().catch(async () => {
    const fallback = await response.text();
    return { raw: fallback };
  });

  if (!response.ok) {
    const message =
      typeof raw === "object" && raw && "message" in raw && typeof raw.message === "string"
        ? raw.message
        : `Zoho send failed (${response.status})`;
    throw new Error(message);
  }

  let messageId: string | null = null;
  let campaignId: string | null = null;
  if (typeof raw === "object" && raw) {
    if ("message_id" in raw && typeof raw.message_id === "string") {
      messageId = raw.message_id.trim() || null;
    } else if ("messageId" in raw && typeof raw.messageId === "string") {
      messageId = raw.messageId.trim() || null;
    }
    if ("campaign_id" in raw && typeof raw.campaign_id === "string") {
      campaignId = raw.campaign_id.trim() || null;
    } else if ("campaignId" in raw && typeof raw.campaignId === "string") {
      campaignId = raw.campaignId.trim() || null;
    }
  }

  return {
    messageId,
    campaignId,
    raw,
  } satisfies ZohoCampaignSendResult;
};
