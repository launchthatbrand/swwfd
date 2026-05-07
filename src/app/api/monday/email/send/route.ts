import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { api as apiGenerated } from "@convex-config/_generated/api";
import { env } from "~/env";
import { getRequestOrigin } from "~/server/http/requestOrigin";
import { getConvexHttpClient } from "~/server/convexHttp";
import {
  findMondayContactsByEmail,
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

    const requestedContactItemId = body.contactItemId?.trim() ?? "";
    const requestedOwnerUserId = body.ownerMondayUserId?.trim() ?? "";
    let effectiveOwnerUserId = requestedOwnerUserId;
    if (!effectiveOwnerUserId && requestedContactItemId) {
      try {
        const resolvedOwnerId = await resolveMondayContactOwnerId({
          itemId: requestedContactItemId,
        });
        if (resolvedOwnerId) {
          effectiveOwnerUserId = resolvedOwnerId;
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
    }
    if (!effectiveOwnerUserId) {
      return toJson(
        {
          ok: false,
          error:
            "Unable to resolve the contact owner. This email must be sent from the contact owner's mailbox.",
        },
        400,
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
          error: `Outlook is not connected for contact owner ${effectiveOwnerUserId}. Ask that owner to connect Outlook in Settings.`,
        },
        400,
      );
    }

    const convex = getConvexHttpClient();
    let configuredReplyToEmails = splitEmailList(env.OUTLOOK_REPLY_TO_EMAIL);
    try {
      const platformSettings = await convex.query(
        apiGenerated.mondaySettings.getPlatformSettings,
        {},
      );
      if (platformSettings.replyToEmails.length > 0) {
        configuredReplyToEmails = platformSettings.replyToEmails;
      }
    } catch (platformSettingsError) {
      console.warn(
        "[monday-email-send] Failed to read platform settings; using env fallback",
        platformSettingsError,
      );
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

    let resolvedContactItemId = requestedContactItemId;
    if (!resolvedContactItemId) {
      try {
        const candidates = await findMondayContactsByEmail(to, 2);
        if (candidates.length === 1) {
          resolvedContactItemId = candidates[0]?.id?.trim() ?? "";
        }
      } catch (resolveContactError) {
        console.warn("[monday-email-send] contact auto-resolution failed", {
          to,
          error:
            resolveContactError instanceof Error
              ? resolveContactError.message
              : String(resolveContactError),
        });
      }
    }

    let sentMessage: {
      id: string;
      internetMessageId: string | null;
      conversationId: string | null;
    } | null = null;
    try {
      sentMessage = await findRecentlySentMessage({
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
        mondayAppClientId: identity.appClientId,
        connectionEmail: ownerConnection.email ?? undefined,
        contactItemId: resolvedContactItemId || undefined,
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
        contactItemId: resolvedContactItemId || null,
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
