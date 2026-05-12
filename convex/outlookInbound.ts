import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

const optionalString = v.optional(v.string());
const nullableString = v.union(v.string(), v.null());
const nullableNumber = v.union(v.number(), v.null());

const normalizeAppClientId = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
};

const normalizeOptionalString = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
};

const normalizeRequiredString = (value: string) => value.trim();

const outboundStatusValidator = v.union(
  v.literal("pending_lookup"),
  v.literal("identified"),
);

const inboundStatusValidator = v.union(
  v.literal("received"),
  v.literal("parsed"),
  v.literal("mirrored"),
  v.literal("failed"),
  v.literal("ignored"),
);
type InboundStatus =
  | "received"
  | "parsed"
  | "mirrored"
  | "failed"
  | "ignored";

const subscriptionStatusValidator = v.union(
  v.literal("active"),
  v.literal("expired"),
  v.literal("deleted"),
  v.literal("error"),
);

const correlationMethodValidator = v.union(
  v.literal("inReplyTo"),
  v.literal("conversationId"),
  v.literal("senderEmail"),
  v.literal("none"),
  v.null(),
);

const correlationConfidenceValidator = v.union(
  v.literal("high"),
  v.literal("medium"),
  v.literal("low"),
  v.null(),
);

const outboundMessageValidator = v.object({
  _id: v.id("outlookOutboundMessages"),
  _creationTime: v.number(),
  mondayAccountId: v.string(),
  mondayUserId: v.string(),
  mondayAppClientId: nullableString,
  connectionEmail: nullableString,
  contactItemId: nullableString,
  recipientEmail: v.string(),
  subject: v.string(),
  sentAt: v.number(),
  graphMessageId: nullableString,
  internetMessageId: nullableString,
  conversationId: nullableString,
  correlationToken: nullableString,
  status: outboundStatusValidator,
  createdAt: v.number(),
  updatedAt: v.number(),
});

const inboundMessageValidator = v.object({
  _id: v.id("outlookInboundMessages"),
  _creationTime: v.number(),
  dedupeKey: v.string(),
  internetMessageId: nullableString,
  graphMessageId: v.string(),
  conversationId: nullableString,
  inReplyTo: nullableString,
  fromEmail: v.string(),
  subject: v.string(),
  receivedAt: v.number(),
  rawBodyPreview: nullableString,
  parsedBody: nullableString,
  correlationMethod: correlationMethodValidator,
  correlationConfidence: correlationConfidenceValidator,
  outboundMessageId: v.optional(v.id("outlookOutboundMessages")),
  contactItemId: nullableString,
  matchedContactEmail: nullableString,
  status: inboundStatusValidator,
  mirrorMondayUpdateId: nullableString,
  mirrorMondaySubitemId: nullableString,
  mirrorTouchId: nullableString,
  errorMessage: nullableString,
  createdAt: v.number(),
  updatedAt: v.number(),
});

