import type { RuntimeToolErrorKind, RuntimeToolUpdate } from "./types";

export class RuntimeToolExecutionError extends Error {
  readonly kind: RuntimeToolErrorKind;
  readonly toolName: string;
  readonly callId: string;
  readonly durationMs?: number;
  readonly retrySafe: boolean;

  constructor(args: {
    message: string;
    kind: RuntimeToolErrorKind;
    toolName: string;
    callId: string;
    durationMs?: number;
    retrySafe?: boolean;
  }) {
    super(args.message);
    this.name = "RuntimeToolExecutionError";
    this.kind = args.kind;
    this.toolName = args.toolName;
    this.callId = args.callId;
    this.durationMs = args.durationMs;
    this.retrySafe = Boolean(args.retrySafe);
  }
}

export const runtimeToolErrorFromUpdate = (update: RuntimeToolUpdate): RuntimeToolExecutionError => {
  if (update.type !== "tool_error") {
    throw new Error("Expected tool_error update.");
  }
  return new RuntimeToolExecutionError({
    message: update.error,
    kind: update.errorKind ?? "runtime",
    toolName: update.call.name,
    callId: update.call.id,
    durationMs: update.durationMs,
    retrySafe: update.isRetrySafe,
  });
};
