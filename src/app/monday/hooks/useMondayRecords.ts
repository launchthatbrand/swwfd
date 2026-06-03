import { useMemo } from "react";

import type { MondayRecord } from "../types";

type UseMondayRecordsArgs = {
  records: MondayRecord[];
  filteredRecords: MondayRecord[];
  sortedGridRecords: MondayRecord[];
};

export const useMondayRecords = ({ records, filteredRecords, sortedGridRecords }: UseMondayRecordsArgs) => {
  return useMemo(
    () => ({
      records,
      filteredRecords,
      sortedGridRecords,
      filteredRecordCountLabel: `${filteredRecords.length} of ${records.length} contacts`,
    }),
    [filteredRecords, records, sortedGridRecords],
  );
};
