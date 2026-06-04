"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Button } from "@launchthatapp/ui/button";
import { Input } from "@launchthatapp/ui/input";
import { Textarea } from "@launchthatapp/ui/textarea";
import { api } from "@convex-config/_generated/api";
import type { Id } from "@convex-config/_generated/dataModel";

export const SupportAdminClient = () => {
  const [accountId, setAccountId] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    null,
  );
  const normalizedAccountId = accountId.trim();
  const conversations = useQuery(
    api.supportConversations.listConversations,
    normalizedAccountId
      ? {
          accountId: normalizedAccountId,
          scope: "all",
        }
      : "skip",
  );
  const conversationIdArg = selectedConversationId as
    | Id<"mondaySupportConversations">
    | null;
  const notes = useQuery(
    api.supportNotes.listNotes,
    conversationIdArg ? { conversationId: conversationIdArg } : "skip",
  );
  const events = useQuery(
    api.supportEvents.listEvents,
    conversationIdArg ? { conversationId: conversationIdArg } : "skip",
  );
  const addNote = useMutation(api.supportNotes.addNote);
  const selectedConversation = useMemo(
    () => (conversations ?? []).find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <p className="mb-2 text-sm font-medium">Support account scope</p>
        <div className="flex items-center gap-2">
          <Input
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            placeholder="Monday account id"
            className="max-w-xs"
          />
          <p className="text-muted-foreground text-xs">
            Enter account id to load support conversations.
          </p>
        </div>
      </div>

      <div className="grid min-h-[560px] grid-cols-1 overflow-hidden rounded-xl border bg-card lg:grid-cols-[320px_minmax(0,1fr)_360px]">
        <aside className="border-r p-3">
          <p className="mb-2 text-sm font-semibold">Conversations</p>
          <div className="space-y-2">
            {(conversations ?? []).map((conversation) => (
              <Button
                key={conversation.id}
                variant={conversation.id === selectedConversationId ? "default" : "outline"}
                className="h-auto w-full justify-start px-2 py-2 text-left"
                onClick={() => setSelectedConversationId(conversation.id)}
              >
                <div className="w-full space-y-0.5">
                  <p className="truncate text-xs font-medium">{conversation.contactName}</p>
                  <p className="text-muted-foreground truncate text-[11px]">
                    {conversation.contactEmail ?? "No email"}
                  </p>
                </div>
              </Button>
            ))}
            {(conversations ?? []).length === 0 ? (
              <p className="text-muted-foreground text-xs">No conversations found.</p>
            ) : null}
          </div>
        </aside>
        <section className="p-4">
          {!normalizedAccountId ? (
            <p className="text-muted-foreground text-sm">
              Enter a Monday account id above to inspect support conversations.
            </p>
          ) : !selectedConversation ? (
            <p className="text-muted-foreground text-sm">No conversation selected.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold">{selectedConversation.contactName}</p>
              <div className="space-y-2">
                {(events ?? []).slice(0, 20).map((event) => (
                  <div key={event.id} className="rounded-md border p-2 text-xs">
                    <p className="font-medium">{event.type}</p>
                    <p className="text-muted-foreground">
                      {event.actorName ?? event.actorMondayUserId ?? "System"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
        <aside className="border-l p-4">
          <p className="mb-2 text-sm font-semibold">Internal notes</p>
          {conversationIdArg ? (
            <div className="space-y-3">
              <Textarea
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                rows={4}
                placeholder="Add note..."
              />
              <Button
                size="sm"
                onClick={async () => {
                  const body = noteDraft.trim();
                  if (!body) return;
                  await addNote({
                    conversationId: conversationIdArg,
                    authorMondayUserId: "admin",
                    authorName: "Admin",
                    body,
                  });
                  setNoteDraft("");
                }}
              >
                Add note
              </Button>
              <div className="space-y-2">
                {(notes ?? []).slice(0, 20).map((note) => (
                  <div key={note.id} className="rounded-md border p-2 text-xs">
                    <p>{note.body}</p>
                    <p className="text-muted-foreground mt-1">
                      {note.authorName ?? note.authorMondayUserId}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">No conversation selected.</p>
          )}
        </aside>
      </div>
    </div>
  );
};
