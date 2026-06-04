import { useMemo } from "react";
import { useQuery } from "convex/react";

import { useSupportConvex } from "../../convex/bindings";

export interface ChatHistoryMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { title: string; url: string; source?: string; slug?: string }[];
}

interface UseSupportChatHistoryResult {
  initialMessages: ChatHistoryMessage[];
  isBootstrapped: boolean;
}

export const useSupportChatHistory = (
  organizationId: string,
  threadId: string | null,
  options?: {
    transportMode?: "legacy" | "convex";
    widgetKey?: string | null;
    requestOrigin?: string;
    requestHost?: string;
  },
): UseSupportChatHistoryResult => {
  const convex = useSupportConvex();
  const isConvexTransport =
    options?.transportMode === "convex" &&
    typeof options.widgetKey === "string" &&
    options.widgetKey.trim().length > 0;
  const listMessagesRef = isConvexTransport
    ? convex.support.widget.queries.listMessages
    : convex.support.queries.listMessages;

  const messages = useQuery(
    listMessagesRef,
    organizationId && threadId
      ? {
          ...(isConvexTransport
            ? {
                organizationId,
                widgetKey: options?.widgetKey,
                requestOrigin: options?.requestOrigin,
                requestHost: options?.requestHost,
                threadId,
                sessionId: threadId,
                limit: 500,
              }
            : {
                organizationId,
                sessionId: threadId,
              }),
        }
      : "skip",
  );

  const initialMessages = useMemo<ChatHistoryMessage[]>(() => {
    if (!messages) {
      return [];
    }
    return messages.map((message: { _id: any; role: any; content: any }) => ({
      id: message._id,
      role: message.role,
      content: message.content,
    }));
  }, [messages]);

  const isBootstrapped = messages !== undefined;

  return { initialMessages, isBootstrapped };
};