const graphSubscriptionValidator = v.object({
  _id: v.id("outlookGraphSubscriptions"),
  _creationTime: v.number(),
  mondayAccountId: v.string(),
  mondayUserId: v.string(),
  mondayAppClientId: nullableString,
  connectionEmail: nullableString,
  subscriptionId: v.string(),
  clientState: v.string(),
  resource: v.string(),
  changeType: v.string(),
  notificationUrl: v.string(),
  expirationDateTime: v.string(),
  expirationTimestamp: v.number(),
  status: subscriptionStatusValidator,
  lastRenewedAt: nullableNumber,
  lastError: nullableString,
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const upsertOutboundMessage = mutation({
  args: {
    mondayAccountId: v.string(),
    mondayUserId: v.string(),
    mondayAppClientId: optionalString,
    connectionEmail: optionalString,
    contactItemId: optionalString,
    recipientEmail: v.string(),
    subject: v.string(),
    sentAt: v.number(),
    graphMessageId: optionalString,
    internetMessageId: optionalString,
    conversationId: optionalString,
    correlationToken: optionalString,
    status: v.optional(outboundStatusValidator),
  },
  returns: v.object({
    outboundMessageId: v.id("outlookOutboundMessages"),
    created: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const normalizedAppClientId = normalizeAppClientId(args.mondayAppClientId);
    const normalizedConnectionEmail = normalizeOptionalString(
      args.connectionEmail,
    )?.toLowerCase();
    const normalizedRecipient = normalizeRequiredString(args.recipientEmail)
      .toLowerCase();
    const normalizedSubject = normalizeRequiredString(args.subject);
    const normalizedInternetMessageId = normalizeOptionalString(
      args.internetMessageId,
    );
    const normalizedConversationId = normalizeOptionalString(args.conversationId);
    const normalizedGraphMessageId = normalizeOptionalString(args.graphMessageId);
    const normalizedCorrelationToken = normalizeOptionalString(
      args.correlationToken,
    );
    const now = Date.now();

    let existing: Doc<"outlookOutboundMessages"> | null = null;
    if (normalizedCorrelationToken) {
      existing = await ctx.db
        .query("outlookOutboundMessages")
        .withIndex("by_correlationToken", (q) =>
          q.eq("correlationToken", normalizedCorrelationToken),
        )
        .first();
    }

    if (!existing && normalizedInternetMessageId) {
      existing = await ctx.db
        .query("outlookOutboundMessages")
        .withIndex("by_internetMessageId", (q) =>
          q.eq("internetMessageId", normalizedInternetMessageId),
        )
        .first();
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        mondayAccountId: normalizeRequiredString(args.mondayAccountId),
        mondayUserId: normalizeRequiredString(args.mondayUserId),
        mondayAppClientId: normalizedAppClientId,
        connectionEmail: normalizedConnectionEmail ?? null,
        contactItemId: normalizeOptionalString(args.contactItemId) ?? null,
        recipientEmail: normalizedRecipient,
        subject: normalizedSubject,
        sentAt: args.sentAt,
        graphMessageId: normalizedGraphMessageId ?? existing.graphMessageId,
        internetMessageId:
          normalizedInternetMessageId ?? existing.internetMessageId,
        conversationId: normalizedConversationId ?? existing.conversationId,
        correlationToken:
          normalizedCorrelationToken ?? existing.correlationToken,
        status:
          args.status ??
          (normalizedInternetMessageId || normalizedConversationId
            ? "identified"
            : existing.status),
        updatedAt: now,
      });
      return { outboundMessageId: existing._id, created: false };
    }

    const outboundMessageId = await ctx.db.insert("outlookOutboundMessages", {
      mondayAccountId: normalizeRequiredString(args.mondayAccountId),
      mondayUserId: normalizeRequiredString(args.mondayUserId),
      mondayAppClientId: normalizedAppClientId,
      connectionEmail: normalizedConnectionEmail ?? null,
      contactItemId: normalizeOptionalString(args.contactItemId) ?? null,
      recipientEmail: normalizedRecipient,
      subject: normalizedSubject,
      sentAt: args.sentAt,
      graphMessageId: normalizedGraphMessageId ?? null,
      internetMessageId: normalizedInternetMessageId ?? null,
      conversationId: normalizedConversationId ?? null,
      correlationToken: normalizedCorrelationToken ?? null,
      status:
        args.status ??
        (normalizedInternetMessageId || normalizedConversationId
          ? "identified"
          : "pending_lookup"),
      createdAt: now,
      updatedAt: now,
    });
    return { outboundMessageId, created: true };
  },
});

export const getOutboundByInternetMessageId = query({
  args: {
    internetMessageId: v.string(),
  },
  returns: v.union(outboundMessageValidator, v.null()),
  handler: async (ctx, args) => {
    const normalized = normalizeRequiredString(args.internetMessageId);
    if (!normalized) return null;
    const row = await ctx.db
      .query("outlookOutboundMessages")
      .withIndex("by_internetMessageId", (q) =>
        q.eq("internetMessageId", normalized),
      )
      .first();
    return row ?? null;
  },
});

export const listOutboundByConversationId = query({
  args: {
    conversationId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(outboundMessageValidator),
  handler: async (ctx, args) => {
    const normalized = normalizeRequiredString(args.conversationId);
    if (!normalized) return [];
    const limit = Math.min(Math.max(Math.floor(args.limit ?? 20), 1), 100);
    return await ctx.db
      .query("outlookOutboundMessages")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", normalized),
      )
      .order("desc")
      .take(limit);
  },
});

export const listRecentOutboundByRecipient = query({
  args: {
    mondayAccountId: v.string(),
    mondayUserId: v.string(),
    recipientEmail: v.string(),
    sentAtMin: v.number(),
    limit: v.optional(v.number()),
  },
  returns: v.array(outboundMessageValidator),
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(Math.floor(args.limit ?? 30), 1), 100);
    const normalizedRecipient = normalizeRequiredString(args.recipientEmail)
      .toLowerCase();
    const rows = await ctx.db
      .query("outlookOutboundMessages")
      .withIndex("by_identity_and_sentAt", (q) =>
        q
          .eq("mondayAccountId", normalizeRequiredString(args.mondayAccountId))
          .eq("mondayUserId", normalizeRequiredString(args.mondayUserId))
          .gte("sentAt", args.sentAtMin),
      )
      .order("desc")
      .take(limit * 3);

    return rows
      .filter((row) => row.recipientEmail === normalizedRecipient)
      .slice(0, limit);
  },
});

