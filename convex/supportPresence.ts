import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

const presenceValidator = v.object({
  id: v.string(),
  conversationId: v.string(),
  userId: v.string(),
  userName: v.union(v.string(), v.null()),
  userType: v.union(v.literal("agent"), v.literal("visitor")),
  status: v.union(v.literal("online"), v.literal("typing"), v.literal("idle")),
  lastSeenAt: v.number(),
});

export const listPresence = query({
  args: { conversationId: v.id("mondaySupportConversations") },
  returns: v.array(presenceValidator),
  handler: async (ctx, args) => {
    const now = Date.now();
    const cutoff = now - 90_000;
    const rows = await ctx.db
      .query("mondaySupportPresence")
      .withIndex("by_conversation_and_lastSeenAt", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    return rows
      .filter((row) => row.lastSeenAt >= cutoff)
      .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
      .map((row) => ({
        id: row._id,
        conversationId: row.conversationId,
        userId: row.userId,
        userName: row.userName,
        userType: row.userType,
        status: row.status,
        lastSeenAt: row.lastSeenAt,
      }));
  },
});

export const heartbeat = mutation({
  args: {
    conversationId: v.id("mondaySupportConversations"),
    userId: v.string(),
    userName: v.optional(v.string()),
    userType: v.union(v.literal("agent"), v.literal("visitor")),
    status: v.optional(v.union(v.literal("online"), v.literal("typing"), v.literal("idle"))),
  },
  returns: v.object({ ok: v.literal(true) }),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    const existing = await ctx.db
      .query("mondaySupportPresence")
      .withIndex("by_conversation_and_user", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", args.userId),
      )
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        userName: args.userName ?? null,
        userType: args.userType,
        status: args.status ?? "online",
        lastSeenAt: now,
      });
    } else {
      await ctx.db.insert("mondaySupportPresence", {
        conversationId: args.conversationId,
        userId: args.userId,
        userName: args.userName ?? null,
        userType: args.userType,
        status: args.status ?? "online",
        lastSeenAt: now,
      });
    }

    return { ok: true as const };
  },
});
