import { listMessages, syncStreams, vStreamArgs, vStreamMessagesReturnValue } from "@convex-dev/agent";

import { CostComponent } from "neutral-cost";
import { components } from "./_generated/api";
import { paginationOptsValidator } from "convex/server";
import { query } from "./server";
import { v } from "convex/values";

const costs = new CostComponent(components.neutralCost as any);

const extractMessageText = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const typedPart = part as Record<string, unknown>;
      return typedPart.type === "text" && typeof typedPart.text === "string"
        ? typedPart.text
        : "";
    })
    .filter(Boolean)
    .join("\n");
};

const pricingRowValidator = v.object({
  providerId: v.string(),
  providerName: v.string(),
  modelId: v.string(),
  modelName: v.string(),
  pricing: v.object({
    input: v.number(),
    output: v.number(),
    reasoning: v.optional(v.number()),
    cache_read: v.optional(v.number()),
    cache_write: v.optional(v.number()),
  }),
  limits: v.object({
    context: v.number(),
    output: v.number(),
  }),
  lastUpdated: v.number(),
});

const evalThreadEnvelopeValidator = v.object({
  appId: v.string(),
  organizationId: v.string(),
  featureDomain: v.string(),
  threadKey: v.string(),
});

const evalRoleValidator = v.union(
  v.literal("user"),
  v.literal("assistant"),
  v.literal("system"),
);

const langfuseScopeValidator = v.object({
  appId: v.string(),
  organizationId: v.string(),
  featureDomain: v.string(),
});

const linkAnalysisRunStatusValidator = v.union(
  v.literal("running"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("cancelled"),
);

const linkAnalysisUrlRowValidator = v.object({
  url: v.string(),
  sourceType: v.string(),
  status: v.union(
    v.literal("detected"),
    v.literal("processing"),
    v.literal("completed"),
    v.literal("failed"),
  ),
  error: v.optional(v.string()),
  updatedAt: v.number(),
});

export const getCreditBalance = query({
  args: {
    userId: v.string(),
    periodKey: v.string(),
  },
  returns: v.object({
    userId: v.string(),
    periodKey: v.string(),
    granted: v.number(),
    spent: v.number(),
    remaining: v.number(),
  }),
  handler: async (ctx: any, args: { userId: string; periodKey: string }) => {
    const row = await ctx.db
      .query("userAiCredits")
      .withIndex("by_user_and_period", (q: any) =>
        q.eq("userId", args.userId).eq("periodKey", args.periodKey),
      )
      .first();
    const granted = typeof row?.granted === "number" ? row.granted : 0;
    const spent = typeof row?.spent === "number" ? row.spent : 0;
    return {
      userId: args.userId,
      periodKey: args.periodKey,
      granted,
      spent,
      remaining: Math.max(0, granted - spent),
    };
  },
});

export const getConversationForUser = query({
  args: {
    userId: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      userId: v.string(),
      threadId: v.string(),
      lastMessageSnippet: v.optional(v.string()),
      lastMessageRole: v.optional(v.union(v.literal("user"), v.literal("assistant"))),
      totalMessages: v.number(),
      firstMessageAt: v.number(),
      lastMessageAt: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx: any, args: { userId: string }) => {
    const row = await ctx.db
      .query("aiChatConversations")
      .withIndex("by_user_lastMessageAt", (q: any) => q.eq("userId", args.userId))
      .order("desc")
      .first();
    if (!row) return null;
    return {
      userId: row.userId,
      threadId: row.threadId,
      lastMessageSnippet: row.lastMessageSnippet,
      lastMessageRole: row.lastMessageRole,
      totalMessages: row.totalMessages,
      firstMessageAt: row.firstMessageAt,
      lastMessageAt: row.lastMessageAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  },
});

export const listChatMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: v.optional(paginationOptsValidator),
    streamArgs: vStreamArgs,
  },
  returns: vStreamMessagesReturnValue,
  handler: async (
    ctx: any,
    args: {
      threadId: string;
      paginationOpts?: { cursor: string | null; numItems: number };
      streamArgs?: { kind: "list"; startOrder?: number } | { kind: "deltas"; cursors: { streamId: string; cursor: number }[] };
    },
  ) => {
    const paginationOpts = args.paginationOpts ?? { cursor: null, numItems: 50 };
    const paginated = await listMessages(ctx, components.agent as any, {
      threadId: args.threadId,
      paginationOpts,
      excludeToolMessages: false,
    });
    const streams = await syncStreams(ctx, components.agent as any, {
      threadId: args.threadId,
      streamArgs: args.streamArgs,
    });
    return { ...paginated, streams };
  },
});

