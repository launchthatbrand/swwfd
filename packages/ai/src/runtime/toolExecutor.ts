import { RuntimeHookBus } from "./hooks";
import type {
  RuntimePermissionDecision,
  RuntimeToolCall,
  RuntimeToolDefinition,
  RuntimeToolErrorKind,
  RuntimeToolExecutionContext,
  RuntimeToolExecutionResult,
  RuntimeToolRegistry,
  RuntimeToolUpdate,
  RuntimeValidationResult,
} from "./types";

export type RuntimeToolExecutionOptions<TAppContext, TState> = {
  tools: RuntimeToolRegistry<TAppContext, TState>;
  calls: RuntimeToolCall[];
  appContext: TAppContext;
  initialState: TState;
  maxConcurrency?: number;
  signal?: AbortSignal;
  hookBus?: RuntimeHookBus;
};

export type RuntimeToolExecutionResultSummary<TState> = {
  updates: RuntimeToolUpdate<TState>[];
  state: TState;
};

type Partition = {
  isConcurrencySafe: boolean;
  calls: RuntimeToolCall[];
};

const normalizeErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const isAbortError = (error: unknown): boolean => {
  if (!error) return false;
  if (error instanceof DOMException && error.name === "AbortError") return true;
  const message = normalizeErrorMessage(error);
  return /abort|aborted|timeout/i.test(message);
};

const classifyToolRuntimeError = (error: unknown): {
  kind: RuntimeToolErrorKind;
  message: string;
  isRetrySafe: boolean;
} => {
  const message = normalizeErrorMessage(error);
  if (isAbortError(error)) {
    return {
      kind: "abort",
      message,
      isRetrySafe: true,
    };
  }
  return {
    kind: "runtime",
    message,
    isRetrySafe: true,
  };
};

const asExecutionResult = <TResult, TState>(
  value: RuntimeToolExecutionResult<TResult, TState> | TResult,
): RuntimeToolExecutionResult<TResult, TState> => {
  if (
    value &&
    typeof value === "object" &&
    "data" in (value as Record<string, unknown>)
  ) {
    return value as RuntimeToolExecutionResult<TResult, TState>;
  }
  return { data: value as TResult };
};

const applyContextUpdate = <TState>(
  state: TState,
  update: RuntimeToolExecutionResult<unknown, TState>["contextUpdate"],
): TState => {
  if (!update) return state;
  if (typeof update === "function") {
    return update(state);
  }
  if (typeof update === "object" && update !== null) {
    return { ...(state as Record<string, unknown>), ...update } as TState;
  }
  return state;
};

const resolveIsConcurrencySafe = <TAppContext, TState>(
  tool: RuntimeToolDefinition<TAppContext, TState, any, any> | undefined,
  input: Record<string, unknown>,
): boolean => {
  if (!tool?.isConcurrencySafe) return false;
  try {
    return Boolean(tool.isConcurrencySafe(input));
  } catch {
    return false;
  }
};

const resolveIsReadOnly = <TAppContext, TState>(
  tool: RuntimeToolDefinition<TAppContext, TState, any, any> | undefined,
  input: Record<string, unknown>,
): boolean => {
  if (!tool?.isReadOnly) return false;
  try {
    return Boolean(tool.isReadOnly(input));
  } catch {
    return false;
  }
};

export const partitionToolCalls = <TAppContext, TState>(
  calls: RuntimeToolCall[],
  tools: RuntimeToolRegistry<TAppContext, TState>,
): Partition[] => {
  const partitions: Partition[] = [];

  for (const call of calls) {
    const tool = tools[call.name];
    const isConcurrencySafe = resolveIsConcurrencySafe(tool, call.input);
    const previous = partitions[partitions.length - 1];
    if (isConcurrencySafe && previous?.isConcurrencySafe) {
      previous.calls.push(call);
    } else {
      partitions.push({
        isConcurrencySafe,
        calls: [call],
      });
    }
  }

  return partitions;
};

