import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { UIMessage } from "ai";

import { useSupportConvex } from "../../convex/bindings";

type LiveMessage = {
  _id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

type SendMessageResponse = {
  threadId: string;
  sessionId: string;
  mode: "agent" | "manual";
  autoRespondEnabled: boolean;
  assistantText?: string;
};

type SendMessageArgs = {
  text: string;
};

type ChatStatus = "ready" | "submitted" | "streaming" | "error";

const toUiMessage = (message: LiveMessage): UIMessage => ({
  id: message._id,
  role: message.role,
  parts: [{ type: "text", text: message.content }],
});

const getMessageText = (message: UIMessage): string =>
  message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();

export const useSupportConvexChat = (args: {
  enabled: boolean;
  organizationId: string;
  widgetKey: string | null;
  requestOrigin?: string;
  requestHost?: string;
  threadId: string;
  clientSessionId: string | null;
  initialMessages: UIMessage[];
  contactId?: string;
  contactEmail?: string;
  contactName?: string;
  experienceId?: string;
  experienceContext?: Record<string, unknown>;
  onThreadResolved: (threadId: string) => void;
}) => {
  const convex = useSupportConvex();
  const sendMessageMutation = useMutation(
    convex.support.widget.mutations.sendMessage,
  );
  const [messages, setMessages] = useState<UIMessage[]>(args.initialMessages);
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [error, setError] = useState<Error | null>(null);
  const inFlightStartRef = useRef<number | null>(null);

  const widgetMessages = useQuery(
    convex.support.widget.queries.listMessages,
    args.enabled && args.organizationId && args.widgetKey && args.threadId
      ? {
          organizationId: args.organizationId,
          widgetKey: args.widgetKey,
          requestOrigin: args.requestOrigin,
          requestHost: args.requestHost,
          threadId: args.threadId,
          sessionId: args.threadId,
          limit: 500,
        }
      : "skip",
  ) as LiveMessage[] | undefined;

  const reconciledLiveMessages = useMemo(
    () => (widgetMessages ?? []).map(toUiMessage),
    [widgetMessages],
  );

  useEffect(() => {
    if (!args.enabled) return;
    if (inFlightStartRef.current !== null) {
      // When the backend resolves a canonical thread id after send, avoid
      // resetting in-flight UI state so "thinking" remains visible.
      return;
    }
    setMessages(args.initialMessages);
    setStatus("ready");
    setError(null);
    inFlightStartRef.current = null;
  }, [args.enabled, args.initialMessages, args.threadId]);

  useEffect(() => {
    if (!args.enabled) return;
    if (status === "submitted" || status === "streaming") {
      return;
    }
    if (!widgetMessages) return;
    setMessages(reconciledLiveMessages);
  }, [args.enabled, reconciledLiveMessages, status, widgetMessages]);

  useEffect(() => {
    if (!args.enabled) return;
    if ((status !== "submitted" && status !== "streaming") || !widgetMessages) {
      return;
    }
    const startedAt = inFlightStartRef.current ?? Date.now();
    const hasAssistantReply = widgetMessages.some(
      (message) =>
        message.role === "assistant" && (message.createdAt ?? 0) >= startedAt,
    );
    if (hasAssistantReply) {
      setMessages(reconciledLiveMessages);
      setStatus("ready");
      setError(null);
      inFlightStartRef.current = null;
    }
  }, [args.enabled, reconciledLiveMessages, status, widgetMessages]);

  const sendMessage = useCallback(
    async (payload: SendMessageArgs) => {
      const text = payload.text.trim();
      if (!text || !args.enabled || !args.widgetKey) return;
      const optimisticId = `local-user-${Date.now()}`;
      inFlightStartRef.current = Date.now();
      setMessages((previous) => [
        ...previous,
        {
          id: optimisticId,
          role: "user",
          parts: [{ type: "text", text }],
        },
      ]);
      setStatus("submitted");
      setError(null);
      try {
        const response = (await sendMessageMutation({
          organizationId: args.organizationId,
          widgetKey: args.widgetKey,
          requestOrigin: args.requestOrigin,
          requestHost: args.requestHost,
          threadId: args.threadId,
          sessionId: args.threadId,
          clientSessionId: args.clientSessionId ?? undefined,
          prompt: text,
          contactId: args.contactId,
          contactEmail: args.contactEmail,
          contactName: args.contactName,
          experienceId: args.experienceId,
          experienceContext: args.experienceContext,
        })) as SendMessageResponse;

        if (response.threadId && response.threadId !== args.threadId) {
          args.onThreadResolved(response.threadId);
        }
        if (typeof response.assistantText === "string" && response.assistantText.trim()) {
          setMessages((previous) => [
            ...previous,
            {
              id: `local-assistant-${Date.now()}`,
              role: "assistant",
              parts: [{ type: "text", text: response.assistantText ?? "" }],
            },
          ]);
          setStatus("ready");
          inFlightStartRef.current = null;
          return;
        }
        if (response.mode !== "agent" || !response.autoRespondEnabled) {
          setStatus("ready");
          inFlightStartRef.current = null;
          return;
        }
        setStatus("streaming");
      } catch (sendError) {
        const resolvedError =
          sendError instanceof Error
            ? sendError
            : new Error("Unable to send support message.");
        setError(resolvedError);
        setStatus("error");
        inFlightStartRef.current = null;
      }
    },
    [
      args.clientSessionId,
      args.contactEmail,
      args.contactId,
      args.contactName,
      args.enabled,
      args.experienceContext,
      args.experienceId,
      args.onThreadResolved,
      args.organizationId,
      args.requestHost,
      args.requestOrigin,
      args.threadId,
      args.widgetKey,
      sendMessageMutation,
    ],
  );

  const regenerate = useCallback(async () => {
    const lastUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user");
    const text = lastUserMessage ? getMessageText(lastUserMessage) : "";
    if (!text) return;
    await sendMessage({ text });
  }, [messages, sendMessage]);

  return {
    messages,
    setMessages,
    sendMessage,
    regenerate,
    status,
    error,
  };
};
