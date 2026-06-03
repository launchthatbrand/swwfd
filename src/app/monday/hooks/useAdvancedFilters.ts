import { useMemo } from "react";

import type { MondayRecord } from "../types";

type UseAdvancedFiltersArgs = {
  filteredRecords: MondayRecord[];
  activeConditionsCount: number;
};

export const useAdvancedFilters = ({ filteredRecords, activeConditionsCount }: UseAdvancedFiltersArgs) => {
  return useMemo(
    () => ({
      filteredRecords,
      activeConditionsCount,
      hasActiveAdvancedFilters: activeConditionsCount > 0,
    }),
    [activeConditionsCount, filteredRecords],
  );
};
