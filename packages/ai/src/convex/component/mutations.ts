import { ConvexError, v } from "convex/values";
import { internalMutation, mutation } from "./server";

import { CostComponent } from "neutral-cost";
import { components } from "./_generated/api";

const costs = new CostComponent(components.neutralCost as any);
const componentsAny = components as any;

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
});

const evalThreadEnvelopeValidator = v.object({
  appId: v.string(),
  organizationId: v.string(),
  featureDomain: v.string(),
  source: v.string(),
  threadKey: v.string(),
  sessionId: v.optional(v.string()),
});

const evalRoleValidator = v.union(
  v.literal("user"),
  v.literal("assistant"),
  v.literal("system"),
);

const evalGenerationValidator = v.object({
  generationKey: v.optional(v.string()),
  provider: v.optional(v.string()),
  modelId: v.optional(v.string()),
  latencyMs: v.optional(v.number()),
  inputTokens: v.optional(v.number()),
  outputTokens: v.optional(v.number()),
  totalTokens: v.optional(v.number()),
  costUsd: v.optional(v.number()),
  metadata: v.optional(v.any()),
});

const langfuseScopeValidator = v.object({
  appId: v.string(),
  organizationId: v.string(),
  featureDomain: v.string(),
});

const langfuseConfigValidator = v.object({
  host: v.string(),
  publicKey: v.string(),
  secretKey: v.string(),
  ingestionPath: v.optional(v.string()),
  enabled: v.optional(v.boolean()),
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

const normalizeTokens = (value: number): number =>
  Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

const getLedgerRow = async (ctx: any, userId: string, periodKey: string) => {
  return await ctx.db
    .query("userAiCredits")
    .withIndex("by_user_and_period", (q: any) =>
      q.eq("userId", userId).eq("periodKey", periodKey),
    )
    .first();
};

const truncateSnippet = (content: string): string => {
  const trimmed = content.trim();
  if (!trimmed) return "";
  return trimmed.length > 240 ? trimmed.slice(0, 240) : trimmed;
};

const logAiEvent = async (
  ctx: any,
  args: {
    eventType: string;
    level?: string;
    source?: string;
    message: string;
    userId?: string;
    threadId?: string;
    metadata?: unknown;
  },
) => {
  await ctx.db.insert("aiLogs", {
    userId: args.userId,
    threadId: args.threadId,
    eventType: args.eventType,
    level: args.level ?? "info",
    source: args.source,
    message: args.message,
    metadata: args.metadata,
    createdAt: Date.now(),
  });
};

const getConversationForUser = async (ctx: any, userId: string) => {
  return await ctx.db
    .query("aiChatConversations")
    .withIndex("by_user_lastMessageAt", (q: any) => q.eq("userId", userId))
    .order("desc")
    .first();
};

const getConversationForThread = async (
  ctx: any,
  userId: string,
  threadId: string,
) => {
  return await ctx.db
    .query("aiChatConversations")
    .withIndex("by_user_and_thread", (q: any) =>
      q.eq("userId", userId).eq("threadId", threadId),
    )
    .first();
};

const updateConversationForMessage = async (
  ctx: any,
  args: {
    userId: string;
    threadId: string;
    role: "user" | "assistant";
    content: string;
    messageCount?: number;
  },
) => {
  const now = Date.now();
  const snippet = truncateSnippet(args.content);
  const existing = await getConversationForThread(
    ctx,
    args.userId,
    args.threadId,
  );
  const nextTotal = (existing?.totalMessages ?? 0) + (args.messageCount ?? 1);

  const payload = {
    userId: args.userId,
    threadId: args.threadId,
    lastMessageSnippet: snippet || undefined,
    lastMessageRole: args.role,
    totalMessages: nextTotal,
    firstMessageAt: existing?.firstMessageAt ?? now,
    lastMessageAt: now,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  if (existing) {
    await ctx.db.patch(existing._id, payload);
  } else {
    await ctx.db.insert("aiChatConversations", payload);
  }

  return { totalMessages: nextTotal };
};

const upsertConversationForThread = async (
  ctx: any,
  args: {
    userId: string;
    threadId: string;
    firstMessageAt: number;
    lastMessageAt: number;
    totalMessages: number;
    lastMessageRole?: "user" | "assistant";
    lastMessageSnippet?: string;
  },
) => {
  const existing = await getConversationForThread(ctx, args.userId, args.threadId);
  const payload = {
    userId: args.userId,
    threadId: args.threadId,
    lastMessageSnippet: args.lastMessageSnippet ?? existing?.lastMessageSnippet,
    lastMessageRole: args.lastMessageRole ?? existing?.lastMessageRole,
    totalMessages: args.totalMessages,
    firstMessageAt: existing?.firstMessageAt ?? args.firstMessageAt,
    lastMessageAt: Math.max(existing?.lastMessageAt ?? 0, args.lastMessageAt),
    createdAt: existing?.createdAt ?? args.firstMessageAt,
    updatedAt: Date.now(),
  };
  if (existing) {
    await ctx.db.patch(existing._id, payload);
  } else {
    await ctx.db.insert("aiChatConversations", payload);
  }
  return {
    totalMessages: payload.totalMessages,
    firstMessageAt: payload.firstMessageAt,
    lastMessageAt: payload.lastMessageAt,
  };
};

const getEvalThread = async (
  ctx: any,
  args: {
    appId: string;
    organizationId: string;
    featureDomain: string;
    threadKey: string;
  },
) => {
  return await ctx.db
    .query("aiEvalThreads")
    .withIndex("by_app_org_domain_thread", (q: any) =>
      q
        .eq("appId", args.appId)
        .eq("organizationId", args.organizationId)
        .eq("featureDomain", args.featureDomain)
        .eq("threadKey", args.threadKey),
    )
    .unique();
};

const upsertEvalThreadRecord = async (
  ctx: any,
  args: {
    appId: string;
    organizationId: string;
    featureDomain: string;
    source: string;
    threadKey: string;
    sessionId?: string;
    firstMessageAt: number;
    lastMessageAt: number;
    messageCount: number;
  },
) => {
  const now = Date.now();
  const existing = await getEvalThread(ctx, args);
  const payload = {
    appId: args.appId,
    organizationId: args.organizationId,
    featureDomain: args.featureDomain,
    source: args.source,
    threadKey: args.threadKey,
    sessionId: args.sessionId ?? existing?.sessionId,
    firstMessageAt: existing
      ? Math.min(existing.firstMessageAt, args.firstMessageAt)
      : args.firstMessageAt,
    lastMessageAt: existing
      ? Math.max(existing.lastMessageAt, args.lastMessageAt)
      : args.lastMessageAt,
    messageCount: existing
      ? Math.max(existing.messageCount, args.messageCount)
      : args.messageCount,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  if (existing) {
    await ctx.db.patch(existing._id, payload);
    return {
      threadDocId: String(existing._id),
      created: false,
      messageCount: payload.messageCount,
      firstMessageAt: payload.firstMessageAt,
      lastMessageAt: payload.lastMessageAt,
    };
  }
  const insertedId = await ctx.db.insert("aiEvalThreads", payload);
  return {
    threadDocId: String(insertedId),
    created: true,
    messageCount: payload.messageCount,
    firstMessageAt: payload.firstMessageAt,
    lastMessageAt: payload.lastMessageAt,
  };
};

const enqueueLangfuseFromEvalMessage = async (
  ctx: any,
  args: {
    thread: {
      appId: string;
      organizationId: string;
      featureDomain: string;
      source: string;
      threadKey: string;
      sessionId?: string;
    };
    sequence: number;
    messageKey: string;
    role: "user" | "assistant" | "system";
    content: string;
    createdAt: number;
    mirroredAt: number;
    modelProvider?: string;
    modelId?: string;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    costUsd?: number;
    metadata?: unknown;
    generation?: {
      generationKey?: string;
      provider?: string;
      modelId?: string;
      latencyMs?: number;
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
      costUsd?: number;
      metadata?: unknown;
    };
  },
) => {
  const traceId = `${args.thread.appId}:${args.thread.organizationId}:${args.thread.featureDomain}:${args.thread.threadKey}`;
  const observationId = args.generation?.generationKey ?? args.messageKey;

  const usageInput = args.inputTokens ?? args.generation?.inputTokens;
  const usageOutput = args.outputTokens ?? args.generation?.outputTokens;
  const usageTotal =
    args.totalTokens ??
    args.generation?.totalTokens ??
    ((typeof usageInput === "number" ? usageInput : 0) +
      (typeof usageOutput === "number" ? usageOutput : 0));
  const usage =
    typeof usageInput === "number" ||
    typeof usageOutput === "number" ||
    typeof usageTotal === "number"
      ? {
          input: usageInput,
          output: usageOutput,
          total: usageTotal,
          unit: "TOKENS",
        }
      : undefined;

  const metadata = {
    source: args.thread.source,
    role: args.role,
    sequence: args.sequence,
    messageKey: args.messageKey,
    ...(typeof args.metadata === "object" && args.metadata ? (args.metadata as object) : {}),
    ...(typeof args.generation?.metadata === "object" && args.generation.metadata
      ? { generation: args.generation.metadata }
      : {}),
  };

  await ctx.runMutation(componentsAny.langfuse.pipeline.mutations.enqueueGenerationInternal, {
    scope: {
      appId: args.thread.appId,
      organizationId: args.thread.organizationId,
      featureDomain: args.thread.featureDomain,
    },
    threadKey: args.thread.threadKey,
    sequence: args.sequence,
    idempotencyKey: `generation:${args.messageKey}`,
    generation: {
      traceId,
      observationId,
      name: `${args.thread.featureDomain}.message`,
      startTimeMs: args.createdAt,
      endTimeMs: args.mirroredAt,
      input: args.role === "assistant" ? "" : args.content,
      output: args.role === "assistant" ? args.content : undefined,
      model: args.modelId ?? args.generation?.modelId,
      modelParameters: {
        provider: args.modelProvider ?? args.generation?.provider,
        role: args.role,
      },
      usage,
      cost:
        typeof args.costUsd === "number" || typeof args.generation?.costUsd === "number"
          ? { total: args.costUsd ?? args.generation?.costUsd, currency: "USD" }
          : undefined,
      metadata,
      sessionId: args.thread.sessionId,
      userId: args.thread.organizationId,
    },
  });

  if (typeof args.costUsd === "number") {
    await ctx.runMutation(componentsAny.langfuse.pipeline.mutations.enqueueScoreInternal, {
      scope: {
        appId: args.thread.appId,
        organizationId: args.thread.organizationId,
        featureDomain: args.thread.featureDomain,
      },
      threadKey: args.thread.threadKey,
      sequence: args.sequence,
      idempotencyKey: `score:cost:${args.messageKey}`,
      score: {
        traceId,
        observationId,
        name: "cost_usd",
        value: args.costUsd,
        dataType: "NUMERIC",
        comment: "Mirrored from canonical aiEvalMessages.costUsd",
        metadata,
        timestampMs: args.mirroredAt,
      },
    });
  }
};
export const grantMonthlyCredits = mutation({
  args: {
    userId: v.string(),
    periodKey: v.string(),
    amount: v.number(),
  },
  returns: v.object({
    userId: v.string(),
    periodKey: v.string(),
    granted: v.number(),
    spent: v.number(),
    remaining: v.number(),
  }),
  handler: async (ctx: any, args: { userId: string; periodKey: string; amount: number }) => {
    const granted = normalizeTokens(args.amount);
    const existing = await getLedgerRow(ctx, args.userId, args.periodKey);
    const payload = {
      userId: args.userId,
      periodKey: args.periodKey,
      granted,
      spent: 0,
      updatedAt: Date.now(),
    };
    if (existing) {
      await ctx.db.patch(existing._id, payload);
    } else {
      await ctx.db.insert("userAiCredits", payload);
    }
    await logAiEvent(ctx, {
      eventType: "credits.granted",
      message: `Credits granted: ${granted} for ${args.periodKey}`,
      userId: args.userId,
      metadata: {
        periodKey: args.periodKey,
        granted,
        spent: 0,
        remaining: granted,
      },
    });
    return {
      userId: args.userId,
      periodKey: args.periodKey,
      granted,
      spent: 0,
      remaining: granted,
    };
  },
});

export const assertAndSpendTokens = mutation({
  args: {
    userId: v.string(),
    periodKey: v.string(),
    tokens: v.number(),
  },
  returns: v.object({
    userId: v.string(),
    periodKey: v.string(),
    granted: v.number(),
    spent: v.number(),
    remaining: v.number(),
  }),
  handler: async (
    ctx: any,
    args: { userId: string; periodKey: string; tokens: number },
  ) => {
    const tokens = normalizeTokens(args.tokens);
    const row = await getLedgerRow(ctx, args.userId, args.periodKey);
    const granted = typeof row?.granted === "number" ? row.granted : 0;
    const spent = typeof row?.spent === "number" ? row.spent : 0;
    const remaining = Math.max(0, granted - spent);
    if (tokens > remaining) {
      throw new ConvexError("AI_CREDITS_EXHAUSTED");
    }
    const nextSpent = spent + tokens;
    const payload = {
      userId: args.userId,
      periodKey: args.periodKey,
      granted,
      spent: nextSpent,
      updatedAt: Date.now(),
    };
    if (row) {
      await ctx.db.patch(row._id, payload);
    } else {
      await ctx.db.insert("userAiCredits", payload);
    }
    return {
      userId: args.userId,
      periodKey: args.periodKey,
      granted,
      spent: nextSpent,
      remaining: Math.max(0, granted - nextSpent),
    };
  },
});

export const recordAICostAndSpend = mutation({
  args: {
    userId: v.string(),
    periodKey: v.string(),
    messageId: v.string(),
    threadId: v.optional(v.string()),
    modelId: v.string(),
    providerId: v.string(),
    usage: v.object({
      promptTokens: v.optional(v.number()),
      completionTokens: v.optional(v.number()),
      totalTokens: v.optional(v.number()),
    }),
  },
  returns: v.object({
    remaining: v.number(),
    spent: v.number(),
    granted: v.number(),
  }),
  handler: async (
    ctx: any,
    args: {
      userId: string;
      periodKey: string;
      messageId: string;
      threadId?: string;
      modelId: string;
      providerId: string;
      usage: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
    },
  ) => {
    const promptTokens = normalizeTokens(args.usage.promptTokens ?? 0);
    const completionTokens = normalizeTokens(args.usage.completionTokens ?? 0);
    const totalTokens = normalizeTokens(
      args.usage.totalTokens ?? promptTokens + completionTokens,
    );

    const row = await getLedgerRow(ctx, args.userId, args.periodKey);
    const granted = typeof row?.granted === "number" ? row.granted : 0;
    const spent = typeof row?.spent === "number" ? row.spent : 0;
    const remaining = Math.max(0, granted - spent);
    const nextSpent = Math.min(granted, spent + totalTokens);
    const payload = {
      userId: args.userId,
      periodKey: args.periodKey,
      granted,
      spent: nextSpent,
      updatedAt: Date.now(),
    };
    if (row) {
      await ctx.db.patch(row._id, payload);
    } else {
      await ctx.db.insert("userAiCredits", payload);
    }
    await logAiEvent(ctx, {
      eventType: "credits.spent",
      message: `Credits spent ${nextSpent}/${granted} for ${args.periodKey}`,
      userId: args.userId,
      threadId: args.threadId,
      metadata: {
        periodKey: args.periodKey,
        granted,
        spent: nextSpent,
        promptTokens,
        completionTokens,
        totalTokens,
        modelId: args.modelId,
        providerId: args.providerId,
      },
    });

    return {
      remaining: Math.max(0, granted - nextSpent),
      spent: nextSpent,
      granted,
    };
  },
});

export const getOrCreateChatThread = mutation({
  args: {
    userId: v.string(),
    title: v.optional(v.string()),
  },
  returns: v.object({
    threadId: v.string(),
    created: v.boolean(),
  }),
  handler: async (ctx: any, args: { userId: string; title?: string }) => {
    const existing = await getConversationForUser(ctx, args.userId);
    if (existing?.threadId) {
      return { threadId: String(existing.threadId), created: false };
    }

    const thread = await ctx.runMutation(components.agent.threads.createThread, {
      title: args.title ?? "AI Assistant",
      userId: args.userId,
    });
    const threadId = String(thread?._id ?? "");
    if (!threadId) {
      throw new ConvexError("Failed to create AI chat thread.");
    }

    const now = Date.now();
    await ctx.db.insert("aiChatConversations", {
      userId: args.userId,
      threadId,
      totalMessages: 0,
      firstMessageAt: now,
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return { threadId, created: true };
  },
});

export const createChatThread = mutation({
  args: {
    userId: v.string(),
    title: v.optional(v.string()),
  },
  returns: v.object({
    threadId: v.string(),
    createdAt: v.number(),
  }),
  handler: async (ctx: any, args: { userId: string; title?: string }) => {
    const thread = await ctx.runMutation(components.agent.threads.createThread, {
      title: args.title ?? "AI Assistant",
      userId: args.userId,
    });
    const threadId = String(thread?._id ?? "");
    if (!threadId) {
      throw new ConvexError("Failed to create AI chat thread.");
    }
    const now = Date.now();
    await upsertConversationForThread(ctx, {
      userId: args.userId,
      threadId,
      firstMessageAt: now,
      lastMessageAt: now,
      totalMessages: 0,
    });
    await logAiEvent(ctx, {
      eventType: "thread.created",
      message: "AI chat thread created",
      userId: args.userId,
      threadId,
      metadata: { title: args.title ?? "AI Assistant" },
    });
    return {
      threadId,
      createdAt: now,
    };
  },
});

export const recordChatMessage = mutation({
  args: {
    userId: v.string(),
    threadId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  },
  returns: v.object({
    threadId: v.string(),
    totalMessages: v.number(),
    messageId: v.optional(v.string()),
  }),
  handler: async (
    ctx: any,
    args: { userId: string; threadId: string; role: "user" | "assistant"; content: string },
  ) => {
    const { totalMessages } = await updateConversationForMessage(ctx, {
      userId: args.userId,
      threadId: args.threadId,
      role: args.role,
      content: args.content,
    });

    const messageResult = await ctx.runMutation(
      components.agent.messages.addMessages,
      {
        threadId: args.threadId,
        userId: args.userId,
        messages: [
          {
            message: {
              role: args.role,
              content: args.content,
            } as any,
            status: "success",
          },
        ],
      },
    );

    const messageId = Array.isArray(messageResult?.messages)
      ? String(messageResult.messages[0]?._id ?? "")
      : "";

    await logAiEvent(ctx, {
      eventType: "message.recorded",
      message: `Chat message recorded (${args.role})`,
      userId: args.userId,
      threadId: args.threadId,
      metadata: {
        messageId: messageId || undefined,
        role: args.role,
        content: truncateSnippet(args.content),
      },
    });

    return {
      threadId: args.threadId,
      totalMessages,
      messageId: messageId || undefined,
    };
  },
});

export const importChatThreadMessages = mutation({
  args: {
    userId: v.string(),
    threadId: v.string(),
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
        createdAt: v.optional(v.number()),
      }),
    ),
  },
  returns: v.object({
    imported: v.number(),
    totalMessages: v.number(),
    firstMessageAt: v.number(),
    lastMessageAt: v.number(),
  }),
  handler: async (
    ctx: any,
    args: {
      userId: string;
      threadId: string;
      messages: Array<{
        role: "user" | "assistant";
        content: string;
        createdAt?: number;
      }>;
    },
  ) => {
    const existingThread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });
    if (!existingThread) {
      throw new ConvexError("AI thread not found for message import.");
    }

    const normalized = args.messages
      .map((message) => ({
        role: message.role,
        content: String(message.content ?? "").trim(),
        createdAt:
          typeof message.createdAt === "number"
            ? message.createdAt
            : Date.now(),
      }))
      .filter((message) => message.content.length > 0)
      .sort((a, b) => a.createdAt - b.createdAt);

    if (normalized.length === 0) {
      const existingConversation = await getConversationForThread(
        ctx,
        args.userId,
        args.threadId,
      );
      const now = Date.now();
      return {
        imported: 0,
        totalMessages: Number(existingConversation?.totalMessages ?? 0),
        firstMessageAt: Number(existingConversation?.firstMessageAt ?? now),
        lastMessageAt: Number(existingConversation?.lastMessageAt ?? now),
      };
    }

    await ctx.runMutation(components.agent.messages.addMessages, {
      threadId: args.threadId,
      userId: args.userId,
      messages: normalized.map((message) => ({
        message: {
          role: message.role,
          content: message.content,
        } as any,
        status: "success" as const,
      })),
    });

    const existingConversation = await getConversationForThread(
      ctx,
      args.userId,
      args.threadId,
    );
    const previousTotal = Number(existingConversation?.totalMessages ?? 0);
    const nextTotal = previousTotal + normalized.length;
    const firstMessageAt = normalized[0]?.createdAt ?? Date.now();
    const lastMessage = normalized[normalized.length - 1];
    const lastMessageAt = lastMessage?.createdAt ?? Date.now();
    const lastMessageSnippet = lastMessage?.content
      ? truncateSnippet(lastMessage.content)
      : undefined;
    const nextConversation = await upsertConversationForThread(ctx, {
      userId: args.userId,
      threadId: args.threadId,
      firstMessageAt,
      lastMessageAt,
      totalMessages: nextTotal,
      lastMessageRole: lastMessage?.role,
      lastMessageSnippet,
    });

    await logAiEvent(ctx, {
      eventType: "thread.imported_messages",
      message: "Imported legacy messages into AI thread",
      userId: args.userId,
      threadId: args.threadId,
      metadata: {
        imported: normalized.length,
        totalMessages: nextConversation.totalMessages,
      },
    });

    return {
      imported: normalized.length,
      totalMessages: nextConversation.totalMessages,
      firstMessageAt: nextConversation.firstMessageAt,
      lastMessageAt: nextConversation.lastMessageAt,
    };
  },
});

export const recordChatAssistantSummary = internalMutation({
  args: {
    userId: v.string(),
    threadId: v.string(),
    content: v.string(),
  },
  returns: v.object({
    totalMessages: v.number(),
  }),
  handler: async (
    ctx: any,
    args: { userId: string; threadId: string; content: string },
  ) => {
    const result = await updateConversationForMessage(ctx, {
      userId: args.userId,
      threadId: args.threadId,
      role: "assistant",
      content: args.content,
    });
    await logAiEvent(ctx, {
      eventType: "conversation.summary",
      message: "Conversation summary updated",
      userId: args.userId,
      threadId: args.threadId,
      metadata: {
        snippet: truncateSnippet(args.content),
      },
    });
    return result;
  },
});

export const logAiEventPublic = mutation({
  args: {
    eventType: v.string(),
    level: v.optional(v.string()),
    source: v.optional(v.string()),
    message: v.string(),
    userId: v.optional(v.string()),
    threadId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (
    ctx: any,
    args: {
      eventType: string;
      level?: string;
      source?: string;
      message: string;
      userId?: string;
      threadId?: string;
      metadata?: unknown;
    },
  ) => {
    await logAiEvent(ctx, args);
    return null;
  },
});

export const recordChatAssistantSummaryPublic = mutation({
  args: {
    userId: v.string(),
    threadId: v.string(),
    content: v.string(),
  },
  returns: v.object({
    totalMessages: v.number(),
  }),
  handler: async (
    ctx: any,
    args: { userId: string; threadId: string; content: string },
  ) => {
    return await updateConversationForMessage(ctx, {
      userId: args.userId,
      threadId: args.threadId,
      role: "assistant",
      content: args.content,
    });
  },
});

export const upsertEvalThreadReplica = mutation({
  args: {
    thread: evalThreadEnvelopeValidator,
    firstMessageAt: v.number(),
    lastMessageAt: v.number(),
    messageCount: v.number(),
  },
  returns: v.object({
    threadDocId: v.string(),
    created: v.boolean(),
    messageCount: v.number(),
    firstMessageAt: v.number(),
    lastMessageAt: v.number(),
  }),
  handler: async (
    ctx: any,
    args: {
      thread: {
        appId: string;
        organizationId: string;
        featureDomain: string;
        source: string;
        threadKey: string;
        sessionId?: string;
      };
      firstMessageAt: number;
      lastMessageAt: number;
      messageCount: number;
    },
  ) => {
    return await upsertEvalThreadRecord(ctx, {
      ...args.thread,
      firstMessageAt: args.firstMessageAt,
      lastMessageAt: args.lastMessageAt,
      messageCount: Math.max(0, Math.floor(args.messageCount)),
    });
  },
});

export const ingestExternalEvalMessage = mutation({
  args: {
    thread: evalThreadEnvelopeValidator,
    sequence: v.number(),
    messageKey: v.string(),
    role: evalRoleValidator,
    content: v.string(),
    createdAt: v.number(),
    modelProvider: v.optional(v.string()),
    modelId: v.optional(v.string()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    costUsd: v.optional(v.number()),
    metadata: v.optional(v.any()),
    generation: v.optional(evalGenerationValidator),
  },
  returns: v.object({
    inserted: v.boolean(),
    duplicate: v.boolean(),
    messageDocId: v.optional(v.string()),
    threadDocId: v.string(),
  }),
  handler: async (
    ctx: any,
    args: {
      thread: {
        appId: string;
        organizationId: string;
        featureDomain: string;
        source: string;
        threadKey: string;
        sessionId?: string;
      };
      sequence: number;
      messageKey: string;
      role: "user" | "assistant" | "system";
      content: string;
      createdAt: number;
      modelProvider?: string;
      modelId?: string;
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
      costUsd?: number;
      metadata?: unknown;
      generation?: {
        generationKey?: string;
        provider?: string;
        modelId?: string;
        latencyMs?: number;
        inputTokens?: number;
        outputTokens?: number;
        totalTokens?: number;
        costUsd?: number;
        metadata?: unknown;
      };
    },
  ) => {
    const existing = await ctx.db
      .query("aiEvalMessages")
      .withIndex("by_message_key", (q: any) =>
        q.eq("messageKey", args.messageKey),
      )
      .unique();
    const existingThread = await getEvalThread(ctx, {
      appId: args.thread.appId,
      organizationId: args.thread.organizationId,
      featureDomain: args.thread.featureDomain,
      threadKey: args.thread.threadKey,
    });
    const normalizedSequence = Math.max(0, Math.floor(args.sequence));
    const currentThreadMessageCount = Math.max(
      0,
      Number(existingThread?.messageCount ?? 0),
    );
    const nextThreadMessageCount = existing
      ? Math.max(1, currentThreadMessageCount)
      : currentThreadMessageCount + 1;

    const threadState = await upsertEvalThreadRecord(ctx, {
      ...args.thread,
      firstMessageAt: args.createdAt,
      lastMessageAt: args.createdAt,
      messageCount: nextThreadMessageCount,
    });

    if (existing) {
      return {
        inserted: false,
        duplicate: true,
        messageDocId: String(existing._id),
        threadDocId: threadState.threadDocId,
      };
    }

    const mirroredAt = Date.now();
    const messageDocId = await ctx.db.insert("aiEvalMessages", {
      appId: args.thread.appId,
      organizationId: args.thread.organizationId,
      featureDomain: args.thread.featureDomain,
      source: args.thread.source,
      threadKey: args.thread.threadKey,
      sessionId: args.thread.sessionId,
      sequence: normalizedSequence,
      messageKey: args.messageKey,
      role: args.role,
      content: args.content,
      createdAt: args.createdAt,
      mirroredAt,
      modelProvider: args.modelProvider,
      modelId: args.modelId,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      totalTokens: args.totalTokens,
      costUsd: args.costUsd,
      metadata: args.metadata,
    });

    if (args.generation) {
      await ctx.db.insert("aiEvalGenerations", {
        appId: args.thread.appId,
        organizationId: args.thread.organizationId,
        featureDomain: args.thread.featureDomain,
        source: args.thread.source,
        threadKey: args.thread.threadKey,
        messageKey: args.messageKey,
        generationKey: args.generation.generationKey ?? args.messageKey,
        provider: args.generation.provider,
        modelId: args.generation.modelId,
        latencyMs: args.generation.latencyMs,
        inputTokens: args.generation.inputTokens,
        outputTokens: args.generation.outputTokens,
        totalTokens: args.generation.totalTokens,
        costUsd: args.generation.costUsd,
        metadata: args.generation.metadata,
        createdAt: mirroredAt,
      });
    }

    try {
      await enqueueLangfuseFromEvalMessage(ctx, {
        thread: args.thread,
        sequence: normalizedSequence,
        messageKey: args.messageKey,
        role: args.role,
        content: args.content,
        createdAt: args.createdAt,
        mirroredAt,
        modelProvider: args.modelProvider,
        modelId: args.modelId,
        inputTokens: args.inputTokens,
        outputTokens: args.outputTokens,
        totalTokens: args.totalTokens,
        costUsd: args.costUsd,
        metadata: args.metadata,
        generation: args.generation,
      });
    } catch (error) {
      console.error("[launchthat-ai] langfuse enqueue failed", {
        messageKey: args.messageKey,
        threadKey: args.thread.threadKey,
        organizationId: args.thread.organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return {
      inserted: true,
      duplicate: false,
      messageDocId: String(messageDocId),
      threadDocId: threadState.threadDocId,
    };
  },
});

export const upsertAiPricing = mutation({
  args: {
    row: pricingRowValidator,
  },
  returns: v.object({
    updatedModels: v.number(),
    insertCount: v.number(),
    updateCount: v.number(),
    deleteCount: v.number(),
  }),
  handler: async (ctx: any, args: { row: any }) => {
    const existing = await costs.getAllPricing(ctx as any);
    const next = existing.filter(
      (entry: any) =>
        !(
          entry.modelId === args.row.modelId &&
          entry.providerId === args.row.providerId
        ),
    );
    next.push({
      ...args.row,
      lastUpdated: Date.now(),
    });
    return await ctx.runMutation(
      components.neutralCost.pricing.updatePricingTable,
      { pricingData: next },
    );
  },
});

export const upsertLangfuseConfig = mutation({
  args: {
    scope: langfuseScopeValidator,
    config: langfuseConfigValidator,
  },
  returns: v.object({
    configured: v.boolean(),
    enabled: v.boolean(),
  }),
  handler: async (
    ctx: any,
    args: {
      scope: {
        appId: string;
        organizationId: string;
        featureDomain: string;
      };
      config: {
        host: string;
        publicKey: string;
        secretKey: string;
        ingestionPath?: string;
        enabled?: boolean;
      };
    },
  ) => {
    return await ctx.runMutation(
      componentsAny.langfuse.pipeline.mutations.upsertConfigInternal,
      args,
    );
  },
});

export const saveAiSettings = mutation({
  args: {
    key: v.optional(v.string()),
    provider: v.string(),
    model: v.string(),
    embeddingModel: v.optional(v.string()),
    embeddingDimension: v.optional(v.number()),
    ragNamespace: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
  },
  returns: v.object({
    key: v.string(),
    provider: v.string(),
    model: v.string(),
  }),
  handler: async (
    ctx: any,
    args: {
      key?: string;
      provider: string;
      model: string;
      embeddingModel?: string;
      embeddingDimension?: number;
      ragNamespace?: string;
      systemPrompt?: string;
    },
  ) => {
    const settingsKey = args.key ?? "default";
    const existing = await ctx.db
      .query("aiSettings")
      .withIndex("by_key", (q: any) => q.eq("key", settingsKey))
      .first();

    const payload = {
      key: settingsKey,
      provider: args.provider,
      model: args.model,
      embeddingModel: args.embeddingModel,
      embeddingDimension: args.embeddingDimension,
      ragNamespace: args.ragNamespace,
      systemPrompt: args.systemPrompt,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
    } else {
      await ctx.db.insert("aiSettings", payload);
    }

    await logAiEvent(ctx, {
      eventType: "settings.updated",
      message: `AI settings updated: ${args.provider}/${args.model}`,
      metadata: {
        key: settingsKey,
        provider: args.provider,
        model: args.model,
        embeddingModel: args.embeddingModel,
      },
    });

    return {
      key: settingsKey,
      provider: args.provider,
      model: args.model,
    };
  },
});

export const deleteRagEntry = mutation({
  args: {
    entryId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx: any, args: { entryId: string }) => {
    await ctx.runMutation(components.rag.entries.deleteAsync, {
      entryId: args.entryId,
      startOrder: 0,
    });

    await logAiEvent(ctx, {
      eventType: "rag.entry.deleted",
      message: `RAG entry deleted: ${args.entryId}`,
      metadata: { entryId: args.entryId },
    });

    return null;
  },
});

export const beginLinkAnalysisRun = mutation({
  args: {
    runId: v.string(),
    threadId: v.string(),
    userId: v.string(),
    sourceUrls: v.array(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.object({
    runId: v.string(),
    status: linkAnalysisRunStatusValidator,
    startedAt: v.number(),
    updatedAt: v.number(),
  }),
  handler: async (
    ctx: any,
    args: {
      runId: string;
      threadId: string;
      userId: string;
      sourceUrls: string[];
      metadata?: unknown;
    },
  ) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("aiLinkAnalysisRuns")
      .withIndex("by_run_id", (q: any) => q.eq("runId", args.runId))
      .unique();
    const payload = {
      runId: args.runId,
      threadId: args.threadId,
      userId: args.userId,
      status: "running" as const,
      sourceUrls: args.sourceUrls,
      urlRows: [],
      metadata: args.metadata,
      startedAt: existing?.startedAt ?? now,
      updatedAt: now,
      completedAt: undefined,
    };
    if (existing) {
      await ctx.db.patch(existing._id, payload);
    } else {
      await ctx.db.insert("aiLinkAnalysisRuns", payload);
    }
    return {
      runId: args.runId,
      status: payload.status,
      startedAt: payload.startedAt,
      updatedAt: payload.updatedAt,
    };
  },
});

export const updateLinkAnalysisRun = mutation({
  args: {
    runId: v.string(),
    status: linkAnalysisRunStatusValidator,
    urlRows: v.array(linkAnalysisUrlRowValidator),
    metadata: v.optional(v.any()),
    completedAt: v.optional(v.number()),
  },
  returns: v.object({
    runId: v.string(),
    status: linkAnalysisRunStatusValidator,
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  }),
  handler: async (
    ctx: any,
    args: {
      runId: string;
      status: "running" | "completed" | "failed" | "cancelled";
      urlRows: {
        url: string;
        sourceType: string;
        status: "detected" | "processing" | "completed" | "failed";
        error?: string;
        updatedAt: number;
      }[];
      metadata?: unknown;
      completedAt?: number;
    },
  ) => {
    const existing = await ctx.db
      .query("aiLinkAnalysisRuns")
      .withIndex("by_run_id", (q: any) => q.eq("runId", args.runId))
      .unique();
    if (!existing) {
      throw new ConvexError(`Link analysis run ${args.runId} was not found.`);
    }
    const now = Date.now();
    const completedAt =
      args.status === "completed" || args.status === "failed" || args.status === "cancelled"
        ? (args.completedAt ?? now)
        : undefined;
    await ctx.db.patch(existing._id, {
      status: args.status,
      urlRows: args.urlRows,
      metadata: args.metadata ?? existing.metadata,
      updatedAt: now,
      completedAt,
    });
    return {
      runId: args.runId,
      status: args.status,
      updatedAt: now,
      completedAt,
    };
  },
});
