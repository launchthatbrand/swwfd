import { useCallback } from "react";
import { useAction } from "convex/react";
import type { FunctionArgs } from "convex/server";
import { toast } from "@launchthatapp/ui/toast";

import { api } from "@convex-config/_generated/api";

import type { MondayRecord } from "../types";

interface UsePatchRecordArgs {
  sessionToken: string | null;
}

const resolveTargetId = (record: MondayRecord) => {
  const contactId = record.contactId?.trim();
  return contactId && contactId.length > 0 ? contactId : record.id;
};

type PatchRecordActionArgs = FunctionArgs<typeof api.mondayRecordsNode.patchRecord>;

export const usePatchRecord = ({ sessionToken }: UsePatchRecordArgs) => {
  const patchRecordAction = useAction(api.mondayRecordsNode.patchRecord);

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
      await patchRecordAction({
        sessionToken,
        itemId: targetId,
        ...(patch as Omit<PatchRecordActionArgs, "sessionToken" | "itemId">),
      });
      if (opts?.successMessage) {
        toast.success(opts.successMessage);
      }
      return true;
    },
    [patchRecordAction, sessionToken],
  );

  return { patchRecord, resolveTargetId };
};
