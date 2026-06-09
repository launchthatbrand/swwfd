import { useInfiniteQuery } from "@tanstack/react-query";
import { useAction } from "convex/react";

import { api } from "@convex-config/_generated/api";

import { fetchMondayApi } from "../services/monday-api";
import type {
  AdvancedFilterCondition,
  AdvancedFilterMatchMode,
  MondayResponse,
} from "../types";

interface UseMondayRecordsQueryArgs {
  sessionToken: string | null;
  staticMode: boolean;
  viewMode: string;
  useUserRecordsEndpoint: boolean;
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
  useUserRecordsEndpoint,
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
    queryKey: [
      "monday-records",
      viewMode,
      useUserRecordsEndpoint ? "user-records" : "records",
      isGlobalDateScope ? "__global__" : monthBounds.from,
      isGlobalDateScope ? "__global__" : monthBounds.to,
      debouncedSearch,
      ownerFilter,
      JSON.stringify(activeAdvancedFilterConditions),
      advancedFilterMatchMode,
      sessionToken,
    ],
    enabled:
      !!sessionToken &&
      !staticMode &&
      hasResolvedUserScopeOwner &&
      boardSettingsReady,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const normalizedSearch = debouncedSearch.trim();
      const isFullDbSearch = normalizedSearch.length >= 2 && !useUserRecordsEndpoint;
      const shouldApplyDateWindow = !isGlobalDateScope && !isFullDbSearch;

      if (useUserRecordsEndpoint) {
        const params = new URLSearchParams();
        params.set("limit", "50");
        if (pageParam) params.set("cursor", pageParam);
        if (normalizedSearch.length >= 2) params.set("search", normalizedSearch);
        if (ownerFilter.trim()) params.set("owner", ownerFilter.trim());
        if (shouldApplyDateWindow) {
          params.set("dateFrom", monthBounds.from);
          params.set("dateTo", monthBounds.to);
        }

        const data = await fetchMondayApi<MondayResponse>(
          `/api/monday/user-records?${params.toString()}`,
          { sessionToken },
        );
        if (!data.ok) {
          throw new Error(data.error ?? "Failed to load Monday records");
        }
        return data;
      }

      const result = await listRecords({
        sessionToken: sessionToken!,
        cursor: pageParam,
        limit: 100,
        search: normalizedSearch.length >= 2 ? normalizedSearch : undefined,
        owner: ownerFilter.trim() || undefined,
        dateFrom: shouldApplyDateWindow ? monthBounds.from : undefined,
        dateTo: shouldApplyDateWindow ? monthBounds.to : undefined,
        advancedFilterConditions:
          activeAdvancedFilterConditions.length > 0
            ? activeAdvancedFilterConditions
            : undefined,
        advancedFilterMatchMode:
          activeAdvancedFilterConditions.length > 0
            ? advancedFilterMatchMode
            : undefined,
      });

      return {
        ok: true,
        boardName: result.boardName,
        records: result.records,
        nextCursor: result.nextCursor,
        approvalSteps: result.approvalSteps,
      } as MondayResponse;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: useUserRecordsEndpoint ? 60_000 : 30_000,
  });
};
