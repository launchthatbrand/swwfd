import { useMemo } from "react";

type UseOnboardingWorkflowsArgs = {
  isSavingMarkAsHiredWorkflow: boolean;
  isMergingRecords: boolean;
};

export const useOnboardingWorkflows = ({
  isSavingMarkAsHiredWorkflow,
  isMergingRecords,
}: UseOnboardingWorkflowsArgs) => {
  return useMemo(
    () => ({
      isSavingMarkAsHiredWorkflow,
      isMergingRecords,
    }),
    [isMergingRecords, isSavingMarkAsHiredWorkflow],
  );
};
