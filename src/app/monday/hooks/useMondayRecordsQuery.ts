import { useInfiniteQuery } from "@tanstack/react-query";
import { useAction } from "convex/react";

import { api } from "@convex-config/_generated/api";

import {
  buildMondayRecordsActionPayload,
  buildMondayRecordsQueryKey,
} from "./mondayRecordsQuery.shared";
import type {
  AdvancedFilterCondition,
  AdvancedFilterMatchMode,
  MondayResponse,
  UserBoardRecordSource,
} from "../types";

interface UseMondayRecordsQueryArgs {
  sessionToken: string | null;
  staticMode: boolean;
  viewMode: string;
  recordSource: UserBoardRecordSource;
  isGlobalDateScope: boolean;
  monthBounds: { from: string; to: string };
  debouncedSearch: string;
  ownerFilter: string;
  hasResolvedUserScopeOwner: boolean;
  boardSettingsReady: boolean;
  activeAdvancedFilterConditions: AdvancedFilterCondition[];
  advancedFilterMatchMode: AdvancedFilterMatchMode;
}

export const useMondayRecordsQuery = ({
  sessionToken,
  staticMode,
  viewMode,
  recordSource,
  isGlobalDateScope,
  monthBounds,
  debouncedSearch,
  ownerFilter,
  hasResolvedUserScopeOwner,
  boardSettingsReady,
  activeAdvancedFilterConditions,
  advancedFilterMatchMode,
}: UseMondayRecordsQueryArgs) => {
  const listRecords = useAction(api.mondayRecordsNode.listRecords);

  return useInfiniteQuery({
    queryKey: buildMondayRecordsQueryKey({
      viewMode,
      recordSource,
      isGlobalDateScope,
      monthBounds,
      debouncedSearch,
      ownerFilter,
      activeAdvancedFilterConditions,
      advancedFilterMatchMode,
      sessionToken,
    }),
    enabled:
      !!sessionToken &&
      !staticMode &&
      hasResolvedUserScopeOwner &&
      boardSettingsReady,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const result = await listRecords(
        buildMondayRecordsActionPayload({
          sessionToken: sessionToken!,
          pageParam,
          recordSource,
          isGlobalDateScope,
          monthBounds,
          debouncedSearch,
          ownerFilter,
          activeAdvancedFilterConditions,
          advancedFilterMatchMode,
        }),
      );

      return {
        ok: true,
        boardName: result.boardName,
        records: result.records,
        nextCursor: result.nextCursor,
        approvalSteps: result.approvalSteps,
      } as MondayResponse;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
  });
};
