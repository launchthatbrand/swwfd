import { useQuery } from "@tanstack/react-query";

import { fetchMondayApi } from "../services/monday-api";
import type {
  MondayFeatureFlagsResponse,
  MondayPlatformSettings,
  MondayPlatformSettingsResponse,
} from "../types";

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
  const featureFlagsQuery = useQuery({
    queryKey: ["monday-feature-flags", sessionToken],
    enabled: !!sessionToken && !staticMode,
    queryFn: async () => {
      const data = await fetchMondayApi<MondayFeatureFlagsResponse>(
        "/api/monday/settings/feature-flags",
        { sessionToken },
      );
      if (!data.ok || !data.featureFlags) {
        throw new Error(data.error ?? "Failed to load feature flags");
      }
      return data.featureFlags;
    },
    staleTime: 30_000,
  });

  const platformSettingsQuery = useQuery({
    queryKey: ["monday-platform-settings", sessionToken],
    enabled: !!sessionToken && !staticMode,
    queryFn: async () => {
      const data = await fetchMondayApi<MondayPlatformSettingsResponse>(
        "/api/monday/settings/platform",
        { sessionToken },
      );
      if (!data.ok || !data.platformSettings) {
        throw new Error(data.error ?? "Failed to load platform settings");
      }
      return data.platformSettings;
    },
    staleTime: 30_000,
  });

  const platformBoardColumnsQuery = useQuery({
    queryKey: ["monday-platform-board-columns", sessionToken],
    enabled: !!sessionToken && !staticMode && settingsOpen && isMasterAdmin,
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
