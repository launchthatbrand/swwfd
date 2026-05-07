import "server-only";

import { encryptToken, decryptToken } from "~/server/outlook/crypto";
import { getOutlookOAuthConfig } from "~/server/outlook/config";
import type { OutlookConnection } from "~/server/outlook/store";
import { upsertOutlookConnection } from "~/server/outlook/store";

interface OutlookTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface GraphRecipient {
  emailAddress?: {
    address?: string | null;
    name?: string | null;
  } | null;
}

interface GraphMessageHeader {
  name?: string | null;
  value?: string | null;
}

export interface OutlookGraphMessage {
  id: string;
  internetMessageId: string | null;
  conversationId: string | null;
  subject: string;
  bodyContent: string;
  uniqueBodyContent: string;
  bodyPreview: string;
  fromEmail: string | null;
  replyToEmails: string[];
  toEmails: string[];
  ccEmails: string[];
  inReplyTo: string | null;
  referencesHeader: string | null;
  receivedDateTime: string | null;
  createdDateTime: string | null;
}

interface GraphMessageResponse {
  id?: string;
  internetMessageId?: string | null;
  conversationId?: string | null;
  subject?: string | null;
  body?: { content?: string | null };
  uniqueBody?: { content?: string | null };
  bodyPreview?: string | null;
  from?: GraphRecipient | null;
  replyTo?: GraphRecipient[] | null;
  toRecipients?: GraphRecipient[] | null;
  ccRecipients?: GraphRecipient[] | null;
  inReplyTo?: string | null;
  internetMessageHeaders?: GraphMessageHeader[] | null;
  receivedDateTime?: string | null;
  sentDateTime?: string | null;
  createdDateTime?: string | null;
}

interface GraphSubscriptionResponse {
  id?: string | null;
  resource?: string | null;
  changeType?: string | null;
  expirationDateTime?: string | null;
  clientState?: string | null;
  notificationUrl?: string | null;
}

interface RefreshOutlookAccessTokenArgs {
  connection: OutlookConnection;
  requestOrigin: string;
}

interface GraphRequestOptions {
  method?: string;
  body?: string;
  query?: Record<string, string | number | boolean | undefined>;
}

const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";

const normalizeEmail = (value: string | null | undefined) => {
  const trimmed = value?.trim().toLowerCase();
  return trimmed && trimmed.length > 0 ? trimmed : null;
};

const unwrapRecipientEmails = (recipients: GraphRecipient[] | null | undefined) => {
  return Array.from(
    new Set(
      (recipients ?? [])
        .map((recipient) => normalizeEmail(recipient?.emailAddress?.address))
        .filter((email): email is string => !!email),
    ),
  );
};

const getHeaderValue = (
  headers: GraphMessageHeader[] | null | undefined,
  targetName: string,
) => {
  const normalizedTarget = targetName.toLowerCase();
  for (const header of headers ?? []) {
    const name = header.name?.trim().toLowerCase();
    if (!name || name !== normalizedTarget) continue;
    const value = header.value?.trim();
    if (value && value.length > 0) return value;
  }
  return null;
};

const assertGraphOk = async (response: Response) => {
  if (response.ok) return;
  const errorText = await response.text();
  throw new Error(
    `Microsoft Graph request failed (${response.status}): ${errorText}`,
  );
};

