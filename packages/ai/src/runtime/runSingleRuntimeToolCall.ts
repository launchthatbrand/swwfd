import type { RuntimeHookBus } from "./hooks";
import { runtimeToolErrorFromUpdate } from "./toolErrors";
import { executeToolCalls } from "./toolExecutor";
import type {
  RuntimeToolCall,
  RuntimeToolDefinition,
  RuntimeToolUpdate,
} from "./types";

export type RunSingleRuntimeToolCallOptions<
  TAppContext,
  TState,
  TInput extends Record<string, unknown>,
  TResult,
> = {
  definition: RuntimeToolDefinition<TAppContext, TState, TInput, TResult>;
  input: TInput;
  appContext: TAppContext;
  initialState: TState;
  hookBus?: RuntimeHookBus;
  signal?: AbortSignal;
  callId?: string;
};

export type RunSingleRuntimeToolCallResult<TState, TResult, TInput extends Record<string, unknown>> = {
  call: RuntimeToolCall<TInput>;
  result: TResult;
  state: TState;
  updates: RuntimeToolUpdate<TState>[];
};

export const runSingleRuntimeToolCall = async <
  TAppContext,
  TState,
  TInput extends Record<string, unknown>,
  TResult,
>(
  options: RunSingleRuntimeToolCallOptions<TAppContext, TState, TInput, TResult>,
): Promise<RunSingleRuntimeToolCallResult<TState, TResult, TInput>> => {
  const call: RuntimeToolCall<TInput> = {
    id:
      options.callId ??
      `${options.definition.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: options.definition.name,
    input: options.input,
  };
  const execution = await executeToolCalls({
    tools: {
      [options.definition.name]: options.definition,
    },
    calls: [call],
    appContext: options.appContext,
    initialState: options.initialState,
    hookBus: options.hookBus,
    signal: options.signal,
  });
  const toolError = execution.updates.find(
    (update) => update.type === "tool_error" && update.call.id === call.id,
  );
  if (toolError && toolError.type === "tool_error") {
    throw runtimeToolErrorFromUpdate(toolError);
  }
  const toolResult = execution.updates.find(
    (update) => update.type === "tool_result" && update.call.id === call.id,
  );
  if (!toolResult || toolResult.type !== "tool_result") {
    throw new Error(`Runtime tool ${options.definition.name} did not return a result.`);
  }
  return {
    call,
    result: toolResult.result as TResult,
    state: execution.state,
    updates: execution.updates,
  };
};

