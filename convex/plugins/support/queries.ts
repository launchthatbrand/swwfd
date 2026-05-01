import { v } from "convex/values";

import { components } from "../../_generated/api";
import { query } from "../../_generated/server";

const supportQueries = (components as any).launchthat_support.queries;

export const listMessages = query({
  args: {
    organizationId: v.string(),
    threadId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const events = (await ctx.runQuery(supportQueries.listConversationEvents, args)) as
      | Array<Record<string, unknown>>
      | null;
    return (events ?? [])
      .filter((event) => event.eventType === "message")
      .map((event) => {
        const payload = (() => {
          if (event.payload && typeof event.payload === "object") {
            return event.payload as Record<string, unknown>;
          }
          if (typeof event.payload === "string") {
            try {
              const parsed = JSON.parse(event.payload) as unknown;
              if (parsed && typeof parsed === "object") {
                return parsed as Record<string, unknown>;
              }
            } catch {
              return {};
            }
          }
          return {};
        })();

        const role = payload.role === "assistant" ? "assistant" : "user";
        const messageType =
          payload.messageType === "chat" ||
          payload.messageType === "email_inbound" ||
          payload.messageType === "email_outbound"
            ? payload.messageType
            : "chat";

        return {
          _id: String(event._id ?? ""),
          role,
          content: typeof payload.content === "string" ? payload.content : "",
          createdAt:
            typeof event.createdAt === "number" ? event.createdAt : Date.now(),
          messageType,
          agentName:
            typeof payload.agentName === "string" ? payload.agentName : undefined,
        };
      });
  },
});

export const getAgentPresence = query({
  args: {
    organizationId: v.string(),
    threadId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.runQuery(supportQueries.getAgentPresence, args);
  },
});

export const getConversationMode = query({
  args: {
    organizationId: v.string(),
    threadId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.runQuery(supportQueries.getConversationMode, args);
  },
});
