/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";
import type { GenericId as Id } from "convex/values";
import { anyApi, componentsGeneric } from "convex/server";

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export const api: {
  actions: {
    addRagContent: FunctionReference<
      "action",
      "public",
      {
        apiKey: string;
        importance?: number;
        key: string;
        metadata?: Record<string, any>;
        namespace: string;
        text: string;
        title?: string;
      },
      { created: boolean; entryId: string; status: string }
    >;
    auditLangfuseExportParity: FunctionReference<
      "action",
      "public",
      {
        scope: { appId: string; featureDomain: string; organizationId: string };
        threadLimit?: number;
      },
      {
        parityMismatches: Array<string>;
        pipelineHealth: {
          failed: number;
          lastDeliveredAt?: number;
          oldestPendingCreatedAt?: number;
          pending: number;
          processing: number;
          sent: number;
          total: number;
        };
        threadsChecked: number;
        totalCanonicalMessages: number;
        totalExportedUniqueMessages: number;
      }
    >;
    backfillLangfuseFromAiEval: FunctionReference<
      "action",
      "public",
      {
        perThreadMessageLimit?: number;
        scope: { appId: string; featureDomain: string; organizationId: string };
        threadLimit?: number;
      },
      {
        duplicateGenerations: number;
        failedMessages: number;
        queuedGenerations: number;
        queuedScores: number;
        scannedMessages: number;
        scannedThreads: number;
        skippedGenerations: number;
      }
    >;
    deleteRagEntrySync: FunctionReference<
      "action",
      "public",
      { entryId: string },
      null
    >;
    drainLangfuseOutbox: FunctionReference<
      "action",
      "public",
      { limit?: number },
      {
        claimed: number;
        duplicated: number;
        failed: number;
        requeued: number;
        sent: number;
      }
    >;
    runAgentStep: FunctionReference<
      "action",
      "public",
      {
        apiKey?: string;
        newsEventsHandle?: string;
        orgIdOrSlug?: string;
        promptMessageId: string;
        strategyTools?: {
          addRuleHandle: string;
          addSessionHandle: string;
          createVersionHandle: string;
          deleteAnnotationHandle: string;
          removeRuleHandle: string;
          updateRiskHandle: string;
          updateRuleHandle: string;
          updateSessionHandle: string;
          updateSummaryHandle: string;
          upsertAnnotationHandle: string;
        };
        system?: string;
        threadId: string;
        userId: string;
      },
      { ok: boolean }
    >;
    searchRag: FunctionReference<
      "action",
      "public",
      { apiKey: string; limit?: number; namespace: string; query: string },
      Array<{ key?: string; score: number; text: string; title?: string }>
    >;
    syncPricingFromProviders: FunctionReference<
      "action",
      "public",
      { envKeys?: Record<string, string> },
      {
        deleteCount: number;
        insertCount: number;
        updateCount: number;
        updatedModels: number;
      }
    >;
  };
  mutations: {
    assertAndSpendTokens: FunctionReference<
      "mutation",
      "public",
      { periodKey: string; tokens: number; userId: string },
      {
        granted: number;
        periodKey: string;
        remaining: number;
        spent: number;
        userId: string;
      }
    >;
    beginLinkAnalysisRun: FunctionReference<
      "mutation",
      "public",
      {
        metadata?: any;
        runId: string;
        sourceUrls: Array<string>;
        threadId: string;
        userId: string;
      },
      {
        runId: string;
        startedAt: number;
        status: "running" | "completed" | "failed" | "cancelled";
        updatedAt: number;
      }
    >;
    createChatThread: FunctionReference<
      "mutation",
      "public",
      { title?: string; userId: string },
      { createdAt: number; threadId: string }
    >;
    deleteRagEntry: FunctionReference<
      "mutation",
      "public",
      { entryId: string },
      null
    >;
    getOrCreateChatThread: FunctionReference<
      "mutation",
      "public",
      { title?: string; userId: string },
      { created: boolean; threadId: string }
    >;
    grantMonthlyCredits: FunctionReference<
      "mutation",
      "public",
      { amount: number; periodKey: string; userId: string },
      {
        granted: number;
        periodKey: string;
        remaining: number;
        spent: number;
        userId: string;
      }
    >;
    importChatThreadMessages: FunctionReference<
      "mutation",
      "public",
      {
        messages: Array<{
          content: string;
          createdAt?: number;
          role: "user" | "assistant";
        }>;
        threadId: string;
        userId: string;
      },
      {
        firstMessageAt: number;
        imported: number;
        lastMessageAt: number;
        totalMessages: number;
      }
    >;
    ingestExternalEvalMessage: FunctionReference<
      "mutation",
      "public",
      {
        content: string;
        costUsd?: number;
        createdAt: number;
        generation?: {
          costUsd?: number;
          generationKey?: string;
          inputTokens?: number;
          latencyMs?: number;
          metadata?: any;
          modelId?: string;
          outputTokens?: number;
          provider?: string;
          totalTokens?: number;
        };
        inputTokens?: number;
        messageKey: string;
        metadata?: any;
        modelId?: string;
        modelProvider?: string;
        outputTokens?: number;
        role: "user" | "assistant" | "system";
        sequence: number;
        thread: {
          appId: string;
          featureDomain: string;
          organizationId: string;
          sessionId?: string;
          source: string;
          threadKey: string;
        };
        totalTokens?: number;
      },
      {
        duplicate: boolean;
        inserted: boolean;
        messageDocId?: string;
        threadDocId: string;
      }
    >;
    logAiEventPublic: FunctionReference<
      "mutation",
      "public",
      {
        eventType: string;
        level?: string;
        message: string;
        metadata?: any;
        source?: string;
        threadId?: string;
        userId?: string;
      },
      null
    >;
    recordAICostAndSpend: FunctionReference<
      "mutation",
      "public",
      {
        messageId: string;
        modelId: string;
        periodKey: string;
        providerId: string;
        threadId?: string;
        usage: {
          completionTokens?: number;
          promptTokens?: number;
          totalTokens?: number;
        };
        userId: string;
      },
      { granted: number; remaining: number; spent: number }
    >;
    recordChatAssistantSummaryPublic: FunctionReference<
      "mutation",
      "public",
      { content: string; threadId: string; userId: string },
      { totalMessages: number }
    >;
    recordChatMessage: FunctionReference<
      "mutation",
      "public",
      {
        content: string;
        role: "user" | "assistant";
        threadId: string;
        userId: string;
      },
      { messageId?: string; threadId: string; totalMessages: number }
    >;
    saveAiSettings: FunctionReference<
      "mutation",
      "public",
      {
        embeddingDimension?: number;
        embeddingModel?: string;
        key?: string;
        model: string;
        provider: string;
        ragNamespace?: string;
        systemPrompt?: string;
      },
      { key: string; model: string; provider: string }
    >;
    updateLinkAnalysisRun: FunctionReference<
      "mutation",
      "public",
      {
        completedAt?: number;
        metadata?: any;
        runId: string;
        status: "running" | "completed" | "failed" | "cancelled";
        urlRows: Array<{
          error?: string;
          sourceType: string;
          status: "detected" | "processing" | "completed" | "failed";
          updatedAt: number;
          url: string;
        }>;
      },
      {
        completedAt?: number;
        runId: string;
        status: "running" | "completed" | "failed" | "cancelled";
        updatedAt: number;
      }
    >;
    upsertAiPricing: FunctionReference<
      "mutation",
      "public",
      {
        row: {
          limits: { context: number; output: number };
          modelId: string;
          modelName: string;
          pricing: {
            cache_read?: number;
            cache_write?: number;
            input: number;
            output: number;
            reasoning?: number;
          };
          providerId: string;
          providerName: string;
        };
      },
      {
        deleteCount: number;
        insertCount: number;
        updateCount: number;
        updatedModels: number;
      }
    >;
    upsertEvalThreadReplica: FunctionReference<
      "mutation",
      "public",
      {
        firstMessageAt: number;
        lastMessageAt: number;
        messageCount: number;
        thread: {
          appId: string;
          featureDomain: string;
          organizationId: string;
          sessionId?: string;
          source: string;
          threadKey: string;
        };
      },
      {
        created: boolean;
        firstMessageAt: number;
        lastMessageAt: number;
        messageCount: number;
        threadDocId: string;
      }
    >;
    upsertLangfuseConfig: FunctionReference<
      "mutation",
      "public",
      {
        config: {
          enabled?: boolean;
          host: string;
          ingestionPath?: string;
          publicKey: string;
          secretKey: string;
        };
        scope: { appId: string; featureDomain: string; organizationId: string };
      },
      { configured: boolean; enabled: boolean }
    >;
  };
  queries: {
    getAiSettings: FunctionReference<
      "query",
      "public",
      { key?: string },
      null | {
        embeddingDimension?: number;
        embeddingModel?: string;
        key: string;
        model: string;
        provider: string;
        ragNamespace?: string;
        systemPrompt?: string;
        updatedAt: number;
      }
    >;
    getAllAiPricing: FunctionReference<
      "query",
      "public",
      {},
      Array<{
        lastUpdated: number;
        limits: { context: number; output: number };
        modelId: string;
        modelName: string;
        pricing: {
          cache_read?: number;
          cache_write?: number;
          input: number;
          output: number;
          reasoning?: number;
        };
        providerId: string;
        providerName: string;
      }>
    >;
    getConversationForUser: FunctionReference<
      "query",
      "public",
      { userId: string },
      null | {
        createdAt: number;
        firstMessageAt: number;
        lastMessageAt: number;
        lastMessageRole?: "user" | "assistant";
        lastMessageSnippet?: string;
        threadId: string;
        totalMessages: number;
        updatedAt: number;
        userId: string;
      }
    >;
    getCostsSummaryForUsers: FunctionReference<
      "query",
      "public",
      { userIds: Array<string> },
      { totalCostUsd: number; totalUserCostUsd: number; usersCount: number }
    >;
    getCreditBalance: FunctionReference<
      "query",
      "public",
      { periodKey: string; userId: string },
      {
        granted: number;
        periodKey: string;
        remaining: number;
        spent: number;
        userId: string;
      }
    >;
    getCreditsSummary: FunctionReference<
      "query",
      "public",
      { nearLimitRatio?: number; periodKey: string },
      {
        periodKey: string;
        totalGranted: number;
        totalRemaining: number;
        totalSpent: number;
        usersAtLimit: number;
        usersNearLimit: number;
        usersTracked: number;
      }
    >;
    getEvalThreadStats: FunctionReference<
      "query",
      "public",
      {
        thread: {
          appId: string;
          featureDomain: string;
          organizationId: string;
          threadKey: string;
        };
      },
      null | {
        appId: string;
        featureDomain: string;
        firstMessageAt: number;
        lastMessageAt: number;
        maxSequence?: number;
        messageCount: number;
        organizationId: string;
        sessionId?: string;
        source: string;
        threadDocId: string;
        threadKey: string;
        uniqueMessageKeys: number;
      }
    >;
    getLangfuseConfig: FunctionReference<
      "query",
      "public",
      {
        scope: { appId: string; featureDomain: string; organizationId: string };
      },
      null | {
        enabled: boolean;
        host: string;
        ingestionPath?: string;
        publicKey: string;
        secretKey: string;
      }
    >;
    getLangfusePipelineHealth: FunctionReference<
      "query",
      "public",
      {
        scope: { appId: string; featureDomain: string; organizationId: string };
      },
      {
        failed: number;
        lastDeliveredAt?: number;
        oldestPendingCreatedAt?: number;
        pending: number;
        processing: number;
        sent: number;
        total: number;
      }
    >;
    getLinkAnalysisRun: FunctionReference<
      "query",
      "public",
      { runId: string },
      null | {
        completedAt?: number;
        metadata?: any;
        runId: string;
        sourceUrls: Array<string>;
        startedAt: number;
        status: "running" | "completed" | "failed" | "cancelled";
        threadId: string;
        updatedAt: number;
        urlRows: Array<{
          error?: string;
          sourceType: string;
          status: "detected" | "processing" | "completed" | "failed";
          updatedAt: number;
          url: string;
        }>;
        userId: string;
      }
    >;
    getRagEntryChunks: FunctionReference<
      "query",
      "public",
      { entryId: string; limit?: number },
      Array<{ order: number; text: string }>
    >;
    getThread: FunctionReference<
      "query",
      "public",
      { threadId: string },
      null | {
        createdAt: number;
        status: "active" | "archived";
        summary?: string;
        threadId: string;
        title?: string;
        userId?: string;
      }
    >;
    getUserAiSummary: FunctionReference<
      "query",
      "public",
      { periodKey: string; userId: string },
      {
        granted: number;
        periodKey: string;
        remaining: number;
        spent: number;
        totalCostUsd: number;
        totalRequests: number;
        totalUserCostUsd: number;
        userId: string;
      }
    >;
    listAiLogs: FunctionReference<
      "query",
      "public",
      {
        eventType?: string;
        limit?: number;
        threadId?: string;
        userId?: string;
      },
      Array<{
        _creationTime: number;
        _id: Id<"aiLogs">;
        createdAt: number;
        eventType: string;
        level: string;
        message: string;
        metadata?: any;
        source?: string;
        threadId?: string;
        userId?: string;
      }>
    >;
    listChatMessages: FunctionReference<
      "query",
      "public",
      {
        paginationOpts?: {
          cursor: string | null;
          endCursor?: string | null;
          id?: number;
          maximumBytesRead?: number;
          maximumRowsRead?: number;
          numItems: number;
        };
        streamArgs?:
          | { kind: "list"; startOrder?: number }
          | {
              cursors: Array<{ cursor: number; streamId: string }>;
              kind: "deltas";
            };
        threadId: string;
      },
      {
        continueCursor: string;
        isDone: boolean;
        page: Array<{
          _creationTime: number;
          _id: string;
          agentName?: string;
          embeddingId?: string;
          error?: string;
          fileIds?: Array<string>;
          finishReason?:
            | "stop"
            | "length"
            | "content-filter"
            | "tool-calls"
            | "error"
            | "other"
            | "unknown";
          id?: string;
          message?:
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          image: string | ArrayBuffer;
                          mimeType?: string;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "image";
                        }
                      | {
                          data: string | ArrayBuffer;
                          filename?: string;
                          mimeType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "user";
              }
            | {
                content:
                  | string
                  | Array<
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          text: string;
                          type: "text";
                        }
                      | {
                          data: string | ArrayBuffer;
                          filename?: string;
                          mimeType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "file";
                        }
                      | {
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          signature?: string;
                          text: string;
                          type: "reasoning";
                        }
                      | {
                          data: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          type: "redacted-reasoning";
                        }
                      | {
                          args: any;
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-call";
                        }
                      | {
                          args?: any;
                          experimental_content?: Array<
                            | { text: string; type: "text" }
                            | { data: string; mimeType?: string; type: "image" }
                          >;
                          isError?: boolean;
                          output?:
                            | { type: "text"; value: string }
                            | { type: "json"; value: any }
                            | { type: "error-text"; value: string }
                            | { type: "error-json"; value: any }
                            | {
                                type: "content";
                                value: Array<
                                  | { text: string; type: "text" }
                                  | {
                                      data: string;
                                      mediaType: string;
                                      type: "media";
                                    }
                                >;
                              };
                          providerExecuted?: boolean;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          result?: any;
                          toolCallId: string;
                          toolName: string;
                          type: "tool-result";
                        }
                      | {
                          id: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          sourceType: "url";
                          title?: string;
                          type: "source";
                          url: string;
                        }
                      | {
                          filename?: string;
                          id: string;
                          mediaType: string;
                          providerMetadata?: Record<
                            string,
                            Record<string, any>
                          >;
                          providerOptions?: Record<string, Record<string, any>>;
                          sourceType: "document";
                          title: string;
                          type: "source";
                        }
                    >;
                providerOptions?: Record<string, Record<string, any>>;
                role: "assistant";
              }
            | {
                content: Array<{
                  args?: any;
                  experimental_content?: Array<
                    | { text: string; type: "text" }
                    | { data: string; mimeType?: string; type: "image" }
                  >;
                  isError?: boolean;
                  output?:
                    | { type: "text"; value: string }
                    | { type: "json"; value: any }
                    | { type: "error-text"; value: string }
                    | { type: "error-json"; value: any }
                    | {
                        type: "content";
                        value: Array<
                          | { text: string; type: "text" }
                          | { data: string; mediaType: string; type: "media" }
                        >;
                      };
                  providerExecuted?: boolean;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  result?: any;
                  toolCallId: string;
                  toolName: string;
                  type: "tool-result";
                }>;
                providerOptions?: Record<string, Record<string, any>>;
                role: "tool";
              }
            | {
                content: string;
                providerOptions?: Record<string, Record<string, any>>;
                role: "system";
              };
          model?: string;
          order: number;
          provider?: string;
          providerMetadata?: Record<string, Record<string, any>>;
          providerOptions?: Record<string, Record<string, any>>;
          reasoning?: string;
          reasoningDetails?: Array<
            | {
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                signature?: string;
                text: string;
                type: "reasoning";
              }
            | { signature?: string; text: string; type: "text" }
            | { data: string; type: "redacted" }
          >;
          sources?: Array<
            | {
                id: string;
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "url";
                title?: string;
                type?: "source";
                url: string;
              }
            | {
                filename?: string;
                id: string;
                mediaType: string;
                providerMetadata?: Record<string, Record<string, any>>;
                providerOptions?: Record<string, Record<string, any>>;
                sourceType: "document";
                title: string;
                type: "source";
              }
          >;
          status: "pending" | "success" | "failed";
          stepOrder: number;
          text?: string;
          threadId: string;
          tool: boolean;
          usage?: {
            cachedInputTokens?: number;
            completionTokens: number;
            promptTokens: number;
            reasoningTokens?: number;
            totalTokens: number;
          };
          userId?: string;
          warnings?: Array<
            | { details?: string; setting: string; type: "unsupported-setting" }
            | { details?: string; tool: any; type: "unsupported-tool" }
            | { message: string; type: "other" }
          >;
        }>;
        pageStatus?: "SplitRecommended" | "SplitRequired" | null;
        splitCursor?: string | null;
        streams?:
          | {
              kind: "list";
              messages: Array<{
                agentName?: string;
                format?: "UIMessageChunk" | "TextStreamPart";
                model?: string;
                order: number;
                provider?: string;
                providerOptions?: Record<string, Record<string, any>>;
                status: "streaming" | "finished" | "aborted";
                stepOrder: number;
                streamId: string;
                userId?: string;
              }>;
            }
          | {
              deltas: Array<{
                end: number;
                parts: Array<any>;
                start: number;
                streamId: string;
              }>;
              kind: "deltas";
            };
      }
    >;
    listConversations: FunctionReference<
      "query",
      "public",
      { limit?: number; threadId?: string; userId?: string },
      Array<{
        _creationTime: number;
        _id: Id<"aiChatConversations">;
        createdAt: number;
        firstMessageAt: number;
        lastMessageAt: number;
        lastMessageRole?: "user" | "assistant";
        lastMessageSnippet?: string;
        threadId: string;
        totalMessages: number;
        updatedAt: number;
        userId: string;
      }>
    >;
    listCreditLedger: FunctionReference<
      "query",
      "public",
      { limit?: number; periodKey?: string; userId?: string },
      Array<{
        _creationTime: number;
        _id: Id<"userAiCredits">;
        granted: number;
        periodKey: string;
        spent: number;
        updatedAt: number;
        userId: string;
      }>
    >;
    listEvalThreadMessages: FunctionReference<
      "query",
      "public",
      {
        limit?: number;
        thread: {
          appId: string;
          featureDomain: string;
          organizationId: string;
          threadKey: string;
        };
      },
      Array<{
        content: string;
        costUsd?: number;
        createdAt: number;
        inputTokens?: number;
        messageDocId: string;
        messageKey: string;
        metadata?: any;
        mirroredAt: number;
        modelId?: string;
        modelProvider?: string;
        outputTokens?: number;
        role: "user" | "assistant" | "system";
        sequence: number;
        totalTokens?: number;
      }>
    >;
    listEvalThreadsForScope: FunctionReference<
      "query",
      "public",
      {
        appId: string;
        featureDomain: string;
        limit?: number;
        organizationId: string;
      },
      Array<{
        appId: string;
        createdAt: number;
        featureDomain: string;
        firstMessageAt: number;
        lastMessageAt: number;
        messageCount: number;
        organizationId: string;
        sessionId?: string;
        source: string;
        threadDocId: string;
        threadKey: string;
        updatedAt: number;
      }>
    >;
    listLangfuseFailedOutbox: FunctionReference<
      "query",
      "public",
      {
        limit?: number;
        scope: { appId: string; featureDomain: string; organizationId: string };
      },
      Array<{
        appId: string;
        attempts: number;
        createdAt: number;
        featureDomain: string;
        idempotencyKey: string;
        kind: "generation" | "score";
        lastError?: string;
        maxAttempts: number;
        nextRetryAt: number;
        organizationId: string;
        outboxId: string;
        sequence: number;
        status: "pending" | "processing" | "sent" | "failed";
        threadKey: string;
        updatedAt: number;
      }>
    >;
    listLinkAnalysisRunsForThread: FunctionReference<
      "query",
      "public",
      { limit?: number; threadId: string },
      Array<{
        completedAt?: number;
        metadata?: any;
        runId: string;
        sourceUrls: Array<string>;
        startedAt: number;
        status: "running" | "completed" | "failed" | "cancelled";
        threadId: string;
        updatedAt: number;
        urlRows: Array<{
          error?: string;
          sourceType: string;
          status: "detected" | "processing" | "completed" | "failed";
          updatedAt: number;
          url: string;
        }>;
        userId: string;
      }>
    >;
    listRagEntries: FunctionReference<
      "query",
      "public",
      { limit?: number; namespaceId: string },
      Array<{
        _creationTime: number;
        _id: string;
        importance: number;
        key?: string;
        status: string;
        title?: string;
      }>
    >;
    listRagNamespaces: FunctionReference<
      "query",
      "public",
      {},
      Array<{
        _id: string;
        dimension: number;
        modelId: string;
        namespace: string;
        status: string;
      }>
    >;
    listThreadMessages: FunctionReference<
      "query",
      "public",
      { limit?: number; threadId: string },
      Array<{
        _id: string;
        content: string;
        createdAt: number;
        role: "user" | "assistant";
      }>
    >;
  };
} = anyApi as any;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export const internal: {
  mutations: {
    recordChatAssistantSummary: FunctionReference<
      "mutation",
      "internal",
      { content: string; threadId: string; userId: string },
      { totalMessages: number }
    >;
  };
} = anyApi as any;

export const components = componentsGeneric() as unknown as {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  rag: import("@convex-dev/rag/_generated/component.js").ComponentApi<"rag">;
  neutralCost: import("neutral-cost/_generated/component.js").ComponentApi<"neutralCost">;
  langfuse: import("../../packages/plugin-langfuse/src/convex/component/_generated/component.js").ComponentApi<"langfuse">;
};
