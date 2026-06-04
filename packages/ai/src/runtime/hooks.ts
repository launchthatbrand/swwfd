import type {
  RuntimePermissionDecision,
  RuntimeToolCall,
} from "./types";

export const RUNTIME_HOOK_EVENTS = [
  "PreToolUse",
  "PostToolUse",
  "PostToolUseFailure",
  "PermissionRequest",
  "Stop",
] as const;

export type RuntimeHookEventName = (typeof RUNTIME_HOOK_EVENTS)[number];

export type RuntimeHookPayloadMap = {
  PreToolUse: {
    call: RuntimeToolCall;
  };
  PostToolUse: {
    call: RuntimeToolCall;
    result: unknown;
  };
  PostToolUseFailure: {
    call: RuntimeToolCall;
    error: string;
  };
  PermissionRequest: {
    call: RuntimeToolCall;
    decision: RuntimePermissionDecision;
  };
  Stop: {
    reason: string;
    turnNumber?: number;
  };
};

export type RuntimeHookDecision = {
  continue?: boolean;
  stopReason?: string;
  permissionOverride?: RuntimePermissionDecision;
  additionalContext?: string;
};

type RuntimeHookHandler<TKey extends RuntimeHookEventName> = (
  payload: RuntimeHookPayloadMap[TKey],
) => Promise<RuntimeHookDecision | void> | RuntimeHookDecision | void;

type HandlerRegistry = {
  [K in RuntimeHookEventName]: Set<RuntimeHookHandler<K>>;
};

const createRegistry = (): HandlerRegistry => ({
  PreToolUse: new Set(),
  PostToolUse: new Set(),
  PostToolUseFailure: new Set(),
  PermissionRequest: new Set(),
  Stop: new Set(),
});

export class RuntimeHookBus {
  private readonly handlers: HandlerRegistry = createRegistry();

  on<TKey extends RuntimeHookEventName>(
    eventName: TKey,
    handler: RuntimeHookHandler<TKey>,
  ): () => void {
    this.handlers[eventName].add(handler as RuntimeHookHandler<any>);
    return () => {
      this.handlers[eventName].delete(handler as RuntimeHookHandler<any>);
    };
  }

  async emit<TKey extends RuntimeHookEventName>(
    eventName: TKey,
    payload: RuntimeHookPayloadMap[TKey],
  ): Promise<RuntimeHookDecision[]> {
    const eventHandlers = Array.from(this.handlers[eventName]);
    if (eventHandlers.length === 0) {
      return [];
    }

    const settled = await Promise.all(
      eventHandlers.map(async (handler) => {
        try {
          return (await handler(payload as any)) ?? undefined;
        } catch {
          return undefined;
        }
      }),
    );

    return settled.filter(Boolean) as RuntimeHookDecision[];
  }

  async emitWithDecision<TKey extends RuntimeHookEventName>(
    eventName: TKey,
    payload: RuntimeHookPayloadMap[TKey],
  ): Promise<RuntimeHookDecision> {
    const decisions = await this.emit(eventName, payload);
    const merged: RuntimeHookDecision = {};

    for (const decision of decisions) {
      if (decision.continue === false) {
        merged.continue = false;
        merged.stopReason = decision.stopReason ?? merged.stopReason;
      }
      if (decision.permissionOverride) {
        merged.permissionOverride = decision.permissionOverride;
      }
      if (decision.additionalContext) {
        merged.additionalContext = [
          merged.additionalContext,
          decision.additionalContext,
        ]
          .filter(Boolean)
          .join("\n");
      }
    }

    return merged;
  }
}