export const getThread = query({
  args: {
    threadId: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      threadId: v.string(),
      userId: v.optional(v.string()),
      title: v.optional(v.string()),
      summary: v.optional(v.string()),
      status: v.union(v.literal("active"), v.literal("archived")),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx: any, args: { threadId: string }) => {
    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });
    if (!thread) {
      return null;
    }
    return {
      threadId: String(thread._id),
      userId: typeof thread.userId === "string" ? thread.userId : undefined,
      title: typeof thread.title === "string" ? thread.title : undefined,
      summary: typeof thread.summary === "string" ? thread.summary : undefined,
      status: thread.status,
      createdAt: Number(thread._creationTime ?? 0),
    };
  },
});

export const listThreadMessages = query({
  args: {
    threadId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.string(),
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx: any, args: { threadId: string; limit?: number }) => {
    const limit = Math.max(1, Math.min(Number(args.limit ?? 500), 1000));
    const page = await ctx.runQuery(components.agent.messages.listMessagesByThreadId, {
      threadId: args.threadId,
      order: "asc",
      paginationOpts: { cursor: null, numItems: limit },
      excludeToolMessages: true,
    });

    return (page?.page ?? []).flatMap((row: any) => {
      const role = row?.message?.role;
      if (role !== "user" && role !== "assistant") {
        return [];
      }
      const content = extractMessageText(row?.message?.content).trim();
      if (!content) {
        return [];
      }
      return [
        {
          _id: String(row?._id ?? ""),
          role,
          content,
          createdAt:
            typeof row?._creationTime === "number" ? row._creationTime : 0,
        },
      ];
    });
  },
});

