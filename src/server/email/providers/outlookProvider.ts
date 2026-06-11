import { randomUUID } from "node:crypto";
import { api as apiGenerated } from "@convex-config/_generated/api";
import { getConvexHttpClient } from "~/server/convexHttp";
import {
  findRecentlySentMessage,
  refreshOutlookAccessToken,
} from "~/server/outlook/graph";
import { getOutlookConnection } from "~/server/outlook/store";

const sleep = async (ms: number) =>
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const findRecentlySentMessageWithRetry = async (args: {
  accessToken: string;
  recipientEmail: string;
  subject: string;
  sentAfterMs: number;
}) => {
  const retryDelaysMs = [300, 700, 1_200, 1_800, 2_500];
  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
    const message = await findRecentlySentMessage({
      accessToken: args.accessToken,
      recipientEmail: args.recipientEmail,
      subject: args.subject,
      sentAfterMs: args.sentAfterMs,
      maxResults: 50,
    });
    if (message) return message;
    if (attempt < retryDelaysMs.length) {
      await sleep(retryDelaysMs[attempt] ?? 500);
    }
  }
  return null;
};

export const sendViaOutlookProvider = async (args: {
  mondayAccountId: string;
  mondayAppClientId?: string;
  actingMondayUserId: string;
  ownerMondayUserId: string;
  to: string;
  subject: string;
  html: string;
  contactItemId: string;
  requestOrigin: string;
  configuredReplyToEmails: string[];
  convex: ReturnType<typeof getConvexHttpClient>;
}) => {
  const ownerConnection = await getOutlookConnection({
    mondayAccountId: args.mondayAccountId,
    mondayUserId: args.ownerMondayUserId,
    mondayAppClientId: args.mondayAppClientId,
  });
  if (!ownerConnection) {
    throw new Error(
      `Outlook is not connected for selected sender ${args.ownerMondayUserId}.`,
    );
  }

  const replyToAddresses = Array.from(
    new Set(
      [
        ownerConnection.email ? ownerConnection.email.trim().toLowerCase() : null,
        ...args.configuredReplyToEmails.map((email) => email.trim().toLowerCase()),
      ].filter((entry): entry is string => !!entry && entry.length > 0),
    ),
  );

  const recentOutbound = await args.convex.query(
    apiGenerated.outlookInbound.listRecentOutboundByRecipient,
    {
    mondayAccountId: args.mondayAccountId,
    mondayUserId: args.ownerMondayUserId,
    recipientEmail: args.to,
    sentAtMin: Date.now() - 2 * 60 * 1000,
    limit: 10,
    },
  );
  const hasRecentDuplicate = recentOutbound.some(
    (row) => row.subject.trim() === args.subject,
  );
  if (hasRecentDuplicate) {
    throw new Error(
      "A matching email was already sent to this contact recently. Wait before sending again.",
    );
  }

  const refreshed = await refreshOutlookAccessToken({
    connection: ownerConnection,
    requestOrigin: args.requestOrigin,
  });

  const sentAt = Date.now();
  const correlationToken = randomUUID();
  const sendResponse = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: {
      authorization: `Bearer ${refreshed.accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      message: {
        subject: args.subject,
        body: {
          contentType: "HTML",
          content: args.html,
        },
        toRecipients: [
          {
            emailAddress: {
              address: args.to,
            },
          },
        ],
        ...(replyToAddresses.length > 0
          ? {
              replyTo: replyToAddresses.map((address) => ({
                emailAddress: { address },
              })),
            }
          : {}),
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

  let sentMessage: {
    id: string;
    internetMessageId: string | null;
    conversationId: string | null;
  } | null = null;
  try {
    sentMessage = await findRecentlySentMessageWithRetry({
      accessToken: refreshed.accessToken,
      recipientEmail: args.to,
      subject: args.subject,
      sentAfterMs: sentAt - 2 * 60 * 1000,
    });
  } catch (sentLookupError) {
    console.warn("[monday-email-send] sent-message lookup failed", {
      to: args.to,
      subject: args.subject,
      error:
        sentLookupError instanceof Error
          ? sentLookupError.message
          : String(sentLookupError),
    });
  }

  await args.convex.mutation(apiGenerated.outlookInbound.upsertOutboundMessage, {
    mondayAccountId: args.mondayAccountId,
    mondayUserId: args.ownerMondayUserId,
    actingMondayUserId: args.actingMondayUserId,
    mondayAppClientId: args.mondayAppClientId,
    connectionEmail: ownerConnection.email ?? undefined,
    contactItemId: args.contactItemId,
    recipientEmail: args.to,
    subject: args.subject,
    sentAt,
    graphMessageId: sentMessage?.id ?? undefined,
    internetMessageId: sentMessage?.internetMessageId ?? undefined,
    conversationId: sentMessage?.conversationId ?? undefined,
    correlationToken,
    status: sentMessage ? "identified" : "pending_lookup",
  });
};
