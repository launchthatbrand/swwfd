import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

const noteValidator = v.object({
  id: v.string(),
  conversationId: v.string(),
  authorMondayUserId: v.string(),
  authorName: v.union(v.string(), v.null()),
  body: v.string(),
  createdAt: v.number(),
});

export const listNotes = query({
  args: { conversationId: v.id("mondaySupportConversations") },
  returns: v.array(noteValidator),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("mondaySupportNotes")
      .withIndex("by_conversation_and_createdAt", (q) => q.eq("conversationId", args.conversationId))
      .collect();
    return rows.map((row) => ({
      id: row._id,
      conversationId: row.conversationId,
      authorMondayUserId: row.authorMondayUserId,
      authorName: row.authorName,
      body: row.body,
      createdAt: row.createdAt,
    }));
  },
});

export const addNote = mutation({
  args: {
    conversationId: v.id("mondaySupportConversations"),
    authorMondayUserId: v.string(),
    authorName: v.optional(v.string()),
    body: v.string(),
  },
  returns: v.object({ noteId: v.id("mondaySupportNotes") }),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    const body = args.body.trim();
    if (!body) throw new Error("Note cannot be empty");
    const now = Date.now();
    const noteId = await ctx.db.insert("mondaySupportNotes", {
      conversationId: args.conversationId,
      authorMondayUserId: args.authorMondayUserId,
      authorName: args.authorName ?? null,
      body,
      createdAt: now,
    });
    await ctx.db.insert("mondaySupportEvents", {
      conversationId: args.conversationId,
      type: "note.added",
      actorMondayUserId: args.authorMondayUserId,
      actorName: args.authorName ?? null,
      payload: JSON.stringify({ noteId }),
      createdAt: now,
    });
    return { noteId };
  },
});
