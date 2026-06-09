"use client";

import { useMutation, useQuery } from "convex/react";
import type { Id } from "@convex-config/_generated/dataModel";

import { api } from "@convex-config/_generated/api";

import type { MondaySupportNote } from "../../types";

export const useSupportNotes = (conversationId: string | null) => {
  const typedConversationId = conversationId as Id<"mondaySupportConversations"> | null;
  const notes = useQuery(
    api.supportNotes.listNotes,
    typedConversationId ? { conversationId: typedConversationId } : "skip",
  ) as MondaySupportNote[] | undefined;

  const addNoteMutation = useMutation(api.supportNotes.addNote);

  const addNote = async (args: { authorMondayUserId: string; authorName?: string; body: string }) => {
    if (!conversationId) return;
    await addNoteMutation({
      conversationId: typedConversationId!,
      authorMondayUserId: args.authorMondayUserId,
      authorName: args.authorName,
      body: args.body,
    });
  };

  return {
    notes: notes ?? [],
    addNote,
  };
};
