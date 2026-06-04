"use client";

import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "../ai-elements/conversation";
import type { DynamicToolUIPart, ToolUIPart, UIMessage } from "ai";
import type { HTMLAttributes, ReactNode } from "react";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "../../components/ai-elements/message";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "../ai-elements/tool";

import { cn } from "@launchthatapp/ui";

const getMessageText = (message: UIMessage) => {
  if (typeof (message as { content?: unknown }).content === "string") {
    return String((message as { content?: string }).content ?? "");
  }

  if (Array.isArray(message.parts)) {
    return message.parts
      .map((part) => {
        if (part.type === "text" || part.type === "reasoning") {
          return part.text;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }

  return "";
};

const isToolPart = (
  part: UIMessage["parts"][number],
): part is ToolUIPart | DynamicToolUIPart =>
  part.type === "dynamic-tool" || part.type.startsWith("tool-");

const getToolParts = (message: UIMessage) => {
  if (!Array.isArray(message.parts)) return [];
  return message.parts.filter(isToolPart);
};

export interface AiChatMessageListProps
  extends HTMLAttributes<HTMLDivElement> {
  messages: UIMessage[];
  emptyTitle?: string;
  emptyDescription?: string;
  renderMessage?: (message: UIMessage) => ReactNode;
}

export const AiChatMessageList = ({
  className,
  messages,
  emptyTitle,
  emptyDescription,
  renderMessage,
  ...props
}: AiChatMessageListProps) => (
  <Conversation className={cn("min-h-0", className)} {...props}>
    <ConversationContent>
      {messages.length === 0 ? (
        <ConversationEmptyState
          description={emptyDescription}
          title={emptyTitle}
        />
      ) : (
        messages.map((message, index) => {
          if (renderMessage) {
            return <div key={message.id ?? index}>{renderMessage(message)}</div>;
          }

          const text = getMessageText(message);
          const toolParts = getToolParts(message);

          return (
            <Message from={message.role} key={message.id ?? index}>
              <MessageContent>
                {text ? <MessageResponse>{text}</MessageResponse> : null}
                {toolParts.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {toolParts.map((part, toolIndex) => (
                      <Tool key={`${message.id ?? index}-tool-${toolIndex}`}>
                        {part.type === "dynamic-tool" ? (
                          <ToolHeader
                            type={part.type}
                            state={part.state}
                            toolName={part.toolName}
                          />
                        ) : (
                          <ToolHeader type={part.type} state={part.state} />
                        )}
                        <ToolContent>
                          <div className="space-y-4">
                            <ToolInput input={part.input ?? {}} />
                            <ToolOutput
                              errorText={part.errorText}
                              output={part.output ?? {}}
                            />
                          </div>
                        </ToolContent>
                      </Tool>
                    ))}
                  </div>
                ) : null}
              </MessageContent>
            </Message>
          );
        })
      )}
    </ConversationContent>
    <ConversationScrollButton />
  </Conversation>
);
