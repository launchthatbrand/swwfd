import { v } from "convex/values";

import { components } from "../../_generated/api";
import { mutation } from "../../_generated/server";

const supportMutations = (components as any).launchthat_support.mutations;

export const recordMessage = mutation({
  args: v.any(),
  returns: v.null(),
  handler: async (ctx, args) => {
    const payload =
      args && typeof args === "object" && !Array.isArray(args)
        ? (args as Record<string, unknown>)
        : {};
    const resolvedThreadId =
      (typeof payload.threadId === "string" && payload.threadId) ||
      (typeof payload.sessionId === "string" && payload.sessionId) ||
      "";
    if (!resolvedThreadId) throw new Error("threadId or sessionId is required");
    const role =
      payload.role === "assistant" || payload.role === "user"
        ? payload.role
        : "user";
    const content = typeof payload.content === "string" ? payload.content : "";

    await ctx.runMutation(supportMutations.recordMessageIndexUpdate, {
      organizationId: String(payload.organizationId ?? ""),
      sessionId:
        (typeof payload.sessionId === "string" && payload.sessionId) ||
        resolvedThreadId,
      threadId: resolvedThreadId,
      role,
      snippet: content.slice(0, 240),
      contactId:
        typeof payload.contactId === "string" ? payload.contactId : undefined,
      contactEmail:
        typeof payload.contactEmail === "string" ? payload.contactEmail : undefined,
      contactName:
        typeof payload.contactName === "string" ? payload.contactName : undefined,
    } as any);

    await ctx.runMutation(supportMutations.appendConversationEvent, {
      organizationId: String(payload.organizationId ?? ""),
      threadId:
        typeof payload.threadId === "string" ? payload.threadId : undefined,
      sessionId:
        typeof payload.sessionId === "string"
          ? payload.sessionId
          : resolvedThreadId,
      eventType: "message",
      payload: {
        role,
        content,
      },
    });

    return null;
  },
});
