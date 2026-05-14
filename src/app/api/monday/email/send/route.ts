import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { api as apiGenerated } from "@convex-config/_generated/api";
import { env } from "~/env";
import { getRequestOrigin } from "~/server/http/requestOrigin";
import { getConvexHttpClient } from "~/server/convexHttp";
import {
  fetchMondayItemColumns,
  resolveMondayContactOwnerId,
} from "~/server/monday/client";
import { requireVerifiedMondaySession } from "~/server/monday/session";
import {
  findRecentlySentMessage,
  refreshOutlookAccessToken,
} from "~/server/outlook/graph";
import { getOutlookConnection } from "~/server/outlook/store";

export const runtime = "nodejs";

interface SendEmailBody {
  to: string;
  subject: string;
  html: string;
  contactItemId?: string;
  ownerMondayUserId?: string;
}

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizeUserId = (value: string | null | undefined) => value?.trim() ?? "";
const splitEmailList = (value: string | null | undefined) => {
  if (!value) {
    return [];
  }

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
    // Fall back to text-based extraction.
  }
  return null;
};

const resolveContactEmail = (
  columns: Array<{ type: string; title: string; text: string | null; value: string | null }>,
) => {
  const emailColumn =
    columns.find((column) => column.type.trim().toLowerCase() === "email") ??
    columns.find((column) => column.title.trim().toLowerCase().includes("email")) ??
    null;
  if (!emailColumn) return null;

  const parsedValue = parseEmailFromColumnValue(emailColumn.value);
  if (parsedValue) return parsedValue;
  const text = emailColumn.text?.trim();
  if (!text) return null;
  return normalizeEmail(text);
};

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

