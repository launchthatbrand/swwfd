"use client";

import { useQuery } from "convex/react";
import type { Id } from "@convex-config/_generated/dataModel";

import { api } from "@convex-config/_generated/api";

import type { MondaySupportEvent } from "../../types";

export const useSupportEvents = (conversationId: string | null) => {
  const typedConversationId = conversationId as Id<"mondaySupportConversations"> | null;
  const events = useQuery(
    api.supportEvents.listEvents,
    typedConversationId ? { conversationId: typedConversationId } : "skip",
  ) as MondaySupportEvent[] | undefined;

  return {
    events: events ?? [],
  };
};
