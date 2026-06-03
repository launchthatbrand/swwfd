"use client";

import { useMutation } from "convex/react";
import type { Id } from "@convex-config/_generated/dataModel";

import { api } from "@convex-config/_generated/api";

export const useSupportWorkflow = (conversationId: string | null) => {
  const typedConversationId = conversationId as Id<"mondaySupportConversations"> | null;
  const setStatusMutation = useMutation(api.supportWorkflow.setConversationStatus);
  const setModeMutation = useMutation(api.supportWorkflow.setConversationMode);
  const assignMutation = useMutation(api.supportWorkflow.assignConversation);
  const unassignMutation = useMutation(api.supportWorkflow.unassignConversation);
  const deleteMutation = useMutation(api.supportWorkflow.deleteConversation);

  const setStatus = async (
    status: "open" | "snoozed" | "closed",
    actorMondayUserId?: string,
    actorName?: string,
  ) => {
    if (!conversationId) return;
    await setStatusMutation({
      conversationId: typedConversationId!,
      status,
      actorMondayUserId,
      actorName,
    });
  };

  const setMode = async (
    mode: "agent" | "manual",
    actorMondayUserId?: string,
    actorName?: string,
  ) => {
    if (!conversationId) return;
    await setModeMutation({
      conversationId: typedConversationId!,
      mode,
      actorMondayUserId,
      actorName,
    });
  };

  const assignTo = async (
    assignedAgentId: string,
    assignedAgentName?: string,
    actorMondayUserId?: string,
    actorName?: string,
  ) => {
    if (!conversationId) return;
    await assignMutation({
      conversationId: typedConversationId!,
      assignedAgentId,
      assignedAgentName,
      actorMondayUserId,
      actorName,
    });
  };

  const unassign = async (actorMondayUserId?: string, actorName?: string) => {
    if (!conversationId) return;
    await unassignMutation({
      conversationId: typedConversationId!,
      actorMondayUserId,
      actorName,
    });
  };

  const deleteConversation = async () => {
    if (!conversationId) return;
    await deleteMutation({ conversationId: typedConversationId! });
  };

  return {
    setStatus,
    setMode,
    assignTo,
    unassign,
    deleteConversation,
  };
};
