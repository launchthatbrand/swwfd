"use client";

import type {
  ContactDoc,
  ConversationSummary,
} from "../components/ConversationInspector";
import { useEffect, useMemo } from "react";

import { Badge } from "@launchthatapp/ui/badge";
import { Button } from "@launchthatapp/ui/button";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@launchthatapp/ui/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@launchthatapp/ui/components/ai-elements/message";
import { ConversationComposer } from "../components/Composer";
import type { GenericId as Id } from "convex/values";
import { ChevronLeft, MessageSquare } from "lucide-react";
import { cn } from "@launchthatapp/ui/lib/utils";
import { useQuery } from "convex/react";
import { useSupportContact } from "../hooks/useSupportContact";
import { useSupportConvex } from "../../convex/bindings";
import { useMediaQuery } from "@launchthatapp/ui/hooks/use-media-query";
import { useSupportPresence } from "../../components/hooks/useSupportPresence";

type SupportMessage = {
  _id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  messageType?: "chat" | "email_inbound" | "email_outbound";
  agentName?: string;
};

interface TestViewProps {
  organizationId: Id<"organizations">;
  tenantName?: string;
  currentAgent?: {
    id: string;
    name?: string;
    imageUrl?: string;
  };
  conversations: ConversationSummary[];
  activeThreadId?: string;
  onSelectThread?: (threadId?: string) => void;
  onConversationChange?: (
    conversation?: ConversationSummary,
    contact?: ContactDoc | null,
  ) => void;
}

