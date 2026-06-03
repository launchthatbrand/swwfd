import { useMemo } from "react";

export type MondayBoardQueriesState = {
  recordsQuery: unknown;
  jobsQuery: unknown;
  contactUpdatesQuery: unknown;
  contactColumnsQuery: unknown;
  emailTemplatesQuery: unknown;
  platformSettingsQuery: unknown;
  featureFlagsQuery: unknown;
};

export const useMondayBoardQueries = (state: MondayBoardQueriesState) => {
  return useMemo(() => state, [state]);
};
