"use client";

import { useMemo, useState } from "react";

import { Button } from "@launchthatapp/ui/button";
import { Badge } from "@launchthatapp/ui/badge";
import { Textarea } from "@launchthatapp/ui/textarea";

import type { ConversationRightSidebarProps } from "./types";

const formatWhen = (timestamp: number) =>
  new Date(timestamp).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export const ConversationRightSidebar = ({
  selectedConversation,
  notes,
  events,
  presence,
  identity,
  onSetStatus,
  onSetMode,
  onAssignToMe,
  onUnassign,
  onDeleteConversation,
  onAddNote,
}: ConversationRightSidebarProps) => {
  const [noteDraft, setNoteDraft] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  const sortedNotes = useMemo(() => [...notes].sort((a, b) => b.createdAt - a.createdAt), [notes]);
  const sortedEvents = useMemo(() => [...events].sort((a, b) => b.createdAt - a.createdAt), [events]);

  if (!selectedConversation) {
    return (
      <aside className="hidden h-full min-h-0 w-[320px] shrink-0 flex-col bg-muted/20 lg:flex">
        <div className="p-4">
          <p className="text-muted-foreground text-sm">Select a conversation to view workflow details.</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden h-full min-h-0 w-[320px] shrink-0 flex-col bg-background lg:flex">
      <div className="space-y-4 overflow-auto p-4">
        <section className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-semibold">Workflow</p>
          <div className="flex gap-1.5">
            {(["open", "snoozed", "closed"] as const).map((status) => (
              <Button
                key={status}
                size="sm"
                variant={selectedConversation.status === status ? "default" : "outline"}
                className="h-7 px-2 text-xs capitalize"
                onClick={() => void onSetStatus(status)}
              >
                {status}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={selectedConversation.mode === "agent" ? "default" : "outline"}
              className="h-7 px-2 text-xs"
              onClick={() => void onSetMode("agent")}
            >
              Agent mode
            </Button>
            <Button
              size="sm"
              variant={selectedConversation.mode === "manual" ? "default" : "outline"}
              className="h-7 px-2 text-xs"
              onClick={() => void onSetMode("manual")}
            >
              Manual mode
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => void onAssignToMe()}>
              Assign to me
            </Button>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => void onUnassign()}>
              Unassign
            </Button>
          </div>
          <div className="flex items-center justify-between pt-1">
            <p className="text-muted-foreground text-xs">
              Assigned: {selectedConversation.assignedAgentName || "Nobody"}
            </p>
            <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" onClick={() => void onDeleteConversation()}>
              Delete
            </Button>
          </div>
        </section>

        <section className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-semibold">Internal notes</p>
          <Textarea
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            placeholder="Add note..."
            className="min-h-20"
          />
          <Button
            size="sm"
            className="h-8 w-full"
            disabled={!noteDraft.trim() || isSavingNote || !identity.userId}
            onClick={async () => {
              if (!identity.userId) return;
              const body = noteDraft.trim();
              if (!body) return;
              setIsSavingNote(true);
              try {
                await onAddNote(body);
                setNoteDraft("");
              } finally {
                setIsSavingNote(false);
              }
            }}
          >
            Add note
          </Button>
          <div className="space-y-2">
            {sortedNotes.map((note) => (
              <div key={note.id} className="rounded border p-2 text-xs">
                <p className="whitespace-pre-wrap">{note.body}</p>
                <p className="text-muted-foreground mt-1">
                  {note.authorName || note.authorMondayUserId} · {formatWhen(note.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-semibold">Presence</p>
          <div className="flex flex-wrap gap-1.5">
            {presence.map((entry) => (
              <Badge key={entry.id} variant="secondary" className="text-[11px]">
                {(entry.userName || entry.userId) + " · " + entry.status}
              </Badge>
            ))}
            {presence.length === 0 ? <p className="text-muted-foreground text-xs">No active participants.</p> : null}
          </div>
        </section>

        <section className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-semibold">Audit trail</p>
          <div className="space-y-2">
            {sortedEvents.map((event) => (
              <div key={event.id} className="rounded border p-2 text-xs">
                <p className="font-medium">{event.type}</p>
                <p className="text-muted-foreground">{event.actorName || event.actorMondayUserId || "System"}</p>
                <p className="text-muted-foreground">{formatWhen(event.createdAt)}</p>
              </div>
            ))}
            {sortedEvents.length === 0 ? <p className="text-muted-foreground text-xs">No workflow events yet.</p> : null}
          </div>
        </section>
      </div>
    </aside>
  );
};
