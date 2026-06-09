import { Agent, createTool } from "@convex-dev/agent";
import { ConvexError, v } from "convex/values";
import { api, components, internal } from "./_generated/api";

import { CostComponent } from "neutral-cost";
import type { FunctionHandle } from "convex/server";
import { action } from "./server";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

const costs = new CostComponent(components.neutralCost as any);

const DEFAULT_ADMIN_SYSTEM_PROMPT =
  "You are an admin AI assistant for TraderLaunchpad. When the user asks about recent news or an instrument (e.g., USDJPY), always call fetchNewsEvents with the exact symbol provided. Do not change the symbol. Use concise, actionable answers.";

const GOOGLE_CHAT_PRIMARY_MODEL = "gemini-2.5-flash";
const GOOGLE_CHAT_FALLBACK_MODEL = "gemini-1.5-pro";
const GOOGLE_DEFAULT_EMBEDDING_DIMENSION = 3072;

const normalizeGoogleChatModelId = (modelId: string) => {
  if (modelId === "models/gemini-2.0-flash" || modelId === "gemini-2.0-flash") {
    return GOOGLE_CHAT_PRIMARY_MODEL;
  }
  if (modelId.startsWith("models/")) {
    return modelId.slice("models/".length);
  }
  return modelId;
};

const isMissingModelPricingError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Pricing not found for model") ||
    message.includes("No pricing found for modelId")
  );
};

const fetchNewsEventsSchema = z.object({
  symbol: z.string().optional(),
  fromMs: z.number().optional(),
  toMs: z.number().optional(),
  limit: z.number().optional(),
  eventType: z.string().optional(),
});

const strategyRuleSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.enum(["Entry", "Risk", "Exit", "Process", "Psychology"]),
  severity: z.enum(["hard", "soft"]),
});

const strategySessionSchema = z.object({
  id: z.string(),
  label: z.string(),
  timezone: z.string(),
  days: z.array(z.string()),
  start: z.string(),
  end: z.string(),
});

const updateStrategySummarySchema = z.object({
  strategyId: z.string(),
  summary: z.string(),
});

const updateStrategyRiskSchema = z.object({
  strategyId: z.string(),
  risk: z.object({
    maxRiskPerTradePct: z.number(),
    maxDailyLossPct: z.number(),
    maxWeeklyLossPct: z.number(),
    maxOpenPositions: z.number(),
    maxTradesPerDay: z.number(),
  }),
});

const addStrategyRuleSchema = z.object({
  strategyId: z.string(),
  rule: strategyRuleSchema,
});

const updateStrategyRuleSchema = z.object({
  strategyId: z.string(),
  ruleId: z.string(),
  rule: strategyRuleSchema,
});

const removeStrategyRuleSchema = z.object({
  strategyId: z.string(),
  ruleId: z.string(),
});

const addStrategySessionSchema = z.object({
  strategyId: z.string(),
  session: strategySessionSchema,
});

const updateStrategySessionSchema = z.object({
  strategyId: z.string(),
  sessionId: z.string(),
  session: strategySessionSchema,
});

const createStrategyVersionSchema = z.object({
  strategyId: z.string(),
  name: z.string().optional(),
  summary: z.string().optional(),
  spec: z.any().optional(),
});

const componentsAny = components as any;

const normalizeSymbol = (value: string): string =>
  value.replace(/[^A-Z0-9]/g, "").toUpperCase();

const extractSymbolFromPrompt = (value: string): string | undefined => {
  const match = value.toUpperCase().match(/[A-Z]{3}\/?[A-Z]{3}/);
  if (!match) return undefined;
  return normalizeSymbol(match[0]);
};

