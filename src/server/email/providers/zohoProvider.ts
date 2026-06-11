import { api as apiGenerated } from "@convex-config/_generated/api";
import { getConvexHttpClient } from "~/server/convexHttp";
import { getZohoOAuthConfig } from "~/server/zoho/config";
import { sendZohoCampaignEmail } from "~/server/zoho/campaigns";
import { refreshZohoAccessToken } from "~/server/zoho/oauth";
import { getZohoConnection } from "~/server/zoho/store";

export const sendViaZohoProvider = async (args: {
  mondayAccountId: string;
  mondayAppClientId?: string;
  actingMondayUserId: string;
  ownerMondayUserId: string;
  ownerEmail: string | null;
  to: string;
  subject: string;
  html: string;
  contactItemId: string;
  requestOrigin: string;
  fallbackReplyToEmail: string | null;
  configuredSenderEmail: string | null;
  configuredSenderName: string | null;
  convex: ReturnType<typeof getConvexHttpClient>;
}) => {
  const connection = await getZohoConnection({
    mondayAccountId: args.mondayAccountId,
    mondayAppClientId: args.mondayAppClientId,
  });
  if (!connection) {
    throw new Error(
      "Zoho is not connected for this workspace. Connect Zoho in Email Settings.",
    );
  }

  const refreshed = await refreshZohoAccessToken({
    connection,
    requestOrigin: args.requestOrigin,
  });
  const oauth = getZohoOAuthConfig(args.requestOrigin);

  const fromEmail =
    args.configuredSenderEmail ??
    connection.senderEmail ??
    oauth.defaultSenderEmail;
  if (!fromEmail) {
    throw new Error(
      "Zoho sender email is not configured. Set a sender email in platform settings or ZOHO_CAMPAIGNS_DEFAULT_SENDER_EMAIL.",
    );
  }
  const fromName =
    args.configuredSenderName ?? connection.senderName ?? oauth.defaultSenderName;
  const replyToEmail = args.ownerEmail ?? args.fallbackReplyToEmail;

  const sentAt = Date.now();
  try {
    const result = await sendZohoCampaignEmail({
      accessToken: refreshed.accessToken,
      requestOrigin: args.requestOrigin,
      to: args.to,
      subject: args.subject,
      html: args.html,
      fromEmail,
      fromName,
      replyToEmail,
    });

    await args.convex.mutation(apiGenerated.zohoOutbound.recordSendResult, {
      mondayAccountId: args.mondayAccountId,
      mondayAppClientId: args.mondayAppClientId,
      actingMondayUserId: args.actingMondayUserId,
      ownerMondayUserId: args.ownerMondayUserId,
      ownerEmail: args.ownerEmail ?? undefined,
      contactItemId: args.contactItemId,
      recipientEmail: args.to,
      subject: args.subject,
      senderEmail: fromEmail,
      replyToEmail: replyToEmail ?? undefined,
      zohoMessageId: result.messageId ?? undefined,
      zohoCampaignId: result.campaignId ?? undefined,
      status: "sent",
      sentAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zoho send failed";
    await args.convex.mutation(apiGenerated.zohoOutbound.recordSendResult, {
      mondayAccountId: args.mondayAccountId,
      mondayAppClientId: args.mondayAppClientId,
      actingMondayUserId: args.actingMondayUserId,
      ownerMondayUserId: args.ownerMondayUserId,
      ownerEmail: args.ownerEmail ?? undefined,
      contactItemId: args.contactItemId,
      recipientEmail: args.to,
      subject: args.subject,
      senderEmail: fromEmail,
      replyToEmail: replyToEmail ?? undefined,
      status: "failed",
      errorMessage: message,
      sentAt,
    });
    throw error;
  }
};