export const identifyOutboundMessage = mutation({
  args: {
    outboundMessageId: v.id("outlookOutboundMessages"),
    internetMessageId: optionalString,
    conversationId: optionalString,
    graphMessageId: optionalString,
  },
  returns: v.object({ updated: v.boolean() }),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.outboundMessageId);
    if (!existing) return { updated: false };

    const internetMessageId =
      normalizeOptionalString(args.internetMessageId) ?? existing.internetMessageId;
    const conversationId =
      normalizeOptionalString(args.conversationId) ?? existing.conversationId;
    const graphMessageId =
      normalizeOptionalString(args.graphMessageId) ?? existing.graphMessageId;

    await ctx.db.patch(args.outboundMessageId, {
      internetMessageId,
      conversationId,
      graphMessageId,
      status:
        internetMessageId || conversationId
          ? "identified"
          : existing.status,
      updatedAt: Date.now(),
    });
    return { updated: true };
  },
});

export const recordInboundMessageReceipt = mutation({
  args: {
    dedupeKey: v.string(),
    internetMessageId: optionalString,
    graphMessageId: v.string(),
    conversationId: optionalString,
    inReplyTo: optionalString,
    fromEmail: v.string(),
    subject: v.string(),
    receivedAt: v.number(),
    rawBodyPreview: optionalString,
  },
  returns: v.object({
    inboundMessageId: v.id("outlookInboundMessages"),
    status: inboundStatusValidator,
    alreadyMirrored: v.boolean(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    inboundMessageId: Id<"outlookInboundMessages">;
    status: InboundStatus;
    alreadyMirrored: boolean;
  }> => {
    const dedupeKey = normalizeRequiredString(args.dedupeKey);
    const now = Date.now();
    const existing = await ctx.db
      .query("outlookInboundMessages")
      .withIndex("by_dedupeKey", (q) => q.eq("dedupeKey", dedupeKey))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        internetMessageId:
          normalizeOptionalString(args.internetMessageId) ??
          existing.internetMessageId,
        graphMessageId: normalizeRequiredString(args.graphMessageId),
        conversationId:
          normalizeOptionalString(args.conversationId) ??
          existing.conversationId,
        inReplyTo: normalizeOptionalString(args.inReplyTo) ?? existing.inReplyTo,
        fromEmail: normalizeRequiredString(args.fromEmail).toLowerCase(),
        subject: normalizeRequiredString(args.subject),
        receivedAt: args.receivedAt,
        rawBodyPreview:
          normalizeOptionalString(args.rawBodyPreview) ??
          existing.rawBodyPreview,
        updatedAt: now,
      });
      const status = existing.status as InboundStatus;
      return {
        inboundMessageId: existing._id,
        status,
        alreadyMirrored: status === "mirrored",
      };
    }

    const inboundMessageId = await ctx.db.insert("outlookInboundMessages", {
      dedupeKey,
      internetMessageId: normalizeOptionalString(args.internetMessageId) ?? null,
      graphMessageId: normalizeRequiredString(args.graphMessageId),
      conversationId: normalizeOptionalString(args.conversationId) ?? null,
      inReplyTo: normalizeOptionalString(args.inReplyTo) ?? null,
      fromEmail: normalizeRequiredString(args.fromEmail).toLowerCase(),
      subject: normalizeRequiredString(args.subject),
      receivedAt: args.receivedAt,
      rawBodyPreview: normalizeOptionalString(args.rawBodyPreview) ?? null,
      parsedBody: null,
      correlationMethod: null,
      correlationConfidence: null,
      contactItemId: null,
      matchedContactEmail: null,
      status: "received",
      mirrorMondayUpdateId: null,
      mirrorMondaySubitemId: null,
      mirrorTouchId: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    });
    return { inboundMessageId, status: "received" as const, alreadyMirrored: false };
  },
});

