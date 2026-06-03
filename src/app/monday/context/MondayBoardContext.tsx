"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

// ---------------------------------------------------------------------------
// Session State
// ---------------------------------------------------------------------------

interface MondayIdentity {
  userId: string;
  accountId: string;
  slug?: string;
  isAdmin?: boolean;
  isMasterAdmin?: boolean;
  backId?: string | null;
}

interface SessionState {
  identity: MondayIdentity | null;
  sessionToken: string | null;
  isMondayEmbeddedContext: boolean;
  staticMode: boolean;
  authLoading: boolean;
}

interface SessionActions {
  setIdentity: Dispatch<SetStateAction<MondayIdentity | null>>;
  setSessionToken: Dispatch<SetStateAction<string | null>>;
  setIsMondayEmbeddedContext: Dispatch<SetStateAction<boolean>>;
  setStaticMode: Dispatch<SetStateAction<boolean>>;
  setAuthLoading: Dispatch<SetStateAction<boolean>>;
}

// ---------------------------------------------------------------------------
// Filter State
// ---------------------------------------------------------------------------

type AdvancedFilterCondition = {
  id: string;
  column: string;
  operator: string;
  value: string;
  valueTo?: string;
};

type AdvancedFilterPreset = {
  id: string;
  name: string;
  matchMode: "all" | "any";
  conditions: AdvancedFilterCondition[];
};

interface FilterState {
  search: string;
  statusFilter: string;
  ownerFilter: string;
  districtFilter: string;
  advancedFilterConditions: AdvancedFilterCondition[];
  advancedFilterMatchMode: "all" | "any";
  activeSavedAdvancedFilterId: string | null;
  savedAdvancedFilterPresets: AdvancedFilterPreset[];
}

interface FilterActions {
  setSearch: Dispatch<SetStateAction<string>>;
  setStatusFilter: Dispatch<SetStateAction<string>>;
  setOwnerFilter: Dispatch<SetStateAction<string>>;
  setDistrictFilter: Dispatch<SetStateAction<string>>;
  setAdvancedFilterConditions: Dispatch<SetStateAction<AdvancedFilterCondition[]>>;
  setAdvancedFilterMatchMode: Dispatch<SetStateAction<"all" | "any">>;
  setActiveSavedAdvancedFilterId: Dispatch<SetStateAction<string | null>>;
  setSavedAdvancedFilterPresets: Dispatch<SetStateAction<AdvancedFilterPreset[]>>;
  clearAllFilters: () => void;
}

// ---------------------------------------------------------------------------
// View State
// ---------------------------------------------------------------------------

type BoardViewMode = "table" | "grid" | "kanban";

type GridSortState = {
  column: string;
  direction: "asc" | "desc";
};

interface ViewState {
  viewMode: BoardViewMode;
  gridSort: GridSortState;
  selectedRecordIds: Set<string>;
}

interface ViewActions {
  setViewMode: Dispatch<SetStateAction<BoardViewMode>>;
  setGridSort: Dispatch<SetStateAction<GridSortState>>;
  setSelectedRecordIds: Dispatch<SetStateAction<Set<string>>>;
  toggleRecordSelection: (id: string) => void;
  selectAllRecords: (ids: string[]) => void;
  clearSelection: () => void;
}

// ---------------------------------------------------------------------------
// Combined Context
// ---------------------------------------------------------------------------

interface MondayBoardContextValue {
  session: SessionState & SessionActions;
  filters: FilterState & FilterActions;
  view: ViewState & ViewActions;
}

const MondayBoardContext = createContext<MondayBoardContextValue | null>(null);

export const useMondayBoard = () => {
  const ctx = useContext(MondayBoardContext);
  if (!ctx) {
    throw new Error("useMondayBoard must be used within MondayBoardProvider");
  }
  return ctx;
};

export const useMondaySession = () => useMondayBoard().session;
export const useMondayFilters = () => useMondayBoard().filters;
export const useMondayView = () => useMondayBoard().view;

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface MondayBoardProviderProps {
  children: ReactNode;
  defaultOwnerFilter?: string;
}

export const MondayBoardProvider = ({
  children,
  defaultOwnerFilter = "",
}: MondayBoardProviderProps) => {
  // Session
  const [identity, setIdentity] = useState<MondayIdentity | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isMondayEmbeddedContext, setIsMondayEmbeddedContext] = useState(false);
  const [staticMode, setStaticMode] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState(defaultOwnerFilter);
  const [districtFilter, setDistrictFilter] = useState("");
  const [advancedFilterConditions, setAdvancedFilterConditions] = useState<
    AdvancedFilterCondition[]
  >([]);
  const [advancedFilterMatchMode, setAdvancedFilterMatchMode] = useState<"all" | "any">("all");
  const [activeSavedAdvancedFilterId, setActiveSavedAdvancedFilterId] = useState<string | null>(
    null,
  );
  const [savedAdvancedFilterPresets, setSavedAdvancedFilterPresets] = useState<
    AdvancedFilterPreset[]
  >([]);

  const clearAllFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("");
    setOwnerFilter(defaultOwnerFilter);
    setDistrictFilter("");
    setAdvancedFilterConditions([]);
    setAdvancedFilterMatchMode("all");
    setActiveSavedAdvancedFilterId(null);
  }, [defaultOwnerFilter]);

  // View
  const [viewMode, setViewMode] = useState<BoardViewMode>("table");
  const [gridSort, setGridSort] = useState<GridSortState>({
    column: "createdAt",
    direction: "desc",
  });
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(() => new Set());

  const toggleRecordSelection = useCallback((id: string) => {
    setSelectedRecordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllRecords = useCallback((ids: string[]) => {
    setSelectedRecordIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedRecordIds(new Set());
  }, []);

  const value = useMemo<MondayBoardContextValue>(
    () => ({
      session: {
        identity,
        sessionToken,
        isMondayEmbeddedContext,
        staticMode,
        authLoading,
        setIdentity,
        setSessionToken,
        setIsMondayEmbeddedContext,
        setStaticMode,
        setAuthLoading,
      },
      filters: {
        search,
        statusFilter,
        ownerFilter,
        districtFilter,
        advancedFilterConditions,
        advancedFilterMatchMode,
        activeSavedAdvancedFilterId,
        savedAdvancedFilterPresets,
        setSearch,
        setStatusFilter,
        setOwnerFilter,
        setDistrictFilter,
        setAdvancedFilterConditions,
        setAdvancedFilterMatchMode,
        setActiveSavedAdvancedFilterId,
        setSavedAdvancedFilterPresets,
        clearAllFilters,
      },
      view: {
        viewMode,
        gridSort,
        selectedRecordIds,
        setViewMode,
        setGridSort,
        setSelectedRecordIds,
        toggleRecordSelection,
        selectAllRecords,
        clearSelection,
      },
    }),
    [
      identity,
      sessionToken,
      isMondayEmbeddedContext,
      staticMode,
      authLoading,
      search,
      statusFilter,
      ownerFilter,
      districtFilter,
      advancedFilterConditions,
      advancedFilterMatchMode,
      activeSavedAdvancedFilterId,
      savedAdvancedFilterPresets,
      clearAllFilters,
      viewMode,
      gridSort,
      selectedRecordIds,
      toggleRecordSelection,
      selectAllRecords,
      clearSelection,
    ],
  );

  return (
    <MondayBoardContext.Provider value={value}>
      {children}
    </MondayBoardContext.Provider>
  );
};