export const listCreditLedger = query({
  args: {
    limit: v.optional(v.number()),
    userId: v.optional(v.string()),
    periodKey: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      _id: v.id("userAiCredits"),
      _creationTime: v.number(),
      userId: v.string(),
      periodKey: v.string(),
      granted: v.number(),
      spent: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (
    ctx: any,
    args: { limit?: number; userId?: string; periodKey?: string },
  ) => {
    const limit = Math.max(1, Math.min(Number(args.limit ?? 200), 500));
    const userId = typeof args.userId === "string" ? args.userId : "";
    const periodKey =
      typeof args.periodKey === "string" ? args.periodKey : "";

    let rows: any[] = [];
    if (userId && periodKey) {
      rows = await ctx.db
        .query("userAiCredits")
        .withIndex("by_user_and_period", (q: any) =>
          q.eq("userId", userId).eq("periodKey", periodKey),
        )
        .take(limit);
    } else if (userId) {
      rows = await ctx.db
        .query("userAiCredits")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .take(limit);
    } else if (periodKey) {
      rows = await ctx.db
        .query("userAiCredits")
        .withIndex("by_period", (q: any) => q.eq("periodKey", periodKey))
        .take(limit);
    } else {
      rows = await ctx.db.query("userAiCredits").take(limit);
    }

    return (Array.isArray(rows) ? rows : []).map((row: any) => ({
      _id: row._id,
      _creationTime: row._creationTime,
      userId: String(row.userId),
      periodKey: String(row.periodKey),
      granted: Number(row.granted ?? 0),
      spent: Number(row.spent ?? 0),
      updatedAt: Number(row.updatedAt ?? 0),
    }));
  },
});

export const listConversations = query({
  args: {
    limit: v.optional(v.number()),
    userId: v.optional(v.string()),
    threadId: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      _id: v.id("aiChatConversations"),
      _creationTime: v.number(),
      userId: v.string(),
      threadId: v.string(),
      lastMessageSnippet: v.optional(v.string()),
      lastMessageRole: v.optional(v.union(v.literal("user"), v.literal("assistant"))),
      totalMessages: v.number(),
      firstMessageAt: v.number(),
      lastMessageAt: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (
    ctx: any,
    args: { limit?: number; userId?: string; threadId?: string },
  ) => {
    const limit = Math.max(1, Math.min(Number(args.limit ?? 200), 500));
    const userId = typeof args.userId === "string" ? args.userId : "";
    const threadId = typeof args.threadId === "string" ? args.threadId : "";

    let rows: any[] = [];
    if (threadId) {
      rows = await ctx.db
        .query("aiChatConversations")
        .withIndex("by_thread", (q: any) => q.eq("threadId", threadId))
        .take(limit);
    } else if (userId) {
      rows = await ctx.db
        .query("aiChatConversations")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .take(limit);
    } else {
      rows = await ctx.db.query("aiChatConversations").take(limit);
    }

    const list = Array.isArray(rows) ? rows : [];
    return list.map((row: any) => ({
      _id: row._id,
      _creationTime: row._creationTime,
      userId: String(row.userId),
      threadId: String(row.threadId),
      lastMessageSnippet:
        typeof row.lastMessageSnippet === "string" ? row.lastMessageSnippet : undefined,
      lastMessageRole: row.lastMessageRole,
      totalMessages: Number(row.totalMessages ?? 0),
      firstMessageAt: Number(row.firstMessageAt ?? 0),
      lastMessageAt: Number(row.lastMessageAt ?? 0),
      createdAt: Number(row.createdAt ?? 0),
      updatedAt: Number(row.updatedAt ?? 0),
    }));
  },
});

export const getEvalThreadStats = query({
  args: {
    thread: evalThreadEnvelopeValidator,
  },
  returns: v.union(
    v.null(),
    v.object({
      threadDocId: v.string(),
      appId: v.string(),
      organizationId: v.string(),
      featureDomain: v.string(),
      source: v.string(),
      threadKey: v.string(),
      sessionId: v.optional(v.string()),
      firstMessageAt: v.number(),
      lastMessageAt: v.number(),
      messageCount: v.number(),
      maxSequence: v.optional(v.number()),
      uniqueMessageKeys: v.number(),
    }),
  ),
  handler: async (
    ctx: any,
    args: {
      thread: {
        appId: string;
        organizationId: string;
        featureDomain: string;
        threadKey: string;
      };
    },
  ) => {
    const threadDoc = await ctx.db
      .query("aiEvalThreads")
      .withIndex("by_app_org_domain_thread", (q: any) =>
        q
          .eq("appId", args.thread.appId)
          .eq("organizationId", args.thread.organizationId)
          .eq("featureDomain", args.thread.featureDomain)
          .eq("threadKey", args.thread.threadKey),
      )
      .unique();

    if (!threadDoc) {
      return null;
    }

    const messages = await ctx.db
      .query("aiEvalMessages")
      .withIndex("by_app_org_domain_thread_sequence", (q: any) =>
        q
          .eq("appId", args.thread.appId)
          .eq("organizationId", args.thread.organizationId)
          .eq("featureDomain", args.thread.featureDomain)
          .eq("threadKey", args.thread.threadKey),
      )
      .collect();

    let maxSequence: number | undefined;
    const messageKeys = new Set<string>();
    for (const row of messages as Array<{ sequence?: number; messageKey?: string }>) {
      if (typeof row.sequence === "number") {
        maxSequence =
          typeof maxSequence === "number"
            ? Math.max(maxSequence, row.sequence)
            : row.sequence;
      }
      if (typeof row.messageKey === "string") {
        messageKeys.add(row.messageKey);
      }
    }
    const uniqueMessageKeys = messageKeys.size;

    return {
      threadDocId: String(threadDoc._id),
      appId: threadDoc.appId,
      organizationId: threadDoc.organizationId,
      featureDomain: threadDoc.featureDomain,
      source: threadDoc.source,
      threadKey: threadDoc.threadKey,
      sessionId: threadDoc.sessionId,
      firstMessageAt: threadDoc.firstMessageAt,
      lastMessageAt: threadDoc.lastMessageAt,
      messageCount: threadDoc.messageCount,
      maxSequence,
      uniqueMessageKeys,
    };
  },
});

export const listEvalThreadsForScope = query({
  args: {
    appId: v.string(),
    organizationId: v.string(),
    featureDomain: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      threadDocId: v.string(),
      appId: v.string(),
      organizationId: v.string(),
      featureDomain: v.string(),
      source: v.string(),
      threadKey: v.string(),
      sessionId: v.optional(v.string()),
      firstMessageAt: v.number(),
      lastMessageAt: v.number(),
      messageCount: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (
    ctx: any,
    args: {
      appId: string;
      organizationId: string;
      featureDomain: string;
      limit?: number;
    },
  ) => {
    const limit = Math.max(1, Math.min(Number(args.limit ?? 200), 1000));
    const rows = await ctx.db
      .query("aiEvalThreads")
      .withIndex("by_app_org_domain_updatedAt", (q: any) =>
        q
          .eq("appId", args.appId)
          .eq("organizationId", args.organizationId)
          .eq("featureDomain", args.featureDomain),
      )
      .order("desc")
      .take(limit);
    return rows.map((row: any) => ({
      threadDocId: String(row._id),
      appId: row.appId,
      organizationId: row.organizationId,
      featureDomain: row.featureDomain,
      source: row.source,
      threadKey: row.threadKey,
      sessionId: row.sessionId,
      firstMessageAt: Number(row.firstMessageAt ?? 0),
      lastMessageAt: Number(row.lastMessageAt ?? 0),
      messageCount: Number(row.messageCount ?? 0),
      createdAt: Number(row.createdAt ?? 0),
      updatedAt: Number(row.updatedAt ?? 0),
    }));
  },
});

export const listEvalThreadMessages = query({
  args: {
    thread: evalThreadEnvelopeValidator,
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      messageDocId: v.string(),
      sequence: v.number(),
      messageKey: v.string(),
      role: evalRoleValidator,
      content: v.string(),
      createdAt: v.number(),
      mirroredAt: v.number(),
      modelProvider: v.optional(v.string()),
      modelId: v.optional(v.string()),
      inputTokens: v.optional(v.number()),
      outputTokens: v.optional(v.number()),
      totalTokens: v.optional(v.number()),
      costUsd: v.optional(v.number()),
      metadata: v.optional(v.any()),
    }),
  ),
  handler: async (
    ctx: any,
    args: {
      thread: {
        appId: string;
        organizationId: string;
        featureDomain: string;
        threadKey: string;
      };
      limit?: number;
    },
  ) => {
    const limit = Math.max(1, Math.min(Number(args.limit ?? 500), 5000));
    const rows = await ctx.db
      .query("aiEvalMessages")
      .withIndex("by_app_org_domain_thread_sequence", (q: any) =>
        q
          .eq("appId", args.thread.appId)
          .eq("organizationId", args.thread.organizationId)
          .eq("featureDomain", args.thread.featureDomain)
          .eq("threadKey", args.thread.threadKey),
      )
      .order("asc")
      .take(limit);

    return rows.map((row: any) => ({
      messageDocId: String(row._id),
      sequence: Number(row.sequence ?? 0),
      messageKey: String(row.messageKey ?? ""),
      role: row.role,
      content: String(row.content ?? ""),
      createdAt: Number(row.createdAt ?? 0),
      mirroredAt: Number(row.mirroredAt ?? 0),
      modelProvider:
        typeof row.modelProvider === "string" ? row.modelProvider : undefined,
      modelId: typeof row.modelId === "string" ? row.modelId : undefined,
      inputTokens:
        typeof row.inputTokens === "number" ? row.inputTokens : undefined,
      outputTokens:
        typeof row.outputTokens === "number" ? row.outputTokens : undefined,
      totalTokens:
        typeof row.totalTokens === "number" ? row.totalTokens : undefined,
      costUsd: typeof row.costUsd === "number" ? row.costUsd : undefined,
      metadata: row.metadata,
    }));
  },
});

export const getLangfuseConfig = query({
  args: {
    scope: langfuseScopeValidator,
  },
  returns: v.union(
    v.null(),
    v.object({
      host: v.string(),
      publicKey: v.string(),
      secretKey: v.string(),
      ingestionPath: v.optional(v.string()),
      enabled: v.boolean(),
    }),
  ),
  handler: async (
    ctx: any,
    args: {
      scope: {
        appId: string;
        organizationId: string;
        featureDomain: string;
      };
    },
  ) => {
    return (await ctx.runQuery(
      (components as any).langfuse.pipeline.queries.getConfigInternal,
      {
        scope: args.scope,
      },
    )) as
      | {
          host: string;
          publicKey: string;
          secretKey: string;
          ingestionPath?: string;
          enabled: boolean;
        }
      | null;
  },
});

export const getLangfusePipelineHealth = query({
  args: {
    scope: langfuseScopeValidator,
  },
  returns: v.object({
    pending: v.number(),
    processing: v.number(),
    failed: v.number(),
    sent: v.number(),
    total: v.number(),
    oldestPendingCreatedAt: v.optional(v.number()),
    lastDeliveredAt: v.optional(v.number()),
  }),
  handler: async (
    ctx: any,
    args: {
      scope: {
        appId: string;
        organizationId: string;
        featureDomain: string;
      };
    },
  ) => {
    return (await ctx.runQuery(
      (components as any).langfuse.pipeline.queries.getPipelineHealth,
      {
        scope: args.scope,
      },
    )) as {
      pending: number;
      processing: number;
      failed: number;
      sent: number;
      total: number;
      oldestPendingCreatedAt?: number;
      lastDeliveredAt?: number;
    };
  },
});

export const listLangfuseFailedOutbox = query({
  args: {
    scope: langfuseScopeValidator,
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      outboxId: v.string(),
      appId: v.string(),
      organizationId: v.string(),
      featureDomain: v.string(),
      threadKey: v.string(),
      sequence: v.number(),
      kind: v.union(v.literal("generation"), v.literal("score")),
      status: v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("sent"),
        v.literal("failed"),
      ),
      idempotencyKey: v.string(),
      attempts: v.number(),
      maxAttempts: v.number(),
      nextRetryAt: v.number(),
      lastError: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (
    ctx: any,
    args: {
      scope: {
        appId: string;
        organizationId: string;
        featureDomain: string;
      };
      limit?: number;
    },
  ) => {
    return (await ctx.runQuery(
      (components as any).langfuse.pipeline.queries.listFailedOutbox,
      {
        scope: args.scope,
        limit: args.limit,
      },
    )) as Array<{
      outboxId: string;
      appId: string;
      organizationId: string;
      featureDomain: string;
      threadKey: string;
      sequence: number;
      kind: "generation" | "score";
      status: "pending" | "processing" | "sent" | "failed";
      idempotencyKey: string;
      attempts: number;
      maxAttempts: number;
      nextRetryAt: number;
      lastError?: string;
      createdAt: number;
      updatedAt: number;
    }>;
  },
});

export const listAiLogs = query({
  args: {
    limit: v.optional(v.number()),
    userId: v.optional(v.string()),
    threadId: v.optional(v.string()),
    eventType: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      _id: v.id("aiLogs"),
      _creationTime: v.number(),
      userId: v.optional(v.string()),
      threadId: v.optional(v.string()),
      eventType: v.string(),
      level: v.string(),
      source: v.optional(v.string()),
      message: v.string(),
      metadata: v.optional(v.any()),
      createdAt: v.number(),
    }),
  ),
  handler: async (
    ctx: any,
    args: { limit?: number; userId?: string; threadId?: string; eventType?: string },
  ) => {
    const limit = Math.max(1, Math.min(Number(args.limit ?? 200), 500));
    const userId = typeof args.userId === "string" ? args.userId : "";
    const threadId = typeof args.threadId === "string" ? args.threadId : "";
    const eventType = typeof args.eventType === "string" ? args.eventType : "";

    let rows: any[] = [];
    if (userId) {
      rows = await ctx.db
        .query("aiLogs")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .order("desc")
        .take(limit);
    } else if (threadId) {
      rows = await ctx.db
        .query("aiLogs")
        .withIndex("by_thread", (q: any) => q.eq("threadId", threadId))
        .order("desc")
        .take(limit);
    } else if (eventType) {
      rows = await ctx.db
        .query("aiLogs")
        .withIndex("by_eventType", (q: any) => q.eq("eventType", eventType))
        .order("desc")
        .take(limit);
    } else {
      rows = await ctx.db
        .query("aiLogs")
        .withIndex("by_createdAt")
        .order("desc")
        .take(limit);
    }

    const list = Array.isArray(rows) ? rows : [];
    return list.map((row: any) => ({
      _id: row._id,
      _creationTime: row._creationTime,
      userId: typeof row.userId === "string" ? row.userId : undefined,
      threadId: typeof row.threadId === "string" ? row.threadId : undefined,
      eventType: String(row.eventType),
      level: String(row.level ?? "info"),
      source: typeof row.source === "string" ? row.source : undefined,
      message: String(row.message ?? ""),
      metadata: row.metadata,
      createdAt: Number(row.createdAt ?? 0),
    }));
  },
});