export const markInboundMessageParsed = mutation({
  args: {
    inboundMessageId: v.id("outlookInboundMessages"),
    parsedBody: v.string(),
    correlationMethod: correlationMethodValidator,
    correlationConfidence: correlationConfidenceValidator,
    contactItemId: optionalString,
    matchedContactEmail: optionalString,
    outboundMessageId: v.optional(v.id("outlookOutboundMessages")),
    status: v.optional(inboundStatusValidator),
  },
  returns: v.object({ updated: v.boolean() }),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.inboundMessageId);
    if (!existing) return { updated: false };
    await ctx.db.patch(args.inboundMessageId, {
      parsedBody: normalizeRequiredString(args.parsedBody),
      correlationMethod: args.correlationMethod,
      correlationConfidence: args.correlationConfidence,
      contactItemId: normalizeOptionalString(args.contactItemId) ?? null,
      matchedContactEmail:
        normalizeOptionalString(args.matchedContactEmail)?.toLowerCase() ?? null,
      outboundMessageId: args.outboundMessageId,
      status: args.status ?? "parsed",
      errorMessage: null,
      updatedAt: Date.now(),
    });
    return { updated: true };
  },
});

export const markInboundMessageMirrored = mutation({
  args: {
    inboundMessageId: v.id("outlookInboundMessages"),
    mirrorMondayUpdateId: v.string(),
    mirrorMondaySubitemId: optionalString,
    mirrorTouchId: optionalString,
  },
  returns: v.object({ updated: v.boolean() }),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.inboundMessageId);
    if (!existing) return { updated: false };
    await ctx.db.patch(args.inboundMessageId, {
      status: "mirrored",
      mirrorMondayUpdateId: normalizeRequiredString(args.mirrorMondayUpdateId),
      mirrorMondaySubitemId:
        normalizeOptionalString(args.mirrorMondaySubitemId) ?? null,
      mirrorTouchId: normalizeOptionalString(args.mirrorTouchId) ?? null,
      errorMessage: null,
      updatedAt: Date.now(),
    });
    return { updated: true };
  },
});

export const markInboundMessageFailed = mutation({
  args: {
    inboundMessageId: v.id("outlookInboundMessages"),
    errorMessage: v.string(),
    status: v.optional(v.union(v.literal("failed"), v.literal("ignored"))),
  },
  returns: v.object({ updated: v.boolean() }),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.inboundMessageId);
    if (!existing) return { updated: false };
    await ctx.db.patch(args.inboundMessageId, {
      status: args.status ?? "failed",
      errorMessage: normalizeRequiredString(args.errorMessage),
      updatedAt: Date.now(),
    });
    return { updated: true };
  },
});

export const getInboundMessageByDedupeKey = query({
  args: { dedupeKey: v.string() },
  returns: v.union(inboundMessageValidator, v.null()),
  handler: async (ctx, args) => {
    const normalized = normalizeRequiredString(args.dedupeKey);
    if (!normalized) return null;
    return (
      (await ctx.db
        .query("outlookInboundMessages")
        .withIndex("by_dedupeKey", (q) => q.eq("dedupeKey", normalized))
        .first()) ?? null
    );
  },
});

