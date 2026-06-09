import { useMemo } from "react";

import type { MondayFeatureFlags, MondayPlatformSettings, UserBoardGeneralSettings } from "../types";

type UseMondaySettingsArgs = {
  settingsOpen: boolean;
  boardGeneralSettings: UserBoardGeneralSettings;
  platformSettings: MondayPlatformSettings;
  featureFlags: MondayFeatureFlags;
};

export const useMondaySettings = ({
  settingsOpen,
  boardGeneralSettings,
  platformSettings,
  featureFlags,
}: UseMondaySettingsArgs) => {
  return useMemo(
    () => ({
      settingsOpen,
      boardGeneralSettings,
      platformSettings,
      featureFlags,
    }),
    [boardGeneralSettings, featureFlags, platformSettings, settingsOpen],
  );
};
