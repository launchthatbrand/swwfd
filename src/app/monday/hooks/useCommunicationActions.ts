import { useMemo } from "react";

import type { BulkCommunicationQuickActionState, BulkUniqueCommunicationSession } from "../board-local";

type UseCommunicationActionsArgs = {
  bulkCommunicationModePrompt: BulkCommunicationQuickActionState | null;
  bulkCommunicationQuickAction: BulkCommunicationQuickActionState | null;
  bulkUniqueCommunicationSession: BulkUniqueCommunicationSession | null;
};

export const useCommunicationActions = ({
  bulkCommunicationModePrompt,
  bulkCommunicationQuickAction,
  bulkUniqueCommunicationSession,
}: UseCommunicationActionsArgs) => {
  return useMemo(
    () => ({
      bulkCommunicationModePrompt,
      bulkCommunicationQuickAction,
      bulkUniqueCommunicationSession,
    }),
    [bulkCommunicationModePrompt, bulkCommunicationQuickAction, bulkUniqueCommunicationSession],
  );
};
