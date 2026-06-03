import { v } from "convex/values";

import { mutation } from "./_generated/server";

const workflowResultValidator = v.object({
  ok: v.literal(true),
});

export const setConversationStatus = mutation({
  args: {
    conversationId: v.id("mondaySupportConversations"),
    status: v.union(v.literal("open"), v.literal("snoozed"), v.literal("closed")),
    actorMondayUserId: v.optional(v.string()),
    actorName: v.optional(v.string()),
  },
  returns: workflowResultValidator,
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    const now = Date.now();
    await ctx.db.patch(args.conversationId, { status: args.status, updatedAt: now });
    await ctx.db.insert("mondaySupportEvents", {
      conversationId: args.conversationId,
      type: "workflow.status_changed",
      actorMondayUserId: args.actorMondayUserId ?? null,
      actorName: args.actorName ?? null,
      payload: JSON.stringify({ status: args.status }),
      createdAt: now,
    });
    return { ok: true as const };
  },
});

export const setConversationMode = mutation({
  args: {
    conversationId: v.id("mondaySupportConversations"),
    mode: v.union(v.literal("agent"), v.literal("manual")),
    actorMondayUserId: v.optional(v.string()),
    actorName: v.optional(v.string()),
  },
  returns: workflowResultValidator,
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    const now = Date.now();
    await ctx.db.patch(args.conversationId, { mode: args.mode, updatedAt: now });
    await ctx.db.insert("mondaySupportEvents", {
      conversationId: args.conversationId,
      type: "workflow.mode_changed",
      actorMondayUserId: args.actorMondayUserId ?? null,
      actorName: args.actorName ?? null,
      payload: JSON.stringify({ mode: args.mode }),
      createdAt: now,
    });
    return { ok: true as const };
  },
});

export const assignConversation = mutation({
  args: {
    conversationId: v.id("mondaySupportConversations"),
    assignedAgentId: v.string(),
    assignedAgentName: v.optional(v.string()),
    actorMondayUserId: v.optional(v.string()),
    actorName: v.optional(v.string()),
  },
  returns: workflowResultValidator,
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    const now = Date.now();
    await ctx.db.patch(args.conversationId, {
      assignedAgentId: args.assignedAgentId.trim(),
      assignedAgentName: args.assignedAgentName?.trim() || null,
      updatedAt: now,
    });
    await ctx.db.insert("mondaySupportEvents", {
      conversationId: args.conversationId,
      type: "workflow.assigned",
      actorMondayUserId: args.actorMondayUserId ?? null,
      actorName: args.actorName ?? null,
      payload: JSON.stringify({
        assignedAgentId: args.assignedAgentId,
        assignedAgentName: args.assignedAgentName ?? null,
      }),
      createdAt: now,
    });
    return { ok: true as const };
  },
});

export const unassignConversation = mutation({
  args: {
    conversationId: v.id("mondaySupportConversations"),
    actorMondayUserId: v.optional(v.string()),
    actorName: v.optional(v.string()),
  },
  returns: workflowResultValidator,
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    const now = Date.now();
    await ctx.db.patch(args.conversationId, {
      assignedAgentId: null,
      assignedAgentName: null,
      updatedAt: now,
    });
    await ctx.db.insert("mondaySupportEvents", {
      conversationId: args.conversationId,
      type: "workflow.unassigned",
      actorMondayUserId: args.actorMondayUserId ?? null,
      actorName: args.actorName ?? null,
      payload: null,
      createdAt: now,
    });
    return { ok: true as const };
  },
});

export const deleteConversation = mutation({
  args: {
    conversationId: v.id("mondaySupportConversations"),
  },
  returns: workflowResultValidator,
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return { ok: true as const };

    const messages = await ctx.db
      .query("mondaySupportMessages")
      .withIndex("by_conversation_and_createdAt", (q) => q.eq("conversationId", args.conversationId))
      .collect();
    const notes = await ctx.db
      .query("mondaySupportNotes")
      .withIndex("by_conversation_and_createdAt", (q) => q.eq("conversationId", args.conversationId))
      .collect();
    const events = await ctx.db
      .query("mondaySupportEvents")
      .withIndex("by_conversation_and_createdAt", (q) => q.eq("conversationId", args.conversationId))
      .collect();
    const presence = await ctx.db
      .query("mondaySupportPresence")
      .withIndex("by_conversation_and_lastSeenAt", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    await Promise.all([
      ...messages.map((row) => ctx.db.delete(row._id)),
      ...notes.map((row) => ctx.db.delete(row._id)),
      ...events.map((row) => ctx.db.delete(row._id)),
      ...presence.map((row) => ctx.db.delete(row._id)),
    ]);
    await ctx.db.delete(args.conversationId);

    return { ok: true as const };
  },
});
