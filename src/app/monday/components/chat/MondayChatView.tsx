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
  ApprovalStepConfig,
  MondayApiResponse,
  MondayEmailTemplate,
  MondayRecord,
  MondaySubitemEntry,
  MondaySendEmailBatchResponse,
  OutlookTeamMailboxesResponse,
} from "../../types";
import { api } from "@convex-config/_generated/api";
import type { Id } from "@convex-config/_generated/dataModel";
import { fetchMondayApi } from "../../services/monday-api";
import { ConversationLeftSidebar } from "./ConversationLeftSidebar";
import { ConversationRightSidebar } from "./ConversationRightSidebar";
import { ConversationThreadPane } from "./ConversationThreadPane";

const todayYmd = () => new Date().toISOString().slice(0, 10);
const toRecordKey = (record: Pick<MondayRecord, "id" | "contactId">) =>
  (record.contactId ?? record.id).trim();

type Props = {
  accountId: string | null;
  userId: string | null;
  userName: string | null;
  sessionToken: string | null;
  records: MondayRecord[];
  approvalSteps: ApprovalStepConfig[];
  isLoadingRecords: boolean;
};

export const MondayChatView = ({
  accountId,
  userId,
  userName,
  sessionToken,
  records,
  approvalSteps,
  isLoadingRecords,
}: Props) => {
  const [scope, setScope] = useState<"all" | "mine" | "unassigned">("all");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [composerChannel, setComposerChannel] = useState<"email" | "sms">("email");
  const [selectedBulkRecordIds, setSelectedBulkRecordIds] = useState<Set<string>>(() => new Set());
  const [selectedEmailTemplateId, setSelectedEmailTemplateId] = useState<string | null>(null);
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
  const listTemplatesAction = useAction(api.mondayEmailTemplatesNode.listTemplates);

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
  const selectedBulkRecords = useMemo(() => {
    if (selectedBulkRecordIds.size === 0) return [] as MondayRecord[];
    return records.filter((record) => selectedBulkRecordIds.has(toRecordKey(record)));
  }, [records, selectedBulkRecordIds]);
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
  const emailTemplatesQuery = useQuery({
    queryKey: ["monday-chat-email-templates", sessionToken],
    enabled: !!sessionToken,
    queryFn: async () => {
      const result = await listTemplatesAction({
        sessionToken: sessionToken!,
        boardId: "18401299370",
        workdocColumnId: "doc_mm0wq4r",
        limit: 250,
      });
      return result.templates ?? [];
    },
    staleTime: 60_000,
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
        creatorUserId: subitem.creatorUserId ?? null,
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
    const bulkMode = selectedBulkRecords.length > 0;
    const bulkEmailCount = selectedBulkRecords.filter((record) => (record.email ?? "").trim().length > 0).length;
    const bulkSmsCount = selectedBulkRecords.filter((record) => (record.phone ?? "").trim().length > 0).length;
    const emailEnabled =
      bulkMode
        ? !!sessionToken && bulkEmailCount > 0
        : !!sessionToken &&
          !!selectedContactItemId &&
          contactEmail.length > 0 &&
          !contactOwnerQuery.isLoading &&
          senderMailboxUserId.length > 0;
    const emailDisabledReason =
      bulkMode
        ? !sessionToken
          ? "Session unavailable."
          : bulkEmailCount === 0
            ? "No selected contacts have email."
            : undefined
        : !sessionToken
          ? "Session unavailable."
          : !selectedContactItemId
            ? "Select a conversation."
            : contactEmail.length === 0
              ? "Contact has no email address."
              : contactOwnerQuery.isLoading
                ? "Resolving contact owner mailbox..."
              : senderMailboxUserId.length === 0
                ? "No contact owner mailbox found."
                : undefined;

    const smsEnabled =
      bulkMode
        ? !!sessionToken &&
          bulkSmsCount > 0 &&
          !smsReadinessQuery.isLoading &&
          smsReadinessQuery.data?.ready === true
        : !!sessionToken &&
          !!selectedContactItemId &&
          contactPhone.length > 0 &&
          !smsReadinessQuery.isLoading &&
          smsReadinessQuery.data?.ready === true;
    const smsDisabledReason =
      bulkMode
        ? !sessionToken
          ? "Session unavailable."
          : bulkSmsCount === 0
            ? "No selected contacts have phone numbers."
            : smsReadinessQuery.isLoading
              ? "Checking Twilio readiness..."
              : smsReadinessQuery.data?.ready !== true
                ? "Twilio SMS is not configured."
                : undefined
        : !sessionToken
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
    selectedBulkRecords,
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
  useEffect(() => {
    const templates = emailTemplatesQuery.data ?? [];
    if (templates.length === 0) {
      if (selectedEmailTemplateId !== null) {
        setSelectedEmailTemplateId(null);
      }
      return;
    }
    if (selectedEmailTemplateId && templates.some((template) => template.id === selectedEmailTemplateId)) {
      return;
    }
    setSelectedEmailTemplateId(null);
  }, [emailTemplatesQuery.data, selectedEmailTemplateId]);

  const selectedEmailTemplate = useMemo(
    () =>
      (emailTemplatesQuery.data ?? []).find((template) => template.id === selectedEmailTemplateId) ??
      null,
    [emailTemplatesQuery.data, selectedEmailTemplateId],
  );

  const sendEmailToRecord = async (args: {
    record: MondayRecord;
    body: string;
    template: MondayEmailTemplate | null;
    intent: "conversation" | "campaign";
  }) => {
    if (!sessionToken) return;
    const targetRecordId = (args.record.contactId ?? args.record.id ?? "").trim();
    if (!targetRecordId) throw new Error("Missing contact record id");
    const email = args.record.email?.trim() ?? "";
    if (!email) throw new Error("Contact email is missing.");
    const ownerResponse = await fetchMondayApi<MondayApiResponse<{ ownerUserId?: string | null }>>(
      `/api/monday/records/${targetRecordId}/owner`,
      { sessionToken },
    );
    if (!ownerResponse.ok) {
      throw new Error(ownerResponse.error ?? "Failed to resolve contact owner");
    }
    const ownerMondayUserId = ownerResponse.ownerUserId?.trim() ?? "";
    const subject = args.template
      ? `${args.template.name} - ${args.record.name || "Contact"}`
      : `Support update for ${args.record.name || "Contact"}`;
    const html =
      args.template?.renderedHtml?.trim().length
        ? args.template.renderedHtml
        : args.body
            .trim()
            .split("\n\n")
            .map((paragraph) =>
              paragraph ? `<p>${paragraph.replaceAll("\n", "<br/>")}</p>` : "<p><br/></p>",
            )
            .join("");
    const sendEmailResult = await fetchMondayApi<MondaySendEmailBatchResponse>("/api/monday/email/send/batch", {
      sessionToken,
      method: "POST",
      body: {
        subject,
        html,
        recipients: [
          {
            to: email,
            contactItemId: targetRecordId,
            ownerMondayUserId: ownerMondayUserId || undefined,
          },
        ],
      },
    });
    if (!sendEmailResult.ok) {
      throw new Error(sendEmailResult.error ?? "Failed to send email");
    }
    await createRecordUpdateAction({
      sessionToken,
      itemId: targetRecordId,
      body: `${args.intent === "campaign" ? "Campaign Email Sent" : "Email Sent"} - ${subject}`,
      updateType: "general",
      intent: args.intent,
      date: todayYmd(),
      methodOfCommunication: "Email",
      internalExternalStatus: "External",
    });
  };

  const sendSmsToRecord = async (args: {
    record: MondayRecord;
    body: string;
    intent: "conversation" | "campaign";
  }) => {
    if (!sessionToken) return;
    const targetRecordId = (args.record.contactId ?? args.record.id ?? "").trim();
    if (!targetRecordId) throw new Error("Missing contact record id");
    const to = args.record.phone?.trim() ?? "";
    if (!to) throw new Error("Contact phone number is missing.");
    const smsResult = await fetchMondayApi<MondayApiResponse<{ sid?: string; to?: string; from?: string }>>(
      "/api/monday/sms/send",
      {
        sessionToken,
        method: "POST",
        body: {
          to,
          body: args.body,
          contactItemId: targetRecordId,
        },
      },
    );
    if (!smsResult.ok) {
      throw new Error(smsResult.error ?? "Failed to send SMS");
    }
    await createRecordUpdateAction({
      sessionToken,
      itemId: targetRecordId,
      body: `${args.intent === "campaign" ? "Campaign SMS Sent" : "SMS Sent"} - ${args.body}`,
      updateType: "general",
      intent: args.intent,
      date: todayYmd(),
      methodOfCommunication: "Text",
      internalExternalStatus: "External",
    });
  };

  return (
    <div className="flex h-[calc(100vh-3rem)] max-h-[calc(100vh-3rem)] min-h-[560px] w-full overflow-hidden rounded-xl border bg-background">
      <ConversationLeftSidebar
        userId={userId}
        records={records}
        approvalSteps={approvalSteps}
        isLoadingRecords={isLoadingRecords}
        selectedRecordId={selectedRecordId}
        selectedBulkRecordIds={selectedBulkRecordIds}
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
        onToggleRecordBulkSelection={(record) => {
          const recordKey = toRecordKey(record);
          if (!recordKey) return;
          setSelectedBulkRecordIds((prev) => {
            const next = new Set(prev);
            if (next.has(recordKey)) {
              next.delete(recordKey);
            } else {
              next.add(recordKey);
            }
            return next;
          });
        }}
        onSelectAllVisibleRecords={() => {
          setSelectedBulkRecordIds(
            new Set(
              records
                .map((record) => toRecordKey(record))
                .filter((recordKey): recordKey is string => recordKey.length > 0),
            ),
          );
        }}
        onClearBulkSelection={() => {
          setSelectedBulkRecordIds(new Set());
        }}
      />

      <ConversationThreadPane
        selectedConversation={selectedConversation}
        subitems={updatesQuery.data ?? []}
        isLoadingMessages={updatesQuery.isLoading}
        composerChannels={composerChannels}
        selectedComposerChannel={composerChannel}
        onComposerChannelChange={setComposerChannel}
        contactOwnerUserId={contactOwnerUserId || null}
        onSendMessage={async ({ body, channel, emailTemplateId }) => {
          if (!sessionToken || !selectedContactItemId || !selectedRecord) return;
          const trimmedBody = body.trim();
          const template =
            emailTemplateId && channel === "email"
              ? (emailTemplatesQuery.data ?? []).find((entry) => entry.id === emailTemplateId) ?? null
              : null;
          if (!trimmedBody && !template?.renderedHtml?.trim()) {
            return;
          }
          try {
            if (channel === "email") {
              await sendEmailToRecord({
                record: selectedRecord,
                body: trimmedBody,
                template,
                intent: "conversation",
              });
              if (selectedSupportConversationId) {
                const subject = template
                  ? `${template.name} - ${selectedRecord.name || "Contact"}`
                  : `Support update for ${contactName}`;
                await appendSupportMessage({
                  body: trimmedBody || template?.content || "",
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
                  payload: JSON.stringify({ channel: "email", subject, templateId: template?.id ?? null }),
                });
              }
              toast.success("Email sent and logged.");
            } else {
              await sendSmsToRecord({
                record: selectedRecord,
                body: trimmedBody,
                intent: "conversation",
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
        onSendBulkMessage={async ({ channel, body, emailTemplateId }) => {
          if (!sessionToken) return;
          if (selectedBulkRecords.length === 0) {
            toast.error("Select one or more contacts for bulk send.");
            return;
          }
          const trimmedBody = body.trim();
          const template =
            emailTemplateId && channel === "email"
              ? (emailTemplatesQuery.data ?? []).find((entry) => entry.id === emailTemplateId) ?? null
              : null;
          if (!trimmedBody && !template?.renderedHtml?.trim()) {
            toast.error("Provide a message body or choose a template.");
            return;
          }
          let sentCount = 0;
          let failedCount = 0;
          if (channel === "email") {
            const recipientPayload = selectedBulkRecords
              .map((record) => {
                const contactItemId = (record.contactId ?? record.id ?? "").trim();
                const to = record.email?.trim() ?? "";
                if (!contactItemId || !to) return null;
                const ownerMondayUserId = (record.ownerIds[0] ?? "").trim() || undefined;
                const subject = template
                  ? `${template.name} - ${record.name || "Contact"}`
                  : `Support update for ${record.name || "Contact"}`;
                const html =
                  template?.renderedHtml?.trim().length
                    ? template.renderedHtml
                    : trimmedBody
                        .split("\n\n")
                        .map((paragraph) =>
                          paragraph ? `<p>${paragraph.replaceAll("\n", "<br/>")}</p>` : "<p><br/></p>",
                        )
                        .join("");
                return {
                  record,
                  payload: {
                    to,
                    contactItemId,
                    ownerMondayUserId,
                    subject,
                    html,
                  },
                };
              })
              .filter(
                (
                  entry,
                ): entry is {
                  record: MondayRecord;
                  payload: {
                    to: string;
                    contactItemId: string;
                    ownerMondayUserId?: string;
                    subject: string;
                    html: string;
                  };
                } => !!entry,
              );

            if (recipientPayload.length === 0) {
              toast.error("No selected contacts have email.");
              return;
            }

            const batchResult = await fetchMondayApi<MondaySendEmailBatchResponse>(
              "/api/monday/email/send/batch",
              {
                sessionToken,
                method: "POST",
                body: {
                  recipients: recipientPayload.map((entry) => entry.payload),
                },
              },
            );
            if (!batchResult.ok) {
              throw new Error(batchResult.error ?? "Bulk email request failed.");
            }
            const results = batchResult.results ?? [];
            sentCount = results.filter((entry) => entry.ok).length;
            failedCount =
              results.length > 0
                ? results.length - sentCount
                : recipientPayload.length - sentCount;
            const successfulIds = new Set(
              results.filter((entry) => entry.ok).map((entry) => entry.contactItemId),
            );
            for (const entry of recipientPayload) {
              if (!successfulIds.has(entry.payload.contactItemId)) continue;
              await createRecordUpdateAction({
                sessionToken,
                itemId: entry.payload.contactItemId,
                body: `Campaign Email Sent - ${entry.payload.subject}`,
                updateType: "general",
                intent: "campaign",
                date: todayYmd(),
                methodOfCommunication: "Email",
                internalExternalStatus: "External",
              });
            }
          } else {
            for (const record of selectedBulkRecords) {
              try {
                await sendSmsToRecord({
                  record,
                  body: trimmedBody,
                  intent: "campaign",
                });
                sentCount += 1;
              } catch {
                failedCount += 1;
              }
            }
          }
          if (sentCount > 0 && failedCount === 0) {
            toast.success(`Bulk ${channel.toUpperCase()} sent to ${sentCount} contact${sentCount === 1 ? "" : "s"}.`);
          } else if (sentCount > 0 && failedCount > 0) {
            toast.error(
              `Bulk ${channel.toUpperCase()} partially sent (${sentCount} succeeded, ${failedCount} failed).`,
            );
          } else {
            toast.error(`Bulk ${channel.toUpperCase()} failed for all selected contacts.`);
          }
        }}
        bulkSelectionCount={selectedBulkRecords.length}
        emailTemplates={(emailTemplatesQuery.data ?? []).map((template) => ({
          id: template.id,
          name: template.name,
          content: template.content,
          renderedHtml: template.renderedHtml,
        }))}
        selectedEmailTemplateId={selectedEmailTemplateId}
        selectedEmailTemplateBody={selectedEmailTemplate?.content ?? null}
        onSelectedEmailTemplateIdChange={(templateId) => {
          setSelectedEmailTemplateId(templateId);
        }}
        onClearBulkSelection={() => {
          setSelectedBulkRecordIds(new Set());
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
