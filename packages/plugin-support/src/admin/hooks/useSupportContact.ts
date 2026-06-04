"use client";

import type { GenericId as Id } from "convex/values";
import { useMemo } from "react";
import { useQuery } from "convex/react";

import type { ContactDoc } from "../components/ConversationInspector";
import { useSupportConvex } from "../../convex/bindings";

export const useSupportContact = (contactId?: Id<"contacts">) => {
  const convex = useSupportConvex();
  const contact = useQuery(
    convex.support.queries.getContactById,
    contactId ? { contactId } : "skip",
  ) as ContactDoc | null | undefined;

  return useMemo(() => contact ?? null, [contact]);
};