const normalizeNewsRows = async (
  ctx: any,
  args: z.infer<typeof fetchNewsEventsSchema>,
  options?: {
    newsEventsHandle?: string;
    orgIdOrSlug?: string;
    includeSources?: boolean;
  },
) => {
  const limit = Math.max(1, Math.min(Number(args.limit ?? 50), 200));
  const rawSymbol =
    typeof args.symbol === "string" ? args.symbol.trim().toUpperCase() : "";
  const normalizedSymbol = rawSymbol.replace(/[^A-Z0-9]/g, "");
  const symbolCandidates = Array.from(
    new Set([rawSymbol, normalizedSymbol].filter(Boolean)),
  );

  let rows: any[] = [];
  const newsEventsHandle = options?.newsEventsHandle;
  const orgIdOrSlug = options?.orgIdOrSlug;
  const includeSources = options?.includeSources ?? true;

  if (newsEventsHandle) {
    const handle = newsEventsHandle as FunctionHandle<"action">;
    for (const candidate of symbolCandidates) {
      const candidateRows = await ctx.runAction(handle, {
        symbol: candidate,
        fromMs: args.fromMs,
        toMs: args.toMs,
        limit,
        eventType: args.eventType,
        orgIdOrSlug,
      });
      rows = Array.isArray(candidateRows) ? candidateRows : [];
      console.info("[launchthat-ai] fetchNewsEvents:appAction", {
        candidate,
        count: rows.length,
      });
      if (rows.length > 0) {
        break;
      }
    }

    if (!rows.length) {
      const fallbackRows = await ctx.runAction(handle, {
        fromMs: args.fromMs ?? Date.now() - 7 * 24 * 60 * 60 * 1000,
        toMs: args.toMs ?? Date.now() + 7 * 24 * 60 * 60 * 1000,
        limit,
        eventType: args.eventType,
        orgIdOrSlug,
      });
      const list = Array.isArray(fallbackRows) ? fallbackRows : [];
      console.info("[launchthat-ai] fetchNewsEvents:appAction:fallback", {
        count: list.length,
        sampleCurrencies: Array.from(
          new Set(
            list
              .map((row: any) =>
                typeof row?.currency === "string"
                  ? row.currency.toUpperCase()
                  : "",
              )
              .filter(Boolean),
          ),
        ).slice(0, 10),
      });
      if (rawSymbol.length === 6 || normalizedSymbol.length === 6) {
        const base = (normalizedSymbol || rawSymbol).slice(0, 3);
        const quote = (normalizedSymbol || rawSymbol).slice(3, 6);
        rows = list.filter((row: any) => {
          const currency =
            typeof row?.currency === "string" ? row.currency.toUpperCase() : "";
          return currency === base || currency === quote;
        });
      } else {
        rows = list;
      }
    }
  } else {
    for (const candidate of symbolCandidates) {
      const candidateRows = await ctx.runQuery(
        componentsAny.news.events.queries.listEventsForSymbol,
        {
          symbol: candidate,
          fromMs: args.fromMs,
          toMs: args.toMs,
          limit,
        },
      );
      rows = Array.isArray(candidateRows) ? candidateRows : [];
      if (rows.length > 0) {
        break;
      }
    }

    if (!rows.length) {
      const fallbackRows = await ctx.runQuery(
        componentsAny.news.events.queries.listEventsGlobal,
        {
          fromMs: args.fromMs ?? Date.now() - 7 * 24 * 60 * 60 * 1000,
          toMs: args.toMs ?? Date.now() + 7 * 24 * 60 * 60 * 1000,
          limit,
          eventType: args.eventType,
        },
      );
      const list = Array.isArray(fallbackRows) ? fallbackRows : [];
      if (rawSymbol.length === 6 || normalizedSymbol.length === 6) {
        const base = (normalizedSymbol || rawSymbol).slice(0, 3);
        const quote = (normalizedSymbol || rawSymbol).slice(3, 6);
        rows = list.filter((row: any) => {
          const currency =
            typeof row?.currency === "string" ? row.currency.toUpperCase() : "";
          return currency === base || currency === quote;
        });
      } else {
        rows = list;
      }
    }
  }

  const list = Array.isArray(rows) ? rows : [];
  const results = await Promise.all(
    list.map(async (row: any) => {
      const eventId = String(row?.eventId ?? row?._id ?? "");
      const embeddedSources = Array.isArray(row?.sources) ? row.sources : undefined;
      let sources:
        | {
          sourceKey: string;
          url?: string;
        }[]
        | undefined;
      if (includeSources && eventId) {
        const sourceRows: any[] = await ctx.runQuery(
          componentsAny.news.events.queries.listSourcesForEvent,
          { eventId },
        );
        sources = (Array.isArray(sourceRows) ? sourceRows : []).map((s: any) => ({
          sourceKey: String(s?.sourceKey ?? ""),
          url: typeof s?.url === "string" ? s.url : undefined,
        }));
      } else if (!includeSources && embeddedSources) {
        sources = embeddedSources.map((s: any) => ({
          sourceKey: String(s?.sourceKey ?? ""),
          url: typeof s?.url === "string" ? s.url : undefined,
        }));
      }
      return {
        eventId,
        eventType: String(row?.eventType ?? ""),
        title: String(row?.title ?? ""),
        summary: typeof row?.summary === "string" ? row.summary : undefined,
        publishedAt:
          typeof row?.publishedAt === "number" ? row.publishedAt : undefined,
        startsAt: typeof row?.startsAt === "number" ? row.startsAt : undefined,
        impact: typeof row?.impact === "string" ? row.impact : undefined,
        country: typeof row?.country === "string" ? row.country : undefined,
        currency: typeof row?.currency === "string" ? row.currency : undefined,
        sources,
      };
    }),
  );
  return results;
};

const resolveAdminAiConfig = async (
  ctx: any,
): Promise<{ modelId: string; providerId: string }> => {
  const settings = (await ctx.runQuery(api.queries.getAiSettings, {})) as {
    provider?: string;
    model?: string;
  } | null;
  const providerId =
    typeof settings?.provider === "string" && settings.provider.length > 0
      ? settings.provider
      : "openai";
  let modelId =
    typeof settings?.model === "string" && settings.model.length > 0
      ? settings.model
      : providerId === "google"
        ? GOOGLE_CHAT_PRIMARY_MODEL
        : "gpt-4o-mini";
  if (providerId === "google") {
    modelId = normalizeGoogleChatModelId(modelId);
  }
  return {
    modelId,
    providerId,
  };
};

const normalizeRagImportance = (importance?: number): number => {
  const parsed = Number(importance ?? 1);
  if (!Number.isFinite(parsed)) {
    return 1;
  }
  return Math.max(0, Math.min(1, parsed));
};

const createRagClient = (args: {
  providerId: string;
  apiKey: string;
  embeddingModel: string;
  embeddingDimension: number;
  RAGCtor: any;
}) => {
  if (args.providerId === "google") {
    const google = createGoogleGenerativeAI({ apiKey: args.apiKey });
    return new args.RAGCtor(components.rag as any, {
      // Use Google's native embedding defaults (3072 dimensions unless the
      // model itself changes) to avoid forced truncation.
      textEmbeddingModel: google.embeddingModel(args.embeddingModel),
      embeddingDimension: args.embeddingDimension,
    });
  }

  const openai = createOpenAI({ apiKey: args.apiKey });
  return new args.RAGCtor(components.rag as any, {
    textEmbeddingModel: openai.embedding(args.embeddingModel),
    embeddingDimension: args.embeddingDimension,
  });
};

