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
  records: MondayRecord[];
  conversations: MondaySupportConversationSummary[];
  selectedConversationId: string | null;
  selectedRecordId: string | null;
  scope: ChatConversationScope;
  search: string;
  onScopeChange: (scope: ChatConversationScope) => void;
  onSearchChange: (search: string) => void;
  onSelectConversation: (conversationId: string) => void;
  onSelectRecord: (record: MondayRecord) => void;
};

export type ConversationThreadPaneProps = {
  selectedConversation: MondaySupportConversationSummary | null;
  subitems: MondaySubitemEntry[];
  isLoadingMessages: boolean;
  currentUserId: string | null;
  onSendMessage: (payload: {
    body: string;
    updateType:
      | "general"
      | "welcome_email"
      | "followup"
      | "questionnaire"
      | "resume"
      | "resume_referral"
      | "job_referral"
      | "merge";
    date: string;
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
