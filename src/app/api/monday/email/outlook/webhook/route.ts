import { NextResponse } from "next/server";
import { api as apiGenerated } from "@convex-config/_generated/api";
import type { Id } from "@convex-config/_generated/dataModel";
import { env } from "~/env";
import { getConvexHttpClient } from "~/server/convexHttp";
import { getRequestOrigin } from "~/server/http/requestOrigin";
import {
  createMondayRecordUpdate,
  fetchMondayItemColumns,
  findMondayContactsByEmail,
  upsertMondayTouchRecord,
} from "~/server/monday/client";
import { extractInboundReplyText, extractReplyReferences } from "~/server/outlook/inboundParser";
import {
  fetchGraphMessageById,
  refreshOutlookAccessToken,
} from "~/server/outlook/graph";
import { getOutlookConnection } from "~/server/outlook/store";

export const runtime = "nodejs";

interface GraphNotificationResourceData {
  id?: string;
}

interface GraphNotification {
  subscriptionId?: string;
  clientState?: string;
  resource?: string;
  changeType?: string;
  lifecycleEvent?: string;
  resourceData?: GraphNotificationResourceData;
}

interface GraphNotificationBody {
  value?: GraphNotification[];
}

type CorrelationMethod = "inReplyTo" | "conversationId" | "senderEmail" | "none";
type CorrelationConfidence = "high" | "medium" | "low" | null;

interface CorrelationResult {
  contactItemId: string | null;
  contactName: string | null;
  matchedContactEmail: string | null;
  method: CorrelationMethod;
  confidence: CorrelationConfidence;
  outboundMessageId?: Id<"outlookOutboundMessages">;
  ownerMondayUserId: string | null;
}

const toJson = (body: unknown, status = 200) =>
  NextResponse.json(body, { status });

const toPlainText = (value: string, status = 200) =>
  new Response(value, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });

const normalizeEmail = (value: string | null | undefined) => {
  const trimmed = value?.trim().toLowerCase();
  return trimmed && trimmed.length > 0 ? trimmed : null;
};

const normalizeThreadSubject = (value: string | null | undefined) => {
  const trimmed = value?.trim().toLowerCase();
  if (!trimmed) return "";
  return trimmed.replace(/^((re|fw|fwd)\s*:\s*)+/i, "").trim();
};

const normalizeMessageIdCandidates = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  if (!trimmed) return [] as string[];
  const withoutAngles = trimmed.replace(/^<|>$/g, "");
  return Array.from(
    new Set(
      [trimmed, withoutAngles, `<${withoutAngles}>`].filter(
        (candidate) => candidate.length > 0,
      ),
    ),
  );
};