export const getCreditsSummary = query({
  args: {
    periodKey: v.string(),
    nearLimitRatio: v.optional(v.number()),
  },
  returns: v.object({
    periodKey: v.string(),
    totalGranted: v.number(),
    totalSpent: v.number(),
    totalRemaining: v.number(),
    usersTracked: v.number(),
    usersAtLimit: v.number(),
    usersNearLimit: v.number(),
  }),
  handler: async (
    ctx: any,
    args: { periodKey: string; nearLimitRatio?: number },
  ) => {
    const rows = await ctx.db
      .query("userAiCredits")
      .withIndex("by_period", (q: any) => q.eq("periodKey", args.periodKey))
      .collect();
    const nearRatio =
      typeof args.nearLimitRatio === "number"
        ? Math.max(0, Math.min(1, args.nearLimitRatio))
        : 0.1;

    let totalGranted = 0;
    let totalSpent = 0;
    let totalRemaining = 0;
    let usersAtLimit = 0;
    let usersNearLimit = 0;
    for (const row of rows) {
      const granted = typeof row.granted === "number" ? row.granted : 0;
      const spent = typeof row.spent === "number" ? row.spent : 0;
      const remaining = Math.max(0, granted - spent);
      totalGranted += granted;
      totalSpent += spent;
      totalRemaining += remaining;
      if (remaining <= 0) {
        usersAtLimit += 1;
      } else if (granted > 0 && remaining / granted <= nearRatio) {
        usersNearLimit += 1;
      }
    }

    return {
      periodKey: args.periodKey,
      totalGranted,
      totalSpent,
      totalRemaining,
      usersTracked: rows.length,
      usersAtLimit,
      usersNearLimit,
    };
  },
});