const buildGraphUrl = (path: string, query?: GraphRequestOptions["query"]) => {
  const url = new URL(`${GRAPH_BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
};

export const refreshOutlookAccessToken = async (
  args: RefreshOutlookAccessTokenArgs,
) => {
  const oauth = getOutlookOAuthConfig(args.requestOrigin);
  const tokenBody = new URLSearchParams();
  tokenBody.set("client_id", oauth.clientId);
  tokenBody.set("scope", oauth.scopes.join(" "));
  tokenBody.set("refresh_token", decryptToken(args.connection.encryptedRefreshToken));
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
  const accessTokenExpiresAt = Date.now() + expiresInSeconds * 1000;
  const scopes = (tokenData.scope ?? oauth.scopes.join(" "))
    .split(" ")
    .map((scope) => scope.trim())
    .filter((scope) => scope.length > 0);

  await upsertOutlookConnection({
    mondayAccountId: args.connection.mondayAccountId,
    mondayUserId: args.connection.mondayUserId,
    mondayAppClientId: args.connection.mondayAppClientId,
    email: args.connection.email,
    displayName: args.connection.displayName,
    tenantId: oauth.tenantId,
    clientId: oauth.clientId,
    encryptedAccessToken: encryptToken(tokenData.access_token),
    encryptedRefreshToken: encryptToken(tokenData.refresh_token),
    accessTokenExpiresAt,
    scopes,
  });

  return {
    accessToken: tokenData.access_token,
    accessTokenExpiresAt,
    refreshToken: tokenData.refresh_token,
    scopes,
  };
};

export const graphRequest = async <TResponse>(
  accessToken: string,
  path: string,
  options?: GraphRequestOptions,
) => {
  const response = await fetch(buildGraphUrl(path, options?.query), {
    method: options?.method ?? "GET",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: options?.body,
    cache: "no-store",
  });
  await assertGraphOk(response);
  if (response.status === 204) {
    return null as TResponse;
  }
  return (await response.json()) as TResponse;
};

export const findRecentlySentMessage = async (args: {
  accessToken: string;
  recipientEmail: string;
  subject: string;
  sentAfterMs: number;
  maxResults?: number;
}) => {
  interface SentMessagesData {
    value?: GraphMessageResponse[];
  }

  const data = await graphRequest<SentMessagesData>(
    args.accessToken,
    "/me/mailFolders('sentitems')/messages",
    {
      query: {
        $top: Math.min(Math.max(args.maxResults ?? 20, 1), 50),
        $orderby: "sentDateTime desc",
        $select:
          "id,internetMessageId,conversationId,subject,toRecipients,sentDateTime,createdDateTime",
      },
    },
  );

  const recipient = normalizeEmail(args.recipientEmail);
  const normalizedSubject = args.subject.trim();
  if (!recipient || !normalizedSubject) return null;

  for (const message of data.value ?? []) {
    const toEmails = unwrapRecipientEmails(message.toRecipients);
    if (!toEmails.includes(recipient)) continue;
    if ((message.subject ?? "").trim() !== normalizedSubject) continue;
    const sentAtRaw =
      message.sentDateTime ?? message.createdDateTime ?? message.receivedDateTime;
    const sentAt = sentAtRaw ? Date.parse(sentAtRaw) : Number.NaN;
    if (!Number.isNaN(sentAt) && sentAt < args.sentAfterMs) continue;
    const id = message.id?.trim();
    if (!id) continue;
    return {
      id,
      internetMessageId: message.internetMessageId?.trim() ?? null,
      conversationId: message.conversationId?.trim() ?? null,
    };
  }
  return null;
};

export const fetchGraphMessageById = async (args: {
  accessToken: string;
  messageId: string;
}) => {
  const message = await graphRequest<GraphMessageResponse>(
    args.accessToken,
    `/me/messages/${encodeURIComponent(args.messageId)}`,
    {
      query: {
        $select:
          "id,internetMessageId,conversationId,subject,body,uniqueBody,bodyPreview,from,replyTo,toRecipients,ccRecipients,inReplyTo,internetMessageHeaders,receivedDateTime,createdDateTime",
      },
    },
  );
  const id = message.id?.trim();
  if (!id) {
    throw new Error("Graph message payload was missing id");
  }
  return {
    id,
    internetMessageId: message.internetMessageId?.trim() ?? null,
    conversationId: message.conversationId?.trim() ?? null,
    subject: message.subject?.trim() ?? "",
    bodyContent: message.body?.content?.trim() ?? "",
    uniqueBodyContent: message.uniqueBody?.content?.trim() ?? "",
    bodyPreview: message.bodyPreview?.trim() ?? "",
    fromEmail: normalizeEmail(message.from?.emailAddress?.address),
    replyToEmails: unwrapRecipientEmails(message.replyTo),
    toEmails: unwrapRecipientEmails(message.toRecipients),
    ccEmails: unwrapRecipientEmails(message.ccRecipients),
    inReplyTo: message.inReplyTo?.trim() ?? null,
    referencesHeader: getHeaderValue(message.internetMessageHeaders, "references"),
    receivedDateTime: message.receivedDateTime?.trim() ?? null,
    createdDateTime: message.createdDateTime?.trim() ?? null,
  } satisfies OutlookGraphMessage;
};

export const createMessageSubscription = async (args: {
  accessToken: string;
  notificationUrl: string;
  clientState: string;
  expirationDateTime: string;
}) => {
  const payload = {
    changeType: "created",
    notificationUrl: args.notificationUrl,
    resource: "/me/mailFolders('inbox')/messages",
    expirationDateTime: args.expirationDateTime,
    clientState: args.clientState,
  };
  const subscription = await graphRequest<GraphSubscriptionResponse>(
    args.accessToken,
    "/subscriptions",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  const id = subscription.id?.trim();
  const expirationDateTime = subscription.expirationDateTime?.trim();
  if (!id || !expirationDateTime) {
    throw new Error("Graph subscription creation returned incomplete payload");
  }
  return {
    id,
    resource: subscription.resource?.trim() ?? payload.resource,
    changeType: subscription.changeType?.trim() ?? payload.changeType,
    notificationUrl:
      subscription.notificationUrl?.trim() ?? payload.notificationUrl,
    expirationDateTime,
    clientState: subscription.clientState?.trim() ?? args.clientState,
  };
};

export const renewMessageSubscription = async (args: {
  accessToken: string;
  subscriptionId: string;
  expirationDateTime: string;
}) => {
  const subscription = await graphRequest<GraphSubscriptionResponse>(
    args.accessToken,
    `/subscriptions/${encodeURIComponent(args.subscriptionId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        expirationDateTime: args.expirationDateTime,
      }),
    },
  );
  const expirationDateTime = subscription.expirationDateTime?.trim();
  if (!expirationDateTime) {
    throw new Error("Graph subscription renewal returned no expiration");
  }
  return {
    expirationDateTime,
  };
};

export const deleteMessageSubscription = async (args: {
  accessToken: string;
  subscriptionId: string;
}) => {
  const response = await fetch(
    `${GRAPH_BASE_URL}/subscriptions/${encodeURIComponent(args.subscriptionId)}`,
    {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${args.accessToken}`,
      },
      cache: "no-store",
    },
  );
  if (response.status === 404) return;
  await assertGraphOk(response);
};

export const getDefaultSubscriptionExpirationIso = (hoursFromNow = 24) => {
  const durationMs = Math.min(Math.max(hoursFromNow, 1), 48) * 60 * 60 * 1000;
  return new Date(Date.now() + durationMs).toISOString();
};