const extractMessageId = (notification: GraphNotification) => {
  const fromResourceData = notification.resourceData?.id?.trim();
  if (fromResourceData) return fromResourceData;
  const resource = notification.resource?.trim() ?? "";
  if (!resource) return null;
  const matches = resource.match(/messages(?:\('([^']+)'\)|\/([^/?]+))/i);
  const rawId = matches?.[1] ?? matches?.[2] ?? "";
  if (!rawId) return null;
  try {
    return decodeURIComponent(rawId);
  } catch {
    return rawId;
  }
};

const toDateOnly = (isoDate: string | null) => {
  if (!isoDate) return undefined;
  const parsed = Date.parse(isoDate);
  if (Number.isNaN(parsed)) return undefined;
  return new Date(parsed).toISOString().slice(0, 10);
};

const truncateForMonday = (value: string, maxLength = 12_000) => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 14)}\n\n[Message truncated]`;
};

const parsePeopleColumnIds = (columnValue: string | null) => {
  if (!columnValue) return [] as string[];
  try {
    const parsed = JSON.parse(columnValue) as {
      personsAndTeams?: Array<{ id?: number | string; kind?: string }>;
    };
    return (parsed.personsAndTeams ?? [])
      .filter((entry) => entry.kind === "person" && entry.id != null)
      .map((entry) => String(entry.id))
      .filter((entry) => entry.trim().length > 0);
  } catch {
    return [] as string[];
  }
};

const lookupOutboundByInternetMessageId = async (internetMessageId: string) => {
  const convex = getConvexHttpClient();
  for (const candidate of normalizeMessageIdCandidates(internetMessageId)) {
    const row = await convex.query(
      apiGenerated.outlookInbound.getOutboundByInternetMessageId,
      {
        internetMessageId: candidate,
      },
    );
    if (row) return row;
  }
  return null;
};

const resolveContactOwnerId = async (contactItemId: string) => {
  try {
    const payload = await fetchMondayItemColumns({ itemId: contactItemId });
    const peopleColumn =
      payload.columns.find((column) => column.type.toLowerCase() === "people") ??
      null;
    const ownerIds = parsePeopleColumnIds(peopleColumn?.value ?? null);
    return ownerIds[0] ?? null;
  } catch {
    return null;
  }
};

const recoverPendingOutboundCorrelation = async (args: {
  mondayAccountId: string;
  mondayUserId: string;
  fromEmail: string;
  subject: string;
  receivedAtMs: number;
  inReplyTo: string | null;
  conversationId: string | null;
}) => {
  const convex = getConvexHttpClient();
  const lookbackMs = 90 * 24 * 60 * 60 * 1000;
  const sentAtMin = Math.max(args.receivedAtMs - lookbackMs, 0);
  const candidates = await convex.query(
    apiGenerated.outlookInbound.listRecentOutboundByRecipient,
    {
      mondayAccountId: args.mondayAccountId,
      mondayUserId: args.mondayUserId,
      recipientEmail: args.fromEmail,
      sentAtMin,
      limit: 50,
    },
  );

  const inThreadSubject = normalizeThreadSubject(args.subject);
  const sentBeforeReply = candidates.filter(
    (candidate) =>
      !!candidate.contactItemId && candidate.sentAt <= args.receivedAtMs + 5 * 60 * 1000,
  );
  const sameThreadSubject = inThreadSubject
    ? sentBeforeReply.filter(
        (candidate) => normalizeThreadSubject(candidate.subject) === inThreadSubject,
      )
    : [];
  const pool = sameThreadSubject.length > 0 ? sameThreadSubject : sentBeforeReply;
  if (pool.length === 0) return null;

  const uniqueContactIds = Array.from(
    new Set(
      pool
        .map((candidate) => candidate.contactItemId?.trim() ?? "")
        .filter((contactItemId) => contactItemId.length > 0),
    ),
  );
  if (uniqueContactIds.length !== 1) return null;

  const selected = pool[0];
  if (
    selected.status === "pending_lookup" ||
    (args.conversationId && !selected.conversationId) ||
    (args.inReplyTo && !selected.internetMessageId)
  ) {
    await convex.mutation(apiGenerated.outlookInbound.identifyOutboundMessage, {
      outboundMessageId: selected._id,
      internetMessageId: args.inReplyTo ?? undefined,
      conversationId: args.conversationId ?? undefined,
    });
  }

  if (!selected.contactItemId) return null;
  return {
    contactItemId: selected.contactItemId,
    contactName: null,
    matchedContactEmail: selected.recipientEmail ?? args.fromEmail,
    method: "senderEmail",
    confidence: "medium",
    outboundMessageId: selected._id,
    ownerMondayUserId: selected.mondayUserId ?? null,
  } satisfies CorrelationResult;
};

const correlateInboundMessage = async (args: {
  mondayAccountId: string;
  mondayUserId: string;
  fromEmail: string | null;
  subject: string;
  receivedAtMs: number;
  inReplyTo: string | null;
  referencesHeader: string | null;
  conversationId: string | null;
}) => {
  const fromEmail = normalizeEmail(args.fromEmail);
  const references = extractReplyReferences(args.referencesHeader);

  for (const messageId of [
    ...(args.inReplyTo ? [args.inReplyTo] : []),
    ...references,
  ]) {
    const outbound = await lookupOutboundByInternetMessageId(messageId);
    if (!outbound) continue;
    if (!outbound.contactItemId) continue;
    return {
      contactItemId: outbound.contactItemId,
      contactName: null,
      matchedContactEmail: outbound.recipientEmail ?? null,
      method: "inReplyTo",
      confidence: "high",
      outboundMessageId: outbound._id,
      ownerMondayUserId: outbound.mondayUserId ?? null,
    } satisfies CorrelationResult;
  }

  if (args.conversationId) {
    const convex = getConvexHttpClient();
    const candidates = await convex.query(
      apiGenerated.outlookInbound.listOutboundByConversationId,
      {
        conversationId: args.conversationId,
        limit: 25,
      },
    );
    const preferred =
      candidates.find(
        (candidate) =>
          fromEmail &&
          candidate.recipientEmail &&
          candidate.recipientEmail === fromEmail &&
          candidate.contactItemId,
      ) ??
      candidates.find((candidate) => !!candidate.contactItemId) ??
      null;

    if (preferred?.contactItemId) {
      return {
        contactItemId: preferred.contactItemId,
        contactName: null,
        matchedContactEmail: preferred.recipientEmail ?? null,
        method: "conversationId",
        confidence: "high",
        outboundMessageId: preferred._id,
        ownerMondayUserId: preferred.mondayUserId ?? null,
      } satisfies CorrelationResult;
    }
  }

  if (fromEmail) {
    const recovered = await recoverPendingOutboundCorrelation({
      mondayAccountId: args.mondayAccountId,
      mondayUserId: args.mondayUserId,
      fromEmail,
      subject: args.subject,
      receivedAtMs: args.receivedAtMs,
      inReplyTo: args.inReplyTo,
      conversationId: args.conversationId,
    });
    if (recovered) return recovered;
  }

  if (
    fromEmail &&
    env.OUTLOOK_INBOUND_SENDER_FALLBACK_ENABLED === "true"
  ) {
    const contacts = await findMondayContactsByEmail(fromEmail, 3);
    if (contacts.length === 1) {
      const contact = contacts[0];
      return {
        contactItemId: contact?.id ?? null,
        contactName: contact?.name ?? null,
        matchedContactEmail: contact?.email ?? fromEmail,
        method: "senderEmail",
        confidence: "medium",
        ownerMondayUserId: null,
      } satisfies CorrelationResult;
    }
  }

  return {
    contactItemId: null,
    contactName: null,
    matchedContactEmail: fromEmail,
    method: "none",
    confidence: null,
    ownerMondayUserId: null,
  } satisfies CorrelationResult;
};

const processNotification = async (notification: GraphNotification, request: Request) => {
  const subscriptionId = notification.subscriptionId?.trim();
  if (!subscriptionId) {
    return { ok: true, ignored: true, reason: "missing_subscription_id" };
  }

  const convex = getConvexHttpClient();
  const subscription = await convex.query(
    apiGenerated.outlookInbound.getGraphSubscriptionBySubscriptionId,
    { subscriptionId },
  );
  if (!subscription) {
    return { ok: true, ignored: true, reason: "unknown_subscription" };
  }

  if (notification.clientState?.trim() !== subscription.clientState) {
    await convex.mutation(apiGenerated.outlookInbound.markGraphSubscriptionStatus, {
      subscriptionId,
      status: "error",
      lastError: "Client state mismatch for webhook notification",
    });
    return { ok: false, ignored: true, reason: "client_state_mismatch" };
  }

  const lifecycleEvent = notification.lifecycleEvent?.trim();
  if (lifecycleEvent) {
    await convex.mutation(apiGenerated.outlookInbound.markGraphSubscriptionStatus, {
      subscriptionId,
      status:
        lifecycleEvent === "subscriptionRemoved" ? "deleted" : "error",
      lastError: `Lifecycle event: ${lifecycleEvent}`,
    });
    return { ok: true, ignored: true, reason: `lifecycle_${lifecycleEvent}` };
  }

  if ((notification.changeType ?? "").trim().toLowerCase() !== "created") {
    return { ok: true, ignored: true, reason: "non_created_change_type" };
  }

  const connection = await getOutlookConnection({
    mondayAccountId: subscription.mondayAccountId,
    mondayUserId: subscription.mondayUserId,
    mondayAppClientId: subscription.mondayAppClientId ?? undefined,
  });
  if (!connection) {
    await convex.mutation(apiGenerated.outlookInbound.markGraphSubscriptionStatus, {
      subscriptionId,
      status: "error",
      lastError: "No Outlook connection found for subscription identity",
    });
    return { ok: false, ignored: true, reason: "missing_connection" };
  }

  const messageId = extractMessageId(notification);
  if (!messageId) {
    return { ok: true, ignored: true, reason: "missing_message_id" };
  }

  const refreshed = await refreshOutlookAccessToken({
    connection,
    requestOrigin: getRequestOrigin(request),
  });
  const message = await fetchGraphMessageById({
    accessToken: refreshed.accessToken,
    messageId,
  });

  const dedupeKey = message.internetMessageId
    ? `internet:${message.internetMessageId}`
    : `graph:${message.id}`;
  const receipt = await convex.mutation(
    apiGenerated.outlookInbound.recordInboundMessageReceipt,
    {
      dedupeKey,
      internetMessageId: message.internetMessageId ?? undefined,
      graphMessageId: message.id,
      conversationId: message.conversationId ?? undefined,
      inReplyTo: message.inReplyTo ?? undefined,
      fromEmail: message.fromEmail ?? "",
      subject: message.subject,
      receivedAt: message.receivedDateTime
        ? Date.parse(message.receivedDateTime)
        : Date.now(),
      rawBodyPreview: message.bodyPreview || undefined,
    },
  );
  if (receipt.alreadyMirrored) {
    return { ok: true, ignored: true, reason: "already_mirrored" };
  }

  const parsedBody = extractInboundReplyText({
    uniqueBodyContent: message.uniqueBodyContent,
    bodyContent: message.bodyContent,
    bodyPreview: message.bodyPreview,
  });

  const correlation = await correlateInboundMessage({
    mondayAccountId: subscription.mondayAccountId,
    mondayUserId: subscription.mondayUserId,
    fromEmail: message.fromEmail,
    subject: message.subject,
    receivedAtMs: message.receivedDateTime
      ? Date.parse(message.receivedDateTime)
      : Date.now(),
    inReplyTo: message.inReplyTo,
    referencesHeader: message.referencesHeader,
    conversationId: message.conversationId,
  });
  console.info("[outlook-webhook] correlation evaluated", {
    dedupeKey,
    subscriptionId,
    messageId: message.id,
    internetMessageId: message.internetMessageId,
    fromEmail: message.fromEmail,
    method: correlation.method,
    confidence: correlation.confidence,
    contactItemId: correlation.contactItemId,
  });

  await convex.mutation(apiGenerated.outlookInbound.markInboundMessageParsed, {
    inboundMessageId: receipt.inboundMessageId,
    parsedBody,
    correlationMethod: correlation.method,
    correlationConfidence: correlation.confidence,
    contactItemId: correlation.contactItemId ?? undefined,
    matchedContactEmail: correlation.matchedContactEmail ?? undefined,
    outboundMessageId: correlation.outboundMessageId,
    status: correlation.contactItemId ? "parsed" : "ignored",
  });

  if (!correlation.contactItemId) {
    await convex.mutation(apiGenerated.outlookInbound.markInboundMessageFailed, {
      inboundMessageId: receipt.inboundMessageId,
      status: "ignored",
      errorMessage: "No contact match for inbound reply",
    });
    return { ok: true, ignored: true, reason: "unmatched_contact" };
  }

  if (env.OUTLOOK_INBOUND_MIRROR_ENABLED !== "true") {
    return {
      ok: true,
      ignored: true,
      reason: "mirror_disabled",
      contactItemId: correlation.contactItemId,
    };
  }

  const bodyHeader = [
    `Inbound email reply from ${message.fromEmail ?? "unknown sender"}`,
    message.subject ? `Subject: ${message.subject}` : null,
    message.receivedDateTime ? `Received: ${message.receivedDateTime}` : null,
  ]
    .filter((line): line is string => !!line)
    .join("\n");
  const mondayBody = truncateForMonday(
    `${bodyHeader}\n\n${parsedBody || "[No reply body detected]"}`,
  );

  const createdUpdate = await createMondayRecordUpdate({
    itemId: correlation.contactItemId,
    body: mondayBody,
    updateType: "general",
    date: toDateOnly(message.receivedDateTime),
    methodOfCommunication: "Email",
    subitemNameOverride: "Inbound Email Reply",
  });

  let mirrorTouchId: string | null = null;
  const ownerMondayUserId =
    correlation.ownerMondayUserId ??
    (await resolveContactOwnerId(correlation.contactItemId));
  if (ownerMondayUserId) {
    const touch = await upsertMondayTouchRecord({
      contactItemId: correlation.contactItemId,
      contactName:
        correlation.contactName?.trim() || `Contact ${correlation.contactItemId}`,
      ownerId: ownerMondayUserId,
      source: "inbound_reply",
    });
    mirrorTouchId = touch.id ?? null;
  }

  await convex.mutation(apiGenerated.outlookInbound.markInboundMessageMirrored, {
    inboundMessageId: receipt.inboundMessageId,
    mirrorMondayUpdateId: createdUpdate.id,
    mirrorMondaySubitemId: createdUpdate.targetItemId,
    mirrorTouchId: mirrorTouchId ?? undefined,
  });

  return {
    ok: true,
    ignored: false,
    contactItemId: correlation.contactItemId,
    method: correlation.method,
    confidence: correlation.confidence,
  };
};

const maybeReturnValidationToken = (request: Request) => {
  const token = new URL(request.url).searchParams.get("validationToken");
  if (!token) return null;
  return toPlainText(token);
};

export const GET = async (request: Request) => {
  const validationResponse = maybeReturnValidationToken(request);
  if (validationResponse) return validationResponse;
  return toJson({ ok: true });
};

export const POST = async (request: Request) => {
  const validationResponse = maybeReturnValidationToken(request);
  if (validationResponse) return validationResponse;

  let body: GraphNotificationBody;
  try {
    body = (await request.json()) as GraphNotificationBody;
  } catch {
    return toJson({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const notifications = Array.isArray(body.value) ? body.value : [];
  if (notifications.length === 0) {
    return toJson({ ok: true, processed: 0, ignored: 0 }, 202);
  }

  const results = await Promise.all(
    notifications.map(async (notification) => {
      try {
        return await processNotification(notification, request);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown webhook failure";
        console.error("[outlook-webhook] notification failed", {
          subscriptionId: notification.subscriptionId ?? null,
          changeType: notification.changeType ?? null,
          messageId: extractMessageId(notification),
          error: message,
        });
        return { ok: false, ignored: false, error: message };
      }
    }),
  );

  const processed = results.filter((entry) => !entry.ignored).length;
  const ignored = results.filter((entry) => entry.ignored).length;
  const failed = results.filter((entry) => !entry.ok).length;

  return toJson(
    {
      ok: failed === 0,
      processed,
      ignored,
      failed,
      results,
    },
    202,
  );
};