export const upsertGraphSubscription = mutation({
  args: {
    mondayAccountId: v.string(),
    mondayUserId: v.string(),
    mondayAppClientId: optionalString,
    connectionEmail: optionalString,
    subscriptionId: v.string(),
    clientState: v.string(),
    resource: v.string(),
    changeType: v.string(),
    notificationUrl: v.string(),
    expirationDateTime: v.string(),
    expirationTimestamp: v.number(),
    status: v.optional(subscriptionStatusValidator),
    lastError: optionalString,
  },
  returns: v.object({
    graphSubscriptionId: v.id("outlookGraphSubscriptions"),
    created: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const subscriptionId = normalizeRequiredString(args.subscriptionId);
    const existing = await ctx.db
      .query("outlookGraphSubscriptions")
      .withIndex("by_subscriptionId", (q) =>
        q.eq("subscriptionId", subscriptionId),
      )
      .first();

    const patch = {
      mondayAccountId: normalizeRequiredString(args.mondayAccountId),
      mondayUserId: normalizeRequiredString(args.mondayUserId),
      mondayAppClientId: normalizeAppClientId(args.mondayAppClientId),
      connectionEmail:
        normalizeOptionalString(args.connectionEmail)?.toLowerCase() ?? null,
      subscriptionId,
      clientState: normalizeRequiredString(args.clientState),
      resource: normalizeRequiredString(args.resource),
      changeType: normalizeRequiredString(args.changeType),
      notificationUrl: normalizeRequiredString(args.notificationUrl),
      expirationDateTime: normalizeRequiredString(args.expirationDateTime),
      expirationTimestamp: args.expirationTimestamp,
      status: args.status ?? "active",
      lastRenewedAt: now,
      lastError: normalizeOptionalString(args.lastError) ?? null,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return { graphSubscriptionId: existing._id, created: false };
    }

    const graphSubscriptionId = await ctx.db.insert("outlookGraphSubscriptions", {
      ...patch,
      createdAt: now,
    });
    return { graphSubscriptionId, created: true };
  },
});

export const getGraphSubscriptionBySubscriptionId = query({
  args: {
    subscriptionId: v.string(),
  },
  returns: v.union(graphSubscriptionValidator, v.null()),
  handler: async (ctx, args) => {
    const normalized = normalizeRequiredString(args.subscriptionId);
    if (!normalized) return null;
    return (
      (await ctx.db
        .query("outlookGraphSubscriptions")
        .withIndex("by_subscriptionId", (q) =>
          q.eq("subscriptionId", normalized),
        )
        .first()) ?? null
    );
  },
});

export const listGraphSubscriptionsByIdentity = query({
  args: {
    mondayAccountId: v.string(),
    mondayUserId: v.string(),
    mondayAppClientId: optionalString,
  },
  returns: v.array(graphSubscriptionValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("outlookGraphSubscriptions")
      .withIndex("by_monday_identity", (q) =>
        q
          .eq("mondayAccountId", normalizeRequiredString(args.mondayAccountId))
          .eq("mondayUserId", normalizeRequiredString(args.mondayUserId))
          .eq("mondayAppClientId", normalizeAppClientId(args.mondayAppClientId)),
      )
      .collect();
  },
});

export const listExpiringGraphSubscriptions = query({
  args: {
    expiresBefore: v.number(),
    limit: v.optional(v.number()),
  },
  returns: v.array(graphSubscriptionValidator),
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(Math.floor(args.limit ?? 200), 1), 1000);
    return await ctx.db
      .query("outlookGraphSubscriptions")
      .withIndex("by_status_and_expirationTimestamp", (q) =>
        q.eq("status", "active").lte("expirationTimestamp", args.expiresBefore),
      )
      .take(limit);
  },
});

export const markGraphSubscriptionStatus = mutation({
  args: {
    subscriptionId: v.string(),
    status: subscriptionStatusValidator,
    lastError: optionalString,
    expirationDateTime: optionalString,
    expirationTimestamp: v.optional(v.number()),
  },
  returns: v.object({ updated: v.boolean() }),
  handler: async (ctx, args) => {
    const subscriptionId = normalizeRequiredString(args.subscriptionId);
    const existing = await ctx.db
      .query("outlookGraphSubscriptions")
      .withIndex("by_subscriptionId", (q) =>
        q.eq("subscriptionId", subscriptionId),
      )
      .first();
    if (!existing) return { updated: false };

    await ctx.db.patch(existing._id, {
      status: args.status,
      lastError: normalizeOptionalString(args.lastError) ?? null,
      expirationDateTime:
        normalizeOptionalString(args.expirationDateTime) ??
        existing.expirationDateTime,
      expirationTimestamp: args.expirationTimestamp ?? existing.expirationTimestamp,
      lastRenewedAt:
        args.status === "active" && args.expirationTimestamp
          ? Date.now()
          : existing.lastRenewedAt,
      updatedAt: Date.now(),
    });
    return { updated: true };
  },
});

export const removeGraphSubscriptionsByIdentity = mutation({
  args: {
    mondayAccountId: v.string(),
    mondayUserId: v.string(),
    mondayAppClientId: optionalString,
  },
  returns: v.object({ updatedCount: v.number() }),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("outlookGraphSubscriptions")
      .withIndex("by_monday_identity", (q) =>
        q
          .eq("mondayAccountId", normalizeRequiredString(args.mondayAccountId))
          .eq("mondayUserId", normalizeRequiredString(args.mondayUserId))
          .eq("mondayAppClientId", normalizeAppClientId(args.mondayAppClientId)),
      )
      .collect();

    let updatedCount = 0;
    const now = Date.now();
    for (const row of rows) {
      await ctx.db.patch(row._id, {
        status: "deleted",
        updatedAt: now,
      });
      updatedCount += 1;
    }
    return { updatedCount };
  },
});
