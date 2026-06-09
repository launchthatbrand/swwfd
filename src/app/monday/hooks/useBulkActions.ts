import { useMemo } from "react";

import type { MondayRecord } from "../types";

type UseBulkActionsArgs = {
  selectedRecords: MondayRecord[];
  pendingCount: number;
};

export const useBulkActions = ({ selectedRecords, pendingCount }: UseBulkActionsArgs) => {
  return useMemo(
    () => ({
      selectedRecords,
      pendingCount,
      selectedCount: selectedRecords.length,
    }),
    [pendingCount, selectedRecords],
  );
};
