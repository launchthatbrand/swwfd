import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

const eventValidator = v.object({
  id: v.string(),
  conversationId: v.string(),
  type: v.string(),
  actorMondayUserId: v.union(v.string(), v.null()),
  actorName: v.union(v.string(), v.null()),
  payload: v.union(v.string(), v.null()),
  createdAt: v.number(),
});

export const listEvents = query({
  args: { conversationId: v.id("mondaySupportConversations") },
  returns: v.array(eventValidator),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("mondaySupportEvents")
      .withIndex("by_conversation_and_createdAt", (q) => q.eq("conversationId", args.conversationId))
      .collect();
    return rows
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((row) => ({
        id: row._id,
        conversationId: row.conversationId,
        type: row.type,
        actorMondayUserId: row.actorMondayUserId,
        actorName: row.actorName,
        payload: row.payload,
        createdAt: row.createdAt,
      }));
  },
});

export const appendEvent = mutation({
  args: {
    conversationId: v.id("mondaySupportConversations"),
    type: v.string(),
    actorMondayUserId: v.optional(v.string()),
    actorName: v.optional(v.string()),
    payload: v.optional(v.string()),
  },
  returns: v.object({ ok: v.literal(true) }),
  handler: async (ctx, args) => {
    await ctx.db.insert("mondaySupportEvents", {
      conversationId: args.conversationId,
      type: args.type.trim() || "event",
      actorMondayUserId: args.actorMondayUserId ?? null,
      actorName: args.actorName ?? null,
      payload: args.payload ?? null,
      createdAt: Date.now(),
    });
    return { ok: true as const };
  },
});
