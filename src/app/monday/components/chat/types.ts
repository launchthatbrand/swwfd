"use client";

import type {
  ApprovalStepConfig,
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
  approvalSteps: ApprovalStepConfig[];
  isLoadingRecords: boolean;
  selectedRecordId: string | null;
  selectedBulkRecordIds: Set<string>;
  onSelectRecord: (record: MondayRecord) => void;
  onToggleRecordBulkSelection: (record: MondayRecord) => void;
  onSelectAllVisibleRecords: () => void;
  onClearBulkSelection: () => void;
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
    emailTemplateId?: string | null;
  }) => Promise<void>;
  onSendBulkMessage: (payload: {
    channel: "email" | "sms";
    body: string;
    emailTemplateId?: string | null;
  }) => Promise<void>;
  bulkSelectionCount: number;
  emailTemplates: {
    id: string;
    name: string;
    content: string;
    renderedHtml: string;
  }[];
  selectedEmailTemplateId: string | null;
  selectedEmailTemplateBody: string | null;
  onSelectedEmailTemplateIdChange: (templateId: string | null) => void;
  onClearBulkSelection: () => void;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onUpdateMessageDate: (messageId: string, date: string) => Promise<void>;
};

export type ConversationRightSidebarProps = {
  selectedConversation: MondaySupportConversationSummary | null;
  campaignUpdates: MondaySubitemEntry[];
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
