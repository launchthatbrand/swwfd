import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

const messageValidator = v.object({
  id: v.string(),
  conversationId: v.string(),
  updateType: v.union(
    v.literal("general"),
    v.literal("welcome_email"),
    v.literal("followup"),
    v.literal("questionnaire"),
    v.literal("resume"),
    v.literal("resume_referral"),
    v.literal("job_referral"),
    v.literal("merge"),
  ),
  role: v.union(v.literal("user"), v.literal("assistant")),
  source: v.union(v.literal("admin"), v.literal("visitor"), v.literal("system")),
  channel: v.union(v.literal("chat"), v.literal("email"), v.literal("sms")),
  messageType: v.union(
    v.literal("chat"),
    v.literal("email_inbound"),
    v.literal("email_outbound"),
    v.literal("sms_inbound"),
    v.literal("sms_outbound"),
  ),
  body: v.string(),
  senderName: v.union(v.string(), v.null()),
  senderEmail: v.union(v.string(), v.null()),
  createdAt: v.number(),
});

const trimMessage = (value: string) => value.trim();

export const listMessages = query({
  args: {
    conversationId: v.id("mondaySupportConversations"),
  },
  returns: v.array(messageValidator),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("mondaySupportMessages")
      .withIndex("by_conversation_and_createdAt", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    return rows.map((row) => ({
      id: row._id,
      conversationId: row.conversationId,
      updateType: row.updateType,
      role: row.role,
      source: row.source,
      channel: row.channel,
      messageType: row.messageType,
      body: row.body,
      senderName: row.senderName,
      senderEmail: row.senderEmail,
      createdAt: row.createdAt,
    }));
  },
});

export const sendMessage = mutation({
  args: {
    conversationId: v.id("mondaySupportConversations"),
    body: v.string(),
    updateType: v.optional(
      v.union(
        v.literal("general"),
        v.literal("welcome_email"),
        v.literal("followup"),
        v.literal("questionnaire"),
        v.literal("resume"),
        v.literal("resume_referral"),
        v.literal("job_referral"),
        v.literal("merge"),
      ),
    ),
    date: v.optional(v.string()),
    role: v.optional(v.union(v.literal("user"), v.literal("assistant"))),
    source: v.optional(v.union(v.literal("admin"), v.literal("visitor"), v.literal("system"))),
    channel: v.optional(v.union(v.literal("chat"), v.literal("email"), v.literal("sms"))),
    messageType: v.optional(
      v.union(
        v.literal("chat"),
        v.literal("email_inbound"),
        v.literal("email_outbound"),
        v.literal("sms_inbound"),
        v.literal("sms_outbound"),
      ),
    ),
    senderName: v.optional(v.string()),
    senderEmail: v.optional(v.string()),
    actorMondayUserId: v.optional(v.string()),
    actorName: v.optional(v.string()),
  },
  returns: v.object({
    messageId: v.id("mondaySupportMessages"),
  }),
  handler: async (ctx, args) => {
    const body = trimMessage(args.body);
    if (!body) throw new Error("Message body cannot be empty");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    const parsedDate =
      args.date && /^\d{4}-\d{2}-\d{2}$/.test(args.date.trim()) ? args.date.trim() : null;
    const now = parsedDate ? new Date(`${parsedDate}T12:00:00.000Z`).getTime() : Date.now();
    const role = args.role ?? "assistant";
    const source = args.source ?? "admin";
    const channel = args.channel ?? "chat";
    const messageType =
      args.messageType ??
      (channel === "chat"
        ? "chat"
        : channel === "email"
          ? "email_outbound"
          : "sms_outbound");

    const updateType = args.updateType ?? "general";

    const messageId = await ctx.db.insert("mondaySupportMessages", {
      conversationId: args.conversationId,
      updateType,
      role,
      source,
      channel,
      messageType,
      body,
      senderName: args.senderName ?? null,
      senderEmail: args.senderEmail ?? null,
      createdAt: now,
    });

    await ctx.db.patch(args.conversationId, {
      lastMessagePreview: body.slice(0, 280),
      lastMessageRole: role,
      lastMessageAt: now,
      unreadCount: role === "user" ? conversation.unreadCount + 1 : conversation.unreadCount,
      updatedAt: now,
    });

    await ctx.db.insert("mondaySupportEvents", {
      conversationId: args.conversationId,
      type: "message.sent",
      actorMondayUserId: args.actorMondayUserId ?? null,
      actorName: args.actorName ?? null,
      payload: JSON.stringify({ role, channel, messageType, updateType, date: parsedDate }),
      createdAt: now,
    });

    return { messageId };
  },
});

export const markRead = mutation({
  args: {
    conversationId: v.id("mondaySupportConversations"),
  },
  returns: v.object({ ok: v.literal(true) }),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    await ctx.db.patch(args.conversationId, {
      unreadCount: 0,
      updatedAt: Date.now(),
    });
    return { ok: true as const };
  },
});

export const deleteMessage = mutation({
  args: {
    messageId: v.id("mondaySupportMessages"),
    actorMondayUserId: v.optional(v.string()),
    actorName: v.optional(v.string()),
  },
  returns: v.object({ ok: v.literal(true) }),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return { ok: true as const };
    const conversationId = message.conversationId;
    await ctx.db.delete(args.messageId);

    await ctx.db.insert("mondaySupportEvents", {
      conversationId,
      type: "message.deleted",
      actorMondayUserId: args.actorMondayUserId ?? null,
      actorName: args.actorName ?? null,
      payload: JSON.stringify({ messageId: args.messageId }),
      createdAt: Date.now(),
    });

    return { ok: true as const };
  },
});

export const updateMessageDate = mutation({
  args: {
    messageId: v.id("mondaySupportMessages"),
    date: v.string(),
    actorMondayUserId: v.optional(v.string()),
    actorName: v.optional(v.string()),
  },
  returns: v.object({ ok: v.literal(true) }),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    const normalizedDate = args.date.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
      throw new Error("Date must be YYYY-MM-DD");
    }
    const createdAt = new Date(`${normalizedDate}T12:00:00.000Z`).getTime();
    await ctx.db.patch(args.messageId, { createdAt });
    await ctx.db.insert("mondaySupportEvents", {
      conversationId: message.conversationId,
      type: "message.date_updated",
      actorMondayUserId: args.actorMondayUserId ?? null,
      actorName: args.actorName ?? null,
      payload: JSON.stringify({ messageId: args.messageId, date: normalizedDate }),
      createdAt: Date.now(),
    });
    return { ok: true as const };
  },
});