export const POST = async (request: Request) => {
  try {
    const identity = await requireVerifiedMondaySession(request);
    let body: SendEmailBody;
    try {
      body = (await request.json()) as SendEmailBody;
    } catch {
      return toJson({ ok: false, error: "Invalid JSON body" }, 400);
    }

    const to = normalizeEmail(body.to ?? "");
    const subject = (body.subject ?? "").trim();
    const html = (body.html ?? "").trim();
    if (!to || !subject || !html) {
      return toJson(
        { ok: false, error: "Missing required fields: to, subject, html" },
        400,
      );
    }
    if (!EMAIL_PATTERN.test(to)) {
      return toJson({ ok: false, error: "Recipient email is invalid" }, 400);
    }

    const requestedContactItemId = body.contactItemId?.trim() ?? "";
    if (!requestedContactItemId) {
      return toJson(
        {
          ok: false,
          error:
            "A contactItemId is required. Emails can only be sent to explicit contact records.",
        },
        400,
      );
    }

    const convex = getConvexHttpClient();
    const featureFlags = await convex.query(
      apiGenerated.mondaySettings.getFeatureFlags,
      {},
    );
    if (!featureFlags.emailMarketingEnabled) {
      return toJson(
        {
          ok: false,
          error:
            "Email sending is disabled by platform feature flags. Ask an admin to enable Email Marketing first.",
        },
        403,
      );
    }
    const platformSettings = await convex.query(
      apiGenerated.mondaySettings.getPlatformSettings,
      {},
    );
    const teamUserIds = Array.from(
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
    if (!teamUserIds.includes(identity.userId)) {
      return toJson(
        {
          ok: false,
          error:
            "You are not authorized to send marketing emails for this workspace.",
        },
        403,
      );
    }

    const contactColumns = await fetchMondayItemColumns({
      itemId: requestedContactItemId,
    });
    const contactEmail = resolveContactEmail(contactColumns.columns);
    if (!contactEmail) {
      return toJson(
        {
          ok: false,
          error:
            "The selected contact does not have a valid email address on record.",
        },
        400,
      );
    }
    if (contactEmail !== to) {
      return toJson(
        {
          ok: false,
          error:
            "Recipient email must match the selected contact's email address.",
        },
        400,
      );
    }

    const requestedOwnerUserId = body.ownerMondayUserId?.trim() ?? "";
    let contactOwnerUserId = "";
    try {
      const resolvedOwnerId = await resolveMondayContactOwnerId({
        itemId: requestedContactItemId,
      });
      if (resolvedOwnerId) {
        contactOwnerUserId = resolvedOwnerId;
      }
    } catch (resolveOwnerError) {
      console.warn("[monday-email-send] contact owner resolution failed", {
        contactItemId: requestedContactItemId,
        error:
          resolveOwnerError instanceof Error
            ? resolveOwnerError.message
            : String(resolveOwnerError),
      });
    }
    if (!contactOwnerUserId && !requestedOwnerUserId) {
      return toJson(
        {
          ok: false,
          error:
            "Unable to resolve the contact owner. Select a sender mailbox to continue.",
        },
        400,
      );
    }
    if (
      identity.userId !== contactOwnerUserId &&
      requestedOwnerUserId.length === 0
    ) {
      return toJson(
        {
          ok: false,
          error:
            "Select a sender mailbox when sending on behalf of another teammate.",
        },
        400,
      );
    }
    const effectiveOwnerUserId = requestedOwnerUserId || contactOwnerUserId;
    if (!effectiveOwnerUserId) {
      return toJson(
        {
          ok: false,
          error:
            "Unable to determine sender mailbox.",
        },
        400,
      );
    }
    if (!teamUserIds.includes(effectiveOwnerUserId)) {
      return toJson(
        {
          ok: false,
          error:
            "Selected sender is not part of the allowed workspace team list.",
        },
        403,
      );
    }

    const ownerConnection = await getOutlookConnection({
      mondayAccountId: identity.accountId,
      mondayUserId: effectiveOwnerUserId,
      mondayAppClientId: identity.appClientId,
    });
    if (!ownerConnection) {
      return toJson(
        {
          ok: false,
          error: `Outlook is not connected for selected sender ${effectiveOwnerUserId}. Ask that teammate to connect Outlook in Settings.`,
        },
        400,
      );
    }

    let configuredReplyToEmails = splitEmailList(env.OUTLOOK_REPLY_TO_EMAIL);
    if (platformSettings.replyToEmails.length > 0) {
      configuredReplyToEmails = platformSettings.replyToEmails;
    }
    const replyToAddresses = Array.from(
      new Set(
        [
          ownerConnection.email ? normalizeEmail(ownerConnection.email) : null,
          ...configuredReplyToEmails,
        ].filter((entry): entry is string => !!entry && entry.length > 0),
      ),
    );

    const requestOrigin = getRequestOrigin(request);
    const refreshed = await refreshOutlookAccessToken({
      connection: ownerConnection,
      requestOrigin,
    });

    const recentOutbound = await convex.query(
      apiGenerated.outlookInbound.listRecentOutboundByRecipient,
      {
        mondayAccountId: identity.accountId,
        mondayUserId: effectiveOwnerUserId,
        recipientEmail: to,
        sentAtMin: Date.now() - 2 * 60 * 1000,
        limit: 10,
      },
    );
    const hasRecentDuplicate = recentOutbound.some((row) => row.subject.trim() === subject);
    if (hasRecentDuplicate) {
      return toJson(
        {
          ok: false,
          error:
            "A matching email was already sent to this contact recently. Wait before sending again.",
        },
        409,
      );
    }

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
          subject,
          body: {
            contentType: "HTML",
            content: html,
          },
          toRecipients: [
            {
              emailAddress: {
                address: to,
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
        recipientEmail: to,
        subject,
        sentAfterMs: sentAt - 2 * 60 * 1000,
      });
    } catch (sentLookupError) {
      console.warn("[monday-email-send] sent-message lookup failed", {
        to,
        subject,
        error:
          sentLookupError instanceof Error
            ? sentLookupError.message
            : String(sentLookupError),
      });
    }

    try {
      await convex.mutation(apiGenerated.outlookInbound.upsertOutboundMessage, {
        mondayAccountId: identity.accountId,
        mondayUserId: effectiveOwnerUserId,
        actingMondayUserId: identity.userId,
        mondayAppClientId: identity.appClientId,
        connectionEmail: ownerConnection.email ?? undefined,
        contactItemId: requestedContactItemId,
        recipientEmail: to,
        subject,
        sentAt,
        graphMessageId: sentMessage?.id ?? undefined,
        internetMessageId: sentMessage?.internetMessageId ?? undefined,
        conversationId: sentMessage?.conversationId ?? undefined,
        correlationToken,
        status: sentMessage ? "identified" : "pending_lookup",
      });
    } catch (storeMappingError) {
      console.warn("[monday-email-send] failed to persist outbound mapping", {
        to,
        subject,
        contactItemId: requestedContactItemId,
        error:
          storeMappingError instanceof Error
            ? storeMappingError.message
            : String(storeMappingError),
      });
    }

    return toJson({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email";
    return toJson({ ok: false, error: message }, 500);
  }
};
