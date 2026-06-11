import { api as apiGenerated } from "@convex-config/_generated/api";
import { getConvexHttpClient } from "~/server/convexHttp";
import {
  fetchMondayItemColumns,
  resolveMondayContactOwnerId,
} from "~/server/monday/client";
import { getOutlookConnection } from "~/server/outlook/store";
import { decideEmailProviderReason } from "~/server/email/providers/decision";
import { sendViaOutlookProvider } from "~/server/email/providers/outlookProvider";
import { sendViaZohoProvider } from "~/server/email/providers/zohoProvider";
import type {
  EmailProvider,
  EmailProviderReason,
  EmailRecipientInput,
  EmailRecipientPrepared,
  EmailSendResult,
} from "~/server/email/providers/types";

export interface MondaySessionIdentity {
  userId: string;
  accountId: string;
  appClientId?: string;
}

export interface SendBatchBody {
  subject?: string;
  html?: string;
  recipients?: EmailRecipientInput[];
}

export interface SendBatchResult {
  provider: EmailProvider;
  reason: EmailProviderReason;
  sentCount: number;
  failedCount: number;
  results: EmailSendResult[];
}

type ConvexClient = ReturnType<typeof getConvexHttpClient>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const normalizeUserId = (value: string | null | undefined) => value?.trim() ?? "";
const normalizeOptional = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
};
const splitEmailList = (value: string | null | undefined) => {
  if (!value) return [];
  return Array.from(
    new Set(
      value
        .split(/[\s,;]+/)
        .map((entry) => normalizeEmail(entry))
        .filter((entry) => entry.length > 0),
    ),
  );
};

const parseEmailFromColumnValue = (value: string | null) => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as {
      email?: unknown;
      address?: unknown;
      text?: unknown;
    };
    if (typeof parsed.email === "string" && parsed.email.trim().length > 0) {
      return normalizeEmail(parsed.email);
    }
    if (typeof parsed.address === "string" && parsed.address.trim().length > 0) {
      return normalizeEmail(parsed.address);
    }
    if (typeof parsed.text === "string" && parsed.text.trim().length > 0) {
      return normalizeEmail(parsed.text);
    }
  } catch {
    // fall through to null
  }
  return null;
};

const resolveContactEmail = (
  columns: Array<{
    type: string;
    title: string;
    text: string | null;
    value: string | null;
  }>,
) => {
  const emailColumn =
    columns.find((column) => column.type.trim().toLowerCase() === "email") ??
    columns.find((column) => column.title.trim().toLowerCase().includes("email")) ??
    null;
  if (!emailColumn) return null;
  const parsed = parseEmailFromColumnValue(emailColumn.value);
  if (parsed) return parsed;
  const text = emailColumn.text?.trim();
  if (!text) return null;
  return normalizeEmail(text);
};

const buildAllowedTeamIds = (platformSettings: {
  masterAdminUserId: string;
  adminUserIds: string[];
  employeeUserIds: string[];
}) =>
  Array.from(
    new Set(
      [
        platformSettings.masterAdminUserId,
        ...platformSettings.adminUserIds,
        ...platformSettings.employeeUserIds,
      ]
        .map((entry) => normalizeUserId(entry))
        .filter((entry) => entry.length > 0),
    ),
  );

