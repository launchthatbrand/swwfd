import { Mail, MessageSquare, Phone, UserCheck } from "lucide-react";

import type { MondayJobListing, MondayPlatformSettings, MondayRecord } from "./types";

export type CommunicationQuickActionMethod = "Email" | "Text" | "Phone Call" | "In Person";

export interface CommunicationQuickActionDefinition {
  id: "email" | "text" | "phone" | "in_person";
  label: string;
  defaultBody: string;
  method: CommunicationQuickActionMethod;
  icon: typeof Mail;
}

export interface BulkCommunicationQuickActionState {
  action: CommunicationQuickActionDefinition;
  selectedItems: MondayRecord[];
  clearSelection: () => void;
}

export interface BulkUniqueCommunicationSession {
  action: CommunicationQuickActionDefinition;
  targets: Array<{ targetRecordId: string; record: MondayRecord }>;
  clearSelection: () => void;
}

export const toTimeOnly = (value: Date) => {
  const hour = String(value.getHours()).padStart(2, "0");
  const minute = String(value.getMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
};

export const COMMUNICATION_QUICK_ACTIONS: CommunicationQuickActionDefinition[] = [
  {
    id: "email",
    label: "Email Update",
    defaultBody: "General Email Update",
    method: "Email",
    icon: Mail,
  },
  {
    id: "text",
    label: "Text Update",
    defaultBody: "General Text Update",
    method: "Text",
    icon: MessageSquare,
  },
  {
    id: "phone",
    label: "Phone Call Update",
    defaultBody: "General Phone Call Update",
    method: "Phone Call",
    icon: Phone,
  },
  {
    id: "in_person",
    label: "In Person Update",
    defaultBody: "General In Person Update",
    method: "In Person",
    icon: UserCheck,
  },
];

const SUBITEM_NAME_MAX_LENGTH = 120;
export const buildSubitemName = (rawValue: string, fallbackName: string) => {
  const normalized = rawValue.replace(/\s+/g, " ").trim();
  const candidate = normalized.length > 0 ? normalized : fallbackName.trim();
  if (candidate.length <= SUBITEM_NAME_MAX_LENGTH) return candidate;
  return `${candidate.slice(0, SUBITEM_NAME_MAX_LENGTH - 3).trimEnd()}...`;
};

export type MergeFieldKey =
  | "ownerId"
  | "status"
  | "tags"
  | "referredToContractors"
  | "interviewingWithContractors"
  | "hiredWithContractor"
  | "hireDate"
  | "retentionPeriod";

export const MERGE_FIELD_CONFIG: Array<{ key: MergeFieldKey; label: string }> = [
  { key: "ownerId", label: "Owner" },
  { key: "status", label: "District / Status" },
  { key: "tags", label: "Tags" },
  { key: "referredToContractors", label: "Referred To Contractor" },
  { key: "interviewingWithContractors", label: "Interviewing With Contractor" },
  { key: "hiredWithContractor", label: "Hired With Contractor" },
  { key: "hireDate", label: "Hire Date" },
  { key: "retentionPeriod", label: "Retention Period" },
];

export interface ContactJobRow extends Record<string, unknown> {
  id: string;
  title: string;
  district: string;
  location: string;
  contractor: string;
  categoriesText: string;
  postedDate: string;
  websiteUrl: string | null;
  applyEmail: string | null;
  applyPhone: string | null;
  isAlreadyReferred: boolean;
  rawJob: MondayJobListing;
}

export interface ReferredJobHistoryRow extends Record<string, unknown> {
  id: string;
  jobId: string | null;
  title: string;
  referredAt: string | null;
  subitemId: string;
}

export const parseJobReferralHistoryFromText = (text: string | null | undefined) => {
  const normalized = (text ?? "").trim();
  if (!normalized) {
    return {
      jobId: null as string | null,
      title: "Unknown Job",
    };
  }
  const jobIdMatch = normalized.match(/job id:\s*([0-9]+)/i);
  const titleMatch = normalized.match(/referred to job:\s*(.+)/i);
  return {
    jobId: jobIdMatch?.[1]?.trim() ?? null,
    title: titleMatch?.[1]?.trim() || "Unknown Job",
  };
};

export const buildDefaultPlatformSettings = (
  masterAdminUserId: string,
): MondayPlatformSettings => ({
  masterAdminUserId,
  adminUserIds: [masterAdminUserId],
  employeeUserIds: [],
  replyToEmails: [],
  zohoSenderEmail: null,
  zohoReplyToFallbackEmail: null,
  emailSystemTags: [],
  monthlyBoardMappings: [],
});
