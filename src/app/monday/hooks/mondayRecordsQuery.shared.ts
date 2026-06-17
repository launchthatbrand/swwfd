import type {
  AdvancedFilterCondition,
  AdvancedFilterMatchMode,
  UserBoardRecordSource,
} from "../types";

export interface MondayRecordsQuerySharedArgs {
  viewMode: string;
  recordSource: UserBoardRecordSource;
  isGlobalDateScope: boolean;
  monthBounds: { from: string; to: string };
  debouncedSearch: string;
  ownerFilter: string;
  activeAdvancedFilterConditions: AdvancedFilterCondition[];
  advancedFilterMatchMode: AdvancedFilterMatchMode;
  sessionToken: string | null;
}

export const buildMondayRecordsQueryKey = (args: MondayRecordsQuerySharedArgs) => [
  "monday-records",
  args.viewMode,
  args.recordSource,
  args.isGlobalDateScope ? "__global__" : args.monthBounds.from,
  args.isGlobalDateScope ? "__global__" : args.monthBounds.to,
  args.debouncedSearch,
  args.ownerFilter,
  JSON.stringify(args.activeAdvancedFilterConditions),
  args.advancedFilterMatchMode,
  args.sessionToken,
];

export const buildMondayRecordsActionPayload = (args: {
  recordSource: UserBoardRecordSource;
  isGlobalDateScope: boolean;
  monthBounds: { from: string; to: string };
  debouncedSearch: string;
  ownerFilter: string;
  pageParam?: string;
  activeAdvancedFilterConditions: AdvancedFilterCondition[];
  advancedFilterMatchMode: AdvancedFilterMatchMode;
  sessionToken: string;
}) => {
  const normalizedSearch = args.debouncedSearch.trim();
  const shouldApplyDateWindow = !args.isGlobalDateScope;
  return {
    sessionToken: args.sessionToken,
    cursor: args.pageParam,
    limit: 50,
    recordSource: args.recordSource,
    search: normalizedSearch.length >= 2 ? normalizedSearch : undefined,
    owner: args.ownerFilter.trim() || undefined,
    dateFrom: shouldApplyDateWindow ? args.monthBounds.from : undefined,
    dateTo: shouldApplyDateWindow ? args.monthBounds.to : undefined,
    advancedFilterConditions:
      args.activeAdvancedFilterConditions.length > 0
        ? args.activeAdvancedFilterConditions
        : undefined,
    advancedFilterMatchMode:
      args.activeAdvancedFilterConditions.length > 0
        ? args.advancedFilterMatchMode
        : undefined,
  };
};
