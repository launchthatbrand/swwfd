import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

const conversationStatusValidator = v.union(
  v.literal("open"),
  v.literal("snoozed"),
  v.literal("closed"),
);

const conversationModeValidator = v.union(v.literal("agent"), v.literal("manual"));

const messageRoleValidator = v.union(v.literal("user"), v.literal("assistant"));

const conversationSummaryValidator = v.object({
  id: v.string(),
  sessionId: v.string(),
  contactItemId: v.union(v.string(), v.null()),
  contactName: v.string(),
  contactEmail: v.union(v.string(), v.null()),
  status: conversationStatusValidator,
  mode: conversationModeValidator,
  assignedAgentId: v.union(v.string(), v.null()),
  assignedAgentName: v.union(v.string(), v.null()),
  lastMessagePreview: v.union(v.string(), v.null()),
  lastMessageRole: v.union(messageRoleValidator, v.null()),
  lastMessageAt: v.union(v.number(), v.null()),
  unreadCount: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const normalizeText = (value: string | null | undefined) => value?.trim() ?? "";

export const listConversations = query({
  args: {
    accountId: v.string(),
    scope: v.optional(v.union(v.literal("all"), v.literal("mine"), v.literal("unassigned"))),
    search: v.optional(v.string()),
    userId: v.optional(v.string()),
  },
  returns: v.array(conversationSummaryValidator),
  handler: async (ctx, args) => {
    const accountId = normalizeText(args.accountId);
    if (!accountId) return [];

    const scope = args.scope ?? "all";
    const search = normalizeText(args.search).toLowerCase();
    const userId = normalizeText(args.userId);

    const rows = await ctx.db
      .query("mondaySupportConversations")
      .withIndex("by_account_and_updatedAt", (q) => q.eq("mondayAccountId", accountId))
      .collect();

    const filtered = rows
      .filter((row) => {
        if (scope === "mine" && (!userId || row.assignedAgentId !== userId)) return false;
        if (scope === "unassigned" && row.assignedAgentId) return false;
        if (!search) return true;
        const haystack = [
          row.contactName,
          row.contactEmail ?? "",
          row.lastMessagePreview ?? "",
          row.sessionId,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(search);
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);

    return filtered.map((row) => ({
      id: row._id,
      sessionId: row.sessionId,
      contactItemId: row.contactItemId,
      contactName: row.contactName,
      contactEmail: row.contactEmail,
      status: row.status,
      mode: row.mode,
      assignedAgentId: row.assignedAgentId,
      assignedAgentName: row.assignedAgentName,
      lastMessagePreview: row.lastMessagePreview,
      lastMessageRole: row.lastMessageRole,
      lastMessageAt: row.lastMessageAt,
      unreadCount: row.unreadCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  },
});

export const getConversationById = query({
  args: {
    conversationId: v.id("mondaySupportConversations"),
  },
  returns: v.union(conversationSummaryValidator, v.null()),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.conversationId);
    if (!row) return null;
    return {
      id: row._id,
      sessionId: row.sessionId,
      contactItemId: row.contactItemId,
      contactName: row.contactName,
      contactEmail: row.contactEmail,
      status: row.status,
      mode: row.mode,
      assignedAgentId: row.assignedAgentId,
      assignedAgentName: row.assignedAgentName,
      lastMessagePreview: row.lastMessagePreview,
      lastMessageRole: row.lastMessageRole,
      lastMessageAt: row.lastMessageAt,
      unreadCount: row.unreadCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  },
});

export const ensureConversationForContact = mutation({
  args: {
    accountId: v.string(),
    contactItemId: v.string(),
    contactName: v.string(),
    contactEmail: v.optional(v.string()),
  },
  returns: v.object({ conversationId: v.id("mondaySupportConversations") }),
  handler: async (ctx, args) => {
    const accountId = normalizeText(args.accountId);
    const contactItemId = normalizeText(args.contactItemId);
    if (!accountId) throw new Error("Missing Monday account id");
    if (!contactItemId) throw new Error("Missing contact item id");

    const existing = await ctx.db
      .query("mondaySupportConversations")
      .withIndex("by_account_and_contact", (q) =>
        q.eq("mondayAccountId", accountId).eq("contactItemId", contactItemId),
      )
      .first();

    if (existing) {
      if (
        existing.contactName !== args.contactName ||
        (existing.contactEmail ?? null) !== (args.contactEmail ?? null)
      ) {
        await ctx.db.patch(existing._id, {
          contactName: args.contactName,
          contactEmail: args.contactEmail ?? null,
          updatedAt: Date.now(),
        });
      }
      return { conversationId: existing._id };
    }

    const now = Date.now();
    const conversationId = await ctx.db.insert("mondaySupportConversations", {
      mondayAccountId: accountId,
      sessionId: `contact:${contactItemId}`,
      contactItemId,
      contactName: args.contactName,
      contactEmail: args.contactEmail ?? null,
      status: "open",
      mode: "agent",
      assignedAgentId: null,
      assignedAgentName: null,
      lastMessagePreview: null,
      lastMessageRole: null,
      lastMessageAt: null,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("mondaySupportEvents", {
      conversationId,
      type: "conversation.created",
      actorMondayUserId: null,
      actorName: null,
      payload: null,
      createdAt: now,
    });

    return { conversationId };
  },
});