const runSingleTool = async <TAppContext, TState>(
  call: RuntimeToolCall,
  tool: RuntimeToolDefinition<TAppContext, TState, any, any> | undefined,
  options: {
    appContext: TAppContext;
    state: TState;
    signal: AbortSignal;
    hookBus?: RuntimeHookBus;
  },
): Promise<{
  updates: RuntimeToolUpdate<TState>[];
  contextUpdate?: RuntimeToolExecutionResult<unknown, TState>["contextUpdate"];
  stopSiblings: boolean;
}> => {
  const updates: RuntimeToolUpdate<TState>[] = [];
  const startedAt = Date.now();
  const elapsedMs = () => Date.now() - startedAt;

  const isConcurrencySafe = resolveIsConcurrencySafe(tool, call.input);
  const isReadOnly = resolveIsReadOnly(tool, call.input);
  updates.push({
    type: "tool_start",
    call,
    isConcurrencySafe,
    isReadOnly,
  });

  if (!tool) {
    updates.push({
      type: "tool_error",
      call,
      error: `No tool registered for ${call.name}`,
      errorKind: "not_found",
      isRetrySafe: false,
      durationMs: elapsedMs(),
      state: options.state,
    });
    return { updates, stopSiblings: false };
  }

  const context: RuntimeToolExecutionContext<TAppContext, TState> = {
    appContext: options.appContext,
    state: options.state,
    callId: call.id,
    toolName: call.name,
    signal: options.signal,
    emitProgress: (progress) => {
      updates.push({
        type: "tool_progress",
        call,
        progress,
      });
    },
  };

  const preToolDecision = await options.hookBus?.emitWithDecision("PreToolUse", {
    call,
  });
  if (preToolDecision?.continue === false) {
    const errorMessage = preToolDecision.stopReason ?? "Execution blocked by pre-tool hook";
    updates.push({
      type: "tool_error",
      call,
      error: errorMessage,
      errorKind: "hook",
      isRetrySafe: false,
      durationMs: elapsedMs(),
      state: options.state,
    });
    return { updates, stopSiblings: false };
  }

  let validated: RuntimeValidationResult = { ok: true };
  if (tool.validateInput) {
    validated = await tool.validateInput(call.input, context);
  }
  if (!validated.ok) {
    updates.push({
      type: "tool_error",
      call,
      error: validated.message ?? "Validation failed",
      errorKind: "validation",
      isRetrySafe: false,
      isValidationError: true,
      durationMs: elapsedMs(),
      state: options.state,
    });
    return { updates, stopSiblings: false };
  }

  let permissionDecision: RuntimePermissionDecision = { behavior: "allow" };
  if (tool.checkPermissions) {
    permissionDecision = await tool.checkPermissions(call.input, context);
  }

  if (permissionDecision.behavior !== "allow") {
    const hookDecision = await options.hookBus?.emitWithDecision("PermissionRequest", {
      call,
      decision: permissionDecision,
    });
    if (hookDecision?.permissionOverride) {
      permissionDecision = hookDecision.permissionOverride;
    }
  }

  if (permissionDecision.behavior !== "allow") {
    updates.push({
      type: "tool_error",
      call,
      error: permissionDecision.message ?? "Permission denied",
      errorKind: "permission",
      isRetrySafe: false,
      isPermissionError: true,
      durationMs: elapsedMs(),
      state: options.state,
    });
    return { updates, stopSiblings: false };
  }

  const executableInput = permissionDecision.updatedInput ?? call.input;

  try {
    const raw = await tool.execute(executableInput, context);
    const executionResult = asExecutionResult(raw);
    const mappedResult = tool.mapResult
      ? tool.mapResult(executionResult.data, { ...call, input: executableInput })
      : undefined;
    updates.push({
      type: "tool_result",
      call: { ...call, input: executableInput },
      result: executionResult.data,
      mappedResult,
      contextUpdateApplied: Boolean(executionResult.contextUpdate),
      state: options.state,
      metadata: {
        ...(executionResult.metadata ?? {}),
        executionMs: elapsedMs(),
      },
      durationMs: elapsedMs(),
    });

    await options.hookBus?.emit("PostToolUse", {
      call: { ...call, input: executableInput },
      result: executionResult.data,
    });

    return {
      updates,
      contextUpdate:
        executionResult.contextUpdate as RuntimeToolExecutionResult<
          unknown,
          TState
        >["contextUpdate"],
      stopSiblings: false,
    };
  } catch (error) {
    const classified = classifyToolRuntimeError(error);
    updates.push({
      type: "tool_error",
      call: { ...call, input: executableInput },
      error: classified.message,
      errorKind: classified.kind,
      isRetrySafe: classified.isRetrySafe,
      durationMs: elapsedMs(),
      state: options.state,
    });

    await options.hookBus?.emit("PostToolUseFailure", {
      call: { ...call, input: executableInput },
      error: classified.message,
    });

    return {
      updates,
      stopSiblings: Boolean(tool.cancelConcurrentSiblingsOnError) && !classified.isRetrySafe,
    };
  }
};

