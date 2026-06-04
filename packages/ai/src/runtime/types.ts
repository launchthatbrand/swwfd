export type RuntimeQuerySource = "foreground" | "background" | (string & {});

export type RuntimePermissionBehavior = "allow" | "deny" | "ask";

export type RuntimePermissionDecision = {
  behavior: RuntimePermissionBehavior;
  message?: string;
  updatedInput?: Record<string, unknown>;
};

export type RuntimeValidationResult = {
  ok: boolean;
  message?: string;
};

export type RuntimeToolCall<TInput = Record<string, unknown>> = {
  id: string;
  name: string;
  input: TInput;
  metadata?: Record<string, unknown>;
};

export type RuntimeToolProgressEvent = {
  message: string;
  metadata?: Record<string, unknown>;
};

export type RuntimeToolErrorKind =
  | "not_found"
  | "hook"
  | "validation"
  | "permission"
  | "runtime"
  | "abort";

export type RuntimeToolExecutionContext<TAppContext, TState> = {
  appContext: TAppContext;
  state: TState;
  callId: string;
  toolName: string;
  signal: AbortSignal;
  emitProgress: (event: RuntimeToolProgressEvent) => void;
};

export type RuntimeToolExecutionResult<TResult, TState> = {
  data: TResult;
  contextUpdate?: Partial<TState> | ((state: TState) => TState);
  metadata?: Record<string, unknown>;
};

export type RuntimeToolDefinition<
  TAppContext,
  TState,
  TInput = Record<string, unknown>,
  TResult = unknown,
> = {
  name: string;
  description?: string;
  isConcurrencySafe?: (input: TInput) => boolean;
  isReadOnly?: (input: TInput) => boolean;
  interruptBehavior?: () => "cancel" | "block";
  cancelConcurrentSiblingsOnError?: boolean;
  validateInput?: (
    input: TInput,
    context: RuntimeToolExecutionContext<TAppContext, TState>,
  ) => Promise<RuntimeValidationResult> | RuntimeValidationResult;
  checkPermissions?: (
    input: TInput,
    context: RuntimeToolExecutionContext<TAppContext, TState>,
  ) => Promise<RuntimePermissionDecision> | RuntimePermissionDecision;
  execute: (
    input: TInput,
    context: RuntimeToolExecutionContext<TAppContext, TState>,
  ) =>
    | Promise<RuntimeToolExecutionResult<TResult, TState> | TResult>
    | RuntimeToolExecutionResult<TResult, TState>
    | TResult;
  mapResult?: (
    result: TResult,
    call: RuntimeToolCall<TInput>,
  ) => unknown;
};

export type RuntimeToolRegistry<TAppContext, TState> = Record<
  string,
  RuntimeToolDefinition<TAppContext, TState, any, any>
>;

export type RuntimeToolUpdate<TState = unknown> =
  | {
      type: "batch_start";
      isConcurrencySafe: boolean;
      callIds: string[];
    }
  | {
      type: "batch_end";
      isConcurrencySafe: boolean;
      callIds: string[];
    }
  | {
      type: "tool_start";
      call: RuntimeToolCall;
      isConcurrencySafe: boolean;
      isReadOnly: boolean;
    }
  | {
      type: "tool_progress";
      call: RuntimeToolCall;
      progress: RuntimeToolProgressEvent;
    }
  | {
      type: "tool_result";
      call: RuntimeToolCall;
      result: unknown;
      mappedResult?: unknown;
      contextUpdateApplied: boolean;
      state: TState;
      metadata?: Record<string, unknown>;
      durationMs?: number;
    }
  | {
      type: "tool_error";
      call: RuntimeToolCall;
      error: string;
      errorKind?: RuntimeToolErrorKind;
      isRetrySafe?: boolean;
      isPermissionError?: boolean;
      isValidationError?: boolean;
      durationMs?: number;
      state: TState;
    };

export type RuntimeModelToolResult = {
  toolCallId: string;
  toolName: string;
  result: unknown;
  isError?: boolean;
};

export type RuntimeModelTurnInput = {
  turnNumber: number;
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  toolResults: RuntimeModelToolResult[];
};

export type RuntimeModelTurnOutput = {
  text?: string;
  toolCalls?: RuntimeToolCall[];
  finishReason?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  metadata?: Record<string, unknown>;
};

export type RuntimeModelAdapter = {
  generate: (input: RuntimeModelTurnInput) => Promise<RuntimeModelTurnOutput>;
};

export type RuntimeTurnEvent =
  | { type: "turn_start"; turnNumber: number }
  | { type: "turn_end"; turnNumber: number }
  | { type: "model_request_start"; turnNumber: number }
  | {
      type: "model_request_end";
      turnNumber: number;
      finishReason?: string;
      usage?: RuntimeModelTurnOutput["usage"];
    }
  | { type: "assistant_text"; turnNumber: number; text: string }
  | { type: "max_turns_reached"; maxTurns: number }
  | { type: "tool_update"; update: RuntimeToolUpdate }
  | { type: "runtime_error"; turnNumber: number; error: string };

