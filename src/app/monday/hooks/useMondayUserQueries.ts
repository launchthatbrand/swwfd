import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAction, useQuery as useConvexQuery } from "convex/react";

import { api } from "@convex-config/_generated/api";

import type { SavedAdvancedFilterPreset } from "../types";

interface UseMondayUserQueriesArgs {
  sessionToken: string | null;
  staticMode: boolean;
  identityUserId: string | undefined;
  accountId: string | undefined;
  presetScopeOwnerId: string;
  parseSavedAdvancedFilterPreset: (entry: unknown) => SavedAdvancedFilterPreset | null;
  parseUserBoardGeneralSettings: (raw: unknown) => import("../types").UserBoardGeneralSettings;
}

export const useMondayUserQueries = ({
  sessionToken,
  staticMode,
  identityUserId,
  accountId,
  presetScopeOwnerId,
  parseSavedAdvancedFilterPreset,
  parseUserBoardGeneralSettings,
}: UseMondayUserQueriesArgs) => {
  const getMyProfile = useAction(api.mondayUsersNode.getMyProfile);
  const listBoardUsers = useAction(api.mondayUsersNode.listBoardUsers);
  const getEditOptions = useAction(api.mondayRecordsNode.getEditOptions);

  const userProfileQuery = useQuery({
    queryKey: ["monday-user-profile", sessionToken, identityUserId],
    enabled: !!sessionToken && !!identityUserId && !staticMode,
    queryFn: async () => {
      const result = await getMyProfile({ sessionToken: sessionToken! });
      return result.user ?? null;
    },
    staleTime: 60_000,
  });

  const ownerDirectoryQuery = useQuery({
    queryKey: ["monday-users", sessionToken],
    enabled: !!sessionToken && !staticMode,
    queryFn: async () => {
      const result = await listBoardUsers({ sessionToken: sessionToken! });
      return result.users ?? [];
    },
    staleTime: 60_000,
  });

  const editOptionsQuery = useQuery({
    queryKey: ["monday-record-edit-options", sessionToken],
    enabled: !!sessionToken && !staticMode,
    queryFn: async () => {
      const result = await getEditOptions({ sessionToken: sessionToken! });
      if (!result.options) {
        throw new Error("Failed to load monday edit options");
      }
      return result.options;
    },
    staleTime: 60_000,
  });

  const filterPresetsEnabled =
    !!sessionToken &&
    !staticMode &&
    presetScopeOwnerId.length > 0 &&
    !!accountId?.trim();

  const rawFilterPresets = useConvexQuery(
    api.mondayUserFilterPresets.listForOwnerBoard,
    filterPresetsEnabled
      ? {
          accountId: accountId!.trim(),
          ownerMondayUserId: presetScopeOwnerId,
        }
      : "skip",
  );

  const userFilterPresetsQuery = useMemo(() => {
    const data =
      rawFilterPresets === undefined
        ? undefined
        : rawFilterPresets
            .map((entry) => parseSavedAdvancedFilterPreset(entry))
            .filter((entry): entry is SavedAdvancedFilterPreset => entry !== null)
            .slice(0, 25);
    return {
      data,
      isFetched: rawFilterPresets !== undefined || !filterPresetsEnabled,
      error: null as Error | null,
      refetch: async () => {},
    };
  }, [filterPresetsEnabled, parseSavedAdvancedFilterPreset, rawFilterPresets]);

  const userBoardSettingsRaw = useConvexQuery(
    api.mondayUserBoardSettings.getForOwnerBoard,
    staticMode || !accountId?.trim() || presetScopeOwnerId.length === 0
      ? "skip"
      : {
          accountId: accountId.trim(),
          ownerMondayUserId: presetScopeOwnerId,
        },
  );

  const userBoardSettingsEnabled =
    !staticMode && !!accountId?.trim() && presetScopeOwnerId.length > 0;

  const userBoardSettingsQuery = useMemo(() => {
    const data =
      userBoardSettingsRaw === undefined
        ? undefined
        : parseUserBoardGeneralSettings(userBoardSettingsRaw);
    return {
      data,
      isFetched: userBoardSettingsRaw !== undefined || !userBoardSettingsEnabled,
      error: null as Error | null,
      refetch: async () => {},
    };
  }, [
    parseUserBoardGeneralSettings,
    presetScopeOwnerId,
    userBoardSettingsEnabled,
    userBoardSettingsRaw,
  ]);

  return {
    userProfileQuery,
    ownerDirectoryQuery,
    editOptionsQuery,
    userFilterPresetsQuery,
    userBoardSettingsQuery,
  };
};
