import { RuntimeHookBus } from "./hooks";
import { runWithRetry, type RuntimeRetryOptions } from "./retry";
import { executeToolCalls } from "./toolExecutor";
import type {
  RuntimeModelAdapter,
  RuntimeModelTurnOutput,
  RuntimeQuerySource,
  RuntimeToolRegistry,
  RuntimeTurnEvent,
} from "./types";

export type RuntimeTurnLoopOptions<TAppContext, TState> = {
  modelAdapter: RuntimeModelAdapter;
  tools: RuntimeToolRegistry<TAppContext, TState>;
  appContext: TAppContext;
  initialState: TState;
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  maxTurns?: number;
  maxConcurrency?: number;
  querySource?: RuntimeQuerySource;
  hookBus?: RuntimeHookBus;
  retryOptions?: Omit<RuntimeRetryOptions<RuntimeModelTurnOutput>, "querySource">;
};

export type RuntimeTurnLoopResult<TState> = {
  state: TState;
  finalText: string;
  turns: number;
  finishReason: "completed" | "max_turns" | "error";
};

const toToolResultText = (result: unknown): string => {
  if (typeof result === "string") return result;
  try {
    return JSON.stringify(result);
  } catch {
    return String(result);
  }
};

export async function* runTurnLoop<TAppContext, TState>(
  options: RuntimeTurnLoopOptions<TAppContext, TState>,
): AsyncGenerator<RuntimeTurnEvent, RuntimeTurnLoopResult<TState>> {
  const hookBus = options.hookBus ?? new RuntimeHookBus();
  const querySource = options.querySource ?? "foreground";
  const maxTurns = Math.max(1, options.maxTurns ?? 6);

  let state = options.initialState;
  let turns = 0;
  let finalText = "";
  let finishReason: RuntimeTurnLoopResult<TState>["finishReason"] = "completed";
  const messages = [...options.messages];
  let toolResults: Array<{ toolCallId: string; toolName: string; result: unknown; isError?: boolean }> = [];

  while (turns < maxTurns) {
    turns += 1;
    yield { type: "turn_start", turnNumber: turns };
    yield { type: "model_request_start", turnNumber: turns };

    let modelOutput: RuntimeModelTurnOutput;
    try {
      modelOutput = await runWithRetry(
        async () =>
          await options.modelAdapter.generate({
            turnNumber: turns,
            messages,
            toolResults,
          }),
        {
          querySource,
          ...(options.retryOptions ?? {}),
        },
      );
    } catch (error) {
      finishReason = "error";
      yield {
        type: "runtime_error",
        turnNumber: turns,
        error: error instanceof Error ? error.message : String(error),
      };
      await hookBus.emit("Stop", {
        reason: "runtime_error",
        turnNumber: turns,
      });
      return {
        state,
        finalText,
        turns,
        finishReason,
      };
    }

    yield {
      type: "model_request_end",
      turnNumber: turns,
      finishReason: modelOutput.finishReason,
      usage: modelOutput.usage,
    };

    if (modelOutput.text && modelOutput.text.trim().length > 0) {
      finalText = modelOutput.text.trim();
      messages.push({
        role: "assistant",
        content: finalText,
      });
      yield {
        type: "assistant_text",
        turnNumber: turns,
        text: finalText,
      };
    }

    const toolCalls = Array.isArray(modelOutput.toolCalls) ? modelOutput.toolCalls : [];
    if (toolCalls.length === 0) {
      yield { type: "turn_end", turnNumber: turns };
      await hookBus.emit("Stop", {
        reason: "completed",
        turnNumber: turns,
      });
      return {
        state,
        finalText,
        turns,
        finishReason: "completed",
      };
    }

    const toolExecution = await executeToolCalls({
      tools: options.tools,
      calls: toolCalls,
      appContext: options.appContext,
      initialState: state,
      maxConcurrency: options.maxConcurrency,
      hookBus,
    });

    state = toolExecution.state;
    toolResults = [];
    for (const update of toolExecution.updates) {
      yield {
        type: "tool_update",
        update,
      };
      if (update.type === "tool_result") {
        toolResults.push({
          toolCallId: update.call.id,
          toolName: update.call.name,
          result: update.result,
        });
        messages.push({
          role: "system",
          content: `tool_result ${update.call.name}: ${toToolResultText(update.mappedResult ?? update.result)}`,
        });
      }
      if (update.type === "tool_error") {
        toolResults.push({
          toolCallId: update.call.id,
          toolName: update.call.name,
          result: update.error,
          isError: true,
        });
        messages.push({
          role: "system",
          content: `tool_error ${update.call.name}: ${update.error}`,
        });
      }
    }

    yield { type: "turn_end", turnNumber: turns };
  }

  finishReason = "max_turns";
  yield { type: "max_turns_reached", maxTurns };
  await hookBus.emit("Stop", {
    reason: "max_turns",
    turnNumber: turns,
  });
  return {
    state,
    finalText,
    turns,
    finishReason,
  };
}

