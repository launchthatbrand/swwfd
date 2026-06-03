"use client";

import { useMutation, useQuery } from "convex/react";
import type { Id } from "@convex-config/_generated/dataModel";

import { api } from "@convex-config/_generated/api";

import type { MondaySupportMessage } from "../../types";

export const useSupportMessages = (conversationId: string | null) => {
  const typedConversationId = conversationId as Id<"mondaySupportConversations"> | null;
  const messages = useQuery(
    api.supportMessages.listMessages,
    typedConversationId ? { conversationId: typedConversationId } : "skip",
  ) as MondaySupportMessage[] | undefined;

  const sendMessageMutation = useMutation(api.supportMessages.sendMessage);
  const markReadMutation = useMutation(api.supportMessages.markRead);

  const sendMessage = async (args: {
    body: string;
    updateType?:
      | "general"
      | "welcome_email"
      | "followup"
      | "questionnaire"
      | "resume"
      | "resume_referral"
      | "job_referral"
      | "merge";
    date?: string;
    role?: "user" | "assistant";
    source?: "admin" | "visitor" | "system";
    channel?: "chat" | "email" | "sms";
    messageType?:
      | "chat"
      | "email_inbound"
      | "email_outbound"
      | "sms_inbound"
      | "sms_outbound";
    senderName?: string;
    senderEmail?: string;
    actorMondayUserId?: string;
    actorName?: string;
  }) => {
    if (!conversationId) throw new Error("No conversation selected");
    return sendMessageMutation({
      conversationId: typedConversationId!,
      ...args,
    });
  };

  const markRead = async () => {
    if (!conversationId) return;
    await markReadMutation({
      conversationId: typedConversationId!,
    });
  };

  const deleteMessageMutation = useMutation(api.supportMessages.deleteMessage);
  const updateMessageDateMutation = useMutation(api.supportMessages.updateMessageDate);

  const deleteMessage = async (args: {
    messageId: string;
    actorMondayUserId?: string;
    actorName?: string;
  }) => {
    await deleteMessageMutation({
      messageId: args.messageId as Id<"mondaySupportMessages">,
      actorMondayUserId: args.actorMondayUserId,
      actorName: args.actorName,
    });
  };

  const updateMessageDate = async (args: {
    messageId: string;
    date: string;
    actorMondayUserId?: string;
    actorName?: string;
  }) => {
    await updateMessageDateMutation({
      messageId: args.messageId as Id<"mondaySupportMessages">,
      date: args.date,
      actorMondayUserId: args.actorMondayUserId,
      actorName: args.actorName,
    });
  };

  return {
    messages: messages ?? [],
    sendMessage,
    markRead,
    deleteMessage,
    updateMessageDate,
  };
};
