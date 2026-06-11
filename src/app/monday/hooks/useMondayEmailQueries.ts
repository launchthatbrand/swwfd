import { useQuery } from "@tanstack/react-query";
import { useAction } from "convex/react";

import { api } from "@convex-config/_generated/api";

import { fetchMondayApi } from "../services/monday-api";
import type {
  MondayEmailTemplatesResponse,
  MondayRecord,
  MondayApiResponse,
  OutlookConnectionStatusResponse,
  OutlookTeamMailboxesResponse,
} from "../types";

interface UseMondayEmailQueriesArgs {
  sessionToken: string | null;
  staticMode: boolean;
  identityUserId: string | undefined;
  settingsOpen: boolean;
  sendEmailRecord: MondayRecord | null;
  bulkQuestionnaireEmailRecordsCount: number;
  emailMarketingEnabled: boolean;
}

export const useMondayEmailQueries = ({
  sessionToken,
  staticMode,
  identityUserId,
  settingsOpen,
  sendEmailRecord,
  bulkQuestionnaireEmailRecordsCount,
  emailMarketingEnabled,
}: UseMondayEmailQueriesArgs) => {
  const listTemplates = useAction(api.mondayEmailTemplatesNode.listTemplates);

  const emailTemplatesQuery = useQuery({
    queryKey: ["monday-email-templates", sessionToken],
    enabled:
      !!sessionToken &&
      !staticMode &&
      (!!sendEmailRecord || settingsOpen || bulkQuestionnaireEmailRecordsCount > 0),
    queryFn: async () => {
      const result = await listTemplates({
        sessionToken: sessionToken!,
        boardId: "18401299370",
        workdocColumnId: "doc_mm0wq4r",
        limit: 250,
      });
      return { ok: true, ...result } as MondayEmailTemplatesResponse;
    },
    staleTime: 60_000,
  });

  const outlookStatusQuery = useQuery({
    queryKey: ["monday-outlook-status", sessionToken, identityUserId, settingsOpen],
    enabled:
      !!sessionToken &&
      !!identityUserId &&
      settingsOpen &&
      !staticMode,
    queryFn: async () => {
      const data = await fetchMondayApi<OutlookConnectionStatusResponse>(
        "/api/monday/email/outlook/status",
        { sessionToken },
      );
      if (!data.ok) {
        throw new Error(data.error ?? "Failed to load Outlook connection status");
      }
      return data;
    },
    staleTime: 30_000,
  });

  const zohoStatusQuery = useQuery({
    queryKey: ["monday-zoho-status", sessionToken, identityUserId, settingsOpen],
    enabled: !!sessionToken && !!identityUserId && settingsOpen && !staticMode,
    queryFn: async () => {
      const data = await fetchMondayApi<
        MondayApiResponse<{
          connected?: boolean;
          callbackPath?: string;
          connection?: {
            senderEmail?: string | null;
            senderName?: string | null;
            accessTokenExpiresAt: number;
            scopes: string[];
            updatedAt: number;
          } | null;
        }>
      >("/api/monday/email/zoho/status", { sessionToken });
      if (!data.ok) {
        throw new Error(data.error ?? "Failed to load Zoho connection status");
      }
      return data;
    },
    staleTime: 30_000,
  });

  const sendEmailContactOwnerId = sendEmailRecord?.ownerIds[0]?.trim() ?? "";

  const outlookTeamMailboxesQuery = useQuery({
    queryKey: [
      "monday-outlook-team-mailboxes",
      sessionToken,
      sendEmailRecord?.id,
      sendEmailContactOwnerId,
    ],
    enabled:
      !!sessionToken &&
      !!identityUserId &&
      !!sendEmailRecord &&
      emailMarketingEnabled &&
      !staticMode,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sendEmailContactOwnerId) {
        params.set("contactOwnerUserId", sendEmailContactOwnerId);
      }
      const data = await fetchMondayApi<OutlookTeamMailboxesResponse>(
        `/api/monday/email/outlook/team-mailboxes?${params.toString()}`,
        { sessionToken },
      );
      if (!data.ok || !Array.isArray(data.mailboxes)) {
        throw new Error(data.error ?? "Failed to load team sender mailboxes");
      }
      return data;
    },
    staleTime: 30_000,
  });

  return {
    emailTemplatesQuery,
    outlookStatusQuery,
    zohoStatusQuery,
    outlookTeamMailboxesQuery,
    sendEmailContactOwnerId,
  };
};