export const getCostsSummaryForUsers = query({
  args: {
    userIds: v.array(v.string()),
  },
  returns: v.object({
    totalCostUsd: v.number(),
    totalUserCostUsd: v.number(),
    usersCount: v.number(),
  }),
  handler: async (ctx: any, args: { userIds: string[] }) => {
    let totalCostUsd = 0;
    let totalUserCostUsd = 0;
    for (const userId of args.userIds) {
      const totals = await costs.getTotalAICostsByUser(ctx as any, userId);
      totalCostUsd += Number(totals?.totalAmount ?? 0);
      totalUserCostUsd += Number(totals?.totalUserAmount ?? 0);
    }

    return {
      totalCostUsd: Math.round(totalCostUsd * 1e8) / 1e8,
      totalUserCostUsd: Math.round(totalUserCostUsd * 1e8) / 1e8,
      usersCount: args.userIds.length,
    };
  },
});


export const getUserAiSummary = query({
  args: {
    userId: v.string(),
    periodKey: v.string(),
  },
  returns: v.object({
    userId: v.string(),
    periodKey: v.string(),
    granted: v.number(),
    spent: v.number(),
    remaining: v.number(),
    totalRequests: v.number(),
    totalCostUsd: v.number(),
    totalUserCostUsd: v.number(),
  }),
  handler: async (ctx: any, args: { userId: string; periodKey: string }) => {
    const balance = await ctx.db
      .query("userAiCredits")
      .withIndex("by_user_and_period", (q: any) =>
        q.eq("userId", args.userId).eq("periodKey", args.periodKey),
      )
      .first();

    const granted = typeof balance?.granted === "number" ? balance.granted : 0;
    const spent = typeof balance?.spent === "number" ? balance.spent : 0;

    const totals = await costs.getTotalAICostsByUser(ctx as any, args.userId);

    return {
      userId: args.userId,
      periodKey: args.periodKey,
      granted,
      spent,
      remaining: Math.max(0, granted - spent),
      totalRequests: Number(totals?.count ?? 0),
      totalCostUsd: Math.round(Number(totals?.totalAmount ?? 0) * 1e8) / 1e8,
      totalUserCostUsd:
        Math.round(Number(totals?.totalUserAmount ?? 0) * 1e8) / 1e8,
    };
  },
});

