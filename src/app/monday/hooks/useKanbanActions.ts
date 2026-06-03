import { useMemo } from "react";

import type { KanbanMoveConfirmation } from "../types";

type UseKanbanActionsArgs = {
  confirmation: KanbanMoveConfirmation | null;
  isExecuting: boolean;
};

export const useKanbanActions = ({ confirmation, isExecuting }: UseKanbanActionsArgs) => {
  return useMemo(
    () => ({
      confirmation,
      isExecuting,
    }),
    [confirmation, isExecuting],
  );
};
