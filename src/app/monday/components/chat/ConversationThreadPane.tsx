"use client";

import { useState } from "react";
import { SupportChannelComposer } from "@swwfd/support-chat-composer";

import { Badge } from "@launchthatapp/ui/badge";

import { ContactUpdates } from "../ContactUpdates";
import type { ConversationThreadPaneProps } from "./types";

export const ConversationThreadPane = ({
  selectedConversation,
  subitems,
  isLoadingMessages,
  composerChannels,
  selectedComposerChannel,
  onComposerChannelChange,
  currentUserId,
  onSendMessage,
  onDeleteMessage,
  onUpdateMessageDate,
}: ConversationThreadPaneProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const noop = () => {
    // Thread composer is rendered separately for channel-aware sending.
  };

  if (!selectedConversation) {
    return (
      <section className="flex min-h-0 flex-1 items-center justify-center border-r bg-muted/20">
        <p className="text-muted-foreground text-sm">Select a conversation or contact to start chatting.</p>
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col border-r bg-background">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {selectedConversation.contactName || "Unknown Contact"}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            {selectedConversation.contactEmail || "No email"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="capitalize">
            {selectedConversation.mode}
          </Badge>
          <Badge variant="outline" className="capitalize">
            {selectedConversation.status}
          </Badge>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {isLoadingMessages ? (
          <p className="text-muted-foreground text-sm">Loading messages...</p>
        ) : (
          <ContactUpdates
            subitems={subitems}
            isLoading={isLoadingMessages}
            isEmpty={subitems.length === 0}
            isStaticMode={false}
            draft=""
            onDraftChange={noop}
            onSubmit={async () => undefined}
            onDeleteSubitem={async (subitemId) => {
              await onDeleteMessage(subitemId);
            }}
            onUpdateSubitemDate={async (subitemId, date) => {
              await onUpdateMessageDate(subitemId, date);
            }}
            isSubmitting={false}
            currentUserId={currentUserId}
            hideComposer
          />
        )}
      </div>

      <div className="border-t bg-background p-3">
        <SupportChannelComposer
          channels={composerChannels}
          selectedChannel={selectedComposerChannel}
          onSelectedChannelChange={onComposerChannelChange}
          isSending={isSubmitting}
          onSend={async ({ channel, text }) => {
            setIsSubmitting(true);
            try {
              await onSendMessage({
                channel,
                body: text,
              });
            } finally {
              setIsSubmitting(false);
            }
          }}
        />
      </div>
    </section>
  );
};
