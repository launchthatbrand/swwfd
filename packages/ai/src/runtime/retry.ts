import type { RuntimeQuerySource } from "./types";

export type RuntimeRetryErrorClass =
  | "rate_limit"
  | "capacity"
  | "network"
  | "auth"
  | "context_window"
  | "unknown";

export type RuntimeRetryPolicy = {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableClasses: RuntimeRetryErrorClass[];
  backgroundRetryableClasses: RuntimeRetryErrorClass[];
  fallbackOnClasses: RuntimeRetryErrorClass[];
};

export type RuntimeRetryContext = {
  attempt: number;
  querySource: RuntimeQuerySource;
  classification: RuntimeRetryErrorClass;
  delayMs: number;
};

export type RuntimeRetryOptions<TResult> = {
  querySource?: RuntimeQuerySource;
  signal?: AbortSignal;
  policy?: Partial<RuntimeRetryPolicy>;
  onRetry?: (context: RuntimeRetryContext) => Promise<void> | void;
  onFallback?: (error: unknown, classification: RuntimeRetryErrorClass) => Promise<TResult>;
};

export class RuntimeFallbackTriggeredError extends Error {
  readonly classification: RuntimeRetryErrorClass;

  constructor(classification: RuntimeRetryErrorClass) {
    super(`Fallback triggered due to ${classification}`);
    this.name = "RuntimeFallbackTriggeredError";
    this.classification = classification;
  }
}

const DEFAULT_RETRY_POLICY: RuntimeRetryPolicy = {
  maxRetries: 4,
  baseDelayMs: 500,
  maxDelayMs: 15_000,
  retryableClasses: ["rate_limit", "capacity", "network", "context_window"],
  backgroundRetryableClasses: ["network"],
  fallbackOnClasses: ["capacity", "rate_limit"],
};

const asStatusCode = (error: unknown): number | undefined => {
  if (!error || typeof error !== "object") return undefined;
  const status = (error as { status?: unknown }).status;
  if (typeof status === "number" && Number.isFinite(status)) return status;
  const responseStatus = (error as { response?: { status?: unknown } }).response?.status;
  return typeof responseStatus === "number" && Number.isFinite(responseStatus)
    ? responseStatus
    : undefined;
};

const asErrorCode = (error: unknown): string | undefined => {
  if (!error || typeof error !== "object") return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
};

const asMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

export const classifyRuntimeError = (error: unknown): RuntimeRetryErrorClass => {
  const status = asStatusCode(error);
  const code = asErrorCode(error);
  const message = asMessage(error).toLowerCase();

  if (status === 429 || message.includes("rate limit")) return "rate_limit";
  if (status === 529 || message.includes("overloaded") || message.includes("capacity")) {
    return "capacity";
  }
  if (status === 401 || status === 403 || message.includes("unauthorized")) {
    return "auth";
  }
  if (
    message.includes("context window") ||
    message.includes("max tokens") ||
    message.includes("prompt too long")
  ) {
    return "context_window";
  }
  if (
    code === "ECONNRESET" ||
    code === "EPIPE" ||
    code === "ETIMEDOUT" ||
    status === 408 ||
    (status !== undefined && status >= 500)
  ) {
    return "network";
  }
  return "unknown";
};

const shouldRetryClass = (
  classification: RuntimeRetryErrorClass,
  policy: RuntimeRetryPolicy,
  querySource: RuntimeQuerySource,
): boolean => {
  if (querySource === "background") {
    return policy.backgroundRetryableClasses.includes(classification);
  }
  return policy.retryableClasses.includes(classification);
};

const getRetryDelayMs = (
  attempt: number,
  policy: RuntimeRetryPolicy,
  error: unknown,
): number => {
  const retryAfter = (error as { headers?: { get?: (name: string) => string | null } }).headers?.get?.(
    "retry-after",
  );
  if (retryAfter) {
    const seconds = Number.parseInt(retryAfter, 10);
    if (Number.isFinite(seconds)) {
      return Math.max(0, seconds * 1000);
    }
  }

  const exp = Math.min(
    policy.maxDelayMs,
    policy.baseDelayMs * Math.pow(2, Math.max(0, attempt - 1)),
  );
  const jitter = Math.random() * 0.2 * exp;
  return exp + jitter;
};

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("Retry aborted"));
      return;
    }
    const timeout = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = () => {
      cleanup();
      reject(new Error("Retry aborted"));
    };
    const cleanup = () => {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });

export const runWithRetry = async <TResult>(
  operation: (attempt: number) => Promise<TResult>,
  options: RuntimeRetryOptions<TResult> = {},
): Promise<TResult> => {
  const querySource = options.querySource ?? "foreground";
  const policy: RuntimeRetryPolicy = {
    ...DEFAULT_RETRY_POLICY,
    ...(options.policy ?? {}),
  };

  let lastError: unknown;
  for (let attempt = 1; attempt <= policy.maxRetries + 1; attempt += 1) {
    if (options.signal?.aborted) {
      throw new Error("Retry aborted");
    }

    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      const classification = classifyRuntimeError(error);
      const canRetry = shouldRetryClass(classification, policy, querySource);
      const isLastAttempt = attempt > policy.maxRetries;

      if (
        options.onFallback &&
        policy.fallbackOnClasses.includes(classification) &&
        (isLastAttempt || !canRetry)
      ) {
        return await options.onFallback(error, classification);
      }

      if (!canRetry || isLastAttempt) {
        throw error;
      }

      const delayMs = getRetryDelayMs(attempt, policy, error);
      await options.onRetry?.({
        attempt,
        querySource,
        classification,
        delayMs,
      });
      await sleep(delayMs, options.signal);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
};

export const createRuntimeRetryPolicy = (
  overrides: Partial<RuntimeRetryPolicy> = {},
): RuntimeRetryPolicy => ({
  ...DEFAULT_RETRY_POLICY,
  ...overrides,
});