export function TestView({
  organizationId,
  tenantName,
  currentAgent,
  conversations,
  activeThreadId,
  onSelectThread,
  onConversationChange,
}: TestViewProps) {
  const convex = useSupportConvex();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const selectedConversation = useMemo(() => {
    if (!conversations.length) {
      return undefined;
    }
    if (activeThreadId) {
      return (
        conversations.find(
          (conversation) => conversation.threadId === activeThreadId,
        ) ?? conversations[0]
      );
    }
    if (isMobile) {
      return undefined;
    }
    return conversations[0];
  }, [conversations, activeThreadId, isMobile]);

  const contactDoc = useSupportContact(
    selectedConversation?.contactId
      ? (selectedConversation.contactId as Id<"contacts">)
      : undefined,
  );

  const contactForComposer: ContactDoc | null =
    contactDoc ??
    (selectedConversation
      ? {
          _id: (selectedConversation.contactId ??
            "placeholder-contact") as Id<"contacts">,
          organizationId,
          fullName: selectedConversation.contactName ?? "Unknown visitor",
          email: selectedConversation.contactEmail ?? undefined,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
      : null);

  const selectedThreadId = selectedConversation?.threadId ?? null;
  const selectedSessionId =
    selectedConversation?.sessionId ?? selectedConversation?.threadId ?? null;

  const messages =
    (useQuery(
      convex.support.queries.listMessages,
      selectedSessionId
        ? {
            organizationId,
            sessionId: selectedSessionId,
          }
        : "skip",
    ) as SupportMessage[] | undefined) ?? [];

  const hasRenderableConversation =
    Boolean(selectedConversation) && conversations.length > 0;

  const renderedMessages: SupportMessage[] = hasRenderableConversation
    ? messages
    : [];

  useEffect(() => {
    onConversationChange?.(selectedConversation, contactDoc ?? null);
  }, [onConversationChange, selectedConversation, contactDoc]);

  type PresenceEntry = {
    userId: string;
    online?: boolean;
    data?: Record<string, unknown>;
    name?: string;
  };

  const presenceRoomId =
    selectedConversation && organizationId
      ? `support:${organizationId}:${selectedSessionId ?? selectedConversation.threadId}`
      : "__support:no-room";
  const presenceUserId = `agent:${currentAgent?.id ?? "support-admin"}`;
  const presenceState = useSupportPresence({
    presenceApi: convex.support.presence,
    roomId: presenceRoomId,
    userId: presenceUserId,
  }) as PresenceEntry[];
  const visitorConnected = useMemo(
    () =>
      presenceState.some(
        (entry) => entry.online && String(entry.userId).startsWith("visitor:"),
      ),
    [presenceState],
  );

  const formatMessageMeta = (message: SupportMessage) => {
    const timestamp = new Date(message.createdAt).toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
    const channelLabel =
      message.messageType === "email_inbound"
        ? "Email inbound"
        : message.messageType === "email_outbound"
          ? "Email outbound"
          : "Chat";
    return `${timestamp} • ${channelLabel}`;
  };

  if (isMobile && !selectedConversation) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
        <div className="border-border/80 bg-card/95 sticky top-0 z-20 border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Conversations</h2>
        </div>
        <div className="bg-muted/20 flex-1 overflow-y-auto px-2 py-2">
          {conversations.length > 0 ? (
            <div className="space-y-2">
              {conversations.map((conversation) => (
                <button
                  key={conversation.threadId}
                  type="button"
                  onClick={() => onSelectThread?.(conversation.threadId)}
                  className="bg-card text-foreground border-border/70 w-full rounded-xl border px-3 py-3 text-left shadow-sm"
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium">
                        {conversation.contactName ??
                          `Thread ${conversation.threadId.slice(-6)}`}
                      </p>
                      {conversation.contactEmail ? (
                        <p className="text-muted-foreground line-clamp-1 text-xs">
                          {conversation.contactEmail}
                        </p>
                      ) : null}
                    </div>
                    <span className="text-muted-foreground shrink-0 text-[11px]">
                      {new Date(conversation.lastAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-2 line-clamp-2 text-xs">
                    {conversation.lastMessage}
                  </p>
                  <div className="text-muted-foreground mt-2 flex items-center gap-1.5 text-[11px]">
                    <MessageSquare className="h-3.5 w-3.5" />
                    {conversation.totalMessages} messages
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
              No conversations yet.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      {isMobile && selectedConversation ? (
        <div className="border-border/80 bg-card/95 sticky top-0 z-20 flex items-center gap-2 border-b px-2 py-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onSelectThread?.(undefined)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="line-clamp-1 text-sm font-medium">
              {selectedConversation.contactName ??
                `Thread ${selectedConversation.threadId.slice(-6)}`}
            </p>
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              {selectedConversation.contactEmail ? (
                <span className="line-clamp-1">{selectedConversation.contactEmail}</span>
              ) : null}
              <Badge variant={visitorConnected ? "default" : "secondary"}>
                {visitorConnected ? "Visitor connected" : "Visitor disconnected"}
              </Badge>
            </div>
          </div>
        </div>
      ) : null}
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden md:h-[calc(100vh-75px)] md:max-h-[calc(100vh-75px)]">
        <div className="border-border/70 bg-card/70 mx-3 mt-3 flex items-center justify-between rounded-lg border px-3 py-2 text-xs md:mx-6">
          <span className="text-muted-foreground">
            {selectedConversation
              ? selectedConversation.contactName ?? "Unknown visitor"
              : "No conversation selected"}
          </span>
          <Badge variant={visitorConnected ? "default" : "secondary"}>
            {visitorConnected ? "Visitor connected" : "Visitor disconnected"}
          </Badge>
        </div>
        <Conversation className="bg-muted/20 mt-2 flex-1 px-3 pb-8 md:px-6 md:pb-10">
          <ConversationContent className="mx-auto w-full max-w-3xl gap-5 px-0 py-6">
            {renderedMessages.length === 0 ? (
              <ConversationEmptyState
                title={
                  selectedConversation
                    ? "No messages yet"
                    : "Select a conversation from the sidebar"
                }
                description={
                  selectedConversation
                    ? "Messages in this support thread appear here."
                    : "Choose a conversation to preview and reply."
                }
              />
            ) : (
              renderedMessages.map((message) => (
                <Message from={message.role} key={message._id}>
                  <MessageContent
                    className={cn(
                      "max-w-[90%] px-4 py-3 shadow-sm",
                      message.role === "assistant"
                        ? "bg-card rounded-2xl border"
                        : "rounded-2xl",
                    )}
                  >
                    {message.role === "assistant" && message.agentName ? (
                      <p className="text-muted-foreground mb-1 text-[11px] font-semibold">
                        {message.agentName}
                      </p>
                    ) : null}
                    <MessageResponse>{message.content}</MessageResponse>
                    <p className="text-muted-foreground mt-2 text-[11px]">
                      {formatMessageMeta(message)}
                    </p>
                  </MessageContent>
                </Message>
              ))
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="bg-card/95 border-border/80 supports-backdrop-filter:bg-card/75 sticky bottom-0 border-t p-2 shadow-2xl backdrop-blur">
          {selectedConversation ? (
            <ConversationComposer
              organizationId={organizationId}
              threadId={selectedConversation.threadId}
              sessionId={selectedConversation.sessionId}
              conversation={selectedConversation}
              contact={contactForComposer}
              visitorConnected={visitorConnected}
            />
          ) : (
            <div className="text-muted-foreground flex items-center justify-center py-6 text-sm">
              {tenantName
                ? `Select a conversation from the sidebar to preview ${tenantName}'s composer experience.`
                : "Select a conversation from the sidebar to preview the composer."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
