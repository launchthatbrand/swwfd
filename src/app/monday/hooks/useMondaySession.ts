import { useMemo } from "react";

export type MondaySessionState = {
  sessionToken: string | null;
  staticMode: boolean;
  authLoading: boolean;
  isMasterAdmin: boolean;
  isMondaySettingsAdmin: boolean;
};

export const useMondaySession = (state: MondaySessionState) => {
  return useMemo(() => state, [state]);
};
