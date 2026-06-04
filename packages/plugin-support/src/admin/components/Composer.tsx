"use client";

import type { ContactDoc, ConversationSummary } from "./ConversationInspector";
import {
  Loader2,
  Maximize2,
  MessageSquare,
  Minimize2,
  SendHorizontal,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@launchthatapp/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@launchthatapp/ui/dialog";
import { Input } from "@launchthatapp/ui/input";
import { Editor } from "@swwfd/ui-lexical/components/editor-x/editor";
import { useMediaQuery } from "@launchthatapp/ui/hooks/use-media-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@launchthatapp/ui/select";
import type { GenericId as Id } from "convex/values";
import { toast } from "@launchthatapp/ui/toast";
import { useMutation, useQuery } from "convex/react";

import {
  buildSupportChannelRegistry,
  createEmailChannelDefinition,
} from "../../channels/registry";
import { useSupportConvex } from "../../convex/bindings";

interface ConversationComposerProps {
  organizationId: Id<"organizations">;
  threadId: string;
  sessionId?: string;
  conversation: ConversationSummary;
  contact: ContactDoc | null;
  visitorConnected: boolean;
}

interface SupportCannedResponseOption {
  _id: string;
  title: string;
  body: string;
  channels: ("chat" | "email")[];
}

const createSerializedEditorStateFromText = (
  text: string,
): any => {
  const normalized = text.replace(/\r\n/g, "\n");
  const paragraphs = normalized.split("\n\n");
  const children = (paragraphs.length > 0 ? paragraphs : [""]).map((paragraph) => ({
    children: [
      {
        detail: 0,
        format: 0,
        mode: "normal",
        style: "",
        text: paragraph,
        type: "text",
        version: 1,
      },
    ],
    direction: "ltr",
    format: "",
    indent: 0,
    type: "paragraph",
    version: 1,
  }));

  return {
    root: {
      children,
      direction: "ltr",
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  };
};

export function ConversationComposer({
  organizationId,
  threadId,
  sessionId,
  conversation,
  contact,
  visitorConnected,
}: ConversationComposerProps) {
  const convex = useSupportConvex();
  const recordMessage = useMutation(convex.support.mutations.recordMessage);
  const setAgentPresence = useMutation(
    convex.support.mutations.setAgentPresence,
  );
  const [isSending, setIsSending] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [editorSerializedState, setEditorSerializedState] = useState<any>(
    createSerializedEditorStateFromText(""),
  );
  const [editorInstanceKey, setEditorInstanceKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string>("chat");
  const [isCannedDialogOpen, setIsCannedDialogOpen] = useState(false);
  const [cannedResponseSearch, setCannedResponseSearch] = useState("");
  const [pendingCannedResponseId, setPendingCannedResponseId] = useState<
    string | null
  >(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const lastPresenceStatusRef = useRef<"typing" | "idle">("idle");
  const lastPresenceUpdateRef = useRef(0);
  const isMobile = useMediaQuery("(max-width: 767px)");

  const contactId =
    contact?._id ?? (conversation.contactId as Id<"contacts"> | undefined);
  const contactEmail = contact?.email ?? conversation.contactEmail ?? undefined;
  const contactName =
    contact?.fullName ?? conversation.contactName ?? undefined;
  const conversationSessionId = sessionId ?? threadId;
  const channelCapabilities = useQuery(
    convex.support.queries.getChannelCapabilities,
    {
      organizationId: organizationId as unknown as string,
      threadId,
      sessionId: conversationSessionId,
      contactEmail,
    },
  ) as
    | {
        emailReady: boolean;
        hasEmailChannel: boolean;
        hasContactEmail: boolean;
        allowEmailIntake: boolean;
      }
    | undefined;
  const cannedResponses = useQuery(
    convex.support.queries.listSupportCannedResponses,
    {
      organizationId: organizationId as unknown as string,
      includeInactive: false,
    },
  ) as SupportCannedResponseOption[] | undefined;

  const shouldRegisterEmailChannel =
    conversation.origin === "email" ||
    Boolean(channelCapabilities?.emailReady) ||
    Boolean(channelCapabilities?.allowEmailIntake);

  const channelRegistry = useMemo(
    () =>
      buildSupportChannelRegistry(
        {
          conversationOrigin: conversation.origin,
          visitorOnline: visitorConnected,
          emailReady: Boolean(channelCapabilities?.emailReady),
          hasContactEmail:
            Boolean(contactEmail && contactEmail.trim().length > 0) ||
            Boolean(channelCapabilities?.hasContactEmail),
          allowEmailIntake: Boolean(channelCapabilities?.allowEmailIntake),
        },
        shouldRegisterEmailChannel ? [createEmailChannelDefinition()] : [],
      ),
    [
      conversation.origin,
      visitorConnected,
      channelCapabilities?.emailReady,
      channelCapabilities?.hasContactEmail,
      channelCapabilities?.allowEmailIntake,
      contactEmail,
      shouldRegisterEmailChannel,
    ],
  );

  const channels = channelRegistry.channels;
  const selectedChannel = channels.find(
    (channel) => channel.id === selectedChannelId,
  );
  const channelLabel =
    selectedChannel?.id === "email" ? "Email reply" : "Live chat reply";
  const channelCompatibleCannedResponses = useMemo(() => {
    const channelId = selectedChannel?.id;
    if (!channelId || !Array.isArray(cannedResponses)) {
      return [];
    }
    return cannedResponses.filter((response) =>
      response.channels.includes(channelId as "chat" | "email"),
    );
  }, [selectedChannel?.id, cannedResponses]);

  const filteredCannedResponses = useMemo(() => {
    const query = cannedResponseSearch.trim().toLowerCase();
    if (!query) {
      return channelCompatibleCannedResponses;
    }
    return channelCompatibleCannedResponses.filter((response) => {
      const inTitle = response.title.toLowerCase().includes(query);
      const inBody = response.body.toLowerCase().includes(query);
      return inTitle || inBody;
    });
  }, [channelCompatibleCannedResponses, cannedResponseSearch]);

  const pendingCannedResponse = channelCompatibleCannedResponses.find(
    (response) => response._id === pendingCannedResponseId,
  );

  useEffect(() => {
    const validSelection = channels.find(
      (channel) => channel.id === selectedChannelId && channel.enabled,
    );
    if (validSelection) return;
    if (channelRegistry.defaultChannelId) {
      setSelectedChannelId(channelRegistry.defaultChannelId);
    }
  }, [channels, channelRegistry.defaultChannelId, selectedChannelId]);

  useEffect(() => {
    if (!isCannedDialogOpen) {
      return;
    }

    const stillExists = channelCompatibleCannedResponses.some(
      (response) => response._id === pendingCannedResponseId,
    );
    if (stillExists) {
      return;
    }

    setPendingCannedResponseId(channelCompatibleCannedResponses[0]?._id ?? null);
  }, [
    channelCompatibleCannedResponses,
    isCannedDialogOpen,
    pendingCannedResponseId,
  ]);

  const updatePresence = useCallback(
    (status: "typing" | "idle", force = false) => {
      const now = Date.now();
      if (
        !force &&
        lastPresenceStatusRef.current === status &&
        now - lastPresenceUpdateRef.current < 1500
      ) {
        return;
      }

      lastPresenceStatusRef.current = status;
      lastPresenceUpdateRef.current = now;
      void setAgentPresence({
        organizationId: organizationId as unknown as string,
        threadId,
        sessionId: conversationSessionId,
        status,
        agentUserId: "agent",
        agentName: contactName ?? "Agent",
      });
    },
    [contactName, conversationSessionId, organizationId, setAgentPresence, threadId],
  );

  const handleTextChange = (text: string) => {
    const trimmed = text.trim();
    setDraftText(trimmed);
    setHasContent(trimmed.length > 0);

    if (trimmed.length > 0) {
      updatePresence("typing");
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = window.setTimeout(() => {
        updatePresence("idle", true);
      }, 4000);
    } else {
      updatePresence("idle");
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  };

  const handleSend = async () => {
    if (isSending) {
      return;
    }

    const plainText = draftText.trim();
    if (!plainText) {
      return;
    }
    if (!selectedChannel?.enabled) {
      toast.error(selectedChannel?.disabledReason ?? "Selected channel is unavailable.");
      return;
    }

    const messageType =
      selectedChannel.id === "email" ? "email_outbound" : "chat";

    const htmlBody = plainText
      ? plainText
          .split("\n\n")
          .map((paragraph) =>
            paragraph
              ? `<p>${paragraph.replace(/\n/g, "<br/>")}</p>`
              : "<p><br/></p>",
          )
          .join("")
      : undefined;

    try {
      setIsSending(true);
      await recordMessage({
        organizationId,
        threadId,
        sessionId: conversationSessionId,
        role: "assistant",
        content: plainText,
        contactId,
        contactEmail,
        contactName,
        source: "admin",
        channel: selectedChannel.id,
        messageType,
        subject:
          messageType === "email_outbound"
            ? conversation.origin === "email"
              ? conversation.lastMessage || "Support reply"
              : `Support update from ${contactName ?? "Support"}`
            : undefined,
        htmlBody,
        textBody: plainText,
      });

      setHasContent(false);
      setDraftText("");
      setEditorSerializedState(createSerializedEditorStateFromText(""));
      setEditorInstanceKey((prev) => prev + 1);
      updatePresence("idle", true);
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    } catch (error) {
      console.error("[support-composer] send message error", error);
      toast.error("Unable to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const insertCannedResponseBody = (responseBody: string) => {
    const nextText = draftText.trim().length
      ? `${draftText}\n\n${responseBody}`.trim()
      : responseBody;
    setEditorSerializedState(createSerializedEditorStateFromText(nextText));
    setEditorInstanceKey((prev) => prev + 1);
    handleTextChange(nextText);
    toast.success("Canned response inserted.");
  };

  const handleInsertCannedResponse = useCallback(() => {
    if (!pendingCannedResponse) {
      toast.error("Select a canned response first.");
      return;
    }

    insertCannedResponseBody(pendingCannedResponse.body);
    setIsCannedDialogOpen(false);
    setCannedResponseSearch("");
  }, [insertCannedResponseBody, pendingCannedResponse]);

  const blockInsertMenuItems = useMemo(
    () => (
      <SelectItem
        value="support-canned-response"
        disabled={channelCompatibleCannedResponses.length === 0}
        onPointerUp={(event) => {
          event.preventDefault();
          if (channelCompatibleCannedResponses.length === 0) {
            toast.error(`No canned responses available for ${channelLabel}.`);
            return;
          }
          setIsCannedDialogOpen(true);
        }}
      >
        <div className="flex items-center gap-1">
          <MessageSquare className="size-4" />
          <span>Canned response</span>
        </div>
      </SelectItem>
    ),
    [channelCompatibleCannedResponses.length, channelLabel],
  );

  useEffect(() => {
    if (!isMobile && isFullscreen) {
      setIsFullscreen(false);
    }
  }, [isFullscreen, isMobile]);

  useEffect(() => {
    if (!isFullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreen]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      updatePresence("idle", true);
    };
  }, [updatePresence]);

  const composerCard = (
    <div
      className={
        isFullscreen
          ? "bg-card flex h-full flex-col rounded-xl border shadow-sm"
          : "bg-card rounded-xl border shadow-sm [&_[contenteditable='true']]:min-h-[120px] [&_[contenteditable='true']]:px-3 [&_[contenteditable='true']]:py-2.5 [&_[contenteditable='true']]:text-[15px] md:[&_[contenteditable='true']]:min-h-[96px] md:[&_[contenteditable='true']]:text-sm"
      }
    >
        {isMobile ? (
          <div className="flex items-center justify-end border-b px-2 py-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-xs"
              onClick={() => setIsFullscreen((prev) => !prev)}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5" />
                  Close full screen
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5" />
                  Full screen editor
                </>
              )}
            </Button>
          </div>
        ) : null}
        <div
          className={
            isFullscreen
              ? "min-h-0 flex-1 [&_[contenteditable='true']]:min-h-[50vh] [&_[contenteditable='true']]:px-3 [&_[contenteditable='true']]:py-2.5 [&_[contenteditable='true']]:text-[15px]"
              : ""
          }
        >
          <Editor
            key={editorInstanceKey}
            editorSerializedState={editorSerializedState}
            onSerializedChange={(value) => setEditorSerializedState(value as any)}
            onTextContentChange={handleTextChange}
            hideFooterActions
            compactToolbar={isMobile && !isFullscreen}
            singleRowToolbar
            blockInsertMenuItems={blockInsertMenuItems}
          />
        </div>
        <div className="flex flex-col gap-2 border-t px-3 py-2 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="text-muted-foreground text-[11px] md:text-xs">
              {channelLabel}
              {selectedChannel?.id === "chat"
                ? " • Sends directly in the live widget."
                : " • Sends an email and keeps replies in this thread."}
            </div>
            <div className="text-muted-foreground text-[11px] md:text-xs">
              Use the editor <span className="font-medium">Insert</span> menu to add
              canned responses.
            </div>
            {selectedChannel && !selectedChannel.enabled ? (
              <div className="text-destructive text-[11px]">
                {selectedChannel.disabledReason}
              </div>
            ) : null}
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
            <Select
              value={selectedChannelId}
              onValueChange={(value) => setSelectedChannelId(value)}
            >
              <SelectTrigger className="h-9 w-full md:w-[180px]">
                <SelectValue placeholder="Select channel" />
              </SelectTrigger>
              <SelectContent>
                {channels.map((channel) => (
                  <SelectItem
                    key={channel.id}
                    value={channel.id}
                    disabled={!channel.enabled}
                  >
                    {channel.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              disabled={!hasContent || isSending || !selectedChannel?.enabled}
              onClick={() => void handleSend()}
              className="h-10 w-full gap-2 md:h-9 md:w-auto"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <SendHorizontal className="h-4 w-4" />
                  Send
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
  );

  const cannedResponseDialog = (
    <Dialog open={isCannedDialogOpen} onOpenChange={setIsCannedDialogOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select canned response</DialogTitle>
          <DialogDescription>
            Choose a stored response for {channelLabel.toLowerCase()}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={cannedResponseSearch}
            onChange={(event) => setCannedResponseSearch(event.target.value)}
            placeholder="Search title or content..."
          />
          <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
            {filteredCannedResponses.length > 0 ? (
              filteredCannedResponses.map((response) => {
                const isSelected = pendingCannedResponseId === response._id;
                return (
                  <button
                    key={response._id}
                    type="button"
                    onClick={() => setPendingCannedResponseId(response._id)}
                    className={`w-full rounded-md border p-3 text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted border-border"
                    }`}
                  >
                    <div className="text-sm font-medium">{response.title}</div>
                    <p className="text-muted-foreground mt-1 line-clamp-3 text-xs whitespace-pre-wrap">
                      {response.body}
                    </p>
                  </button>
                );
              })
            ) : (
              <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                No canned responses found for this channel.
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsCannedDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleInsertCannedResponse}
            disabled={!pendingCannedResponse}
          >
            Insert response
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (isFullscreen && typeof document !== "undefined") {
    return createPortal(
      <>
        <div className="bg-background fixed inset-0 z-[2147483000] p-2">
          {composerCard}
        </div>
        {cannedResponseDialog}
      </>,
      document.body,
    );
  }

  return (
    <div className="space-y-2 p-1.5 md:p-2">
      {composerCard}
      {cannedResponseDialog}
    </div>
  );
}
