import "server-only";

import { getZohoOAuthConfig } from "~/server/zoho/config";
import { createZohoContentToken } from "~/server/zoho/contentToken";

export interface ZohoCampaignSendResult {
  messageId: string | null;
  campaignId: string | null;
  raw: unknown;
}

const normalizeOptional = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
};

const parseXmlTag = (xml: string, tagName: string) => {
  const pattern = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, "i");
  const match = pattern.exec(xml);
  const value = match?.[1]?.trim();
  return value && value.length > 0 ? value : null;
};

const toJsonObject = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== "object" || value === null) return null;
  return value as Record<string, unknown>;
};

const getStringValue = (value: unknown): string | null => {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
};

const isLocalOrigin = (origin: string) =>
  /^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?$/i.test(origin.trim());

const parseZohoResponse = (rawBody: string): unknown => {
  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return { raw: rawBody };
  }
};

const extractZohoError = (raw: unknown, fallback: string) => {
  const json = toJsonObject(raw);
  if (json) {
    const nested = toJsonObject(json.response);
    const message = getStringValue(json.message) ?? getStringValue(nested?.message);
    const code = getStringValue(json.code) ?? getStringValue(nested?.code);
    if (message) {
      return code ? `${fallback} (code ${code}): ${message}` : `${fallback}: ${message}`;
    }
  }

  if (
    typeof raw === "object" &&
    raw &&
    "raw" in raw &&
    typeof (raw as { raw?: unknown }).raw === "string"
  ) {
    const rawText = (raw as { raw: string }).raw;
    const xmlMessage = parseXmlTag(rawText, "message");
    const xmlCode = parseXmlTag(rawText, "code");
    if (xmlMessage) {
      return xmlCode ? `${fallback} (code ${xmlCode}): ${xmlMessage}` : `${fallback}: ${xmlMessage}`;
    }
  }

  return fallback;
};

const ensureZohoSuccess = (args: {
  endpoint: string;
  response: Response;
  raw: unknown;
}) => {
  const { endpoint, response, raw } = args;
  if (!response.ok) {
    throw new Error(extractZohoError(raw, `Zoho ${endpoint} failed (${response.status})`));
  }

  const json = toJsonObject(raw);
  if (json) {
    const rootStatus = getStringValue(json.status)?.toLowerCase();
    const rootCode = getStringValue(json.code);
    const nested = toJsonObject(json.response);
    const nestedStatus = getStringValue(nested?.status)?.toLowerCase();
    const nestedCode = getStringValue(nested?.code);
    const code = nestedCode ?? rootCode;
    const status = nestedStatus ?? rootStatus;

    if (status === "error" || status === "failed" || status === "failure") {
      throw new Error(extractZohoError(raw, `Zoho ${endpoint} failed`));
    }
    if (code && code !== "0" && code !== "200") {
      throw new Error(extractZohoError(raw, `Zoho ${endpoint} failed`));
    }
    return;
  }

  if (
    typeof raw === "object" &&
    raw &&
    "raw" in raw &&
    typeof (raw as { raw?: unknown }).raw === "string"
  ) {
    const rawText = (raw as { raw: string }).raw;
    const xmlStatus = parseXmlTag(rawText, "status")?.toLowerCase();
    const xmlCode = parseXmlTag(rawText, "code");
    if (xmlStatus === "error" || xmlStatus === "failed" || xmlStatus === "failure") {
      throw new Error(extractZohoError(raw, `Zoho ${endpoint} failed`));
    }
    if (xmlCode && xmlCode !== "0" && xmlCode !== "200") {
      throw new Error(extractZohoError(raw, `Zoho ${endpoint} failed`));
    }
  }
};

const getCampaignKey = (raw: unknown): string | null => {
  const json = toJsonObject(raw);
  if (json) {
    const key = getStringValue(json.campaignKey);
    if (key) return key;
    const nested = toJsonObject(json.response);
    const nestedKey = getStringValue(nested?.campaignKey);
    if (nestedKey) return nestedKey;
  }
  if (
    typeof raw === "object" &&
    raw &&
    "raw" in raw &&
    typeof (raw as { raw?: unknown }).raw === "string"
  ) {
    return parseXmlTag((raw as { raw: string }).raw, "campaignKey");
  }
  return null;
};

export const sendZohoCampaignEmail = async (args: {
  accessToken: string;
  requestOrigin: string;
  to: string;
  subject: string;
  html: string;
  fromEmail: string;
  fromName?: string | null;
  replyToEmail?: string | null;
}) => {
  const oauth = getZohoOAuthConfig(args.requestOrigin);
  if (!oauth.campaignsListKey) {
    throw new Error(
      "ZOHO_CAMPAIGNS_LIST_KEY is required for Zoho Campaigns sending. Set it to your target mailing list key.",
    );
  }

  const contentOrigin = oauth.publicContentOrigin ?? args.requestOrigin;
  if (isLocalOrigin(contentOrigin)) {
    throw new Error(
      "Zoho Campaigns cannot fetch content from localhost. Set NEXT_PUBLIC_APP_URL to a public HTTPS origin.",
    );
  }

  const contentToken = await createZohoContentToken({ html: args.html });
  const contentUrl = `${contentOrigin.replace(/\/+$/, "")}/api/monday/email/zoho/content?token=${encodeURIComponent(contentToken)}`;
  const isDebug = process.env.NODE_ENV !== "production";
  const campaignName = `SWWFD ${new Date().toISOString()}`;
  const listDetails = JSON.stringify({
    [oauth.campaignsListKey]: [],
  });

  const postForm = async (path: string, fields: Record<string, string>) => {
    const url = `${oauth.campaignsApiBaseUrl}${path}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${args.accessToken}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(fields).toString(),
      cache: "no-store",
    });
    const rawBody = await response.text();
    const raw = parseZohoResponse(rawBody);
    if (isDebug) {
      console.info("[ZohoCampaigns] response", {
        endpoint: path,
        status: response.status,
        ok: response.ok,
        raw,
      });
    }
    ensureZohoSuccess({
      endpoint: path,
      response,
      raw,
    });
    return raw;
  };

  await postForm("/json/listsubscribe", {
    resfmt: "JSON",
    listkey: oauth.campaignsListKey,
    contactinfo: JSON.stringify({
      "Contact Email": args.to,
    }),
    ...(oauth.campaignsTopicId ? { topic_id: oauth.campaignsTopicId } : {}),
  });

  const createRaw = await postForm("/createCampaign", {
    resfmt: "JSON",
    campaignname: campaignName,
    from_email: args.fromEmail,
    ...(normalizeOptional(args.fromName) ? { from_name: normalizeOptional(args.fromName)! } : {}),
    subject: args.subject,
    content_url: contentUrl,
    list_details: listDetails,
    ...(oauth.campaignsTopicId ? { topicId: oauth.campaignsTopicId } : {}),
  });
  const campaignKey = getCampaignKey(createRaw);
  if (!campaignKey) {
    throw new Error("Zoho createCampaign succeeded but did not return a campaign key.");
  }

  const sendRaw = await postForm(oauth.campaignsSendPath, {
    resfmt: "JSON",
    campaignkey: campaignKey,
  });

  let messageId: string | null = null;
  const sendJson = toJsonObject(sendRaw);
  if (sendJson) {
    messageId = getStringValue(sendJson.message_id) ?? getStringValue(sendJson.messageId);
  }

  return {
    messageId,
    campaignId: campaignKey,
    raw: sendRaw,
  } satisfies ZohoCampaignSendResult;
};
