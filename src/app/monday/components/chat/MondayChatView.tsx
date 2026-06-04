"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAction, useMutation } from "convex/react";
import { toast } from "@launchthatapp/ui/toast";

import { useSupportConversations } from "../../hooks/chat/useSupportConversations";
import { useSupportEvents } from "../../hooks/chat/useSupportEvents";
import { useSupportMessages } from "../../hooks/chat/useSupportMessages";
import { useSupportNotes } from "../../hooks/chat/useSupportNotes";
import { useSupportPresence } from "../../hooks/chat/useSupportPresence";
import { useSupportWorkflow } from "../../hooks/chat/useSupportWorkflow";
import type {
  MondayApiResponse,
  MondayRecord,
  MondaySubitemEntry,
  MondaySendEmailResponse,
  OutlookTeamMailboxesResponse,
} from "../../types";
import { api } from "@convex-config/_generated/api";
import type { Id } from "@convex-config/_generated/dataModel";
import { fetchMondayApi } from "../../services/monday-api";
import { ConversationLeftSidebar } from "./ConversationLeftSidebar";
import { ConversationRightSidebar } from "./ConversationRightSidebar";
import { ConversationThreadPane } from "./ConversationThreadPane";

const todayYmd = () => new Date().toISOString().slice(0, 10);

type Props = {
  accountId: string | null;
  userId: string | null;
  userName: string | null;
  sessionToken: string | null;
  records: MondayRecord[];
  isLoadingRecords: boolean;
};

