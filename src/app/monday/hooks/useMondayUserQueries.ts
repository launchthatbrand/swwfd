import { useQuery } from "@tanstack/react-query";

import { fetchMondayApi } from "../services/monday-api";
import type {
  MondayRecordEditOptionsResponse,
  MondayUserBoardSettingsResponse,
  MondayUserFilterPresetsResponse,
  MondayUserProfileResponse,
  SavedAdvancedFilterPreset,
} from "../types";

interface UseMondayUserQueriesArgs {
  sessionToken: string | null;
  staticMode: boolean;
  identityUserId: string | undefined;
  presetScopeOwnerId: string;
  parseSavedAdvancedFilterPreset: (entry: unknown) => SavedAdvancedFilterPreset | null;
  parseUserBoardGeneralSettings: (raw: unknown) => import("../types").UserBoardGeneralSettings;
}

export const useMondayUserQueries = ({
  sessionToken,
  staticMode,
  identityUserId,
  presetScopeOwnerId,
  parseSavedAdvancedFilterPreset,
  parseUserBoardGeneralSettings,
}: UseMondayUserQueriesArgs) => {
  const userProfileQuery = useQuery({
    queryKey: ["monday-user-profile", sessionToken, identityUserId],
    enabled: !!sessionToken && !!identityUserId && !staticMode,
    queryFn: async () => {
      const data = await fetchMondayApi<MondayUserProfileResponse>(
        "/api/monday/users/me",
        { sessionToken },
      );
      if (!data.ok) {
        throw new Error(data.error ?? "Failed to load Monday user profile");
      }
      return data.user ?? null;
    },
    staleTime: 60_000,
  });

  const ownerDirectoryQuery = useQuery({
    queryKey: ["monday-users", sessionToken],
    enabled: !!sessionToken && !staticMode,
    queryFn: async () => {
      const data = await fetchMondayApi<{
        ok?: boolean;
        error?: string;
        users?: Array<{
          id: string;
          name: string | null;
          email: string | null;
          photoThumb: string | null;
        }>;
      }>("/api/monday/users", { sessionToken });
      if (!data.ok) {
        throw new Error(data.error ?? "Failed to load Monday users");
      }
      return data.users ?? [];
    },
    staleTime: 60_000,
  });

  const editOptionsQuery = useQuery({
    queryKey: ["monday-record-edit-options", sessionToken],
    enabled: !!sessionToken && !staticMode,
    queryFn: async () => {
      const data = await fetchMondayApi<MondayRecordEditOptionsResponse>(
        "/api/monday/records/edit-options",
        { sessionToken },
      );
      if (!data.ok || !data.options) {
        throw new Error(data.error ?? "Failed to load monday edit options");
      }
      return data.options;
    },
    staleTime: 60_000,
  });

  const userFilterPresetsQuery = useQuery({
    queryKey: ["monday-user-filter-presets", sessionToken, presetScopeOwnerId],
    enabled: !!sessionToken && !staticMode && presetScopeOwnerId.length > 0,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("ownerId", presetScopeOwnerId);
      const data = await fetchMondayApi<MondayUserFilterPresetsResponse>(
        `/api/monday/user-filter-presets?${params.toString()}`,
        { sessionToken },
      );
      if (!data.ok) {
        throw new Error(data.error ?? "Failed to load saved filters");
      }
      const presets = (data.presets ?? [])
        .map((entry) => parseSavedAdvancedFilterPreset(entry))
        .filter((entry): entry is SavedAdvancedFilterPreset => entry !== null)
        .slice(0, 25);
      return presets;
    },
    staleTime: 30_000,
  });

  const userBoardSettingsQuery = useQuery({
    queryKey: ["monday-user-board-settings", sessionToken, presetScopeOwnerId],
    enabled: !!sessionToken && !staticMode && presetScopeOwnerId.length > 0,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("ownerId", presetScopeOwnerId);
      const data = await fetchMondayApi<MondayUserBoardSettingsResponse>(
        `/api/monday/settings/user-board?${params.toString()}`,
        { sessionToken },
      );
      if (!data.ok) {
        throw new Error(data.error ?? "Failed to load board settings");
      }
      return parseUserBoardGeneralSettings(data.settings);
    },
    staleTime: 30_000,
  });

  return {
    userProfileQuery,
    ownerDirectoryQuery,
    editOptionsQuery,
    userFilterPresetsQuery,
    userBoardSettingsQuery,
  };
};
