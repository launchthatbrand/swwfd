import { useQuery } from "@tanstack/react-query";

import { fetchMondayApi } from "../services/monday-api";
import type {
  MondayJobsResponse,
  MondayRecord,
  MondayRecordUpdatesResponse,
  MondayRoutingStatusResponse,
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
      const data = await fetchMondayApi<MondayRecordUpdatesResponse>(
        `/api/monday/records/${encodeURIComponent(targetRecordId)}/updates?limit=200`,
        { sessionToken },
      );
      if (!data.ok) {
        throw new Error(data.error ?? "Failed to load contact conversation history");
      }
      return data;
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
      const data = await fetchMondayApi<MondayJobsResponse>(
        "/api/monday/jobs?limit=300&onlyAvailable=true",
        { sessionToken },
      );
      if (!data.ok) {
        throw new Error(data.error ?? "Failed to load jobs board");
      }
      return data;
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
      contactDialogTab === "info",
    queryFn: async () => {
      const contactId = contactHistoryDialogRecord?.contactId?.trim();
      const targetRecordId =
        contactId && contactId.length > 0
          ? contactId
          : (contactHistoryDialogRecord?.id ?? "");
      const data = await fetchMondayApi<ContactColumnsResponse>(
        `/api/monday/records/${encodeURIComponent(targetRecordId)}`,
        { sessionToken },
      );
      if (!data.ok) {
        throw new Error(data.error ?? "Failed to load contact details");
      }
      return data;
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
      const data = await fetchMondayApi<MondayRoutingStatusResponse>(
        "/api/monday/routing/status",
        { sessionToken },
      );
      if (!data.ok || !data.status) {
        throw new Error(data.error ?? "Failed to load district routing status");
      }
      return data.status;
    },
    staleTime: 30_000,
  });

  const sendEmailContactColumnsQuery = useQuery({
    queryKey: ["monday-send-email-columns", sessionToken, sendEmailTargetRecordId],
    enabled: !!sessionToken && !!sendEmailRecord && !staticMode && sendEmailTargetRecordId.length > 0,
    queryFn: async () => {
      const data = await fetchMondayApi<ContactColumnsResponse>(
        `/api/monday/records/${encodeURIComponent(sendEmailTargetRecordId)}`,
        { sessionToken },
      );
      if (!data.ok) {
        throw new Error(data.error ?? "Failed to load contact template values");
      }
      return data;
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
      const data = await fetchMondayApi<ContactColumnsResponse>(
        `/api/monday/records/${encodeURIComponent(bulkQuestionnaireTargetRecordId)}`,
        { sessionToken },
      );
      if (!data.ok) {
        throw new Error(data.error ?? "Failed to load contact template values");
      }
      return data;
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
