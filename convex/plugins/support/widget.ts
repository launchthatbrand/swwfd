// @ts-nocheck
import { v } from "convex/values";

import { components } from "../../_generated/api";
import { mutation, query } from "../../_generated/server";

const supportWidgetQueries = components.launchthat_support.queries;
const supportWidgetMutations = components.launchthat_support.mutations;

export const bootstrap = query({
  args: {
    organizationId: v.string(),
    widgetKey: v.string(),
    requestOrigin: v.optional(v.string()),
    requestHost: v.optional(v.string()),
    threadId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    clientSessionId: v.optional(v.string()),
    contactId: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.runQuery(supportWidgetQueries.widgetBootstrap, args);
  },
});

export const getSettings = query({
  args: {
    organizationId: v.string(),
    widgetKey: v.string(),
    requestOrigin: v.optional(v.string()),
    requestHost: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.runQuery(supportWidgetQueries.widgetGetSettings, args);
  },
});

export const resolveThread = query({
  args: {
    organizationId: v.string(),
    widgetKey: v.string(),
    requestOrigin: v.optional(v.string()),
    requestHost: v.optional(v.string()),
    threadId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    clientSessionId: v.optional(v.string()),
    contactId: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
  },
  returns: v.union(v.null(), v.object({ threadId: v.string() })),
  handler: async (ctx, args) => {
    return await ctx.runQuery(supportWidgetQueries.widgetResolveThread, args);
  },
});

export const listMessages = query({
  args: {
    organizationId: v.string(),
    widgetKey: v.string(),
    requestOrigin: v.optional(v.string()),
    requestHost: v.optional(v.string()),
    threadId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.runQuery(supportWidgetQueries.widgetListMessages, args);
  },
});

export const listHelpdeskArticles = query({
  args: {
    organizationId: v.string(),
    widgetKey: v.string(),
    requestOrigin: v.optional(v.string()),
    requestHost: v.optional(v.string()),
    query: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.runQuery(supportWidgetQueries.widgetListHelpdeskArticles, args);
  },
});

export const listPresence = query({
  args: {
    organizationId: v.string(),
    widgetKey: v.string(),
    requestOrigin: v.optional(v.string()),
    requestHost: v.optional(v.string()),
    threadId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    onlineOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.runQuery(supportWidgetQueries.widgetPresenceList, args);
  },
});

export const createThread = mutation({
  args: {
    organizationId: v.string(),
    widgetKey: v.string(),
    requestOrigin: v.optional(v.string()),
    requestHost: v.optional(v.string()),
    threadId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    clientSessionId: v.optional(v.string()),
    contactId: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
  },
  returns: v.object({
    threadId: v.string(),
    sessionId: v.string(),
  }),
  handler: async (ctx, args) => {
    return await ctx.runMutation(supportWidgetMutations.widgetCreateThread, args);
  },
});

export const captureContact = mutation({
  args: {
    organizationId: v.string(),
    widgetKey: v.string(),
    requestOrigin: v.optional(v.string()),
    requestHost: v.optional(v.string()),
    threadId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    clientSessionId: v.optional(v.string()),
    contactId: v.optional(v.string()),
    fullName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.runMutation(supportWidgetMutations.widgetCaptureContact, args);
  },
});

export const sendMessage = mutation({
  args: {
    organizationId: v.string(),
    widgetKey: v.string(),
    requestOrigin: v.optional(v.string()),
    requestHost: v.optional(v.string()),
    threadId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    clientSessionId: v.optional(v.string()),
    prompt: v.string(),
    contactId: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
  },
  returns: v.object({
    threadId: v.string(),
    sessionId: v.string(),
    mode: v.union(v.literal("agent"), v.literal("manual")),
    autoRespondEnabled: v.boolean(),
    assistantText: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const content = args.prompt.trim();
    if (!content) {
      throw new Error("prompt is required");
    }

    const response = await ctx.runMutation(supportWidgetMutations.widgetSendMessage, {
      ...args,
      prompt: content,
      role: "user",
    });

    if (!response.requiresAgentReply) {
      return {
        threadId: response.threadId,
        sessionId: response.sessionId,
        mode: response.mode,
        autoRespondEnabled: response.autoRespondEnabled,
      };
    }

    const fallbackReply =
      "Thanks for reaching out. A support team member will reply shortly.";
    await ctx.runMutation(supportWidgetMutations.widgetSendMessage, {
      organizationId: args.organizationId,
      widgetKey: args.widgetKey,
      requestOrigin: args.requestOrigin,
      requestHost: args.requestHost,
      threadId: response.threadId,
      sessionId: response.sessionId,
      prompt: fallbackReply,
      role: "assistant",
      agentName: "Support",
      contactId: args.contactId,
      contactName: args.contactName,
      contactEmail: args.contactEmail,
    });

    return {
      threadId: response.threadId,
      sessionId: response.sessionId,
      mode: response.mode,
      autoRespondEnabled: response.autoRespondEnabled,
      assistantText: fallbackReply,
    };
  },
});

export const presenceHeartbeat = mutation({
  args: {
    organizationId: v.string(),
    widgetKey: v.string(),
    requestOrigin: v.optional(v.string()),
    requestHost: v.optional(v.string()),
    threadId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    userId: v.string(),
    sessionTokenId: v.string(),
    interval: v.optional(v.number()),
    data: v.optional(v.any()),
  },
  returns: v.object({
    roomToken: v.string(),
    sessionToken: v.string(),
  }),
  handler: async (ctx, args) => {
    return await ctx.runMutation(supportWidgetMutations.widgetPresenceHeartbeat, args);
  },
});

export const presenceDisconnect = mutation({
  args: {
    organizationId: v.string(),
    widgetKey: v.string(),
    requestOrigin: v.optional(v.string()),
    requestHost: v.optional(v.string()),
    sessionToken: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(supportWidgetMutations.widgetPresenceDisconnect, args);
    return null;
  },
});
