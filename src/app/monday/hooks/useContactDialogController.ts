import { useMemo } from "react";

import type { MondayRecord } from "../types";

type UseContactDialogControllerArgs = {
  record: MondayRecord | null;
  index: number;
  total: number;
};

export const useContactDialogController = ({ record, index, total }: UseContactDialogControllerArgs) => {
  return useMemo(
    () => ({
      record,
      index,
      total,
      hasPrevious: index > 0,
      hasNext: index >= 0 && index < total - 1,
    }),
    [index, record, total],
  );
};