const periodKeyForDate = (ts: number): string => {
  const d = new Date(ts);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

export const syncPricingFromProviders = action({
  args: {
    envKeys: v.optional(v.record(v.string(), v.string())),
  },
  returns: v.object({
    updatedModels: v.number(),
    insertCount: v.number(),
    updateCount: v.number(),
    deleteCount: v.number(),
  }),
  handler: async (ctx: any, args: { envKeys?: Record<string, string> }) => {
    return await costs.updatePricingData(ctx as any, args.envKeys);
  },
});

export const runAgentStep = action({
  args: {
    userId: v.string(),
    threadId: v.string(),
    promptMessageId: v.string(),
    system: v.optional(v.string()),
    apiKey: v.optional(v.string()),
    strategyTools: v.optional(
      v.object({
        updateSummaryHandle: v.string(),
        updateRiskHandle: v.string(),
        addRuleHandle: v.string(),
        updateRuleHandle: v.string(),
        removeRuleHandle: v.string(),
        addSessionHandle: v.string(),
        updateSessionHandle: v.string(),
        createVersionHandle: v.string(),
        upsertAnnotationHandle: v.string(),
        deleteAnnotationHandle: v.string(),
      }),
    ),
    newsEventsHandle: v.optional(v.string()),
    orgIdOrSlug: v.optional(v.string()),
  },
  returns: v.object({
    ok: v.boolean(),
  }),
  handler: async (
    ctx: any,
    args: {
      userId: string;
      threadId: string;
      promptMessageId: string;
      system?: string;
      apiKey?: string;
      strategyTools?: {
        updateSummaryHandle: string;
        updateRiskHandle: string;
        addRuleHandle: string;
        updateRuleHandle: string;
        removeRuleHandle: string;
        addSessionHandle: string;
        updateSessionHandle: string;
        createVersionHandle: string;
        upsertAnnotationHandle: string;
        deleteAnnotationHandle: string;
      };
      newsEventsHandle?: string;
      orgIdOrSlug?: string;
    },
  ) => {
    const writeAssistantMessage = async (message: string) => {
      try {
        await ctx.runMutation(api.mutations.recordChatMessage, {
          userId: args.userId,
          threadId: args.threadId,
          role: "assistant",
          content: message,
        });
      } catch (error) {
        console.error("[launchthat-ai] runAgentStep:assistantMessage:write", {
          userId: args.userId,
          threadId: args.threadId,
          promptMessageId: args.promptMessageId,
          error,
        });
      }
    };
    const writeAssistantError = async (message: string) => {
      await writeAssistantMessage(message);
    };
    const logAiEvent = async (payload: {
      eventType: string;
      level?: string;
      message: string;
      metadata?: unknown;
    }) => {
      try {
        await ctx.runMutation(api.mutations.logAiEventPublic, {
          eventType: payload.eventType,
          level: payload.level,
          message: payload.message,
          userId: args.userId,
          threadId: args.threadId,
          metadata: payload.metadata,
          source: "launchthat_ai.runAgentStep",
        });
      } catch (error) {
        console.error("[launchthat-ai] runAgentStep:log:error", {
          userId: args.userId,
          threadId: args.threadId,
          promptMessageId: args.promptMessageId,
          error,
        });
      }
    };

    const { modelId, providerId } = await resolveAdminAiConfig(ctx);
    const apiKey = args.apiKey;
    if (!apiKey) {
      await logAiEvent({
        eventType: "auth.missing_api_key",
        level: "error",
        message: "Missing API key",
      });
      throw new ConvexError("AI_MISSING_API_KEY");
    }

    const periodKey = periodKeyForDate(Date.now());
    const balance = await ctx.runQuery(api.queries.getCreditBalance, {
      userId: args.userId,
      periodKey,
    });
    // Only enforce monthly caps when a grant is configured.
    // If granted is 0 (no ledger row / unlimited mode), allow requests.
    if (balance.granted > 0 && balance.remaining <= 0) {
      await logAiEvent({
        eventType: "credits.blocked",
        level: "warn",
        message: `Credits exhausted for ${periodKey}`,
        metadata: {
          periodKey,
          granted: balance.granted,
          spent: balance.spent,
          remaining: balance.remaining,
        },
      });
      await writeAssistantError(
        `Sorry, you are out of AI credits for ${periodKey}.`,
      );
      return { ok: false };
    }

    console.info("[launchthat-ai] runAgentStep:start", {
      userId: args.userId,
      threadId: args.threadId,
      promptMessageId: args.promptMessageId,
      hasSystem: typeof args.system === "string" && args.system.length > 0,
      hasApiKey: Boolean(apiKey),
    });
    await logAiEvent({
      eventType: "request.start",
      message: "AI request started",
      metadata: {
        promptMessageId: args.promptMessageId,
        hasSystem: typeof args.system === "string" && args.system.length > 0,
      },
    });

    type AgentConfig = ConstructorParameters<typeof Agent>[1];
    type StreamTextArgs = Parameters<Agent["streamText"]>[2];
    let languageModel: AgentConfig["languageModel"];
    if (providerId === "google") {
      const google = createGoogleGenerativeAI({ apiKey });
      languageModel = google(modelId) as unknown as AgentConfig["languageModel"];
    } else {
      const openai = createOpenAI({ apiKey });
      languageModel = openai.chat(
        modelId,
      ) as unknown as AgentConfig["languageModel"];
    }
    type LastToolCall = {
      symbol?: string;
      resultCount: number;
      results: unknown[];
    };
    let lastToolCall: LastToolCall | null = null;
    const promptMessages = await ctx.runQuery(
      components.agent.messages.getMessagesByIds,
      { messageIds: [args.promptMessageId] },
    );
    const promptMessage = Array.isArray(promptMessages) ? promptMessages[0] : null;
    let promptText = "";
    const messageContent = promptMessage?.message?.content;
    if (typeof messageContent === "string") {
      promptText = messageContent;
    } else if (Array.isArray(messageContent)) {
      promptText = messageContent
        .map((part: any) =>
          typeof part?.text === "string" ? String(part.text) : "",
        )
        .filter(Boolean)
        .join("\n");
    }
    const forcedSymbol = promptText ? extractSymbolFromPrompt(promptText) : undefined;

    const shouldUseGoogleDirectPath = false;
    if (shouldUseGoogleDirectPath) {
      const google = createGoogleGenerativeAI({ apiKey });
      const runGoogleGenerate = async (selectedModelId: string) => {
        return await generateText({
          model: google(selectedModelId),
          system: args.system ?? DEFAULT_ADMIN_SYSTEM_PROMPT,
          prompt: promptText || "Continue.",
        });
      };

      let googleResponse: Awaited<ReturnType<typeof runGoogleGenerate>>;
      let effectiveModelId = normalizeGoogleChatModelId(modelId);
      try {
        googleResponse = await runGoogleGenerate(effectiveModelId);
      } catch (error) {
        const errorMessage = String(error);
        if (errorMessage.includes("no longer available") || errorMessage.includes("NOT_FOUND")) {
          effectiveModelId =
            effectiveModelId === GOOGLE_CHAT_PRIMARY_MODEL
              ? GOOGLE_CHAT_FALLBACK_MODEL
              : GOOGLE_CHAT_PRIMARY_MODEL;
          await logAiEvent({
            eventType: "model.fallback",
            level: "warn",
            message: "Google model fallback applied",
            metadata: { fromModelId: modelId, toModelId: effectiveModelId },
          });
          googleResponse = await runGoogleGenerate(effectiveModelId);
        } else {
          throw error;
        }
      }

      const assistantText = (googleResponse.text ?? "").trim();
      if (!assistantText) {
        await writeAssistantError(
          "The assistant could not generate a response. Please try again.",
        );
        return { ok: false };
      }

      const messageResult = await ctx.runMutation(api.mutations.recordChatMessage, {
        userId: args.userId,
        threadId: args.threadId,
        role: "assistant",
        content: assistantText,
      });

      await ctx.runMutation(internal.mutations.recordChatAssistantSummary, {
        userId: args.userId,
        threadId: args.threadId,
        content: assistantText,
      });

      await logAiEvent({
        eventType: "response.complete",
        message: "AI response completed",
        metadata: { textLength: assistantText.length },
      });

      const usage = googleResponse.usage as
        | {
          promptTokens?: number;
          completionTokens?: number;
          totalTokens?: number;
          inputTokens?: number;
          outputTokens?: number;
        }
        | undefined;

      const promptTokens =
        typeof usage?.promptTokens === "number"
          ? usage.promptTokens
          : typeof usage?.inputTokens === "number"
            ? usage.inputTokens
            : 0;
      const completionTokens =
        typeof usage?.completionTokens === "number"
          ? usage.completionTokens
          : typeof usage?.outputTokens === "number"
            ? usage.outputTokens
            : 0;
      const totalTokens =
        typeof usage?.totalTokens === "number"
          ? usage.totalTokens
          : promptTokens + completionTokens;

      const assistantMessageId =
        typeof messageResult?.messageId === "string" &&
          messageResult.messageId.length > 0
          ? messageResult.messageId
          : args.promptMessageId;

      if (totalTokens > 0) {
        await logAiEvent({
          eventType: "usage.recorded",
          message: "Usage recorded",
          metadata: {
            promptTokens,
            completionTokens,
            totalTokens,
            modelId: effectiveModelId,
            providerId,
          },
        });

        try {
          await costs.addAICost(ctx as any, {
            messageId: assistantMessageId,
            userId: args.userId,
            threadId: args.threadId ?? assistantMessageId,
            usage: {
              promptTokens,
              completionTokens,
              totalTokens,
            },
            modelId: effectiveModelId,
            providerId,
          });

          await ctx.runMutation(api.mutations.recordAICostAndSpend, {
            userId: args.userId,
            periodKey,
            messageId: assistantMessageId,
            threadId: args.threadId,
            modelId: effectiveModelId,
            providerId,
            usage: {
              promptTokens,
              completionTokens,
              totalTokens,
            },
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const errorData =
            (error as { data?: unknown } | null | undefined)?.data;
          const isCreditError =
            typeof errorData === "string"
              ? errorData === "AI_CREDITS_EXHAUSTED"
              : errorMessage.includes("AI_CREDITS_EXHAUSTED");
          if (isCreditError) {
            await logAiEvent({
              eventType: "credits.exhausted",
              level: "warn",
              message: `Credits exhausted for ${periodKey}`,
              metadata: { periodKey },
            });
            await writeAssistantError(
              `Sorry, you are out of AI credits for ${periodKey}.`,
            );
            return { ok: false };
          }
          if (isMissingModelPricingError(error)) {
            await logAiEvent({
              eventType: "usage.pricing_missing",
              level: "warn",
              message: "Skipping cost recording due to missing model pricing",
              metadata: { modelId: effectiveModelId, providerId },
            });
          } else {
            throw error;
          }
        }
      }

      return { ok: true };
    }

    const newsTool = createTool({
      description:
        "Fetch recent news or economic events globally or for a symbol.",
      args: fetchNewsEventsSchema,
      handler: async (toolCtx, toolArgs) => {
        const rawSymbol =
          typeof toolArgs?.symbol === "string" ? toolArgs.symbol : undefined;
        const nextSymbol = forcedSymbol ?? rawSymbol;
        console.info("[launchthat-ai] fetchNewsEvents:call", {
          userId: toolCtx.userId,
          threadId: toolCtx.threadId,
          args: { ...toolArgs, symbol: nextSymbol },
        });
        await logAiEvent({
          eventType: "tool.call",
          message: "fetchNewsEvents called",
          metadata: { tool: "fetchNewsEvents", args: { ...toolArgs, symbol: nextSymbol } },
        });
        try {
          const normalizedArgs = {
            ...toolArgs,
            symbol: nextSymbol,
          };
          const results = await normalizeNewsRows(toolCtx, normalizedArgs, {
            newsEventsHandle: args.newsEventsHandle,
            orgIdOrSlug: args.orgIdOrSlug,
            includeSources: !args.newsEventsHandle,
          });
          const resultList = Array.isArray(results) ? results : [];
          lastToolCall = {
            symbol:
              typeof toolArgs?.symbol === "string" ? toolArgs.symbol : undefined,
            resultCount: resultList.length,
            results: resultList,
          };
          await logAiEvent({
            eventType: "tool.result",
            message: "fetchNewsEvents returned",
            metadata: {
              tool: "fetchNewsEvents",
              count: resultList.length,
            },
          });
          return resultList;
        } catch (error) {
          console.error("[launchthat-ai] fetchNewsEvents:error", {
            userId: toolCtx.userId,
            threadId: toolCtx.threadId,
            error,
          });
          await logAiEvent({
            eventType: "tool.error",
            level: "error",
            message: "fetchNewsEvents failed",
            metadata: { tool: "fetchNewsEvents", error: String(error) },
          });
          return [];
        }
      },
    });

    const callStrategyHandle = async (
      handle: string | undefined,
      toolName: string,
      payload: unknown,
    ) => {
      if (!handle) {
        await logAiEvent({
          eventType: "tool.error",
          level: "error",
          message: `${toolName} missing handle`,
          metadata: { tool: toolName },
        });
        return { ok: false, error: "missing_handle" };
      }
      try {
        const result = await ctx.runMutation(handle as FunctionHandle<"mutation">, payload);
        await logAiEvent({
          eventType: "tool.result",
          message: `${toolName} returned`,
          metadata: { tool: toolName },
        });
        return result;
      } catch (error) {
        await logAiEvent({
          eventType: "tool.error",
          level: "error",
          message: `${toolName} failed`,
          metadata: { tool: toolName, error: String(error) },
        });
        return { ok: false, error: String(error) };
      }
    };

    const updateStrategySummaryTool = createTool({
      description: "Update the strategy summary.",
      args: updateStrategySummarySchema,
      handler: async (_toolCtx, toolArgs) =>
        await callStrategyHandle(
          args.strategyTools?.updateSummaryHandle,
          "updateStrategySummary",
          toolArgs,
        ),
    });

    const updateStrategyRiskTool = createTool({
      description: "Update the strategy risk limits.",
      args: updateStrategyRiskSchema,
      handler: async (_toolCtx, toolArgs) =>
        await callStrategyHandle(
          args.strategyTools?.updateRiskHandle,
          "updateStrategyRisk",
          toolArgs,
        ),
    });

    const addStrategyRuleTool = createTool({
      description: "Add a rule to the strategy.",
      args: addStrategyRuleSchema,
      handler: async (_toolCtx, toolArgs) =>
        await callStrategyHandle(
          args.strategyTools?.addRuleHandle,
          "addStrategyRule",
          toolArgs,
        ),
    });

    const updateStrategyRuleTool = createTool({
      description: "Update an existing strategy rule.",
      args: updateStrategyRuleSchema,
      handler: async (_toolCtx, toolArgs) =>
        await callStrategyHandle(
          args.strategyTools?.updateRuleHandle,
          "updateStrategyRule",
          toolArgs,
        ),
    });

    const removeStrategyRuleTool = createTool({
      description: "Remove a strategy rule.",
      args: removeStrategyRuleSchema,
      handler: async (_toolCtx, toolArgs) =>
        await callStrategyHandle(
          args.strategyTools?.removeRuleHandle,
          "removeStrategyRule",
          toolArgs,
        ),
    });

    const addStrategySessionTool = createTool({
      description: "Add a trading session to the strategy.",
      args: addStrategySessionSchema,
      handler: async (_toolCtx, toolArgs) =>
        await callStrategyHandle(
          args.strategyTools?.addSessionHandle,
          "addStrategySession",
          toolArgs,
        ),
    });

    const updateStrategySessionTool = createTool({
      description: "Update an existing trading session.",
      args: updateStrategySessionSchema,
      handler: async (_toolCtx, toolArgs) =>
        await callStrategyHandle(
          args.strategyTools?.updateSessionHandle,
          "updateStrategySession",
          toolArgs,
        ),
    });

    const createStrategyVersionTool = createTool({
      description: "Create a new strategy version with changes.",
      args: createStrategyVersionSchema,
      handler: async (_toolCtx, toolArgs) =>
        await callStrategyHandle(
          args.strategyTools?.createVersionHandle,
          "createStrategyVersion",
          toolArgs,
        ),
    });

    const agent = new Agent(components.agent as any, {
      name: "launchthat-admin-ai",
      languageModel,
      instructions: args.system ?? DEFAULT_ADMIN_SYSTEM_PROMPT,
      tools: {
        fetchNewsEvents: newsTool,
        updateStrategySummary: updateStrategySummaryTool,
        updateStrategyRisk: updateStrategyRiskTool,
        addStrategyRule: addStrategyRuleTool,
        updateStrategyRule: updateStrategyRuleTool,
        removeStrategyRule: removeStrategyRuleTool,
        addStrategySession: addStrategySessionTool,
        updateStrategySession: updateStrategySessionTool,
        createStrategyVersion: createStrategyVersionTool,
      },
    });

    let stream: Awaited<ReturnType<Agent["streamText"]>> | null = null;
    try {
      stream = await agent.streamText(
        ctx,
        { userId: args.userId, threadId: args.threadId },
        { promptMessageId: args.promptMessageId } as StreamTextArgs,
        { saveStreamDeltas: true },
      );
    } catch (error) {
      console.error("[launchthat-ai] runAgentStep:streamText:error", {
        userId: args.userId,
        threadId: args.threadId,
        promptMessageId: args.promptMessageId,
        modelId,
        providerId,
        error,
      });
      await logAiEvent({
        eventType: "request.error",
        level: "error",
        message: "streamText failed",
        metadata: { error: String(error) },
      });
      throw error;
    }

    try {
      await stream.consumeStream();
    } catch (error) {
      console.error("[launchthat-ai] runAgentStep:consumeStream:error", {
        userId: args.userId,
        threadId: args.threadId,
        promptMessageId: args.promptMessageId,
        error,
      });
      await logAiEvent({
        eventType: "request.error",
        level: "error",
        message: "consumeStream failed",
        metadata: { error: String(error) },
      });
      await writeAssistantError(
        "The assistant ran into a problem while responding. Please try again.",
      );
      throw error;
    }

    const text = (await stream.text)?.trim() ?? "";
    console.info("[launchthat-ai] runAgentStep:response", {
      userId: args.userId,
      threadId: args.threadId,
      promptMessageId: args.promptMessageId,
      textLength: text.length,
    });
    if (text) {
      await ctx.runMutation(internal.mutations.recordChatAssistantSummary, {
        userId: args.userId,
        threadId: args.threadId,
        content: text,
      });
    }
    const toolCall = lastToolCall as LastToolCall | null;
    if (!text && toolCall) {
      const symbolLabel = toolCall.symbol
        ? ` for ${toolCall.symbol}`
        : "";
      if (toolCall.resultCount === 0) {
        await writeAssistantMessage(
          `No recent news events were found${symbolLabel}.`,
        );
      } else {
        const titles = toolCall.results
          .map((row: unknown) => {
            const titleValue =
              typeof (row as { title?: unknown })?.title === "string"
                ? String((row as { title?: string }).title)
                : "";
            return titleValue;
          })
          .filter((value: string) => Boolean(value))
          .slice(0, 5);
        await writeAssistantMessage(
          titles.length
            ? `Here are the latest headlines${symbolLabel}:\n${titles
              .map((t: string) => `- ${t}`)
              .join("\n")}`
            : `Here are the latest updates${symbolLabel}.`,
        );
      }
      await logAiEvent({
        eventType: "response.fallback",
        level: "warn",
        message: "Fallback response used",
        metadata: { tool: "fetchNewsEvents", resultCount: toolCall.resultCount },
      });
    }
    await logAiEvent({
      eventType: "response.complete",
      message: "AI response completed",
      metadata: { textLength: text.length },
    });

    const usageRaw = await stream.usage;
    console.info("[launchthat-ai] runAgentStep:usage", {
      userId: args.userId,
      threadId: args.threadId,
      promptMessageId: args.promptMessageId,
      hasUsage: Boolean(usageRaw),
    });
    if (usageRaw) {
      const usage = usageRaw as {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
        inputTokens?: number;
        outputTokens?: number;
      };
      const promptTokens =
        typeof usage.promptTokens === "number"
          ? usage.promptTokens
          : typeof usage.inputTokens === "number"
            ? usage.inputTokens
            : undefined;
      const completionTokens =
        typeof usage.completionTokens === "number"
          ? usage.completionTokens
          : typeof usage.outputTokens === "number"
            ? usage.outputTokens
            : undefined;
      const totalTokens =
        typeof usage.totalTokens === "number"
          ? usage.totalTokens
          : undefined;

      const savedMessages = Array.isArray(stream.savedMessages)
        ? stream.savedMessages
        : [];
      const assistantMessageId =
        savedMessages.find((message) => message.message?.role === "assistant")
          ?._id ?? args.promptMessageId;

      const safePromptTokens =
        typeof promptTokens === "number" ? Math.max(0, promptTokens) : 0;
      const safeCompletionTokens =
        typeof completionTokens === "number"
          ? Math.max(0, completionTokens)
          : 0;
      const safeTotalTokens =
        typeof totalTokens === "number"
          ? Math.max(0, totalTokens)
          : safePromptTokens + safeCompletionTokens;
      await logAiEvent({
        eventType: "usage.recorded",
        message: "Usage recorded",
        metadata: {
          promptTokens: safePromptTokens,
          completionTokens: safeCompletionTokens,
          totalTokens: safeTotalTokens,
          modelId,
          providerId,
        },
      });

      try {
        await costs.addAICost(ctx as any, {
          messageId: assistantMessageId,
          userId: args.userId,
          threadId: args.threadId ?? assistantMessageId,
          usage: {
            promptTokens: safePromptTokens,
            completionTokens: safeCompletionTokens,
            totalTokens: safeTotalTokens,
          },
          modelId,
          providerId,
        });

        await ctx.runMutation(api.mutations.recordAICostAndSpend, {
          userId: args.userId,
          periodKey,
          messageId: assistantMessageId,
          threadId: args.threadId,
          modelId,
          providerId,
          usage: {
            promptTokens: safePromptTokens,
            completionTokens: safeCompletionTokens,
            totalTokens: safeTotalTokens,
          },
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorData =
          (error as { data?: unknown } | null | undefined)?.data;
        const isCreditError =
          typeof errorData === "string"
            ? errorData === "AI_CREDITS_EXHAUSTED"
            : errorMessage.includes("AI_CREDITS_EXHAUSTED");
        if (isCreditError) {
          await logAiEvent({
            eventType: "credits.exhausted",
            level: "warn",
            message: `Credits exhausted for ${periodKey}`,
            metadata: { periodKey },
          });
          await writeAssistantError(
            `Sorry, you are out of AI credits for ${periodKey}.`,
          );
          return { ok: false };
        }
        if (isMissingModelPricingError(error)) {
          await logAiEvent({
            eventType: "usage.pricing_missing",
            level: "warn",
            message: "Skipping cost recording due to missing model pricing",
            metadata: { modelId, providerId },
          });
          return { ok: true };
        }
        console.error("[launchthat-ai] runAgentStep:usage:error", {
          userId: args.userId,
          threadId: args.threadId,
          promptMessageId: args.promptMessageId,
          error,
        });
        throw error;
      }
    }

    return { ok: true };
  },
});

export const addRagContent = action({
  args: {
    apiKey: v.string(),
    namespace: v.string(),
    key: v.string(),
    text: v.string(),
    title: v.optional(v.string()),
    importance: v.optional(v.number()),
    metadata: v.optional(v.record(v.string(), v.any())),
  },
  returns: v.object({
    entryId: v.string(),
    status: v.string(),
    created: v.boolean(),
  }),
  handler: async (
    ctx: any,
    args: {
      apiKey: string;
      namespace: string;
      key: string;
      text: string;
      title?: string;
      importance?: number;
      metadata?: Record<string, unknown>;
    },
  ): Promise<{ entryId: string; status: string; created: boolean }> => {
    const { RAG } = await import("@convex-dev/rag");

    const settings: {
      provider?: string;
      embeddingModel?: string;
      embeddingDimension?: number;
    } | null = await ctx.runQuery(api.queries.getAiSettings, {});
    const providerId: string =
      settings?.provider === "google" ? "google" : "openai";
    const embeddingModel: string =
      settings?.embeddingModel ??
      (providerId === "google" ? "gemini-embedding-001" : "text-embedding-3-small");
    const embeddingDimension: number =
      providerId === "google"
        ? GOOGLE_DEFAULT_EMBEDDING_DIMENSION
        : (settings?.embeddingDimension ?? 1536);

    if (!args.apiKey) {
      throw new ConvexError("AI_MISSING_API_KEY");
    }

    const ragClient: InstanceType<typeof RAG> = createRagClient({
      providerId,
      apiKey: args.apiKey,
      embeddingModel,
      embeddingDimension,
      RAGCtor: RAG,
    });
    const normalizedImportance = normalizeRagImportance(args.importance);

    const result: { entryId: string; status: string; created: boolean } =
      await ragClient.add(ctx, {
        namespace: args.namespace,
        key: args.key,
        text: args.text,
        title: args.title,
        importance: normalizedImportance,
        metadata: args.metadata as Record<string, string> | undefined,
      });

    await ctx.runMutation(api.mutations.logAiEventPublic, {
      eventType: "rag.content.added",
      message: `RAG content added: ${args.key}`,
      metadata: {
        namespace: args.namespace,
        key: args.key,
        title: args.title,
        entryId: result.entryId,
        status: result.status,
      },
    });

    return {
      entryId: String(result.entryId),
      status: String(result.status),
      created: Boolean(result.created),
    };
  },
});

export const searchRag = action({
  args: {
    apiKey: v.string(),
    namespace: v.string(),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      text: v.string(),
      title: v.optional(v.string()),
      key: v.optional(v.string()),
      score: v.number(),
    }),
  ),
  handler: async (
    ctx: any,
    args: { apiKey: string; namespace: string; query: string; limit?: number },
  ): Promise<{ text: string; title?: string; key?: string; score: number }[]> => {
    const { RAG } = await import("@convex-dev/rag");

    const settings: {
      provider?: string;
      embeddingModel?: string;
      embeddingDimension?: number;
    } | null = await ctx.runQuery(api.queries.getAiSettings, {});
    const providerId: string =
      settings?.provider === "google" ? "google" : "openai";
    const embeddingModel: string =
      settings?.embeddingModel ??
      (providerId === "google" ? "gemini-embedding-001" : "text-embedding-3-small");
    const embeddingDimension: number =
      providerId === "google"
        ? GOOGLE_DEFAULT_EMBEDDING_DIMENSION
        : (settings?.embeddingDimension ?? 1536);

    if (!args.apiKey) {
      return [];
    }

    const ragClient: InstanceType<typeof RAG> = createRagClient({
      providerId,
      apiKey: args.apiKey,
      embeddingModel,
      embeddingDimension,
      RAGCtor: RAG,
    });

    const searchResult = await ragClient.search(ctx, {
      namespace: args.namespace,
      query: args.query,
      limit: args.limit ?? 8,
    });

    return (searchResult.results ?? []).map((r: any) => ({
      text: String(r.text ?? ""),
      title: typeof r.title === "string" ? r.title : undefined,
      key: typeof r.key === "string" ? r.key : undefined,
      score: Number(r.score ?? 0),
    }));
  },
});

export const deleteRagEntrySync = action({
  args: {
    entryId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx: any, args: { entryId: string }) => {
    await ctx.runAction(components.rag.entries.deleteSync, {
      entryId: args.entryId,
    });

    await ctx.runMutation(api.mutations.logAiEventPublic, {
      eventType: "rag.entry.deleted",
      message: `RAG entry deleted (sync): ${args.entryId}`,
      metadata: { entryId: args.entryId },
    });

    return null;
  },
});

const evalScopeValidator = v.object({
  appId: v.string(),
  organizationId: v.string(),
  featureDomain: v.string(),
});

export const drainLangfuseOutbox = action({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.object({
    claimed: v.number(),
    sent: v.number(),
    duplicated: v.number(),
    failed: v.number(),
    requeued: v.number(),
  }),
  handler: async (ctx: any, args: { limit?: number }) => {
    return (await ctx.runAction(
      componentsAny.langfuse.pipeline.actions.drainOutbox,
      {
        limit: args.limit,
      },
    )) as {
      claimed: number;
      sent: number;
      duplicated: number;
      failed: number;
      requeued: number;
    };
  },
});

export const backfillLangfuseFromAiEval = action({
  args: {
    scope: evalScopeValidator,
    threadLimit: v.optional(v.number()),
    perThreadMessageLimit: v.optional(v.number()),
  },
  returns: v.object({
    scannedThreads: v.number(),
    scannedMessages: v.number(),
    queuedGenerations: v.number(),
    duplicateGenerations: v.number(),
    skippedGenerations: v.number(),
    queuedScores: v.number(),
    failedMessages: v.number(),
  }),
  handler: async (
    ctx: any,
    args: {
      scope: {
        appId: string;
        organizationId: string;
        featureDomain: string;
      };
      threadLimit?: number;
      perThreadMessageLimit?: number;
    },
  ) => {
    const threadLimit = Math.max(1, Math.min(Number(args.threadLimit ?? 200), 2000));
    const perThreadMessageLimit = Math.max(
      1,
      Math.min(Number(args.perThreadMessageLimit ?? 500), 5000),
    );
    const threads = (await ctx.runQuery(api.queries.listEvalThreadsForScope, {
      appId: args.scope.appId,
      organizationId: args.scope.organizationId,
      featureDomain: args.scope.featureDomain,
      limit: threadLimit,
    })) as Array<{
      threadKey: string;
      sessionId?: string;
    }>;

    let scannedMessages = 0;
    let queuedGenerations = 0;
    let duplicateGenerations = 0;
    let skippedGenerations = 0;
    let queuedScores = 0;
    let failedMessages = 0;

    for (const thread of threads) {
      const rows = (await ctx.runQuery(api.queries.listEvalThreadMessages, {
        thread: {
          appId: args.scope.appId,
          organizationId: args.scope.organizationId,
          featureDomain: args.scope.featureDomain,
          threadKey: thread.threadKey,
        },
        limit: perThreadMessageLimit,
      })) as Array<{
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
      }>;

      for (const row of rows) {
        scannedMessages += 1;
        const metadata = {
          source: "ai_eval_backfill",
          role: row.role,
          sequence: row.sequence,
          messageKey: row.messageKey,
          ...(typeof row.metadata === "object" && row.metadata ? (row.metadata as object) : {}),
        };
        try {
          const generationResult = (await ctx.runMutation(
            componentsAny.langfuse.pipeline.mutations.enqueueGenerationInternal,
            {
              scope: args.scope,
              threadKey: thread.threadKey,
              sequence: row.sequence,
              idempotencyKey: `generation:${row.messageKey}`,
              generation: {
                traceId: `${args.scope.appId}:${args.scope.organizationId}:${args.scope.featureDomain}:${thread.threadKey}`,
                observationId: row.messageKey,
                name: `${args.scope.featureDomain}.message`,
                startTimeMs: row.createdAt,
                endTimeMs: row.mirroredAt,
                input: row.role === "assistant" ? "" : row.content,
                output: row.role === "assistant" ? row.content : undefined,
                model: row.modelId,
                modelParameters: {
                  provider: row.modelProvider,
                  role: row.role,
                },
                usage: {
                  input: row.inputTokens,
                  output: row.outputTokens,
                  total: row.totalTokens,
                  unit: "TOKENS",
                },
                cost:
                  typeof row.costUsd === "number"
                    ? { total: row.costUsd, currency: "USD" }
                    : undefined,
                metadata,
                sessionId: thread.sessionId,
                userId: args.scope.organizationId,
              },
            },
          )) as { queued: boolean; duplicate: boolean; skipped: boolean };
          if (generationResult.queued) {
            queuedGenerations += 1;
          } else if (generationResult.duplicate) {
            duplicateGenerations += 1;
          } else if (generationResult.skipped) {
            skippedGenerations += 1;
          }

          if (typeof row.costUsd === "number") {
            const scoreResult = (await ctx.runMutation(
              componentsAny.langfuse.pipeline.mutations.enqueueScoreInternal,
              {
                scope: args.scope,
                threadKey: thread.threadKey,
                sequence: row.sequence,
                idempotencyKey: `score:cost:${row.messageKey}`,
                score: {
                  traceId: `${args.scope.appId}:${args.scope.organizationId}:${args.scope.featureDomain}:${thread.threadKey}`,
                  observationId: row.messageKey,
                  name: "cost_usd",
                  value: row.costUsd,
                  dataType: "NUMERIC",
                  comment: "Backfilled from aiEvalMessages.costUsd",
                  metadata,
                  timestampMs: row.mirroredAt,
                },
              },
            )) as { queued: boolean };
            if (scoreResult.queued) {
              queuedScores += 1;
            }
          }
        } catch (error) {
          failedMessages += 1;
          console.error("[launchthat-ai] backfillLangfuseFromAiEval failed", {
            threadKey: thread.threadKey,
            messageKey: row.messageKey,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    return {
      scannedThreads: threads.length,
      scannedMessages,
      queuedGenerations,
      duplicateGenerations,
      skippedGenerations,
      queuedScores,
      failedMessages,
    };
  },
});

export const auditLangfuseExportParity = action({
  args: {
    scope: evalScopeValidator,
    threadLimit: v.optional(v.number()),
  },
  returns: v.object({
    threadsChecked: v.number(),
    totalCanonicalMessages: v.number(),
    totalExportedUniqueMessages: v.number(),
    parityMismatches: v.array(v.string()),
    pipelineHealth: v.object({
      pending: v.number(),
      processing: v.number(),
      failed: v.number(),
      sent: v.number(),
      total: v.number(),
      oldestPendingCreatedAt: v.optional(v.number()),
      lastDeliveredAt: v.optional(v.number()),
    }),
  }),
  handler: async (
    ctx: any,
    args: {
      scope: {
        appId: string;
        organizationId: string;
        featureDomain: string;
      };
      threadLimit?: number;
    },
  ) => {
    const threadLimit = Math.max(1, Math.min(Number(args.threadLimit ?? 200), 2000));
    const threads = (await ctx.runQuery(api.queries.listEvalThreadsForScope, {
      appId: args.scope.appId,
      organizationId: args.scope.organizationId,
      featureDomain: args.scope.featureDomain,
      limit: threadLimit,
    })) as Array<{
      threadKey: string;
      messageCount: number;
    }>;

    const parityMismatches: string[] = [];
    let totalCanonicalMessages = 0;
    let totalExportedUniqueMessages = 0;

    for (const thread of threads) {
      const canonicalStats = (await ctx.runQuery(api.queries.getEvalThreadStats, {
        thread: {
          appId: args.scope.appId,
          organizationId: args.scope.organizationId,
          featureDomain: args.scope.featureDomain,
          threadKey: thread.threadKey,
        },
      })) as { uniqueMessageKeys?: number } | null;
      const canonicalMessageCount = Math.max(
        0,
        Number(canonicalStats?.uniqueMessageKeys ?? thread.messageCount ?? 0),
      );
      totalCanonicalMessages += canonicalMessageCount;
      const exportStats = (await ctx.runQuery(
        componentsAny.langfuse.pipeline.queries.getThreadExportStats,
        {
          scope: args.scope,
          threadKey: thread.threadKey,
        },
      )) as {
        uniqueMessageKeys: number;
        failedGenerations: number;
        pendingGenerations: number;
      };
      totalExportedUniqueMessages += Math.max(
        0,
        Number(exportStats?.uniqueMessageKeys ?? 0),
      );

      if (Number(exportStats?.uniqueMessageKeys ?? 0) < canonicalMessageCount) {
        parityMismatches.push(
          `thread ${thread.threadKey} missing exports: canonical=${canonicalMessageCount}, exported=${exportStats?.uniqueMessageKeys ?? 0}`,
        );
      }
      if (Number(exportStats?.failedGenerations ?? 0) > 0) {
        parityMismatches.push(
          `thread ${thread.threadKey} has failed generations: ${exportStats?.failedGenerations ?? 0}`,
        );
      }
      if (Number(exportStats?.pendingGenerations ?? 0) > 0) {
        parityMismatches.push(
          `thread ${thread.threadKey} has pending generations: ${exportStats?.pendingGenerations ?? 0}`,
        );
      }
    }

    const pipelineHealth = (await ctx.runQuery(
      componentsAny.langfuse.pipeline.queries.getPipelineHealth,
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

    return {
      threadsChecked: threads.length,
      totalCanonicalMessages,
      totalExportedUniqueMessages,
      parityMismatches,
      pipelineHealth,
    };
  },
});