const runConcurrently = async <TAppContext, TState>(
  calls: RuntimeToolCall[],
  tools: RuntimeToolRegistry<TAppContext, TState>,
  options: {
    appContext: TAppContext;
    state: TState;
    maxConcurrency: number;
    signal: AbortSignal;
    hookBus?: RuntimeHookBus;
  },
): Promise<Array<Awaited<ReturnType<typeof runSingleTool<TAppContext, TState>>>>> => {
  const results: Array<
    Awaited<ReturnType<typeof runSingleTool<TAppContext, TState>>>
  > = new Array(calls.length);

  const siblingController = new AbortController();
  options.signal.addEventListener(
    "abort",
    () => siblingController.abort(options.signal.reason),
    { once: true },
  );

  let index = 0;
  const worker = async () => {
    while (index < calls.length && !siblingController.signal.aborted) {
      const currentIndex = index;
      index += 1;

      const call = calls[currentIndex]!;
      const result = await runSingleTool(call, tools[call.name], {
        appContext: options.appContext,
        state: options.state,
        signal: siblingController.signal,
        hookBus: options.hookBus,
      });
      results[currentIndex] = result;
      if (result.stopSiblings) {
        siblingController.abort("sibling_error");
      }
    }
  };

  const workerCount = Math.max(1, Math.min(options.maxConcurrency, calls.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
};

export const executeToolCalls = async <TAppContext, TState>(
  options: RuntimeToolExecutionOptions<TAppContext, TState>,
): Promise<RuntimeToolExecutionResultSummary<TState>> => {
  const maxConcurrency = Math.max(1, options.maxConcurrency ?? 6);
  const abortController = new AbortController();
  if (options.signal) {
    options.signal.addEventListener("abort", () => abortController.abort(options.signal?.reason), {
      once: true,
    });
  }

  let state = options.initialState;
  const updates: RuntimeToolUpdate<TState>[] = [];
  const partitions = partitionToolCalls(options.calls, options.tools);

  for (const partition of partitions) {
    const callIds = partition.calls.map((call) => call.id);
    updates.push({
      type: "batch_start",
      isConcurrencySafe: partition.isConcurrencySafe,
      callIds,
    });

    if (partition.isConcurrencySafe) {
      const results = await runConcurrently(partition.calls, options.tools, {
        appContext: options.appContext,
        state,
        maxConcurrency,
        signal: abortController.signal,
        hookBus: options.hookBus,
      });

      for (const result of results) {
        if (!result) continue;
        for (const update of result.updates) {
          if (update.type === "tool_result" && result.contextUpdate) {
            state = applyContextUpdate(state, result.contextUpdate);
            updates.push({
              ...update,
              state,
            });
          } else if (update.type === "tool_error") {
            updates.push({
              ...update,
              state,
            });
          } else {
            updates.push(update);
          }
        }
      }
    } else {
      for (const call of partition.calls) {
        const result = await runSingleTool(call, options.tools[call.name], {
          appContext: options.appContext,
          state,
          signal: abortController.signal,
          hookBus: options.hookBus,
        });
        for (const update of result.updates) {
          if (update.type === "tool_result" && result.contextUpdate) {
            state = applyContextUpdate(state, result.contextUpdate);
            updates.push({
              ...update,
              state,
            });
          } else if (update.type === "tool_error") {
            updates.push({
              ...update,
              state,
            });
          } else {
            updates.push(update);
          }
        }
      }
    }

    updates.push({
      type: "batch_end",
      isConcurrencySafe: partition.isConcurrencySafe,
      callIds,
    });
  }

  return { updates, state };
};

