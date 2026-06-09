"use client";

import { useMemo } from "react";
import { useMutation, useQuery } from "convex/react";

import { api } from "@convex-config/_generated/api";

import type { MondayRecord, MondaySupportConversationSummary } from "../../types";

export type SupportConversationScope = "all" | "mine" | "unassigned";

type Args = {
  accountId: string | null;
  userId: string | null;
  scope: SupportConversationScope;
  search: string;
};

export const useSupportConversations = ({ accountId, userId, scope, search }: Args) => {
  const conversations = useQuery(
    api.supportConversations.listConversations,
    accountId
      ? {
          accountId,
          scope,
          search,
          userId: userId ?? undefined,
        }
      : "skip",
  ) as MondaySupportConversationSummary[] | undefined;

  const ensureConversationMutation = useMutation(api.supportConversations.ensureConversationForContact);

  const byContactItemId = useMemo(() => {
    const map = new Map<string, MondaySupportConversationSummary>();
    for (const convo of conversations ?? []) {
      if (convo.contactItemId) map.set(convo.contactItemId, convo);
    }
    return map;
  }, [conversations]);

  const ensureConversationForRecord = async (record: MondayRecord) => {
    if (!accountId) throw new Error("Missing account context");
    const contactItemId = (record.contactId ?? record.id ?? "").trim();
    if (!contactItemId) throw new Error("Record is missing contact item id");
    const response = await ensureConversationMutation({
      accountId,
      contactItemId,
      contactName: record.name ?? "Unknown Contact",
      contactEmail: record.email ?? undefined,
    });
    return response.conversationId;
  };

  return {
    conversations: conversations ?? [],
    byContactItemId,
    ensureConversationForRecord,
  };
};
