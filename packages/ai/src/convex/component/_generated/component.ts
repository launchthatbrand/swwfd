/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    actions: {
      addRagContent: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          importance?: number;
          key: string;
          metadata?: Record<string, any>;
          namespace: string;
          text: string;
          title?: string;
        },
        { created: boolean; entryId: string; status: string },
        Name
      >;
      auditLangfuseExportParity: FunctionReference<
        "action",
        "internal",
        {
          scope: {
            appId: string;
            featureDomain: string;
            organizationId: string;
          };
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
        },
        Name
      >;
      backfillLangfuseFromAiEval: FunctionReference<
        "action",
        "internal",
        {
          perThreadMessageLimit?: number;
          scope: {
            appId: string;
            featureDomain: string;
            organizationId: string;
          };
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
        },
        Name
      >;
      deleteRagEntrySync: FunctionReference<
        "action",
        "internal",
        { entryId: string },
        null,
        Name
      >;
      drainLangfuseOutbox: FunctionReference<
        "action",
        "internal",
        { limit?: number },
        {
          claimed: number;
          duplicated: number;
          failed: number;
          requeued: number;
          sent: number;
        },
        Name
      >;
      runAgentStep: FunctionReference<
        "action",
        "internal",
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
        { ok: boolean },
        Name
      >;
      searchRag: FunctionReference<
        "action",
        "internal",
        { apiKey: string; limit?: number; namespace: string; query: string },
        Array<{ key?: string; score: number; text: string; title?: string }>,
        Name
      >;
      syncPricingFromProviders: FunctionReference<
        "action",
        "internal",
        { envKeys?: Record<string, string> },
        {
          deleteCount: number;
          insertCount: number;
          updateCount: number;
          updatedModels: number;
        },
        Name
      >;
    };
    mutations: {
      assertAndSpendTokens: FunctionReference<
        "mutation",
        "internal",
        { periodKey: string; tokens: number; userId: string },
        {
          granted: number;
          periodKey: string;
          remaining: number;
          spent: number;
          userId: string;
        },
        Name
      >;
      beginLinkAnalysisRun: FunctionReference<
        "mutation",
        "internal",
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
        },
        Name
      >;
      createChatThread: FunctionReference<
        "mutation",
        "internal",
        { title?: string; userId: string },
        { createdAt: number; threadId: string },
        Name
      >;
      deleteRagEntry: FunctionReference<
        "mutation",
        "internal",
        { entryId: string },
        null,
        Name
      >;
      getOrCreateChatThread: FunctionReference<
        "mutation",
        "internal",
        { title?: string; userId: string },
        { created: boolean; threadId: string },
        Name
      >;
      grantMonthlyCredits: FunctionReference<
        "mutation",
        "internal",
        { amount: number; periodKey: string; userId: string },
        {
          granted: number;
          periodKey: string;
          remaining: number;
          spent: number;
          userId: string;
        },
        Name
      >;
      importChatThreadMessages: FunctionReference<
        "mutation",
        "internal",
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
        },
        Name
      >;
      ingestExternalEvalMessage: FunctionReference<
        "mutation",
        "internal",
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
        },
        Name
      >;
      logAiEventPublic: FunctionReference<
        "mutation",
        "internal",
        {
          eventType: string;
          level?: string;
          message: string;
          metadata?: any;
          source?: string;
          threadId?: string;
          userId?: string;
        },
        null,
        Name
      >;
      recordAICostAndSpend: FunctionReference<
        "mutation",
        "internal",
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
        { granted: number; remaining: number; spent: number },
        Name
      >;
      recordChatAssistantSummaryPublic: FunctionReference<
        "mutation",
        "internal",
        { content: string; threadId: string; userId: string },
        { totalMessages: number },
        Name
      >;
      recordChatMessage: FunctionReference<
        "mutation",
        "internal",
        {
          content: string;
          role: "user" | "assistant";
          threadId: string;
          userId: string;
        },
        { messageId?: string; threadId: string; totalMessages: number },
        Name
      >;
      saveAiSettings: FunctionReference<
        "mutation",
        "internal",
        {
          embeddingDimension?: number;
          embeddingModel?: string;
          key?: string;
          model: string;
          provider: string;
          ragNamespace?: string;
          systemPrompt?: string;
        },
        { key: string; model: string; provider: string },
        Name
      >;
      updateLinkAnalysisRun: FunctionReference<
        "mutation",
        "internal",
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
        },
        Name
      >;
      upsertAiPricing: FunctionReference<
        "mutation",
        "internal",
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
        },
        Name
      >;
      upsertEvalThreadReplica: FunctionReference<
        "mutation",
        "internal",
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
        },
        Name
      >;
      upsertLangfuseConfig: FunctionReference<
        "mutation",
        "internal",
        {
          config: {
            enabled?: boolean;
            host: string;
            ingestionPath?: string;
            publicKey: string;
            secretKey: string;
          };
          scope: {
            appId: string;
            featureDomain: string;
            organizationId: string;
          };
        },
        { configured: boolean; enabled: boolean },
        Name
      >;
    };
    queries: {
      getAiSettings: FunctionReference<
        "query",
        "internal",
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
        },
        Name
      >;
      getAllAiPricing: FunctionReference<
        "query",
        "internal",
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
        }>,
        Name
      >;
      getConversationForUser: FunctionReference<
        "query",
        "internal",
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
        },
        Name
      >;
      getCostsSummaryForUsers: FunctionReference<
        "query",
        "internal",
        { userIds: Array<string> },
        { totalCostUsd: number; totalUserCostUsd: number; usersCount: number },
        Name
      >;
      getCreditBalance: FunctionReference<
        "query",
        "internal",
        { periodKey: string; userId: string },
        {
          granted: number;
          periodKey: string;
          remaining: number;
          spent: number;
          userId: string;
        },
        Name
      >;
      getCreditsSummary: FunctionReference<
        "query",
        "internal",
        { nearLimitRatio?: number; periodKey: string },
        {
          periodKey: string;
          totalGranted: number;
          totalRemaining: number;
          totalSpent: number;
          usersAtLimit: number;
          usersNearLimit: number;
          usersTracked: number;
        },
        Name
      >;
      getEvalThreadStats: FunctionReference<
        "query",
        "internal",
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
        },
        Name
      >;
      getLangfuseConfig: FunctionReference<
        "query",
        "internal",
        {
          scope: {
            appId: string;
            featureDomain: string;
            organizationId: string;
          };
        },
        null | {
          enabled: boolean;
          host: string;
          ingestionPath?: string;
          publicKey: string;
          secretKey: string;
        },
        Name
      >;
      getLangfusePipelineHealth: FunctionReference<
        "query",
        "internal",
        {
          scope: {
            appId: string;
            featureDomain: string;
            organizationId: string;
          };
        },
        {
          failed: number;
          lastDeliveredAt?: number;
          oldestPendingCreatedAt?: number;
          pending: number;
          processing: number;
          sent: number;
          total: number;
        },
        Name
      >;
      getLinkAnalysisRun: FunctionReference<
        "query",
        "internal",
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
        },
        Name
      >;
      getRagEntryChunks: FunctionReference<
        "query",
        "internal",
        { entryId: string; limit?: number },
        Array<{ order: number; text: string }>,
        Name
      >;
      getThread: FunctionReference<
        "query",
        "internal",
        { threadId: string },
        null | {
          createdAt: number;
          status: "active" | "archived";
          summary?: string;
          threadId: string;
          title?: string;
          userId?: string;
        },
        Name
      >;
      getUserAiSummary: FunctionReference<
        "query",
        "internal",
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
        },
        Name
      >;
      listAiLogs: FunctionReference<
        "query",
        "internal",
        {
          eventType?: string;
          limit?: number;
          threadId?: string;
          userId?: string;
        },
        Array<{
          _creationTime: number;
          _id: string;
          createdAt: number;
          eventType: string;
          level: string;
          message: string;
          metadata?: any;
          source?: string;
          threadId?: string;
          userId?: string;
        }>,
        Name
      >;
      listChatMessages: FunctionReference<
        "query",
        "internal",
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
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            image: string | ArrayBuffer;
                            mimeType?: string;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
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
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
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
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
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
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
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
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "redacted-reasoning";
                          }
                        | {
                            args: any;
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-call";
                          }
                        | {
                            args?: any;
                            experimental_content?: Array<
                              | { text: string; type: "text" }
                              | {
                                  data: string;
                                  mimeType?: string;
                                  type: "image";
                                }
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
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
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
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
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
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
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
              | {
                  details?: string;
                  setting: string;
                  type: "unsupported-setting";
                }
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
        },
        Name
      >;
      listConversations: FunctionReference<
        "query",
        "internal",
        { limit?: number; threadId?: string; userId?: string },
        Array<{
          _creationTime: number;
          _id: string;
          createdAt: number;
          firstMessageAt: number;
          lastMessageAt: number;
          lastMessageRole?: "user" | "assistant";
          lastMessageSnippet?: string;
          threadId: string;
          totalMessages: number;
          updatedAt: number;
          userId: string;
        }>,
        Name
      >;
      listCreditLedger: FunctionReference<
        "query",
        "internal",
        { limit?: number; periodKey?: string; userId?: string },
        Array<{
          _creationTime: number;
          _id: string;
          granted: number;
          periodKey: string;
          spent: number;
          updatedAt: number;
          userId: string;
        }>,
        Name
      >;
      listEvalThreadMessages: FunctionReference<
        "query",
        "internal",
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
        }>,
        Name
      >;
      listEvalThreadsForScope: FunctionReference<
        "query",
        "internal",
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
        }>,
        Name
      >;
      listLangfuseFailedOutbox: FunctionReference<
        "query",
        "internal",
        {
          limit?: number;
          scope: {
            appId: string;
            featureDomain: string;
            organizationId: string;
          };
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
        }>,
        Name
      >;
      listLinkAnalysisRunsForThread: FunctionReference<
        "query",
        "internal",
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
        }>,
        Name
      >;
      listRagEntries: FunctionReference<
        "query",
        "internal",
        { limit?: number; namespaceId: string },
        Array<{
          _creationTime: number;
          _id: string;
          importance: number;
          key?: string;
          status: string;
          title?: string;
        }>,
        Name
      >;
      listRagNamespaces: FunctionReference<
        "query",
        "internal",
        {},
        Array<{
          _id: string;
          dimension: number;
          modelId: string;
          namespace: string;
          status: string;
        }>,
        Name
      >;
      listThreadMessages: FunctionReference<
        "query",
        "internal",
        { limit?: number; threadId: string },
        Array<{
          _id: string;
          content: string;
          createdAt: number;
          role: "user" | "assistant";
        }>,
        Name
      >;
    };
  };
