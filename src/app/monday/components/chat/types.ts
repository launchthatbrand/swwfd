"use client";

import type {
  MondayRecord,
  MondaySupportConversationSummary,
  MondaySupportEvent,
  MondaySupportNote,
  MondaySubitemEntry,
  MondaySupportPresenceEntry,
} from "../../types";

export type ChatConversationScope = "all" | "mine" | "unassigned";

export type ChatIdentity = {
  userId: string | null;
  userName: string | null;
  accountId: string | null;
};

export type ConversationLeftSidebarProps = {
  userId: string | null;
  records: MondayRecord[];
  isLoadingRecords: boolean;
  selectedRecordId: string | null;
  onSelectRecord: (record: MondayRecord) => void;
};

export type ConversationThreadPaneProps = {
  selectedConversation: MondaySupportConversationSummary | null;
  subitems: MondaySubitemEntry[];
  isLoadingMessages: boolean;
  composerChannels: {
    id: "email" | "sms";
    label: string;
    enabled: boolean;
    disabledReason?: string;
  }[];
  selectedComposerChannel: "email" | "sms";
  onComposerChannelChange: (channel: "email" | "sms") => void;
  currentUserId: string | null;
  onSendMessage: (payload: {
    channel: "email" | "sms";
    body: string;
  }) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onUpdateMessageDate: (messageId: string, date: string) => Promise<void>;
};

export type ConversationRightSidebarProps = {
  selectedConversation: MondaySupportConversationSummary | null;
  notes: MondaySupportNote[];
  events: MondaySupportEvent[];
  presence: MondaySupportPresenceEntry[];
  identity: ChatIdentity;
  onSetStatus: (status: "open" | "snoozed" | "closed") => Promise<void>;
  onSetMode: (mode: "agent" | "manual") => Promise<void>;
  onAssignToMe: () => Promise<void>;
  onUnassign: () => Promise<void>;
  onDeleteConversation: () => Promise<void>;
  onAddNote: (body: string) => Promise<void>;
};
