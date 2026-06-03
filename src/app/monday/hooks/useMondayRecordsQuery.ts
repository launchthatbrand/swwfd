import { useInfiniteQuery } from "@tanstack/react-query";

import type { MondayResponse } from "../types";

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
}: UseMondayRecordsQueryArgs) => {
  return useInfiniteQuery({
    queryKey: [
      "monday-records",
      viewMode,
      useUserRecordsEndpoint ? "user-records" : "records",
      isGlobalDateScope ? "__global__" : monthBounds.from,
      isGlobalDateScope ? "__global__" : monthBounds.to,
      debouncedSearch,
      ownerFilter,
      sessionToken,
    ],
    enabled:
      !!sessionToken &&
      !staticMode &&
      hasResolvedUserScopeOwner &&
      boardSettingsReady,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const recordsEndpoint = useUserRecordsEndpoint
        ? "/api/monday/user-records"
        : "/api/monday/records";
      const params = new URLSearchParams();
      params.set("limit", useUserRecordsEndpoint ? "50" : "100");
      if (pageParam) params.set("cursor", pageParam);
      const normalizedSearch = debouncedSearch.trim();
      const isFullDbSearch = normalizedSearch.length >= 2 && !useUserRecordsEndpoint;
      if (normalizedSearch.length >= 2) params.set("search", normalizedSearch);
      if (ownerFilter.trim()) params.set("owner", ownerFilter.trim());
      const shouldApplyDateWindow = !isGlobalDateScope && !isFullDbSearch;
      if (shouldApplyDateWindow) {
        params.set("dateFrom", monthBounds.from);
        params.set("dateTo", monthBounds.to);
      }

      const response = await fetch(`${recordsEndpoint}?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
        headers: sessionToken
          ? { "x-monday-session-token": sessionToken }
          : undefined,
      });
      const data = (await response.json()) as MondayResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to load Monday records");
      }
      return data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: useUserRecordsEndpoint ? 60_000 : 30_000,
  });
};