export const MondayChatView = ({
  accountId,
  userId,
  userName,
  sessionToken,
  records,
  isLoadingRecords,
}: Props) => {
  const [scope, setScope] = useState<"all" | "mine" | "unassigned">("all");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [composerChannel, setComposerChannel] = useState<"email" | "sms">("email");
  const selectedSupportConversationId = selectedConversationId as Id<"mondaySupportConversations"> | null;

  const { conversations, ensureConversationForRecord } = useSupportConversations({
    accountId,
    userId,
    scope,
    search: "",
  });

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );
  const { sendMessage: appendSupportMessage } = useSupportMessages(selectedConversationId);
  const appendSupportEvent = useMutation(api.supportEvents.appendEvent);

  const listRecordUpdatesAction = useAction(api.mondayRecordsNode.listRecordUpdates);
  const createRecordUpdateAction = useAction(api.mondayRecordsNode.createRecordUpdate);
  const deleteSubitemAction = useAction(api.mondaySubitemsNode.deleteSubitem);
  const patchSubitemAction = useAction(api.mondaySubitemsNode.patchSubitem);

  const selectedContactItemId =
    selectedConversation?.contactItemId?.trim() ||
    selectedRecordId ||
    null;
  const selectedRecord = useMemo(
    () =>
      records.find(
        (record) =>
          record.id === selectedContactItemId ||
          (record.contactId?.trim() ?? "") === (selectedContactItemId ?? ""),
      ) ?? null,
    [records, selectedContactItemId],
  );
  const contactEmail =
    selectedRecord?.email?.trim() ||
    selectedConversation?.contactEmail?.trim() ||
    "";
  const contactPhone = selectedRecord?.phone?.trim() || "";
  const contactName = selectedRecord?.name?.trim() || selectedConversation?.contactName?.trim() || "Contact";
  const contactOwnerQuery = useQuery({
    queryKey: ["monday-chat-contact-owner", selectedContactItemId, sessionToken],
    enabled: !!sessionToken && !!selectedContactItemId,
    queryFn: async () => {
      const data = await fetchMondayApi<
        MondayApiResponse<{ ownerUserId?: string | null }>
      >(`/api/monday/records/${selectedContactItemId}/owner`, {
        sessionToken,
      });
      if (!data.ok) {
        throw new Error(data.error ?? "Failed to resolve contact owner");
      }
      return {
        ownerUserId: data.ownerUserId?.trim() ?? "",
      };
    },
    staleTime: 30_000,
  });
  const contactOwnerUserId =
    contactOwnerQuery.data?.ownerUserId ||
    (selectedRecord?.ownerIds[0] ?? "").trim();

  const teamMailboxQuery = useQuery({
    queryKey: ["monday-chat-mailboxes", selectedContactItemId, contactOwnerUserId, sessionToken],
    enabled: !!sessionToken && !!selectedContactItemId,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (contactOwnerUserId.length > 0) {
        params.set("contactOwnerUserId", contactOwnerUserId);
      }
      const data = await fetchMondayApi<OutlookTeamMailboxesResponse>(
        `/api/monday/email/outlook/team-mailboxes?${params.toString()}`,
        { sessionToken },
      );
      if (!data.ok) {
        throw new Error(data.error ?? "Failed to load sender mailboxes");
      }
      return data;
    },
    staleTime: 30_000,
  });
  const senderMailboxUserId =
    contactOwnerUserId ||
    teamMailboxQuery.data?.defaultSenderUserId?.trim() ||
    "";

  const smsReadinessQuery = useQuery({
    queryKey: ["monday-chat-sms-readiness", sessionToken],
    enabled: !!sessionToken,
    queryFn: async () => {
      const data = await fetchMondayApi<
        MondayApiResponse<{ ready?: boolean; fromPhone?: string | null }>
      >("/api/monday/sms/readiness", {
        sessionToken,
      });
      if (!data.ok) {
        throw new Error(data.error ?? "Failed to load SMS readiness");
      }
      return {
        ready: data.ready === true,
        fromPhone: data.fromPhone ?? null,
      };
    },
    staleTime: 30_000,
  });

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
  const campaignUpdates = useMemo(
    () => (updatesQuery.data ?? []).filter((entry) => entry.intent === "campaign"),
    [updatesQuery.data],
  );
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
  const senderMailbox = useMemo(
    () =>
      teamMailboxQuery.data?.mailboxes?.find(
        (mailbox) => mailbox.mondayUserId === senderMailboxUserId,
      ) ?? null,
    [teamMailboxQuery.data?.mailboxes, senderMailboxUserId],
  );

  const composerChannels = useMemo(() => {
    const emailEnabled =
      !!sessionToken &&
      !!selectedContactItemId &&
      contactEmail.length > 0 &&
      !contactOwnerQuery.isLoading &&
      !teamMailboxQuery.isLoading &&
      senderMailboxUserId.length > 0 &&
      !!senderMailbox?.connected;
    const emailDisabledReason =
      !sessionToken
        ? "Session unavailable."
        : !selectedContactItemId
          ? "Select a conversation."
          : contactEmail.length === 0
            ? "Contact has no email address."
            : contactOwnerQuery.isLoading
              ? "Resolving contact owner mailbox..."
            : senderMailboxUserId.length === 0
              ? "No contact owner mailbox found."
              : teamMailboxQuery.isLoading
                ? "Loading sender mailbox status..."
                : !senderMailbox?.connected
                  ? "Contact owner mailbox is not connected to Outlook."
                  : undefined;

    const smsEnabled =
      !!sessionToken &&
      !!selectedContactItemId &&
      contactPhone.length > 0 &&
      !smsReadinessQuery.isLoading &&
      smsReadinessQuery.data?.ready === true;
    const smsDisabledReason =
      !sessionToken
        ? "Session unavailable."
        : !selectedContactItemId
          ? "Select a conversation."
          : contactPhone.length === 0
            ? "Contact has no phone number."
            : smsReadinessQuery.isLoading
              ? "Checking Twilio readiness..."
              : smsReadinessQuery.data?.ready !== true
                ? "Twilio SMS is not configured."
                : undefined;

    return [
      {
        id: "email" as const,
        label: "Email",
        enabled: emailEnabled,
        disabledReason: emailDisabledReason,
      },
      {
        id: "sms" as const,
        label: "SMS",
        enabled: smsEnabled,
        disabledReason: smsDisabledReason,
      },
    ];
  }, [
    contactEmail.length,
    contactPhone.length,
    contactOwnerQuery.isLoading,
    selectedContactItemId,
    senderMailbox?.connected,
    senderMailboxUserId.length,
    sessionToken,
    smsReadinessQuery.data?.ready,
    smsReadinessQuery.isLoading,
    teamMailboxQuery.isLoading,
  ]);

  useEffect(() => {
    const currentChannel = composerChannels.find((entry) => entry.id === composerChannel);
    if (currentChannel?.enabled) return;
    const fallback = composerChannels.find((entry) => entry.enabled);
    if (fallback) {
      setComposerChannel(fallback.id);
    }
  }, [composerChannel, composerChannels]);

  return (
    <div className="flex h-[calc(100vh-3rem)] max-h-[calc(100vh-3rem)] min-h-[560px] w-full overflow-hidden rounded-xl border bg-background">
      <ConversationLeftSidebar
        userId={userId}
        records={records}
        isLoadingRecords={isLoadingRecords}
        selectedRecordId={selectedRecordId}
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
        composerChannels={composerChannels}
        selectedComposerChannel={composerChannel}
        onComposerChannelChange={setComposerChannel}
        currentUserId={userId}
        onSendMessage={async ({ body, channel }) => {
          if (!sessionToken || !selectedContactItemId) return;
          const trimmedBody = body.trim();
          if (!trimmedBody) return;
          try {
            if (channel === "email") {
              if (!contactEmail) {
                toast.error("Contact email is missing.");
                return;
              }
              const subject = `Support update for ${contactName}`;
              const html = trimmedBody
                .split("\n\n")
                .map((paragraph) =>
                  paragraph
                    ? `<p>${paragraph.replaceAll("\n", "<br/>")}</p>`
                    : "<p><br/></p>",
                )
                .join("");
              const sendEmailResult = await fetchMondayApi<MondaySendEmailResponse>(
                "/api/monday/email/send",
                {
                  sessionToken,
                  method: "POST",
                  body: {
                    to: contactEmail,
                    subject,
                    html,
                    contactItemId: selectedContactItemId,
                    ownerMondayUserId: senderMailboxUserId || undefined,
                  },
                },
              );
              if (!sendEmailResult.ok) {
                throw new Error(sendEmailResult.error ?? "Failed to send email");
              }
              await createRecordUpdateAction({
                sessionToken,
                itemId: selectedContactItemId,
                body: `Email Sent - ${subject}`,
                updateType: "general",
                intent: "conversation",
                date: todayYmd(),
                methodOfCommunication: "Email",
                internalExternalStatus: "External",
              });
              if (selectedSupportConversationId) {
                await appendSupportMessage({
                  body: trimmedBody,
                  role: "assistant",
                  source: "admin",
                  channel: "email",
                  messageType: "email_outbound",
                  senderName: userName ?? "Agent",
                  senderEmail: senderMailboxUserId || undefined,
                  actorMondayUserId: userId ?? undefined,
                  actorName: userName ?? undefined,
                });
                await appendSupportEvent({
                  conversationId: selectedSupportConversationId!,
                  type: "message.sent",
                  actorMondayUserId: userId ?? undefined,
                  actorName: userName ?? undefined,
                  payload: JSON.stringify({ channel: "email", subject }),
                });
              }
              toast.success("Email sent and logged.");
            } else {
              if (!contactPhone) {
                toast.error("Contact phone number is missing.");
                return;
              }
              const smsResult = await fetchMondayApi<
                MondayApiResponse<{ sid?: string; to?: string; from?: string }>
              >("/api/monday/sms/send", {
                sessionToken,
                method: "POST",
                body: {
                  to: contactPhone,
                  body: trimmedBody,
                  contactItemId: selectedContactItemId,
                },
              });
              if (!smsResult.ok) {
                throw new Error(smsResult.error ?? "Failed to send SMS");
              }
              await createRecordUpdateAction({
                sessionToken,
                itemId: selectedContactItemId,
                body: `SMS Sent - ${trimmedBody}`,
                updateType: "general",
                intent: "conversation",
                date: todayYmd(),
                methodOfCommunication: "Text",
                internalExternalStatus: "External",
              });
              if (selectedSupportConversationId) {
                await appendSupportMessage({
                  body: trimmedBody,
                  role: "assistant",
                  source: "admin",
                  channel: "sms",
                  messageType: "sms_outbound",
                  senderName: userName ?? "Agent",
                  actorMondayUserId: userId ?? undefined,
                  actorName: userName ?? undefined,
                });
                await appendSupportEvent({
                  conversationId: selectedSupportConversationId!,
                  type: "message.sent",
                  actorMondayUserId: userId ?? undefined,
                  actorName: userName ?? undefined,
                  payload: JSON.stringify({ channel: "sms" }),
                });
              }
              toast.success("SMS sent and logged.");
            }
            await updatesQuery.refetch();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to send message");
          }
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
        campaignUpdates={campaignUpdates}
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
