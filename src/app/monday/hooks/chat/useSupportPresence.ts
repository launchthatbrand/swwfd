"use client";

import { useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "@convex-config/_generated/dataModel";

import { api } from "@convex-config/_generated/api";

import type { MondaySupportPresenceEntry } from "../../types";

type PresenceStatus = "online" | "typing" | "idle";

export const useSupportPresence = (args: {
  conversationId: string | null;
  userId: string | null;
  userName: string | null;
  userType?: "agent" | "visitor";
  status?: PresenceStatus;
}) => {
  const { conversationId, userId, userName, userType = "agent", status = "online" } = args;
  const typedConversationId = conversationId as Id<"mondaySupportConversations"> | null;

  const presence = useQuery(
    api.supportPresence.listPresence,
    typedConversationId ? { conversationId: typedConversationId } : "skip",
  ) as MondaySupportPresenceEntry[] | undefined;

  const heartbeatMutation = useMutation(api.supportPresence.heartbeat);

  useEffect(() => {
    if (!conversationId || !userId) return;

    void heartbeatMutation({
      conversationId: typedConversationId!,
      userId,
      userName: userName ?? undefined,
      userType,
      status,
    });

    const interval = setInterval(() => {
      void heartbeatMutation({
        conversationId: typedConversationId!,
        userId,
        userName: userName ?? undefined,
        userType,
        status,
      });
    }, 30_000);

    return () => clearInterval(interval);
  }, [conversationId, heartbeatMutation, status, typedConversationId, userId, userName, userType]);

  return {
    presence: presence ?? [],
  };
};