export const getAllAiPricing = query({
  args: {},
  returns: v.array(pricingRowValidator),
  handler: async (ctx: any) => {
    const rows = await costs.getAllPricing(ctx as any);
    return rows.map((row: any) => ({
      providerId: row.providerId,
      providerName: row.providerName,
      modelId: row.modelId,
      modelName: row.modelName,
      pricing: row.pricing,
      limits: row.limits,
      lastUpdated: row.lastUpdated,
    }));
  },
});

export const getAiSettings = query({
  args: { key: v.optional(v.string()) },
  returns: v.union(
    v.null(),
    v.object({
      key: v.string(),
      provider: v.string(),
      model: v.string(),
      embeddingModel: v.optional(v.string()),
      embeddingDimension: v.optional(v.number()),
      ragNamespace: v.optional(v.string()),
      systemPrompt: v.optional(v.string()),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx: any, args: { key?: string }) => {
    const settingsKey = args.key ?? "default";
    const row = await ctx.db
      .query("aiSettings")
      .withIndex("by_key", (q: any) => q.eq("key", settingsKey))
      .first();
    if (!row) return null;
    return {
      key: String(row.key),
      provider: String(row.provider),
      model: String(row.model),
      embeddingModel:
        typeof row.embeddingModel === "string" ? row.embeddingModel : undefined,
      embeddingDimension:
        typeof row.embeddingDimension === "number"
          ? row.embeddingDimension
          : undefined,
      ragNamespace:
        typeof row.ragNamespace === "string" ? row.ragNamespace : undefined,
      systemPrompt:
        typeof row.systemPrompt === "string" ? row.systemPrompt : undefined,
      updatedAt: Number(row.updatedAt ?? 0),
    };
  },
});

export const listRagNamespaces = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.string(),
      namespace: v.string(),
      modelId: v.string(),
      dimension: v.number(),
      status: v.string(),
    }),
  ),
  handler: async (ctx: any) => {
    const result = await ctx.runQuery(components.rag.namespaces.list, {
      paginationOpts: { cursor: null, numItems: 100 },
      status: "ready",
    });
    const page = Array.isArray(result?.page) ? result.page : [];
    return page
      .map((ns: any) => ({
        _id: String(ns.namespaceId ?? ns._id ?? ""),
        namespace: String(ns.namespace ?? ""),
        modelId: String(ns.modelId ?? ""),
        dimension: Number(ns.dimension ?? 0),
        status: String(ns.status ?? ns.status?.kind ?? "unknown"),
      }))
      .filter((ns: { _id: string }) => ns._id.length > 0);
  },
});

