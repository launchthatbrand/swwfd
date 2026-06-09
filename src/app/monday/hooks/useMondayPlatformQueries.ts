import { useQuery } from "@tanstack/react-query";
import { useQuery as useConvexQuery } from "convex/react";

import { api } from "@convex-config/_generated/api";

import { fetchMondayApi } from "../services/monday-api";
import type { MondayPlatformSettings } from "../types";

interface PlatformBoardColumnsResponse {
  ok: boolean;
  error?: string;
  columns?: Array<{
    id: string;
    title: string;
    type: string;
  }>;
}

interface UseMondayPlatformQueriesArgs {
  sessionToken: string | null;
  staticMode: boolean;
  settingsOpen: boolean;
  isMasterAdmin: boolean;
}

export const useMondayPlatformQueries = ({
  sessionToken,
  staticMode,
  settingsOpen,
  isMasterAdmin,
}: UseMondayPlatformQueriesArgs) => {
  const featureFlagsQuery = useConvexQuery(
    api.mondaySettings.getFeatureFlags,
    staticMode ? "skip" : {},
  );

  const platformSettingsQuery = useConvexQuery(
    api.mondaySettings.getPlatformSettings,
    staticMode ? "skip" : {},
  );

  const platformBoardColumnsQuery = useQuery({
    queryKey: ["monday-platform-board-columns", sessionToken],
    enabled: !!sessionToken && !staticMode,
    queryFn: async () => {
      const data = await fetchMondayApi<PlatformBoardColumnsResponse>(
        "/api/monday/settings/platform/columns",
        { sessionToken },
      );
      if (!data.ok || !Array.isArray(data.columns)) {
        throw new Error(data.error ?? "Failed to load platform board columns");
      }
      return data.columns;
    },
    staleTime: 5 * 60_000,
  });

  return { featureFlagsQuery, platformSettingsQuery, platformBoardColumnsQuery };
};

export type PlatformSettingsData = MondayPlatformSettings;
export type { PlatformBoardColumnsResponse };
