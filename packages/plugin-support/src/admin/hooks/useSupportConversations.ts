"use client";

import type { GenericId as Id } from "convex/values";
import { useMemo } from "react";
import { useQuery } from "convex/react";

import type { ConversationSummary } from "../components/ConversationInspector";
import { useSupportConvex } from "../../convex/bindings";

export const useSupportConversations = (
  organizationId: Id<"organizations">,
  limit = 100,
) => {
  const convex = useSupportConvex();
  const conversations = useQuery(
    convex.support.queries.listConversations,
    {
      organizationId,
      limit,
    },
  ) as ConversationSummary[] | undefined;

  return useMemo(
    () => conversations ?? [],
    [conversations],
  ) as ConversationSummary[];
};