export const listRagEntries = query({
  args: {
    namespaceId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.string(),
      _creationTime: v.number(),
      key: v.optional(v.string()),
      title: v.optional(v.string()),
      importance: v.number(),
      status: v.string(),
    }),
  ),
  handler: async (ctx: any, args: { namespaceId: string; limit?: number }) => {
    const numItems = Math.max(1, Math.min(args.limit ?? 100, 500));
    const result = await ctx.runQuery(components.rag.entries.list, {
      namespaceId: args.namespaceId,
      status: "ready",
      paginationOpts: { cursor: null, numItems },
    });
    const page = Array.isArray(result?.page) ? result.page : [];
    return page.map((entry: any) => ({
      _id: String(entry.entryId ?? entry._id ?? ""),
      _creationTime: Number(entry._creationTime ?? entry.createdAt ?? 0),
      key: typeof entry.key === "string" ? entry.key : undefined,
      title: typeof entry.title === "string" ? entry.title : undefined,
      importance: Number(entry.importance ?? 1),
      status: String(entry.status ?? entry.status?.kind ?? "unknown"),
    }));
  },
});

export const getRagEntryChunks = query({
  args: {
    entryId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      order: v.number(),
      text: v.string(),
    }),
  ),
  handler: async (ctx: any, args: { entryId: string; limit?: number }) => {
    const numItems = Math.max(1, Math.min(args.limit ?? 40, 200));
    const result = await ctx.runQuery(components.rag.chunks.list, {
      entryId: args.entryId,
      order: "asc",
      paginationOpts: { cursor: null, numItems },
    });
    const page = Array.isArray(result?.page) ? result.page : [];
    return page.map((chunk: any) => ({
      order: Number(chunk.order ?? 0),
      text: String(chunk.text ?? ""),
    }));
  },
});

