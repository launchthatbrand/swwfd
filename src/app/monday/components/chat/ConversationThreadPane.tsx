"use client";

import { useState } from "react";

import { Badge } from "@launchthatapp/ui/badge";

import { ContactUpdates } from "../ContactUpdates";
import type { ConversationThreadPaneProps } from "./types";

export const ConversationThreadPane = ({
  selectedConversation,
  subitems,
  isLoadingMessages,
  currentUserId,
  onSendMessage,
  onDeleteMessage,
  onUpdateMessageDate,
}: ConversationThreadPaneProps) => {
  const [draft, setDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
            draft={draft}
            onDraftChange={setDraft}
            onSubmit={async ({ updateType, date }) => {
              const body = draft.trim();
              if (!body) return;
              setIsSubmitting(true);
              try {
                await onSendMessage({ body, updateType, date });
                setDraft("");
              } finally {
                setIsSubmitting(false);
              }
            }}
            onDeleteSubitem={async (subitemId) => {
              await onDeleteMessage(subitemId);
            }}
            onUpdateSubitemDate={async (subitemId, date) => {
              await onUpdateMessageDate(subitemId, date);
            }}
            isSubmitting={isSubmitting}
            currentUserId={currentUserId}
          />
        )}
      </div>
    </section>
  );
};
