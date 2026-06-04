"use client";

import {
  AiChatComposer,
  AiChatHeader,
  AiChatMessageList,
  AiChatPanel,
} from "../components/chat";
import type { ChatStatus, FileUIPart, UIMessage } from "ai";

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@launchthatapp/ui";

export interface AdminAiChatScreenProps
  extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  messages: UIMessage[];
  status?: ChatStatus;
  onStop?: () => void;
  onSend: (input: string, files: FileUIPart[]) => void | Promise<void>;
  emptyTitle?: string;
  emptyDescription?: string;
  composerPlaceholder?: string;
  composerModelLabel?: string;
  composerModelProvider?: string;
  composerLockModelSelector?: boolean;
  renderMessage?: (message: UIMessage) => ReactNode;
}

export const AdminAiChatScreen = ({
  className,
  title = "AI Assistant",
  subtitle = "Ask about trades, risk, and daily market context.",
  messages,
  status,
  onStop,
  onSend,
  emptyTitle = "Start a conversation",
  emptyDescription = "Ask a question to see answers here.",
  composerPlaceholder = "Ask a question about your trades...",
  composerModelLabel,
  composerModelProvider,
  composerLockModelSelector,
  renderMessage,
  ...props
}: AdminAiChatScreenProps) => (
  <AiChatPanel
    className={cn("flex h-full min-h-[520px] flex-col overflow-hidden", className)}
    {...props}
  >
    {/* <AiChatHeader subtitle={subtitle} title={title} /> */}
    <AiChatMessageList
      className="flex-1 overflow-y-auto"
      emptyDescription={emptyDescription}
      emptyTitle={emptyTitle}
      messages={messages}
      renderMessage={renderMessage}
    />
    <div className="shrink-0 border-t bg-background p-2">
      <AiChatComposer
        onSend={onSend}
        onStop={onStop}
        placeholder={composerPlaceholder}
        modelLabel={composerModelLabel}
        modelProvider={composerModelProvider}
        lockModelSelector={composerLockModelSelector}
        status={status}
      />
    </div>
  </AiChatPanel>
);
