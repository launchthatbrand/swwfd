import { useQuery } from "@tanstack/react-query";
import { useAction } from "convex/react";

import { api } from "@convex-config/_generated/api";

import type {
  MondayJobsResponse,
  MondayRecord,
  MondayRecordUpdatesResponse,
} from "../types";

interface ContactColumnEntry {
  id: string;
  title: string;
  type: string;
  text: string | null;
  value: string | null;
  options?: string[];
  isEditable?: boolean;
}

interface ContactColumnsResponse {
  ok: boolean;
  error?: string;
  itemId?: string;
  itemName?: string | null;
  columns?: ContactColumnEntry[];
}

interface UseMondayContactQueriesArgs {
  sessionToken: string | null;
  staticMode: boolean;
  identityUserId: string | undefined;
  settingsOpen: boolean;
  contactHistoryDialogRecord: MondayRecord | null;
  contactDialogTab: string;
  sendEmailRecord: MondayRecord | null;
  sendEmailTargetRecordId: string;
  bulkQuestionnaireTargetRecordId: string;
  bulkQuestionnaireEmailRecordsCount: number;
  resolveContactUpdateTargetRecordId: (record: MondayRecord) => string;
}

export const useMondayContactQueries = ({
  sessionToken,
  staticMode,
  identityUserId,
  settingsOpen,
  contactHistoryDialogRecord,
  contactDialogTab,
  sendEmailRecord,
  sendEmailTargetRecordId,
  bulkQuestionnaireTargetRecordId,
  bulkQuestionnaireEmailRecordsCount,
}: UseMondayContactQueriesArgs) => {
  const listRecordUpdates = useAction(api.mondayRecordsNode.listRecordUpdates);
  const listJobs = useAction(api.mondayJobsNode.listJobs);
  const getRecordColumns = useAction(api.mondayRecordsNode.getRecordColumns);
  const getRoutingStatus = useAction(api.mondayRoutingNode.getRoutingStatus);

  const contactUpdatesQuery = useQuery({
    queryKey: [
      "monday-record-updates",
      sessionToken,
      contactHistoryDialogRecord?.id,
      contactHistoryDialogRecord?.contactId,
    ],
    enabled: !!sessionToken && !!contactHistoryDialogRecord && !staticMode,
    queryFn: async () => {
      const contactId = contactHistoryDialogRecord?.contactId?.trim();
      const targetRecordId =
        contactId && contactId.length > 0
          ? contactId
          : (contactHistoryDialogRecord?.id ?? "");
      const result = await listRecordUpdates({
        sessionToken: sessionToken!,
        itemId: targetRecordId,
        limit: 200,
      });
      return { ok: true, ...result } as MondayRecordUpdatesResponse;
    },
    staleTime: 30_000,
  });

  const jobsQuery = useQuery({
    queryKey: ["monday-jobs-board", sessionToken],
    enabled:
      !!sessionToken &&
      !!contactHistoryDialogRecord &&
      !staticMode &&
      contactDialogTab === "jobs",
    queryFn: async () => {
      const result = await listJobs({
        sessionToken: sessionToken!,
        limit: 300,
        onlyAvailable: true,
      });
      return { ok: true, ...result } as MondayJobsResponse;
    },
    staleTime: 60_000,
  });

  const contactColumnsQuery = useQuery({
    queryKey: [
      "monday-record-columns",
      sessionToken,
      contactHistoryDialogRecord?.id,
      contactHistoryDialogRecord?.contactId,
    ],
    enabled:
      !!sessionToken &&
      !!contactHistoryDialogRecord &&
      !staticMode &&
      (contactDialogTab === "info" || contactDialogTab === "resume"),
    queryFn: async () => {
      const contactId = contactHistoryDialogRecord?.contactId?.trim();
      const targetRecordId =
        contactId && contactId.length > 0
          ? contactId
          : (contactHistoryDialogRecord?.id ?? "");
      const result = await getRecordColumns({
        sessionToken: sessionToken!,
        itemId: targetRecordId,
      });
      return { ok: true, ...result } as ContactColumnsResponse;
    },
    staleTime: 60_000,
  });

  const routingStatusQuery = useQuery({
    queryKey: ["monday-routing-status", sessionToken, identityUserId, settingsOpen],
    enabled:
      !!sessionToken &&
      !!identityUserId &&
      settingsOpen &&
      !staticMode,
    queryFn: async () => {
      const result = await getRoutingStatus({ sessionToken: sessionToken! });
      if (!result.status) {
        throw new Error("Failed to load district routing status");
      }
      return result.status;
    },
    staleTime: 30_000,
  });

  const sendEmailContactColumnsQuery = useQuery({
    queryKey: ["monday-send-email-columns", sessionToken, sendEmailTargetRecordId],
    enabled: !!sessionToken && !!sendEmailRecord && !staticMode && sendEmailTargetRecordId.length > 0,
    queryFn: async () => {
      const result = await getRecordColumns({
        sessionToken: sessionToken!,
        itemId: sendEmailTargetRecordId,
      });
      return { ok: true, ...result } as ContactColumnsResponse;
    },
    staleTime: 60_000,
  });

  const bulkQuestionnaireContactColumnsQuery = useQuery({
    queryKey: [
      "monday-bulk-questionnaire-columns",
      sessionToken,
      bulkQuestionnaireTargetRecordId,
    ],
    enabled:
      !!sessionToken &&
      !staticMode &&
      bulkQuestionnaireEmailRecordsCount > 0 &&
      bulkQuestionnaireTargetRecordId.length > 0,
    queryFn: async () => {
      const result = await getRecordColumns({
        sessionToken: sessionToken!,
        itemId: bulkQuestionnaireTargetRecordId,
      });
      return { ok: true, ...result } as ContactColumnsResponse;
    },
    staleTime: 60_000,
  });

  return {
    contactUpdatesQuery,
    jobsQuery,
    contactColumnsQuery,
    routingStatusQuery,
    sendEmailContactColumnsQuery,
    bulkQuestionnaireContactColumnsQuery,
  };
};

export type { ContactColumnEntry, ContactColumnsResponse };
