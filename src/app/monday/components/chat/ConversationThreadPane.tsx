"use client";

import { useState } from "react";
import { SupportChannelComposer } from "@swwfd/support-chat-composer";

import { Badge } from "@launchthatapp/ui/badge";
import { Button } from "@launchthatapp/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@launchthatapp/ui/select";

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
  contactOwnerUserId,
  onSendMessage,
  onSendBulkMessage,
  bulkSelectionCount,
  emailTemplates,
  selectedEmailTemplateId,
  selectedEmailTemplateBody,
  onSelectedEmailTemplateIdChange,
  onClearBulkSelection,
  onDeleteMessage,
  onUpdateMessageDate,
}: ConversationThreadPaneProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const noop = () => {
    // Thread composer is rendered separately for channel-aware sending.
  };

  if (!selectedConversation && bulkSelectionCount === 0) {
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
            {selectedConversation?.contactName || (bulkSelectionCount > 0 ? "Bulk outreach" : "Unknown Contact")}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            {selectedConversation?.contactEmail || (bulkSelectionCount > 0 ? `${bulkSelectionCount} contacts selected` : "No email")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedConversation ? (
            <>
              <Badge variant="secondary" className="capitalize">
                {selectedConversation.mode}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {selectedConversation.status}
              </Badge>
            </>
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {bulkSelectionCount > 0 && !selectedConversation ? (
          <p className="text-muted-foreground text-sm">
            Bulk outreach mode. Compose a message below and send it to selected contacts.
          </p>
        ) : isLoadingMessages ? (
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
            alignmentOwnerUserId={contactOwnerUserId}
            hideComposer
          />
        )}
      </div>

      <div className="border-t bg-background p-3">
        {bulkSelectionCount > 0 ? (
          <div className="mb-2 flex items-center justify-between gap-2 rounded border border-primary/30 bg-primary/5 px-2 py-1.5">
            <p className="text-xs font-medium">
              Bulk mode active: {bulkSelectionCount} contact{bulkSelectionCount === 1 ? "" : "s"}
            </p>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onClearBulkSelection}>
              Exit bulk mode
            </Button>
          </div>
        ) : null}
        {selectedComposerChannel === "email" ? (
          <div className="mb-2 flex items-center gap-2">
            <p className="text-muted-foreground shrink-0 text-xs">Template</p>
            <Select
              value={selectedEmailTemplateId ?? "__manual__"}
              onValueChange={(value) =>
                onSelectedEmailTemplateIdChange(value === "__manual__" ? null : value)
              }
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Manual message" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__manual__">Manual message</SelectItem>
                {emailTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <SupportChannelComposer
          channels={composerChannels}
          selectedChannel={selectedComposerChannel}
          onSelectedChannelChange={onComposerChannelChange}
          isSending={isSubmitting}
          initialText={
            selectedComposerChannel === "email" && selectedEmailTemplateId
              ? (selectedEmailTemplateBody ?? "")
              : undefined
          }
          onSend={async ({ channel, text }) => {
            setIsSubmitting(true);
            try {
              if (bulkSelectionCount > 0) {
                await onSendBulkMessage({
                  channel,
                  body: text,
                  emailTemplateId: selectedEmailTemplateId,
                });
              } else {
                await onSendMessage({
                  channel,
                  body: text,
                  emailTemplateId: selectedEmailTemplateId,
                });
              }
            } finally {
              setIsSubmitting(false);
            }
          }}
        />
      </div>
    </section>
  );
};
