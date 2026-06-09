import { defineSchema, defineTable } from "convex/server";

import { v } from "convex/values";

const aiEvalRoleValidator = v.union(
  v.literal("user"),
  v.literal("assistant"),
  v.literal("system"),
);

export default defineSchema({
  aiSettings: defineTable({
    key: v.string(),
    provider: v.string(),
    model: v.string(),
    embeddingModel: v.optional(v.string()),
    embeddingDimension: v.optional(v.number()),
    ragNamespace: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
  userAiCredits: defineTable({
    userId: v.string(),
    periodKey: v.string(),
    granted: v.number(),
    spent: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_period", ["userId", "periodKey"])
    .index("by_period", ["periodKey"]),
  aiChatConversations: defineTable({
    userId: v.string(),
    threadId: v.string(),
    lastMessageSnippet: v.optional(v.string()),
    lastMessageRole: v.optional(v.union(v.literal("user"), v.literal("assistant"))),
    totalMessages: v.number(),
    firstMessageAt: v.number(),
    lastMessageAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_thread", ["threadId"])
    .index("by_user_and_thread", ["userId", "threadId"])
    .index("by_user_lastMessageAt", ["userId", "lastMessageAt"]),
  aiLogs: defineTable({
    userId: v.optional(v.string()),
    threadId: v.optional(v.string()),
    eventType: v.string(),
    level: v.string(),
    source: v.optional(v.string()),
    message: v.string(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_eventType", ["eventType", "createdAt"])
    .index("by_level", ["level", "createdAt"])
    .index("by_user", ["userId", "createdAt"])
    .index("by_thread", ["threadId", "createdAt"]),
  aiLinkAnalysisRuns: defineTable({
    runId: v.string(),
    threadId: v.string(),
    userId: v.string(),
    status: v.union(
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    sourceUrls: v.array(v.string()),
    urlRows: v.array(
      v.object({
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
      }),
    ),
    metadata: v.optional(v.any()),
    startedAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_run_id", ["runId"])
    .index("by_thread_and_updatedAt", ["threadId", "updatedAt"])
    .index("by_user_and_updatedAt", ["userId", "updatedAt"]),
  aiEvalThreads: defineTable({
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
  })
    .index("by_app_org_domain_thread", [
      "appId",
      "organizationId",
      "featureDomain",
      "threadKey",
    ])
    .index("by_thread_key", ["threadKey"])
    .index("by_app_org_domain_updatedAt", [
      "appId",
      "organizationId",
      "featureDomain",
      "updatedAt",
    ]),
  aiEvalMessages: defineTable({
    appId: v.string(),
    organizationId: v.string(),
    featureDomain: v.string(),
    source: v.string(),
    threadKey: v.string(),
    sessionId: v.optional(v.string()),
    sequence: v.number(),
    messageKey: v.string(),
    role: aiEvalRoleValidator,
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
  })
    .index("by_app_org_domain_thread_sequence", [
      "appId",
      "organizationId",
      "featureDomain",
      "threadKey",
      "sequence",
    ])
    .index("by_thread_sequence", ["threadKey", "sequence"])
    .index("by_message_key", ["messageKey"])
    .index("by_thread_createdAt", ["threadKey", "createdAt"]),
  aiEvalGenerations: defineTable({
    appId: v.string(),
    organizationId: v.string(),
    featureDomain: v.string(),
    source: v.string(),
    threadKey: v.string(),
    messageKey: v.string(),
    generationKey: v.string(),
    provider: v.optional(v.string()),
    modelId: v.optional(v.string()),
    latencyMs: v.optional(v.number()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    costUsd: v.optional(v.number()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_app_org_domain_thread_createdAt", [
      "appId",
      "organizationId",
      "featureDomain",
      "threadKey",
      "createdAt",
    ])
    .index("by_message_key_and_generation_key", ["messageKey", "generationKey"]),
});