const prepareRecipients = async (args: {
  identity: MondaySessionIdentity;
  body: SendBatchBody;
  convex: ConvexClient;
  teamUserIds: string[];
}) => {
  const recipients = args.body.recipients ?? [];
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error("At least one recipient is required.");
  }
  if (recipients.length > 200) {
    throw new Error("Batch send is limited to 200 recipients per request.");
  }

  const prepared: EmailRecipientPrepared[] = [];
  for (const recipient of recipients) {
    const to = normalizeEmail(recipient.to ?? "");
    const contactItemId = recipient.contactItemId?.trim() ?? "";
    const subject = (recipient.subject ?? args.body.subject ?? "").trim();
    const html = (recipient.html ?? args.body.html ?? "").trim();
    if (!to || !subject || !html || !contactItemId) {
      throw new Error(
        "Each recipient requires to, contactItemId, subject, and html (or batch defaults).",
      );
    }
    if (!EMAIL_PATTERN.test(to)) {
      throw new Error(`Recipient email is invalid: ${to}`);
    }

    let contactEmail: string | null = null;
    try {
      const contactColumns = await fetchMondayItemColumns({ itemId: contactItemId });
      contactEmail = resolveContactEmail(contactColumns.columns);
      if (contactEmail && contactEmail !== to) {
        throw new Error(
          "Recipient email must match the selected contact's email address.",
        );
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("must match the selected contact")
      ) {
        throw error;
      }
      console.warn("[monday-email-batch] contact lookup failed; continuing", {
        contactItemId,
        to,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    let contactOwnerUserId = "";
    try {
      const resolvedOwnerId = await resolveMondayContactOwnerId({ itemId: contactItemId });
      if (resolvedOwnerId) contactOwnerUserId = resolvedOwnerId;
    } catch (error) {
      console.warn("[monday-email-batch] contact owner resolution failed", {
        contactItemId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const requestedOwnerUserId = recipient.ownerMondayUserId?.trim() ?? "";
    if (!contactOwnerUserId && !requestedOwnerUserId) {
      throw new Error(
        `Unable to resolve the contact owner for ${contactItemId}. Select a sender mailbox.`,
      );
    }
    if (
      args.identity.userId !== contactOwnerUserId &&
      requestedOwnerUserId.length === 0
    ) {
      throw new Error(
        `Select a sender mailbox when sending on behalf of another teammate (${contactItemId}).`,
      );
    }
    const ownerMondayUserId = requestedOwnerUserId || contactOwnerUserId;
    if (!args.teamUserIds.includes(ownerMondayUserId)) {
      throw new Error(
        `Selected sender ${ownerMondayUserId} is not part of the allowed workspace team list.`,
      );
    }

    const ownerUser = await args.convex.query(apiGenerated.mondayUsers.getByAccountAndUser, {
      mondayAccountId: args.identity.accountId,
      mondayUserId: ownerMondayUserId,
    });
    const ownerEmail = normalizeOptional(ownerUser?.email);

    prepared.push({
      to,
      contactItemId,
      ownerMondayUserId,
      ownerEmail,
      subject,
      html,
    });
  }
  return prepared;
};

export const sendMarketingEmailBatch = async (args: {
  identity: MondaySessionIdentity;
  body: SendBatchBody;
  requestOrigin: string;
  convex: ConvexClient;
}) => {
  const featureFlags = await args.convex.query(
    apiGenerated.mondaySettings.getFeatureFlags,
    {},
  );
  if (!featureFlags.emailMarketingEnabled) {
    throw new Error(
      "Email sending is disabled by platform feature flags. Ask an admin to enable Email Marketing first.",
    );
  }

  const platformSettings = await args.convex.query(
    apiGenerated.mondaySettings.getPlatformSettings,
    {},
  );

  const teamUserIds = buildAllowedTeamIds(platformSettings);
  if (!teamUserIds.includes(args.identity.userId)) {
    throw new Error(
      "You are not authorized to send marketing emails for this workspace.",
    );
  }

  const preparedRecipients = await prepareRecipients({
    identity: args.identity,
    body: args.body,
    convex: args.convex,
    teamUserIds,
  });

  const firstRecipient = preparedRecipients[0];
  if (!firstRecipient) {
    throw new Error("No recipients were prepared for sending.");
  }
  const ownerConnection = await getOutlookConnection({
    mondayAccountId: args.identity.accountId,
    mondayUserId: firstRecipient.ownerMondayUserId,
    mondayAppClientId: args.identity.appClientId,
  });
  const reason = decideEmailProviderReason({
    recipientCount: preparedRecipients.length,
    ownerHasOutlookConnection: !!ownerConnection,
  });
  const provider: EmailProvider = reason === "single_outlook" ? "outlook" : "zoho";

  const configuredReplyToEmails = platformSettings.replyToEmails;
  const fallbackReplyToEmail =
    platformSettings.zohoReplyToFallbackEmail ??
    splitEmailList(platformSettings.replyToEmails.join(","))[0] ??
    null;

  const results: EmailSendResult[] = [];
  for (const recipient of preparedRecipients) {
    try {
      if (provider === "outlook") {
        await sendViaOutlookProvider({
          mondayAccountId: args.identity.accountId,
          mondayAppClientId: args.identity.appClientId,
          actingMondayUserId: args.identity.userId,
          ownerMondayUserId: recipient.ownerMondayUserId,
          to: recipient.to,
          subject: recipient.subject,
          html: recipient.html,
          contactItemId: recipient.contactItemId,
          requestOrigin: args.requestOrigin,
          configuredReplyToEmails,
          convex: args.convex,
        });
      } else {
        await sendViaZohoProvider({
          mondayAccountId: args.identity.accountId,
          mondayAppClientId: args.identity.appClientId,
          actingMondayUserId: args.identity.userId,
          ownerMondayUserId: recipient.ownerMondayUserId,
          ownerEmail: recipient.ownerEmail,
          to: recipient.to,
          subject: recipient.subject,
          html: recipient.html,
          contactItemId: recipient.contactItemId,
          requestOrigin: args.requestOrigin,
          fallbackReplyToEmail,
          configuredSenderEmail: platformSettings.zohoSenderEmail,
          configuredSenderName: null,
          convex: args.convex,
        });
      }
      results.push({
        contactItemId: recipient.contactItemId,
        to: recipient.to,
        provider,
        ok: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Send failed";
      results.push({
        contactItemId: recipient.contactItemId,
        to: recipient.to,
        provider,
        ok: false,
        error: message,
      });
    }
  }

  const sentCount = results.filter((row) => row.ok).length;
  const failedCount = results.length - sentCount;
  const status =
    failedCount === 0 ? "sent" : sentCount > 0 ? "partial" : "failed";
  const firstError = results.find((row) => !row.ok)?.error ?? null;

  await args.convex.mutation(apiGenerated.emailSendEvents.record, {
    mondayAccountId: args.identity.accountId,
    mondayAppClientId: args.identity.appClientId,
    actingMondayUserId: args.identity.userId,
    provider,
    reason,
    recipientCount: preparedRecipients.length,
    sentCount,
    failedCount,
    contactItemIds: preparedRecipients.map((entry) => entry.contactItemId),
    ownerMondayUserIds: preparedRecipients.map((entry) => entry.ownerMondayUserId),
    subject: firstRecipient.subject,
    status,
    errorMessage: firstError ?? undefined,
  });

  return {
    provider,
    reason,
    sentCount,
    failedCount,
    results,
  } satisfies SendBatchResult;
};
