"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
} from "@launchthatapp/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@launchthatapp/ui/tabs";
import { useEffect, useMemo, useState } from "react";

import type { ConversationSummary } from "../components/ConversationInspector";
import { CheckSquare, MessageSquare, Square, Trash2 } from "lucide-react";
import { SUPPORT_COPY } from "../constants/supportCopy";
import { cn } from "@launchthatapp/ui/lib/utils";
import { Badge } from "@launchthatapp/ui/badge";
import type { GenericId as Id } from "convex/values";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@launchthatapp/ui/alert-dialog";
import { Button } from "@launchthatapp/ui/button";
import { Checkbox } from "@launchthatapp/ui/checkbox";
import { toast } from "@launchthatapp/ui/toast";
import { useMutation } from "convex/react";

import { useSupportConvex } from "../../convex/bindings";

type SidebarFilter = "mine" | "unassigned" | "all";

interface ConversationSidebarProps {
  organizationId: Id<"organizations">;
  conversations: ConversationSummary[];
  activeThreadId?: string;
  onSelect: (threadId: string) => void;
  onBulkDeleteComplete?: (deletedThreadIds: string[]) => void;
  className?: string;
}

export function ConversationLeftSidebar({
  organizationId,
  conversations,
  activeThreadId,
  onSelect,
  onBulkDeleteComplete,
  className,
}: ConversationSidebarProps) {
  const convex = useSupportConvex();
  const deleteConversation = useMutation(convex.support.mutations.deleteConversation);
  const [filter, setFilter] = useState<SidebarFilter>("all");
  const [searchValue, setSearchValue] = useState("");
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedThreadIds, setSelectedThreadIds] = useState<Set<string>>(new Set());
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const filteredConversations = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();
    const matchesSearch = (conversation: ConversationSummary) => {
      if (!normalizedSearch) {
        return true;
      }

      const subjectText = conversation.contactName ?? "";
      const emailText = conversation.contactEmail ?? "";
      const threadText = conversation.threadId;
      const lastMessageText = conversation.lastMessage ?? "";
      return (
        subjectText.toLowerCase().includes(normalizedSearch) ||
        emailText.toLowerCase().includes(normalizedSearch) ||
        threadText.toLowerCase().includes(normalizedSearch) ||
        lastMessageText.toLowerCase().includes(normalizedSearch)
      );
    };

    switch (filter) {
      case "mine":
        return conversations.filter(
          (conversation) => conversation.contactId && matchesSearch(conversation),
        );
      case "unassigned":
        return conversations.filter(
          (conversation) => !conversation.contactId && matchesSearch(conversation),
        );
      default:
        return conversations.filter(matchesSearch);
    }
  }, [conversations, filter, searchValue]);

  const formatDateLabel = (lastAt: number) => {
    if (!Number.isFinite(lastAt)) {
      return "—";
    }
    return new Date(lastAt).toLocaleDateString();
  };

  useEffect(() => {
    setSelectedThreadIds((previous) => {
      if (previous.size === 0) {
        return previous;
      }
      const validThreadIds = new Set(
        filteredConversations.map((conversation) => conversation.threadId),
      );
      const next = new Set(
        Array.from(previous).filter((threadId) => validThreadIds.has(threadId)),
      );
      return next.size === previous.size ? previous : next;
    });
  }, [filteredConversations]);

  const selectedCount = selectedThreadIds.size;
  const allFilteredSelected =
    filteredConversations.length > 0 &&
    filteredConversations.every((conversation) =>
      selectedThreadIds.has(conversation.threadId),
    );

  const toggleThreadSelection = (threadId: string) => {
    setSelectedThreadIds((previous) => {
      const next = new Set(previous);
      if (next.has(threadId)) {
        next.delete(threadId);
      } else {
        next.add(threadId);
      }
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    setSelectedThreadIds((_previous) => {
      if (allFilteredSelected) {
        return new Set();
      }
      return new Set(
        filteredConversations.map((conversation) => conversation.threadId),
      );
    });
  };

  const handleBulkDelete = async () => {
    if (selectedCount === 0 || isBulkDeleting) {
      return;
    }

    const threadIds = Array.from(selectedThreadIds);
    setIsBulkDeleting(true);
    try {
      const results = await Promise.allSettled(
        threadIds.map(async (threadId) =>
          deleteConversation({
            organizationId,
            threadId,
          }),
        ),
      );

      const deletedThreadIds: string[] = [];
      const failureMessages: string[] = [];
      results.forEach((result, index) => {
        const threadId = threadIds[index];
        if (!threadId) {
          return;
        }
        if (result.status === "fulfilled") {
          deletedThreadIds.push(threadId);
          return;
        }
        const message =
          result.reason instanceof Error
            ? result.reason.message
            : "Unexpected error";
        failureMessages.push(message);
      });

      if (deletedThreadIds.length > 0) {
        toast.success(
          `Deleted ${deletedThreadIds.length} conversation${deletedThreadIds.length === 1 ? "" : "s"}.`,
        );
        onBulkDeleteComplete?.(deletedThreadIds);
      }
      if (failureMessages.length > 0) {
        toast.error(
          `Failed to delete ${failureMessages.length} conversation${failureMessages.length === 1 ? "" : "s"}.`,
          {
            description: failureMessages[0],
          },
        );
      }

      setSelectedThreadIds((previous) => {
        if (deletedThreadIds.length === 0) {
          return previous;
        }
        const next = new Set(previous);
        deletedThreadIds.forEach((threadId) => {
          next.delete(threadId);
        });
        return next;
      });
      setConfirmBulkDeleteOpen(false);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return (
    <Sidebar
      collapsible="none"
      className={cn("hidden border-r md:flex", className)}
    >
      <AlertDialog open={confirmBulkDeleteOpen} onOpenChange={setConfirmBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected conversations?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {selectedCount} selected conversation
              {selectedCount === 1 ? "" : "s"}, including notes and event history.
              Connected visitors are still protected by backend rules.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={selectedCount === 0 || isBulkDeleting}
              onClick={(event) => {
                event.preventDefault();
                void handleBulkDelete();
              }}
            >
              {isBulkDeleting ? "Deleting..." : "Delete selected"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Tabs
        value={filter}
        onValueChange={(value) => setFilter(value as SidebarFilter)}
      >
        <SidebarHeader className="flex h-auto flex-col gap-1 border-b p-0">
          <div className="flex flex-col gap-1 p-4">
            <div className="flex w-full items-center justify-between gap-3">
              <div className="text-foreground text-base font-medium">Conversations</div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setBulkSelectMode((previous) => !previous);
                  setSelectedThreadIds(new Set());
                }}
              >
                {bulkSelectMode ? "Done" : "Select"}
              </Button>
            </div>
            <SidebarInput
              placeholder="Search thread, contact, or message..."
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
            {bulkSelectMode ? (
              <div className="bg-muted/40 mt-2 space-y-2 rounded-md border p-2">
                <div className="text-muted-foreground text-xs">
                  {selectedCount} selected
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={toggleSelectAllFiltered}
                    disabled={filteredConversations.length === 0 || isBulkDeleting}
                  >
                    {allFilteredSelected ? (
                      <Square className="h-3.5 w-3.5" />
                    ) : (
                      <CheckSquare className="h-3.5 w-3.5" />
                    )}
                    {allFilteredSelected ? "Clear all" : "Select all"}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={() => setConfirmBulkDeleteOpen(true)}
                    disabled={selectedCount === 0 || isBulkDeleting}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete selected
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
          <TabsList className="flex h-auto w-auto justify-start rounded-none p-0">
            <TabsTrigger value="mine" className="rounded-none text-xs">
              Mine
            </TabsTrigger>
            <TabsTrigger value="unassigned" className="rounded-none text-xs">
              Unassigned
            </TabsTrigger>
            <TabsTrigger value="all" className="rounded-none text-xs">
              All
            </TabsTrigger>
          </TabsList>
        </SidebarHeader>

      </Tabs>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            {filteredConversations?.length > 0 ? (
              filteredConversations.map((conversation) => {
                const isActive =
                  activeThreadId === conversation.threadId ||
                  (!activeThreadId &&
                    filteredConversations[0]?.threadId ===
                    conversation.threadId);
                return (
                  <div
                    key={conversation.threadId}
                    className={cn(
                      "flex gap-2 border-b p-3 text-left text-sm last:border-b-0",
                      isActive ? "bg-sidebar-accent/60" : "",
                    )}
                  >
                    {bulkSelectMode ? (
                      <div className="pt-1">
                        <Checkbox
                          checked={selectedThreadIds.has(conversation.threadId)}
                          onCheckedChange={() =>
                            toggleThreadSelection(conversation.threadId)
                          }
                          aria-label={`Select conversation ${conversation.threadId.slice(-6)}`}
                          disabled={isBulkDeleting}
                        />
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onSelect(conversation.threadId)}
                      className="hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground flex min-w-0 flex-1 flex-col gap-2 rounded-md p-1"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex min-w-0 flex-col">
                          <span className="font-medium">
                            {conversation.contactName ??
                              `Thread ${conversation.threadId.slice(-6)}`}
                          </span>
                          {conversation.contactEmail && (
                            <span className="text-muted-foreground line-clamp-1 text-[11px]">
                              {conversation.contactEmail}
                            </span>
                          )}
                        </div>
                        <span className="text-muted-foreground ml-auto shrink-0 text-xs">
                          {formatDateLabel(conversation.lastAt)}
                        </span>
                      </div>
                      <p className="text-muted-foreground line-clamp-2 text-xs">
                        {conversation.lastMessage}
                      </p>
                      <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {conversation.totalMessages} messages
                        {conversation.lastRole === "user" && !isActive ? (
                          <Badge className="h-5 px-2 text-[10px]">Unread</Badge>
                        ) : null}
                        <Badge
                          variant="secondary"
                          className={cn(
                            "h-5 px-2 text-[10px]",
                            conversation.lastRole === "user"
                              ? "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200"
                              : "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200",
                          )}
                        >
                          {conversation.lastRole === "user"
                            ? "Waiting for response"
                            : "Responded"}
                        </Badge>
                        {conversation.status && conversation.status !== "open" ? (
                          <Badge variant="outline" className="h-5 px-2 text-[10px]">
                            {conversation.status === "snoozed"
                              ? "Snoozed"
                              : "Closed"}
                          </Badge>
                        ) : null}
                        {conversation.mode === "manual" ? (
                          <Badge variant="outline" className="h-5 px-2 text-[10px]">
                            Manual mode
                          </Badge>
                        ) : null}
                      </div>
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="text-muted-foreground p-6 text-sm">
                {SUPPORT_COPY.sidebar.emptyState}
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
