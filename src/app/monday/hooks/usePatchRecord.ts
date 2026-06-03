import { useCallback } from "react";
import { toast } from "@launchthatapp/ui/toast";

import { fetchMondayApi } from "../services/monday-api";
import type { MondayApiResponse, MondayRecord } from "../types";

interface UsePatchRecordArgs {
  sessionToken: string | null;
}

const resolveTargetId = (record: MondayRecord) => {
  const contactId = record.contactId?.trim();
  return contactId && contactId.length > 0 ? contactId : record.id;
};

export const usePatchRecord = ({ sessionToken }: UsePatchRecordArgs) => {
  const patchRecord = useCallback(
    async (
      record: MondayRecord,
      patch: Record<string, unknown>,
      opts?: { confirmMessage?: string; successMessage?: string },
    ): Promise<boolean> => {
      if (!sessionToken) {
        toast.error("Missing monday session context");
        return false;
      }
      if (opts?.confirmMessage && !window.confirm(opts.confirmMessage)) {
        return false;
      }

      const targetId = resolveTargetId(record);
      const data = await fetchMondayApi<MondayApiResponse>(
        `/api/monday/records/${encodeURIComponent(targetId)}`,
        { sessionToken, method: "PATCH", body: patch },
      );
      if (!data.ok) {
        throw new Error(data.error ?? "Failed to update record");
      }
      if (opts?.successMessage) {
        toast.success(opts.successMessage);
      }
      return true;
    },
    [sessionToken],
  );

  return { patchRecord, resolveTargetId };
};