export const getLinkAnalysisRun = query({
  args: {
    runId: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      runId: v.string(),
      threadId: v.string(),
      userId: v.string(),
      status: linkAnalysisRunStatusValidator,
      sourceUrls: v.array(v.string()),
      urlRows: v.array(linkAnalysisUrlRowValidator),
      metadata: v.optional(v.any()),
      startedAt: v.number(),
      updatedAt: v.number(),
      completedAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx: any, args: { runId: string }) => {
    const row = await ctx.db
      .query("aiLinkAnalysisRuns")
      .withIndex("by_run_id", (q: any) => q.eq("runId", args.runId))
      .unique();
    if (!row) return null;
    return {
      runId: row.runId,
      threadId: row.threadId,
      userId: row.userId,
      status: row.status,
      sourceUrls: row.sourceUrls,
      urlRows: row.urlRows,
      metadata: row.metadata,
      startedAt: row.startedAt,
      updatedAt: row.updatedAt,
      completedAt: row.completedAt,
    };
  },
});

export const listLinkAnalysisRunsForThread = query({
  args: {
    threadId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      runId: v.string(),
      threadId: v.string(),
      userId: v.string(),
      status: linkAnalysisRunStatusValidator,
      sourceUrls: v.array(v.string()),
      urlRows: v.array(linkAnalysisUrlRowValidator),
      metadata: v.optional(v.any()),
      startedAt: v.number(),
      updatedAt: v.number(),
      completedAt: v.optional(v.number()),
    }),
  ),
  handler: async (
    ctx: any,
    args: {
      threadId: string;
      limit?: number;
    },
  ) => {
    const limit = Math.max(1, Math.min(Number(args.limit ?? 20), 100));
    const rows = await ctx.db
      .query("aiLinkAnalysisRuns")
      .withIndex("by_thread_and_updatedAt", (q: any) => q.eq("threadId", args.threadId))
      .order("desc")
      .take(limit);
    return rows.map((row: any) => ({
      runId: String(row.runId),
      threadId: String(row.threadId),
      userId: String(row.userId),
      status: row.status,
      sourceUrls: row.sourceUrls,
      urlRows: row.urlRows,
      metadata: row.metadata,
      startedAt: Number(row.startedAt ?? 0),
      updatedAt: Number(row.updatedAt ?? 0),
      completedAt: typeof row.completedAt === "number" ? row.completedAt : undefined,
    }));
  },
});
