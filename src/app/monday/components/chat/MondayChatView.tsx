"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAction } from "convex/react";
import { toast } from "@launchthatapp/ui/toast";

import { useSupportConversations } from "../../hooks/chat/useSupportConversations";
import { useSupportEvents } from "../../hooks/chat/useSupportEvents";
import { useSupportNotes } from "../../hooks/chat/useSupportNotes";
import { useSupportPresence } from "../../hooks/chat/useSupportPresence";
import { useSupportWorkflow } from "../../hooks/chat/useSupportWorkflow";
import type { MondayRecord, MondaySubitemEntry } from "../../types";
import { api } from "@convex-config/_generated/api";
import { ConversationLeftSidebar } from "./ConversationLeftSidebar";
import { ConversationRightSidebar } from "./ConversationRightSidebar";
import { ConversationThreadPane } from "./ConversationThreadPane";

type Props = {
  accountId: string | null;
  userId: string | null;
  userName: string | null;
  sessionToken: string | null;
  records: MondayRecord[];
};

export const MondayChatView = ({ accountId, userId, userName, sessionToken, records }: Props) => {
  const [scope, setScope] = useState<"all" | "mine" | "unassigned">("all");
  const [search, setSearch] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const { conversations, ensureConversationForRecord } = useSupportConversations({
    accountId,
    userId,
    scope,
    search,
  });

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  const listRecordUpdatesAction = useAction(api.mondayRecordsNode.listRecordUpdates);
  const createRecordUpdateAction = useAction(api.mondayRecordsNode.createRecordUpdate);
  const deleteSubitemAction = useAction(api.mondaySubitemsNode.deleteSubitem);
  const patchSubitemAction = useAction(api.mondaySubitemsNode.patchSubitem);

  const selectedContactItemId =
    selectedConversation?.contactItemId?.trim() ||
    selectedRecordId ||
    null;

  const updatesQuery = useQuery({
    queryKey: ["monday-chat-updates", selectedConversationId, selectedContactItemId, sessionToken],
    enabled: !!sessionToken && !!selectedContactItemId,
    queryFn: async () => {
      const result = await listRecordUpdatesAction({
        sessionToken: sessionToken!,
        itemId: selectedContactItemId!,
      });
      const subitems = (result.subitems ?? []) as Array<
        Omit<MondaySubitemEntry, "creatorProfile"> & {
          creatorProfile?: MondaySubitemEntry["creatorProfile"];
        }
      >;
      return subitems.map((subitem) => ({
        ...subitem,
        creatorProfile: subitem.creatorProfile ?? null,
      }));
    },
    staleTime: 10_000,
  });
  const workflowState = useSupportWorkflow(selectedConversationId);
  const notesState = useSupportNotes(selectedConversationId);
  const eventsState = useSupportEvents(selectedConversationId);
  const presenceState = useSupportPresence({
    conversationId: selectedConversationId,
    userId,
    userName,
    userType: "agent",
    status: "online",
  });

  return (
    <div className="flex h-[calc(100vh-3rem)] max-h-[calc(100vh-3rem)] min-h-[560px] w-full overflow-hidden rounded-xl border bg-background">
      <ConversationLeftSidebar
        records={records}
        conversations={conversations}
        selectedConversationId={selectedConversationId}
        selectedRecordId={selectedRecordId}
        scope={scope}
        search={search}
        onScopeChange={setScope}
        onSearchChange={setSearch}
        onSelectConversation={(conversationId) => {
          setSelectedConversationId(conversationId);
          setSelectedRecordId(null);
        }}
        onSelectRecord={(record) => {
          const recordId = (record.contactId ?? record.id ?? "").trim();
          setSelectedRecordId(recordId || null);
          void (async () => {
            try {
              const conversationId = await ensureConversationForRecord(record);
              setSelectedConversationId(conversationId);
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : "Failed to open conversation for contact",
              );
            }
          })();
        }}
      />

      <ConversationThreadPane
        selectedConversation={selectedConversation}
        subitems={updatesQuery.data ?? []}
        isLoadingMessages={updatesQuery.isLoading}
        currentUserId={userId}
        onSendMessage={async ({ body, updateType, date }) => {
          if (!sessionToken || !selectedContactItemId) return;
          await createRecordUpdateAction({
            sessionToken,
            itemId: selectedContactItemId,
            body,
            updateType,
            date,
          });
          await updatesQuery.refetch();
        }}
        onDeleteMessage={async (messageId) => {
          if (!sessionToken) return;
          await deleteSubitemAction({
            sessionToken,
            subitemId: messageId,
          });
          await updatesQuery.refetch();
        }}
        onUpdateMessageDate={async (messageId, date) => {
          if (!sessionToken) return;
          await patchSubitemAction({
            sessionToken,
            subitemId: messageId,
            date,
          });
          await updatesQuery.refetch();
        }}
      />

      <ConversationRightSidebar
        selectedConversation={selectedConversation}
        notes={notesState.notes}
        events={eventsState.events}
        presence={presenceState.presence}
        identity={{ userId, userName, accountId }}
        onSetStatus={async (status) => {
          await workflowState.setStatus(status, userId ?? undefined, userName ?? undefined);
        }}
        onSetMode={async (mode) => {
          await workflowState.setMode(mode, userId ?? undefined, userName ?? undefined);
        }}
        onAssignToMe={async () => {
          if (!userId) return;
          await workflowState.assignTo(userId, userName ?? undefined, userId, userName ?? undefined);
        }}
        onUnassign={async () => {
          await workflowState.unassign(userId ?? undefined, userName ?? undefined);
        }}
        onDeleteConversation={async () => {
          await workflowState.deleteConversation();
          setSelectedConversationId(null);
          setSelectedRecordId(null);
        }}
        onAddNote={async (body) => {
          if (!userId) return;
          await notesState.addNote({
            authorMondayUserId: userId,
            authorName: userName ?? undefined,
            body,
          });
        }}
      />
    </div>
  );
};
