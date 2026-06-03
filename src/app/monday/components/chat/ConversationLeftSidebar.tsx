"use client";

import { Input } from "@launchthatapp/ui/input";
import { Badge } from "@launchthatapp/ui/badge";
import { Button } from "@launchthatapp/ui/button";

import { cn } from "~/lib/utils";

import type { ConversationLeftSidebarProps } from "./types";

const scopeOptions: Array<{ value: "all" | "mine" | "unassigned"; label: string }> = [
  { value: "mine", label: "Mine" },
  { value: "unassigned", label: "Unassigned" },
  { value: "all", label: "All" },
];

export const ConversationLeftSidebar = ({
  records,
  conversations,
  selectedConversationId,
  selectedRecordId,
  scope,
  search,
  onScopeChange,
  onSearchChange,
  onSelectConversation,
  onSelectRecord,
}: ConversationLeftSidebarProps) => {
  return (
    <aside className="flex h-full min-h-0 w-[320px] shrink-0 flex-col border-r bg-background">
      <div className="space-y-3 border-b p-3">
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search conversations..."
        />
        <div className="flex items-center gap-1">
          {scopeOptions.map((option) => (
            <Button
              key={option.value}
              variant={scope === option.value ? "default" : "outline"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onScopeChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <p className="text-muted-foreground px-3 pt-3 text-xs font-semibold uppercase tracking-wide">
          Conversations
        </p>
        <div className="space-y-1 p-2">
          {conversations.map((conversation) => {
            const isActive = selectedConversationId === conversation.id;
            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => onSelectConversation(conversation.id)}
                className={cn(
                  "w-full rounded-md border p-2 text-left transition-colors",
                  isActive ? "border-primary bg-primary/10" : "hover:bg-muted/60",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{conversation.contactName || "Unknown"}</p>
                  <div className="flex items-center gap-1">
                    {conversation.unreadCount > 0 ? (
                      <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                        {conversation.unreadCount}
                      </Badge>
                    ) : null}
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] capitalize">
                      {conversation.status}
                    </Badge>
                  </div>
                </div>
                <p className="text-muted-foreground truncate text-xs">
                  {conversation.contactEmail || "No email"}
                </p>
                <p className="text-muted-foreground mt-1 line-clamp-1 text-xs">
                  {conversation.lastMessagePreview || "No messages yet"}
                </p>
              </button>
            );
          })}
        </div>

        <p className="text-muted-foreground px-3 pt-2 text-xs font-semibold uppercase tracking-wide">
          Contacts
        </p>
        <div className="space-y-1 p-2 pb-3">
          {records.slice(0, 100).map((record) => {
            const recordId = record.contactId ?? record.id;
            const isActive = selectedRecordId === recordId;
            return (
              <button
                key={`${record.id}:${recordId}`}
                type="button"
                onClick={() => onSelectRecord(record)}
                className={cn(
                  "w-full rounded-md border px-2 py-1.5 text-left text-xs transition-colors",
                  isActive ? "border-primary bg-primary/10" : "hover:bg-muted/60",
                )}
              >
                <p className="truncate font-medium">{record.name || "Unnamed Contact"}</p>
                <p className="text-muted-foreground truncate">{record.email || "No email"}</p>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
