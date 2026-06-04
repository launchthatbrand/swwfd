export type RuntimeToolMarkerKind = "call" | "result";

export type RuntimeToolMarkerStatus =
  | "running"
  | "approval_requested"
  | "approval-requested"
  | "completed"
  | "failed"
  | "denied"
  | "started"
  | "already_exists"
  | (string & {});

type RuntimeToolMarkerArgs = {
  toolName: string;
  toolCallId: string;
  payload: Record<string, unknown>;
};

type RuntimeToolMarkerBase = {
  toolName: string;
  toolCallId: string;
  payload: Record<string, unknown>;
  status?: RuntimeToolMarkerStatus;
  message?: string;
};

export type ParsedRuntimeToolCallMarker = RuntimeToolMarkerBase & {
  kind: "call";
};

export type ParsedRuntimeToolResultMarker = RuntimeToolMarkerBase & {
  kind: "result";
};

export type ParsedRuntimeToolMarker =
  | ParsedRuntimeToolCallMarker
  | ParsedRuntimeToolResultMarker;

const TOOL_MARKER_PATTERN =
  /^\[\[tool-(call|result):([A-Za-z0-9._-]+)\]\]\s*(\{[\s\S]*\})$/;

export const buildToolCallMarker = (args: RuntimeToolMarkerArgs): string =>
  `[[tool-call:${args.toolName}]] ${JSON.stringify({
    toolCallId: args.toolCallId,
    ...args.payload,
  })}`;

export const buildToolResultMarker = (args: RuntimeToolMarkerArgs): string =>
  `[[tool-result:${args.toolName}]] ${JSON.stringify({
    toolCallId: args.toolCallId,
    ...args.payload,
  })}`;

const readStatus = (payload: Record<string, unknown>): RuntimeToolMarkerStatus | undefined => {
  const status = payload.status;
  return typeof status === "string" && status.trim().length > 0
    ? (status as RuntimeToolMarkerStatus)
    : undefined;
};

const readMessage = (payload: Record<string, unknown>): string | undefined => {
  const message = payload.message;
  return typeof message === "string" && message.trim().length > 0 ? message : undefined;
};

export const parseToolMarker = (content: string): ParsedRuntimeToolMarker | null => {
  const trimmed = content.trim();
  const match = TOOL_MARKER_PATTERN.exec(trimmed);
  if (!match) return null;
  const kind = match[1];
  const toolName = match[2];
  const payloadRaw = match[3];
  if (!kind || !toolName || !payloadRaw) return null;
  try {
    const payload = JSON.parse(payloadRaw) as Record<string, unknown>;
    const toolCallIdRaw = payload.toolCallId;
    const toolCallId =
      typeof toolCallIdRaw === "string" && toolCallIdRaw.trim().length > 0
        ? toolCallIdRaw
        : `${toolName}-missing-id`;
    const status = readStatus(payload);
    const message = readMessage(payload);
    if (kind === "call") {
      return {
        kind: "call",
        toolName,
        toolCallId,
        payload,
        status,
        message,
      };
    }
    return {
      kind: "result",
      toolName,
      toolCallId,
      payload,
      status,
      message,
    };
  } catch {
    return null;
  }
};

