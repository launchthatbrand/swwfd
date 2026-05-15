"use client";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Skeleton } from "~/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Columns3,
  ExternalLink,
  Filter,
  LayoutGrid,
  Pencil,
  CircleHelp,
  List,
  Mail,
  RefreshCcw,
  Settings,
  Upload,
  X,
  UserPlus,
} from "lucide-react";
import type {
  ColumnDefinition,
  EntityAction,
} from "@launchthatapp/ui/entity-list";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@launchthatapp/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@launchthatapp/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@launchthatapp/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@launchthatapp/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@launchthatapp/ui/tooltip";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { Badge } from "@launchthatapp/ui/badge";
import { Button } from "@launchthatapp/ui/button";
import { Calendar } from "@launchthatapp/ui/calendar";

import { Input } from "@launchthatapp/ui/input";
import type { MondayClientSdk } from "monday-sdk-js";
import { MultiSelect } from "@launchthatapp/ui/multi-select";
import { Textarea } from "@launchthatapp/ui/textarea";
import mondaySdkInitialize from "monday-sdk-js";
import { toast } from "@launchthatapp/ui/toast";

import type {
  AddNewContactValues,
  AdvancedFilterCondition,
  AdvancedFilterField,
  AdvancedFilterMatchMode,
  AdvancedFilterOperator,
  ApprovalStepConfig,
  KanbanMoveConfirmation,
  MondayBoardViewMode,
  MondayBulkSyncJob,
  MondayBulkSyncStatusResponse,
  MondayBoardViewProps,
  MondayContactCandidate,
  MondayContactsLookupResponse,
  MondayCreateContactResponse,
  MondayCreateRecordUpdateResponse,
  MondayEmailTemplate,
  MondayEmailTemplatesResponse,
  MondayFeatureFlags,
  MondayFeatureFlagsResponse,
  MondayIdentity,
  MondayPlatformSettings,
  MondayPlatformSettingsResponse,
  MondayRecord,
  MondayRecordEditOptionsResponse,
  MondayRecordUpdate,
  MondayRecordUpdatesResponse,
  MondayResponse,
  MondayResumeUploadResponse,
  MondayRoutingAssignResponse,
  MondayRoutingAssignResult,
  MondayRoutingStatus,
  MondayRoutingStatusResponse,
  MondaySendEmailResponse,
  MondayUserBoardSettingsResponse,
  MondayUserFilterPresetUpsertResponse,
  MondayUserFilterPresetsResponse,
  MondayUserProfileResponse,
  OutlookConnectionStatusResponse,
  OutlookTeamMailboxesResponse,
  ResumePreviewState,
  SavedAdvancedFilterPreset,
  UserBoardColorTheme,
  UserBoardDisplayMode,
  UserBoardFontSize,
  UserBoardGeneralSettings,
  UserBoardTableDensity,
} from "./types";
export type { MondayBoardViewMode } from "./types";

import {
  APPROVAL_STEP_COLUMN_ID_BY_UPDATE_TYPE,
  APPROVAL_STEPS,
  buildUserBoardThemeInlineStyles,
  CONTACT_UPDATE_ACTION_BUTTONS,
  DEFAULT_MONDAY_FEATURE_FLAGS,
  DEFAULT_USER_BOARD_GENERAL_SETTINGS,
  isEmbeddedMondaySessionToken,
  isUserBoardColorTheme,
  isUserBoardDisplayMode,
  isUserBoardFontSize,
  isUserBoardPageSize,
  isUserBoardRecordSource,
  isUserBoardTableDensity,
  KANBAN_STEP_CONFIG,
  MONDAY_DEV_BYPASS_TOKEN,
  QUESTIONNAIRE_UPDATE_ACTION,
  STEP_ACTION_CONFIG,
  SUBITEM_TYPE_COLUMN_ID,
  SUBITEM_TYPE_LABEL_BY_UPDATE_TYPE,
  UPDATE_SUBITEM_NAME_BY_TYPE,
  USER_BOARD_ACTION_BUTTON_SIZE_CLASS,
  USER_BOARD_COLOR_THEME_OPTIONS,
  USER_BOARD_COLOR_THEME_STYLES,
  parseUserBoardCustomTheme,
  USER_BOARD_FONT_SIZE_OPTIONS,
  USER_BOARD_FONT_SIZE_SCALE,
  USER_BOARD_PAGE_SIZE_OPTIONS,
  USER_BOARD_RECORD_SOURCE_OPTIONS,
  USER_BOARD_TABLE_DENSITY_OPTIONS,
} from "./constants";
import type { ContactUpdateType, QuickContactActionButton } from "./constants";

import {
  ADVANCED_DATE_OPERATORS,
  ADVANCED_FILTER_FIELDS,
  ADVANCED_OPERATOR_LABELS,
  ADVANCED_TEXT_OPERATORS,
  applyMondayThemeClass,
  buildKanbanColumns,
  buildMockBusinessInfo,
  createAdvancedFilterCondition,
  createAdvancedFilterId,
  doesRecordMatchAdvancedFilters,
  extractBoardIdFromContextPayload,
  extractThemeFromContextPayload,
  formatDateTimeParts,
  formatUpdatedAt,
  getContactTooltipDetails,
  getDistrictChipClassName,
  getMonthBounds,
  getNameInitials,
  getRecordStepIndex,
  hasHtmlLikeMarkup,
  hasUnsubscribe,
  interpolateTemplateVariables,
  isAdvancedConditionActive,
  isAdvancedFilterField,
  isAdvancedFilterOperator,
  normalizeOwnerIds,
  normalizeOwnerProfiles,
  normalizeResumeFiles,
  normalizeDateOnlyFromRecord,
  parseAdvancedCondition,
  parseSavedAdvancedFilterPreset,
  parseUserBoardGeneralSettings,
  readTokenFromLocation,
  readTokenFromSdkResponse,
  sortFiscalYearTagsDesc,
  splitCsvValues,
  toDateOnly,
  toDateOnlyLocal,
  uniqueSorted,
  getAdvancedOperatorsForField,
  getDefaultAdvancedOperatorForField,
  isAdvancedDateField,
  isAdvancedDateOperator,
  getBoardColumnTargetForCondition,
  normalizeAdvancedDate,
  getRecordFieldValues,
  LEGACY_FIELD_TO_BOARD_COLUMN_LABEL,
} from "./helpers";

import {
  AddNewContactForm,
  BoardTable,
  BusinessInfoHoverCard,
  ContactCard,
  ContactUpdates,
  DocxResumePreview,
  GuidedTourProvider,
  isTourLockingDialog,
  HelpDeskDialog,
  KanbanBoard,
  NameCellContent,
  OnboardingStepper,
  PdfResumePreview,
  QuestionnaireFormDialog,
  UserSettingsProvider,
} from "./components";

const MASTER_ADMIN_USER_ID = "53441186";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_PLATFORM_SETTINGS: MondayPlatformSettings = {
  masterAdminUserId: MASTER_ADMIN_USER_ID,
  adminUserIds: [MASTER_ADMIN_USER_ID],
  employeeUserIds: [],
  replyToEmails: [],
  monthlyBoardMappings: [],
};

export function MondayBoardView({
  viewMode = "all",
  initialOwnerFilter,
  forcedOwnerId: forcedOwnerIdProp,
}: MondayBoardViewProps) {
  const isTouchScopedView = viewMode === "userScoped";
  const [userScopedDisplayMode, setUserScopedDisplayMode] = useState<UserBoardDisplayMode>("table");
  const forcedOwnerId = forcedOwnerIdProp?.trim() ?? "";
  const hasForcedOwnerScope = forcedOwnerId.length > 0;
  const [identity, setIdentity] = useState<MondayIdentity | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isMondayEmbeddedContext, setIsMondayEmbeddedContext] = useState(false);
  const [staticMode, setStaticMode] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState(
    () => (forcedOwnerId.length > 0 ? forcedOwnerId : (initialOwnerFilter?.trim() ?? "")),
  );
  const [advancedFilterMatchMode, setAdvancedFilterMatchMode] =
    useState<AdvancedFilterMatchMode>("all");
  const [advancedFilterConditions, setAdvancedFilterConditions] = useState<
    AdvancedFilterCondition[]
  >([]);
  const [savedAdvancedFilterPresets, setSavedAdvancedFilterPresets] = useState<
    SavedAdvancedFilterPreset[]
  >([]);
  const [activeSavedAdvancedFilterId, setActiveSavedAdvancedFilterId] = useState<
    string | null
  >(null);
  const [pendingSavedAdvancedFilterName, setPendingSavedAdvancedFilterName] =
    useState("");
  const [isSavingAdvancedFilterPreset, setIsSavingAdvancedFilterPreset] =
    useState(false);
  const [deletingAdvancedFilterPresetIds, setDeletingAdvancedFilterPresetIds] = useState<
    Record<string, boolean>
  >({});
  const [boardGeneralSettings, setBoardGeneralSettings] = useState<UserBoardGeneralSettings>({
    ...DEFAULT_USER_BOARD_GENERAL_SETTINGS,
  });
  const [boardGeneralSettingsDraft, setBoardGeneralSettingsDraft] =
    useState<UserBoardGeneralSettings>({
      ...DEFAULT_USER_BOARD_GENERAL_SETTINGS,
    });
  const [boardSettingsReadyOwnerId, setBoardSettingsReadyOwnerId] = useState("");
  const tableDensity = boardGeneralSettings.tableDensity;
  const [isSavingBoardGeneralSettings, setIsSavingBoardGeneralSettings] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [addContactStep, setAddContactStep] = useState<1 | 2>(1);
  const [addContactValues, setAddContactValues] = useState<AddNewContactValues>({
    firstName: "",
    lastName: "",
    email: "",
    address: "",
    ownerId: "",
  });
  const [existingContactsByEmail, setExistingContactsByEmail] = useState<
    MondayContactCandidate[]
  >([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [isCreatingContact, setIsCreatingContact] = useState(false);
  const [retentionDialogRecord, setRetentionDialogRecord] =
    useState<MondayRecord | null>(null);
  const [tagsDialogRecord, setTagsDialogRecord] = useState<MondayRecord | null>(null);
  const [statusDialogRecord, setStatusDialogRecord] = useState<MondayRecord | null>(null);
  const [ownerDialogRecord, setOwnerDialogRecord] = useState<MondayRecord | null>(null);
  const [contactHistoryDialogRecord, setContactHistoryDialogRecord] =
    useState<MondayRecord | null>(null);
  const [pendingDialogItemId, setPendingDialogItemId] = useState<string | null>(null);
  const [contactUpdateDraft, setContactUpdateDraft] = useState("");
  const [contactUpdateType, setContactUpdateType] =
    useState<ContactUpdateType>("general");
  const [isCreatingContactUpdate, setIsCreatingContactUpdate] = useState(false);
  const [contactDialogTab, setContactDialogTab] = useState("updates");
  const [editingContactColumnId, setEditingContactColumnId] = useState<string | null>(null);
  const [editingContactColumnDraft, setEditingContactColumnDraft] = useState("");
  const [isSavingContactColumn, setIsSavingContactColumn] = useState(false);
  const [syncingContactIds, setSyncingContactIds] = useState<Set<string>>(new Set());
  const [syncContactBoardPickerRecord, setSyncContactBoardPickerRecord] =
    useState<MondayRecord | null>(null);
  const [syncContactBoardSelection, setSyncContactBoardSelection] = useState("");
  const [activeBulkSyncJobId, setActiveBulkSyncJobId] = useState<string | null>(null);
  const [latestBulkSyncJob, setLatestBulkSyncJob] = useState<MondayBulkSyncJob | null>(null);
  const finalizedBulkSyncJobIdRef = useRef<string | null>(null);
  const hasHydratedInitialQueryParamsRef = useRef(false);
  const [bulkQuickActionType, setBulkQuickActionType] = useState<
    Exclude<ContactUpdateType, "general"> | null
  >(null);
  const [bulkQuickActionConfirmation, setBulkQuickActionConfirmation] = useState<{
    action: QuickContactActionButton;
    selectedItems: MondayRecord[];
  } | null>(null);
  const [questionnaireDialogRecords, setQuestionnaireDialogRecords] = useState<
    MondayRecord[]
  >([]);
  const bulkClearSelectionRef = useRef<(() => void) | null>(null);
  const [kanbanMoveConfirmation, setKanbanMoveConfirmation] =
    useState<KanbanMoveConfirmation | null>(null);
  const [isExecutingKanbanMove, setIsExecutingKanbanMove] = useState(false);
  const [retentionDraft, setRetentionDraft] = useState({
    referredToContractors: [] as string[],
    hiredWithContractor: "",
    hireDate: "",
    retentionPeriod: "",
  });
  const [tagsDraft, setTagsDraft] = useState<string[]>([]);
  const [statusDraft, setStatusDraft] = useState("");
  const [ownerDraft, setOwnerDraft] = useState("");
  const [isSavingRetention, setIsSavingRetention] = useState(false);
  const [retentionHireDatePopoverOpen, setRetentionHireDatePopoverOpen] =
    useState(false);
  const [isSavingTags, setIsSavingTags] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isSavingOwner, setIsSavingOwner] = useState(false);
  const [uploadingResumeByRecordId, setUploadingResumeByRecordId] = useState<
    Record<string, boolean>
  >({});
  const [resumePreview, setResumePreview] = useState<ResumePreviewState | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpDeskOpen, setHelpDeskOpen] = useState(false);
  const [helpDeskLinkedContact, setHelpDeskLinkedContact] = useState<MondayRecord | null>(null);
  const [sendEmailRecord, setSendEmailRecord] = useState<MondayRecord | null>(null);
  const [sendEmailStep, setSendEmailStep] = useState<1 | 2 | 3>(1);
  const [sendEmailTemplateId, setSendEmailTemplateId] = useState<string | null>(null);
  const [sendEmailOwnerUserId, setSendEmailOwnerUserId] = useState("");
  const [sendEmailProgressUpdate, setSendEmailProgressUpdate] = useState<{
    updateType: Exclude<ContactUpdateType, "general">;
    body: string;
  } | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [featureFlags, setFeatureFlags] = useState<MondayFeatureFlags>(
    DEFAULT_MONDAY_FEATURE_FLAGS,
  );
  const [platformSettings, setPlatformSettings] = useState<MondayPlatformSettings>({
    ...DEFAULT_PLATFORM_SETTINGS,
  });
  const [platformSettingsDraft, setPlatformSettingsDraft] = useState<MondayPlatformSettings>({
    ...DEFAULT_PLATFORM_SETTINGS,
  });
  const [isSavingPlatformSettings, setIsSavingPlatformSettings] = useState(false);
  const [isSavingFeatureFlags, setIsSavingFeatureFlags] = useState(false);
  const [isConnectingOutlook, setIsConnectingOutlook] = useState(false);
  const [isDisconnectingOutlook, setIsDisconnectingOutlook] = useState(false);
  const [routingRerunItemId, setRoutingRerunItemId] = useState("");
  const [isRunningRoutingRerun, setIsRunningRoutingRerun] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeMonth, setActiveMonth] = useState(
    () => new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)),
  );
  const loadMoreAnchorRef = useRef<HTMLDivElement | null>(null);
  const monday = useMemo<MondayClientSdk>(() => {
    const sdk: MondayClientSdk = mondaySdkInitialize();
    console.info("[MondayThemeSync] Initialized monday-sdk-js instance");
    return sdk;
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const root = document.documentElement;
    const hadLightClass = root.classList.contains("light");
    const hadDarkClass = root.classList.contains("dark");
    console.info("[MondayThemeSync] Initializing", {
      hadLightClass,
      hadDarkClass,
      currentClasses: root.className,
      hasListen: typeof monday.listen === "function",
    });
    let didCleanup = false;
    let unsubscribe: (() => void) | undefined;

    const handleContextPayload = (payload: unknown) => {
      console.info("[MondayThemeSync] Received context payload", payload);
      const theme = extractThemeFromContextPayload(payload);
      if (!theme) {
        console.warn("[MondayThemeSync] No theme found in context payload");
        return;
      }
      console.info("[MondayThemeSync] Extracted theme from payload", { theme });
      applyMondayThemeClass(theme);
    };

    void (monday
      .get("context")
      .then((value: unknown) => {
        if (didCleanup) return;
        console.info("[MondayThemeSync] sdk.get('context') resolved", value);
        handleContextPayload(value);
      })
      .catch((error: unknown) => {
        console.error("[MondayThemeSync] sdk.get('context') failed", error);
      }) as Promise<unknown>);

    if (typeof monday.listen === "function") {
      const listenerResult = monday.listen("context", (value: unknown) => {
        if (didCleanup) return;
        console.info("[MondayThemeSync] sdk.listen('context') event", value);
        handleContextPayload(value);
      }) as unknown;
      if (typeof listenerResult === "function") {
        const unsubscribeFunction = listenerResult as () => void;
        unsubscribe = () => unsubscribeFunction();
        console.info("[MondayThemeSync] Registered listener with function unsubscribe");
      } else if (hasUnsubscribe(listenerResult)) {
        const unsubscribeFromListener = listenerResult.unsubscribe;
        unsubscribe = () => unsubscribeFromListener();
        console.info("[MondayThemeSync] Registered listener with object.unsubscribe");
      } else {
        console.info(
          "[MondayThemeSync] Listener registered without explicit unsubscribe handle",
        );
      }
    } else {
      console.warn("[MondayThemeSync] sdk.listen is not available");
    }

    return () => {
      didCleanup = true;
      unsubscribe?.();
      console.info("[MondayThemeSync] Cleanup restoring previous classes", {
        hadLightClass,
        hadDarkClass,
        beforeRestore: root.className,
      });
      root.classList.remove("light", "dark");
      if (hadLightClass) root.classList.add("light");
      if (hadDarkClass) root.classList.add("dark");
      console.info("[MondayThemeSync] Cleanup complete", {
        afterRestore: root.className,
      });
    };
  }, [monday]);

  const monthBounds = useMemo(() => getMonthBounds(activeMonth), [activeMonth]);
  const normalizedIdentityUserId = identity?.userId?.trim() ?? "";
  const masterAdminUserId = platformSettings.masterAdminUserId || MASTER_ADMIN_USER_ID;
  const configuredAdminUserIds = useMemo(
    () =>
      uniqueSorted(platformSettings.adminUserIds.map((userId) => userId.trim())),
    [platformSettings.adminUserIds],
  );
  const isMasterAdmin =
    normalizedIdentityUserId.length > 0 && normalizedIdentityUserId === masterAdminUserId;
  const isMondaySettingsAdmin =
    normalizedIdentityUserId.length > 0 &&
    (isMasterAdmin || configuredAdminUserIds.includes(normalizedIdentityUserId));
  const normalizeUserIdList = useCallback((values: string[]) => {
    return uniqueSorted(
      values.map((value) => value.trim()).filter((value) => value.length > 0),
    );
  }, []);
  const normalizeReplyToEmailList = useCallback((values: string[]) => {
    return uniqueSorted(
      values
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length > 0),
    );
  }, []);
  const normalizeMonthlyBoardMappings = useCallback(
    (values: MondayPlatformSettings["monthlyBoardMappings"]) => {
      const deduped = new Map<string, { monthKey: string; boardId: string }>();
      for (const entry of values) {
        const monthKey = entry.monthKey.trim();
        const boardId = entry.boardId.trim();
        if (!/^\d{4}-\d{2}$/.test(monthKey) || boardId.length === 0) continue;
        deduped.set(monthKey, { monthKey, boardId });
      }
      return Array.from(deduped.values()).sort((a, b) =>
        a.monthKey.localeCompare(b.monthKey),
      );
    },
    [],
  );
  const platformSettingsNormalized = useMemo(
    () => ({
      ...platformSettings,
      adminUserIds: normalizeUserIdList(platformSettings.adminUserIds),
      employeeUserIds: normalizeUserIdList(platformSettings.employeeUserIds),
      replyToEmails: normalizeReplyToEmailList(platformSettings.replyToEmails),
      monthlyBoardMappings: normalizeMonthlyBoardMappings(
        platformSettings.monthlyBoardMappings,
      ),
    }),
    [
      normalizeMonthlyBoardMappings,
      normalizeReplyToEmailList,
      normalizeUserIdList,
      platformSettings,
    ],
  );
  const platformSettingsDraftNormalized = useMemo(
    () => ({
      ...platformSettingsDraft,
      adminUserIds: normalizeUserIdList(platformSettingsDraft.adminUserIds),
      employeeUserIds: normalizeUserIdList(platformSettingsDraft.employeeUserIds),
      replyToEmails: normalizeReplyToEmailList(platformSettingsDraft.replyToEmails),
      monthlyBoardMappings: normalizeMonthlyBoardMappings(
        platformSettingsDraft.monthlyBoardMappings,
      ),
    }),
    [
      normalizeMonthlyBoardMappings,
      normalizeReplyToEmailList,
      normalizeUserIdList,
      platformSettingsDraft,
    ],
  );
  const platformMappingsSignature = (mappings: MondayPlatformSettings["monthlyBoardMappings"]) =>
    mappings.map((entry) => `${entry.monthKey}:${entry.boardId}`).join(",");
  const formatMonthMappingLabel = useCallback((monthKey: string) => {
    const [yearPart, monthPart] = monthKey.split("-");
    const year = Number(yearPart);
    const monthIndex = Number(monthPart) - 1;
    if (!Number.isInteger(year) || !Number.isInteger(monthIndex)) return monthKey;
    if (monthIndex < 0 || monthIndex > 11) return monthKey;
    const parsed = new Date(Date.UTC(year, monthIndex, 1));
    if (Number.isNaN(parsed.getTime())) return monthKey;
    return parsed.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }, []);
  const syncMonthlyBoardOptions = useMemo(
    () =>
      platformSettingsNormalized.monthlyBoardMappings
        .map((entry) => {
          const monthLabel = formatMonthMappingLabel(entry.monthKey);
          return {
            value: `${entry.monthKey}:${entry.boardId}`,
            boardId: entry.boardId,
            monthKey: entry.monthKey,
            label: `${monthLabel} (${entry.monthKey})`,
          };
        })
        .filter((entry) => entry.boardId.trim().length > 0),
    [formatMonthMappingLabel, platformSettingsNormalized.monthlyBoardMappings],
  );
  const hasUnsavedPlatformSettings =
    platformSettingsNormalized.adminUserIds.join(",") !==
      platformSettingsDraftNormalized.adminUserIds.join(",") ||
    platformSettingsNormalized.employeeUserIds.join(",") !==
      platformSettingsDraftNormalized.employeeUserIds.join(",") ||
    platformSettingsNormalized.replyToEmails.join(",") !==
      platformSettingsDraftNormalized.replyToEmails.join(",") ||
    platformMappingsSignature(platformSettingsNormalized.monthlyBoardMappings) !==
      platformMappingsSignature(platformSettingsDraftNormalized.monthlyBoardMappings);
  const canOverrideUserScopeOwner =
    viewMode === "userScoped" &&
    !hasForcedOwnerScope &&
    isMondayEmbeddedContext &&
    isMondaySettingsAdmin;
  const presetScopeOwnerId = useMemo(() => {
    if (hasForcedOwnerScope) return forcedOwnerId;
    if (viewMode !== "userScoped") return "";
    const ownerFromFilter = ownerFilter.trim();
    if (ownerFromFilter.length > 0) return ownerFromFilter;
    return identity?.userId.trim() ?? "";
  }, [forcedOwnerId, hasForcedOwnerScope, identity?.userId, ownerFilter, viewMode]);
  const shouldGateRecordsForBoardSettings =
    isTouchScopedView && presetScopeOwnerId.length > 0;
  const hasResolvedUserScopeOwner =
    !isTouchScopedView || presetScopeOwnerId.length > 0;
  const boardSettingsReady =
    !shouldGateRecordsForBoardSettings || boardSettingsReadyOwnerId === presetScopeOwnerId;
  const useUserRecordsEndpoint =
    boardSettingsReady &&
    isTouchScopedView &&
    !canOverrideUserScopeOwner &&
    boardGeneralSettings.recordSource === "touched_in_month" &&
    debouncedSearch.trim().length < 2;
  const boardThemeStyles = useMemo(
    () => USER_BOARD_COLOR_THEME_STYLES[boardGeneralSettings.colorTheme],
    [boardGeneralSettings.colorTheme],
  );
  const boardThemeInlineStyles = useMemo(
    () => buildUserBoardThemeInlineStyles(boardGeneralSettings),
    [boardGeneralSettings],
  );
  const boardDraftThemeStyles = useMemo(
    () => USER_BOARD_COLOR_THEME_STYLES[boardGeneralSettingsDraft.colorTheme],
    [boardGeneralSettingsDraft.colorTheme],
  );
  const boardDraftThemeInlineStyles = useMemo(
    () => buildUserBoardThemeInlineStyles(boardGeneralSettingsDraft),
    [boardGeneralSettingsDraft],
  );
  const boardFontScale = USER_BOARD_FONT_SIZE_SCALE[boardGeneralSettings.fontSize];
  const boardFontScalePercent = Math.round(boardFontScale * 100);
  const quickActionButtonSizeClass =
    USER_BOARD_ACTION_BUTTON_SIZE_CLASS[boardGeneralSettings.fontSize];
  const quickActionButtonDraftSizeClass =
    USER_BOARD_ACTION_BUTTON_SIZE_CLASS[boardGeneralSettingsDraft.fontSize];
  const hasUnsavedBoardGeneralSettings =
    boardGeneralSettings.colorTheme !== boardGeneralSettingsDraft.colorTheme ||
    boardGeneralSettings.customTheme?.colorHex !==
      boardGeneralSettingsDraft.customTheme?.colorHex ||
    boardGeneralSettings.customTheme?.alpha !== boardGeneralSettingsDraft.customTheme?.alpha ||
    boardGeneralSettings.fontSize !== boardGeneralSettingsDraft.fontSize ||
    boardGeneralSettings.tableDensity !== boardGeneralSettingsDraft.tableDensity ||
    boardGeneralSettings.hoverPopoversEnabled !==
      boardGeneralSettingsDraft.hoverPopoversEnabled ||
    boardGeneralSettings.pageSize !== boardGeneralSettingsDraft.pageSize ||
    boardGeneralSettings.displayMode !== boardGeneralSettingsDraft.displayMode ||
    boardGeneralSettings.recordSource !== boardGeneralSettingsDraft.recordSource;
  const canCreateUpdatesAsLoggedInMondayUser =
    isMondayEmbeddedContext &&
    !!identity?.userId &&
    sessionToken !== MONDAY_DEV_BYPASS_TOKEN;
  const recordsQuery = useInfiniteQuery({
    queryKey: [
      "monday-records",
      viewMode,
      useUserRecordsEndpoint ? "user-records" : "records",
      monthBounds.from,
      monthBounds.to,
      debouncedSearch,
      statusFilter,
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
      if (statusFilter.trim()) params.set("status", statusFilter.trim());
      if (ownerFilter.trim()) params.set("owner", ownerFilter.trim());
      if (!isFullDbSearch) {
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

  const shouldAutoLoadMore =
    !staticMode && boardGeneralSettings.pageSize === 0;
  const handleLoadMoreRecords = () => {
    if (recordsQuery.isFetchingNextPage) return;
    if (!recordsQuery.hasNextPage) return;
    void recordsQuery.fetchNextPage();
  };

  const featureFlagsQuery = useQuery({
    queryKey: ["monday-feature-flags", sessionToken],
    enabled: !!sessionToken && !staticMode,
    queryFn: async () => {
      const response = await fetch("/api/monday/settings/feature-flags", {
        method: "GET",
        cache: "no-store",
        headers: sessionToken ? { "x-monday-session-token": sessionToken } : undefined,
      });
      const data = (await response.json()) as MondayFeatureFlagsResponse;
      if (!response.ok || !data.ok || !data.featureFlags) {
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
      const response = await fetch("/api/monday/settings/platform", {
        method: "GET",
        cache: "no-store",
        headers: sessionToken ? { "x-monday-session-token": sessionToken } : undefined,
      });
      const data = (await response.json()) as MondayPlatformSettingsResponse;
      if (!response.ok || !data.ok || !data.platformSettings) {
        throw new Error(data.error ?? "Failed to load platform settings");
      }
      return data.platformSettings;
    },
    staleTime: 30_000,
  });

  const emailTemplatesQuery = useQuery({
    queryKey: ["monday-email-templates", sessionToken],
    enabled:
      !!sessionToken &&
      !staticMode &&
      (!!sendEmailRecord || settingsOpen),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("boardId", "18401299370");
      params.set("workdocColumnId", "doc_mm0wq4r");
      params.set("limit", "250");

      const response = await fetch(`/api/monday/email-templates?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
        headers: sessionToken ? { "x-monday-session-token": sessionToken } : undefined,
      });
      const data = (await response.json()) as MondayEmailTemplatesResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to load email templates");
      }
      return data;
    },
    staleTime: 60_000,
  });

  const userProfileQuery = useQuery({
    queryKey: ["monday-user-profile", sessionToken, identity?.userId],
    enabled: !!sessionToken && !!identity?.userId && !staticMode,
    queryFn: async () => {
      const response = await fetch("/api/monday/users/me", {
        method: "GET",
        cache: "no-store",
        headers: sessionToken ? { "x-monday-session-token": sessionToken } : undefined,
      });
      const data = (await response.json()) as MondayUserProfileResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to load Monday user profile");
      }
      return data.user ?? null;
    },
    staleTime: 60_000,
  });

  const editOptionsQuery = useQuery({
    queryKey: ["monday-record-edit-options", sessionToken],
    enabled: !!sessionToken && !staticMode,
    queryFn: async () => {
      const response = await fetch("/api/monday/records/edit-options", {
        method: "GET",
        cache: "no-store",
        headers: sessionToken ? { "x-monday-session-token": sessionToken } : undefined,
      });
      const data = (await response.json()) as MondayRecordEditOptionsResponse;
      if (!response.ok || !data.ok || !data.options) {
        throw new Error(data.error ?? "Failed to load monday edit options");
      }
      return data.options;
    },
    staleTime: 60_000,
  });

  const outlookStatusQuery = useQuery({
    queryKey: ["monday-outlook-status", sessionToken, identity?.userId, settingsOpen],
    enabled:
      !!sessionToken &&
      !!identity?.userId &&
      settingsOpen &&
      !staticMode,
    queryFn: async () => {
      const response = await fetch("/api/monday/email/outlook/status", {
        method: "GET",
        cache: "no-store",
        headers: sessionToken ? { "x-monday-session-token": sessionToken } : undefined,
      });
      const data = (await response.json()) as OutlookConnectionStatusResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to load Outlook connection status");
      }
      return data;
    },
    staleTime: 30_000,
  });
  const sendEmailContactOwnerId = sendEmailRecord?.ownerIds[0]?.trim() ?? "";
  const outlookTeamMailboxesQuery = useQuery({
    queryKey: [
      "monday-outlook-team-mailboxes",
      sessionToken,
      sendEmailRecord?.id,
      sendEmailContactOwnerId,
    ],
    enabled:
      !!sessionToken &&
      !!identity?.userId &&
      !!sendEmailRecord &&
      featureFlags.emailMarketingEnabled &&
      !staticMode,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sendEmailContactOwnerId) {
        params.set("contactOwnerUserId", sendEmailContactOwnerId);
      }
      const response = await fetch(
        `/api/monday/email/outlook/team-mailboxes?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
          headers: sessionToken ? { "x-monday-session-token": sessionToken } : undefined,
        },
      );
      const data = (await response.json()) as OutlookTeamMailboxesResponse;
      if (!response.ok || !data.ok || !Array.isArray(data.mailboxes)) {
        throw new Error(data.error ?? "Failed to load team sender mailboxes");
      }
      return data;
    },
    staleTime: 30_000,
  });

  const routingStatusQuery = useQuery({
    queryKey: ["monday-routing-status", sessionToken, identity?.userId, settingsOpen],
    enabled:
      !!sessionToken &&
      !!identity?.userId &&
      settingsOpen &&
      !staticMode,
    queryFn: async () => {
      const response = await fetch("/api/monday/routing/status", {
        method: "GET",
        cache: "no-store",
        headers: sessionToken ? { "x-monday-session-token": sessionToken } : undefined,
      });
      const data = (await response.json()) as MondayRoutingStatusResponse;
      if (!response.ok || !data.ok || !data.status) {
        throw new Error(data.error ?? "Failed to load district routing status");
      }
      return data.status;
    },
    staleTime: 30_000,
  });

  const contactUpdatesQuery = useQuery({
    queryKey: [
      "monday-record-updates",
      sessionToken,
      contactHistoryDialogRecord?.id,
      contactHistoryDialogRecord?.contactId,
    ],
    enabled: !!sessionToken && !!contactHistoryDialogRecord && !staticMode,
    queryFn: async () => {
      const contactId = contactHistoryDialogRecord?.contactId?.trim();
      const targetRecordId =
        contactId && contactId.length > 0
          ? contactId
          : (contactHistoryDialogRecord?.id ?? "");
      const response = await fetch(
        `/api/monday/records/${encodeURIComponent(targetRecordId)}/updates?limit=200`,
        {
          method: "GET",
          cache: "no-store",
          headers: sessionToken
            ? { "x-monday-session-token": sessionToken }
            : undefined,
        },
      );
      const data = (await response.json()) as MondayRecordUpdatesResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to load contact conversation history");
      }
      return data;
    },
    staleTime: 30_000,
  });

  interface ContactColumnEntry {
    id: string;
    title: string;
    type: string;
    text: string | null;
    value: string | null;
    options?: string[];
    isEditable?: boolean;
  }

  interface ContactColumnsResponse {
    ok: boolean;
    error?: string;
    itemId?: string;
    itemName?: string | null;
    columns?: ContactColumnEntry[];
  }

  const contactColumnsQuery = useQuery({
    queryKey: [
      "monday-record-columns",
      sessionToken,
      contactHistoryDialogRecord?.id,
      contactHistoryDialogRecord?.contactId,
    ],
    enabled:
      !!sessionToken &&
      !!contactHistoryDialogRecord &&
      !staticMode &&
      contactDialogTab === "info",
    queryFn: async () => {
      const contactId = contactHistoryDialogRecord?.contactId?.trim();
      const targetRecordId =
        contactId && contactId.length > 0
          ? contactId
          : (contactHistoryDialogRecord?.id ?? "");
      const response = await fetch(
        `/api/monday/records/${encodeURIComponent(targetRecordId)}`,
        {
          method: "GET",
          cache: "no-store",
          headers: sessionToken
            ? { "x-monday-session-token": sessionToken }
            : undefined,
        },
      );
      const data = (await response.json()) as ContactColumnsResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to load contact details");
      }
      return data;
    },
    staleTime: 60_000,
  });

  const userFilterPresetsQuery = useQuery({
    queryKey: ["monday-user-filter-presets", sessionToken, presetScopeOwnerId],
    enabled: !!sessionToken && !staticMode && presetScopeOwnerId.length > 0,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("ownerId", presetScopeOwnerId);
      const response = await fetch(`/api/monday/user-filter-presets?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
        headers: sessionToken ? { "x-monday-session-token": sessionToken } : undefined,
      });
      const data = (await response.json()) as MondayUserFilterPresetsResponse;
      if (!response.ok || !data.ok) {
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
      const response = await fetch(`/api/monday/settings/user-board?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
        headers: sessionToken ? { "x-monday-session-token": sessionToken } : undefined,
      });
      const data = (await response.json()) as MondayUserBoardSettingsResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to load board settings");
      }
      return parseUserBoardGeneralSettings(data.settings);
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    if (hasHydratedInitialQueryParamsRef.current) return;
    hasHydratedInitialQueryParamsRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const ownerIdParam = params.get("ownerId");
    const ownerParam = ownerIdParam ?? params.get("owner");
    const itemIdParam = params.get("itemId");
    const staticParam = params.get("static");
    const outlookParam = params.get("outlook");
    const outlookMessage = params.get("outlookMessage");

    if (!hasForcedOwnerScope && ownerParam && ownerParam.trim().length > 0) {
      setOwnerFilter(ownerParam.trim());
    }
    if (itemIdParam && itemIdParam.trim().length > 0) {
      setPendingDialogItemId(itemIdParam.trim());
    }
    if (staticParam === "1" || staticParam === "true") {
      setStaticMode(true);
    }
    if (outlookParam === "connected") {
      toast.success("Outlook account connected");
      void outlookStatusQuery.refetch();
    } else if (outlookParam === "error" && outlookMessage) {
      toast.error(outlookMessage);
    }
  }, [hasForcedOwnerScope, outlookStatusQuery]);

  useEffect(() => {
    setSavedAdvancedFilterPresets([]);
    setActiveSavedAdvancedFilterId(null);
    setBoardSettingsReadyOwnerId("");
    setBoardGeneralSettings({ ...DEFAULT_USER_BOARD_GENERAL_SETTINGS });
    setBoardGeneralSettingsDraft({ ...DEFAULT_USER_BOARD_GENERAL_SETTINGS });
  }, [presetScopeOwnerId]);

  useEffect(() => {
    if (!presetScopeOwnerId) return;
    if (!userBoardSettingsQuery.isFetched) return;
    setBoardSettingsReadyOwnerId((prev) =>
      prev === presetScopeOwnerId ? prev : presetScopeOwnerId,
    );
  }, [presetScopeOwnerId, userBoardSettingsQuery.isFetched]);

  useEffect(() => {
    if (!presetScopeOwnerId) return;
    if (!userFilterPresetsQuery.data) return;
    setSavedAdvancedFilterPresets(userFilterPresetsQuery.data);
    setActiveSavedAdvancedFilterId((prev) => {
      if (!prev) return prev;
      return userFilterPresetsQuery.data.some((preset) => preset.id === prev) ? prev : null;
    });
  }, [presetScopeOwnerId, userFilterPresetsQuery.data]);

  useEffect(() => {
    if (!presetScopeOwnerId) return;
    if (!userBoardSettingsQuery.data) return;
    setBoardSettingsReadyOwnerId((prev) =>
      prev === presetScopeOwnerId ? prev : presetScopeOwnerId,
    );
    setBoardGeneralSettings(userBoardSettingsQuery.data);
    setBoardGeneralSettingsDraft(userBoardSettingsQuery.data);
    if (isUserBoardDisplayMode(userBoardSettingsQuery.data.displayMode)) {
      setUserScopedDisplayMode(userBoardSettingsQuery.data.displayMode);
    }
  }, [presetScopeOwnerId, userBoardSettingsQuery.data]);

  useEffect(() => {
    const root = document.documentElement;
    const previousFontSize = root.style.fontSize;
    root.style.fontSize = `${boardFontScalePercent}%`;
    return () => {
      root.style.fontSize = previousFontSize;
    };
  }, [boardFontScalePercent]);

  useEffect(() => {
    const handleOutlookOAuthMessage = (event: MessageEvent) => {
      const data = event.data as
        | { type?: string; status?: "connected" | "error"; message?: string | null }
        | null;
      if (!data || data.type !== "outlook-oauth-result") return;
      if (data.status === "connected") {
        toast.success("Outlook account connected");
        void outlookStatusQuery.refetch();
      } else if (data.status === "error") {
        toast.error(data.message ?? "Outlook OAuth failed");
      }
    };
    window.addEventListener("message", handleOutlookOAuthMessage);
    return () =>
      window.removeEventListener("message", handleOutlookOAuthMessage);
  }, [outlookStatusQuery]);

  useEffect(() => {
    const initEmbeddedSession = async () => {
      if (staticMode) {
        setSessionToken("static-mode");
        setIdentity({
          accountId: "static-account",
          userId: "53441186",
        });
        setIsMondayEmbeddedContext(false);
        setAuthLoading(false);
        return;
      }

      setAuthLoading(true);
      setIdentity(null);
      setIsMondayEmbeddedContext(false);

      try {
        const queryToken = readTokenFromLocation();
        if (queryToken && typeof window !== "undefined") {
          const currentUrl = new URL(window.location.href);
          if (currentUrl.searchParams.has("sessionToken")) {
            currentUrl.searchParams.delete("sessionToken");
            const nextSearch = currentUrl.searchParams.toString();
            const nextUrl = `${currentUrl.pathname}${nextSearch ? `?${nextSearch}` : ""}${currentUrl.hash}`;
            window.history.replaceState(null, "", nextUrl);
          }
        }

        let sdkToken: string | null = null;
        try {
          const tokenResponse = await monday.get("sessionToken");
          sdkToken = readTokenFromSdkResponse(tokenResponse);
        } catch {
          sdkToken = null;
        }
        let maybeToken = sdkToken ?? queryToken;

        if (!maybeToken) {
          const devAuthResponse = await fetch("/api/monday/auth/session", {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({}),
            cache: "no-store",
          });
          const devAuthData = (await devAuthResponse.json()) as {
            ok?: boolean;
            error?: string;
            identity?: MondayIdentity;
            sessionToken?: string;
          };
          if (devAuthResponse.ok && devAuthData.ok && devAuthData.identity) {
            setSessionToken(devAuthData.sessionToken ?? MONDAY_DEV_BYPASS_TOKEN);
            setIdentity(devAuthData.identity);
            setIsMondayEmbeddedContext(false);
            return;
          }
          throw new Error(
            devAuthData.error ??
            "Missing Monday session token from SDK/query string",
          );
        }

        const verifyWithToken = async (token: string) => {
          const authResponse = await fetch("/api/monday/auth/session", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-monday-session-token": token,
            },
            body: JSON.stringify({ sessionToken: token }),
            cache: "no-store",
          });
          const authData = (await authResponse.json()) as {
            ok: boolean;
            error?: string;
            identity?: MondayIdentity;
            sessionToken?: string;
          };
          return { authResponse, authData };
        };

        let { authResponse, authData } = await verifyWithToken(maybeToken);

        if (
          (!authResponse.ok || !authData.ok || !authData.identity) &&
          authData.error === "signature verification failed" &&
          sdkToken &&
          sdkToken !== maybeToken
        ) {
          maybeToken = sdkToken;
          ({ authResponse, authData } = await verifyWithToken(maybeToken));
        }

        if (!authResponse.ok || !authData.ok || !authData.identity) {
          throw new Error(authData.error ?? "Unable to verify Monday session");
        }

        setSessionToken(authData.sessionToken ?? maybeToken);
        setIdentity(authData.identity);
        setIsMondayEmbeddedContext(isEmbeddedMondaySessionToken(maybeToken));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to initialize Monday embed session";
        toast.error(message);
        setIsMondayEmbeddedContext(false);
      } finally {
        setAuthLoading(false);
      }
    };

    void initEmbeddedSession();
  }, [monday, staticMode]);

  useEffect(() => {
    if (hasForcedOwnerScope) return;
    if (viewMode !== "userScoped") return;
    if (!identity?.userId) return;
    if (!isMondayEmbeddedContext) return;
    if (canOverrideUserScopeOwner) return;
    setOwnerFilter(identity.userId);
  }, [
    canOverrideUserScopeOwner,
    hasForcedOwnerScope,
    identity?.userId,
    isMondayEmbeddedContext,
    viewMode,
  ]);

  useEffect(() => {
    if (!hasForcedOwnerScope) return;
    setOwnerFilter(forcedOwnerId);
  }, [forcedOwnerId, hasForcedOwnerScope]);

  useEffect(() => {
    if (!featureFlagsQuery.data) return;
    setFeatureFlags(featureFlagsQuery.data);
  }, [featureFlagsQuery.data]);

  useEffect(() => {
    if (!platformSettingsQuery.data) return;
    setPlatformSettings(platformSettingsQuery.data);
    setPlatformSettingsDraft(platformSettingsQuery.data);
  }, [platformSettingsQuery.data]);

  useEffect(() => {
    if (staticMode) return;
    if (!featureFlagsQuery.error) return;
    const message =
      featureFlagsQuery.error instanceof Error
        ? featureFlagsQuery.error.message
        : "Unknown loading error";
    toast.error(message);
  }, [featureFlagsQuery.error, staticMode]);

  useEffect(() => {
    if (staticMode) return;
    if (!platformSettingsQuery.error) return;
    const message =
      platformSettingsQuery.error instanceof Error
        ? platformSettingsQuery.error.message
        : "Unknown loading error";
    toast.error(message);
  }, [platformSettingsQuery.error, staticMode]);

  useEffect(() => {
    if (staticMode) return;
    if (!recordsQuery.error) return;
    const message =
      recordsQuery.error instanceof Error
        ? recordsQuery.error.message
        : "Unknown loading error";
    toast.error(message);
  }, [recordsQuery.error, staticMode]);

  useEffect(() => {
    if (staticMode) return;
    if (!settingsOpen) return;
    if (!emailTemplatesQuery.error) return;
    const message =
      emailTemplatesQuery.error instanceof Error
        ? emailTemplatesQuery.error.message
        : "Unknown loading error";
    toast.error(message);
  }, [emailTemplatesQuery.error, settingsOpen, staticMode]);

  useEffect(() => {
    if (staticMode) return;
    if (!userProfileQuery.error) return;
    const message =
      userProfileQuery.error instanceof Error
        ? userProfileQuery.error.message
        : "Unknown loading error";
    toast.error(message);
  }, [staticMode, userProfileQuery.error]);

  useEffect(() => {
    if (staticMode) return;
    if (!userFilterPresetsQuery.error) return;
    const message =
      userFilterPresetsQuery.error instanceof Error
        ? userFilterPresetsQuery.error.message
        : "Unknown loading error";
    toast.error(message);
  }, [staticMode, userFilterPresetsQuery.error]);

  useEffect(() => {
    if (staticMode) return;
    if (!userBoardSettingsQuery.error) return;
    const message =
      userBoardSettingsQuery.error instanceof Error
        ? userBoardSettingsQuery.error.message
        : "Unknown loading error";
    toast.error(message);
  }, [staticMode, userBoardSettingsQuery.error]);

  useEffect(() => {
    if (staticMode) return;
    if (!editOptionsQuery.error) return;
    const message =
      editOptionsQuery.error instanceof Error
        ? editOptionsQuery.error.message
        : "Unknown loading error";
    toast.error(message);
  }, [editOptionsQuery.error, staticMode]);

  useEffect(() => {
    if (staticMode) return;
    if (!settingsOpen) return;
    if (!outlookStatusQuery.error) return;
    const message =
      outlookStatusQuery.error instanceof Error
        ? outlookStatusQuery.error.message
        : "Unknown loading error";
    toast.error(message);
  }, [outlookStatusQuery.error, settingsOpen, staticMode]);

  useEffect(() => {
    if (staticMode) return;
    if (!sendEmailRecord) return;
    if (!outlookTeamMailboxesQuery.error) return;
    const message =
      outlookTeamMailboxesQuery.error instanceof Error
        ? outlookTeamMailboxesQuery.error.message
        : "Failed to load sender mailbox options";
    toast.error(message);
  }, [outlookTeamMailboxesQuery.error, sendEmailRecord, staticMode]);

  useEffect(() => {
    if (staticMode) return;
    if (!contactHistoryDialogRecord) return;
    if (!contactUpdatesQuery.error) return;
    const message =
      contactUpdatesQuery.error instanceof Error
        ? contactUpdatesQuery.error.message
        : "Unknown loading error";
    toast.error(message);
  }, [contactHistoryDialogRecord, contactUpdatesQuery.error, staticMode]);

  useEffect(() => {
    const target = loadMoreAnchorRef.current;
    if (!target || !recordsQuery.hasNextPage || !shouldAutoLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (recordsQuery.isFetchingNextPage) return;
        void recordsQuery.fetchNextPage();
      },
      { rootMargin: "300px 0px 300px 0px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [recordsQuery, shouldAutoLoadMore]);

  const staticRecords = useMemo<MondayRecord[]>(() => {
    if (!staticMode) return [];
    const statuses = ["New", "Qualified", "Contacted", "Closed"] as const;
    return Array.from({ length: 50 }, (_, index) => {
      const id = String(index + 1);
      const ownerId = index % 3 === 0 ? "53441186" : index % 3 === 1 ? "71234567" : "74561234";
      return {
        id,
        name: `Static Lead ${id}`,
        url: null,
        groupTitle: "Static Group",
        statusText: statuses[index % statuses.length] ?? "New",
        peopleText:
          ownerId === "53441186"
            ? "Current Monday User"
            : ownerId === "71234567"
              ? "Owner Two"
              : "Owner Three",
        ownerIds: [ownerId],
        ownerProfiles: [
          {
            id: ownerId,
            name:
              ownerId === "53441186"
                ? "Current Monday User"
                : ownerId === "71234567"
                  ? "Owner Two"
                  : "Owner Three",
            photoThumb: null,
          },
        ],
        email: `lead${id}@example.com`,
        phone: `(555) 010-${String(index).padStart(2, "0")}`,
        address: `${100 + index} Test Ave, Test City`,
        referredToContractors: index % 2 === 0 ? "Contractor A" : "Contractor B",
        hiredWithContractor: index % 3 === 0 ? "Contractor C" : "—",
        hireDate: new Date(
          Date.UTC(2026, 1, (index % 28) + 1, 0, 0, 0),
        ).toISOString(),
        retentionPeriod: ["30 days", "60 days", "90 days"][index % 3] ?? null,
        tags: ["Priority", "Follow Up", "VIP"][index % 3] ?? null,
        createdAt: new Date(
          Date.UTC(2026, 1, (index % 28) + 1, 12, index % 60, 0),
        ).toISOString(),
        updatedAt: new Date(
          Date.UTC(2026, 1, (index % 28) + 1, 13, index % 60, 0),
        ).toISOString(),
        contactDetails: [
          { label: "Name", value: `Static Lead ${id}` },
          { label: "Email", value: `lead${id}@example.com` },
          { label: "Phone", value: `(555) 010-${String(index).padStart(2, "0")}` },
          { label: "Address", value: `${100 + index} Test Ave, Test City` },
          {
            label: "Owner",
            value:
              ownerId === "53441186"
                ? "Current Monday User"
                : ownerId === "71234567"
                  ? "Owner Two"
                  : "Owner Three",
          },
          { label: "Status", value: statuses[index % statuses.length] ?? "New" },
        ],
        resumeFiles: [],
        batteryProgress: index % 5 === 0 ? null : (index * 7) % 101,
        batteryRawValue: null,
      };
    });
  }, [staticMode]);

  const apiRecords = useMemo(() => {
    return (recordsQuery.data?.pages ?? []).flatMap((page) =>
      (page.records ?? []).map((record) => {
        const ownerProfiles = normalizeOwnerProfiles(record.ownerProfiles);
        const ownerIds = normalizeOwnerIds(record.ownerIds);
        const batteryProgress =
          typeof record.batteryProgress === "number" &&
            Number.isFinite(record.batteryProgress)
            ? Math.max(0, Math.min(100, Math.round(record.batteryProgress)))
            : null;
        return {
          ...record,
          ownerProfiles,
          ownerIds,
          resumeFiles: normalizeResumeFiles(record.resumeFiles),
          batteryProgress,
        };
      }),
    );
  }, [recordsQuery.data?.pages]);

  const records = useMemo(() => {
    if (!staticMode) return apiRecords;
    return staticRecords.filter((record) => {
      if (debouncedSearch.trim().length >= 2) {
        const haystack = [
          record.name,
          record.id,
          record.groupTitle ?? "",
          record.statusText ?? "",
          record.peopleText ?? "",
          record.email ?? "",
          record.address ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(debouncedSearch.toLowerCase().trim())) {
          return false;
        }
      }
      if (statusFilter.trim().length > 0) {
        if ((record.statusText ?? "").toLowerCase() !== statusFilter.toLowerCase()) {
          return false;
        }
      }
      if (ownerFilter.trim().length > 0) {
        const ownerIdMatch = record.ownerIds
          .map((ownerId) => ownerId.toLowerCase())
          .includes(ownerFilter.toLowerCase());
        const ownerTextMatch = (record.peopleText ?? "").toLowerCase() === ownerFilter.toLowerCase();
        if (!ownerIdMatch && !ownerTextMatch) {
          return false;
        }
      }
      return true;
    });
  }, [apiRecords, debouncedSearch, ownerFilter, staticMode, staticRecords, statusFilter]);
  const boardName = staticMode
    ? "Static Test Board (50 records)"
    : recordsQuery.data?.pages[0]?.boardName ?? "Monday Board";
  const approvalSteps = useMemo(() => {
    const fromApi = recordsQuery.data?.pages[0]?.approvalSteps;
    if (!fromApi || fromApi.length === 0) {
      return APPROVAL_STEPS;
    }
    const titleById = new Map(
      fromApi
        .filter(
          (step): step is ApprovalStepConfig =>
            step.id.trim().length > 0 && step.title.trim().length > 0,
        )
        .map((step) => [step.id.trim(), step.title.trim()] as const),
    );
    return APPROVAL_STEPS.map((step) => ({
      id: step.id,
      title: titleById.get(step.id) ?? step.title,
    }));
  }, [recordsQuery.data?.pages]);
  const emailTemplates = useMemo(
    () => (staticMode ? [] : (emailTemplatesQuery.data?.templates ?? [])),
    [emailTemplatesQuery.data?.templates, staticMode],
  );
  const isOwnerFilterEditable =
    !hasForcedOwnerScope &&
    (viewMode === "all" || !isMondayEmbeddedContext || canOverrideUserScopeOwner);

  useEffect(() => {
    const itemId = pendingDialogItemId?.trim();
    if (!itemId) return;

    const matchedRecord = records.find((record) => {
      const recordId = record.id.trim();
      const contactId = record.contactId?.trim() ?? "";
      const touchItemId = record.touchItemId?.trim() ?? "";
      return recordId === itemId || contactId === itemId || touchItemId === itemId;
    });

    if (matchedRecord) {
      openContactHistoryDialog(matchedRecord);
      setPendingDialogItemId(null);
      return;
    }

    if (authLoading || recordsQuery.isLoading || recordsQuery.isFetchingNextPage) {
      return;
    }

    if (!staticMode && recordsQuery.hasNextPage) {
      void recordsQuery.fetchNextPage();
      return;
    }

    toast.error(`Unable to find item ${itemId} in the current view`);
    setPendingDialogItemId(null);
  }, [
    authLoading,
    pendingDialogItemId,
    records,
    recordsQuery,
    staticMode,
  ]);

  useEffect(() => {
    if (viewMode !== "userScoped") return;
    if (hasForcedOwnerScope) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (ownerFilter.trim().length > 0) {
      params.set("owner", ownerFilter.trim());
      params.set("ownerId", ownerFilter.trim());
    } else {
      params.delete("owner");
      params.delete("ownerId");
    }
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
    window.history.replaceState(null, "", nextUrl);
  }, [hasForcedOwnerScope, ownerFilter, viewMode]);

  useEffect(() => {
    if (emailTemplates.length === 0) return;
    if (
      selectedTemplateId &&
      emailTemplates.some((template) => template.id === selectedTemplateId)
    ) {
      return;
    }
    setSelectedTemplateId(emailTemplates[0]?.id ?? null);
  }, [emailTemplates, selectedTemplateId]);

  useEffect(() => {
    if (!identity?.userId) return;
    setAddContactValues((prev) => {
      if (prev.ownerId.trim().length > 0) return prev;
      return { ...prev, ownerId: identity.userId };
    });
  }, [identity?.userId]);

  const selectedTemplate = useMemo(() => {
    return (
      emailTemplates.find((template) => template.id === selectedTemplateId) ??
      emailTemplates[0] ??
      null
    );
  }, [emailTemplates, selectedTemplateId]);
  const sendEmailTemplate = useMemo(() => {
    return (
      emailTemplates.find((template) => template.id === sendEmailTemplateId) ??
      emailTemplates[0] ??
      null
    );
  }, [emailTemplates, sendEmailTemplateId]);

  const callbackUrl = useMemo(() => {
    if (typeof window === "undefined") return "/api/monday/email/outlook/callback";
    const path =
      outlookStatusQuery.data?.callbackPath ?? "/api/monday/email/outlook/callback";
    return `${window.location.origin}${path}`;
  }, [outlookStatusQuery.data?.callbackPath]);
  const monthlyWebhookUrl = useMemo(() => {
    if (typeof window === "undefined") return "/api/monday/routing/monthly-webhook";
    return `${window.location.origin}/api/monday/routing/monthly-webhook`;
  }, []);

  const handleConnectOutlook = async () => {
    if (!sessionToken) {
      toast.error("Missing Monday session token");
      return;
    }
    setIsConnectingOutlook(true);
    try {
      const response = await fetch("/api/monday/email/outlook/connect", {
        method: "GET",
        cache: "no-store",
        headers: { "x-monday-session-token": sessionToken },
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        authorizeUrl?: string;
      };
      if (!response.ok || !data.ok || !data.authorizeUrl) {
        throw new Error(data.error ?? "Failed to initialize Outlook OAuth");
      }
      const popup = window.open(data.authorizeUrl, "_blank");
      if (!popup) {
        window.location.assign(data.authorizeUrl);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to initialize Outlook OAuth";
      toast.error(message);
    } finally {
      setIsConnectingOutlook(false);
    }
  };

  const handleDisconnectOutlook = async () => {
    if (!sessionToken) {
      toast.error("Missing Monday session token");
      return;
    }
    setIsDisconnectingOutlook(true);
    try {
      const response = await fetch("/api/monday/email/outlook/disconnect", {
        method: "POST",
        cache: "no-store",
        headers: { "x-monday-session-token": sessionToken },
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to disconnect Outlook");
      }
      toast.success("Outlook account disconnected");
      await outlookStatusQuery.refetch();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to disconnect Outlook";
      toast.error(message);
    } finally {
      setIsDisconnectingOutlook(false);
    }
  };

  const parseDelimitedList = (value: string) => {
    return uniqueSorted(
      value
        .split(/[\s,;\n]+/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    );
  };

  const handleSavePlatformSettings = async (successMessage: string) => {
    if (!sessionToken) {
      toast.error("Missing Monday session token");
      return;
    }
    if (!isMasterAdmin) {
      toast.error("Only the master admin can change platform settings");
      return;
    }

    const normalizedReplyToEmails = normalizeReplyToEmailList(
      platformSettingsDraft.replyToEmails,
    );
    const invalidReplyToEmails = normalizedReplyToEmails.filter(
      (email) => !EMAIL_PATTERN.test(email),
    );
    if (invalidReplyToEmails.length > 0) {
      toast.error(`Invalid reply-to emails: ${invalidReplyToEmails.join(", ")}`);
      return;
    }
    const normalizedMonthlyBoardMappings = normalizeMonthlyBoardMappings(
      platformSettingsDraft.monthlyBoardMappings,
    );
    const invalidMonthlyMappings = platformSettingsDraft.monthlyBoardMappings.filter(
      (entry) =>
        entry.monthKey.trim().length > 0 &&
        (!/^\d{4}-\d{2}$/.test(entry.monthKey.trim()) ||
          entry.boardId.trim().length === 0),
    );
    if (invalidMonthlyMappings.length > 0) {
      toast.error(
        "Each monthly board mapping row requires a valid month (YYYY-MM) and board ID.",
      );
      return;
    }

    const nextPayload: MondayPlatformSettings = {
      masterAdminUserId: masterAdminUserId,
      adminUserIds: normalizeUserIdList([
        ...platformSettingsDraft.adminUserIds,
        masterAdminUserId,
      ]),
      employeeUserIds: normalizeUserIdList(platformSettingsDraft.employeeUserIds),
      replyToEmails: normalizedReplyToEmails,
      monthlyBoardMappings: normalizedMonthlyBoardMappings,
    };

    setIsSavingPlatformSettings(true);
    try {
      const response = await fetch("/api/monday/settings/platform", {
        method: "POST",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-monday-session-token": sessionToken,
        },
        body: JSON.stringify({
          adminUserIds: nextPayload.adminUserIds,
          employeeUserIds: nextPayload.employeeUserIds,
          replyToEmails: nextPayload.replyToEmails,
          monthlyBoardMappings: nextPayload.monthlyBoardMappings,
        }),
      });
      const data = (await response.json()) as MondayPlatformSettingsResponse;
      if (!response.ok || !data.ok || !data.platformSettings) {
        throw new Error(data.error ?? "Failed to save platform settings");
      }
      setPlatformSettings(data.platformSettings);
      setPlatformSettingsDraft(data.platformSettings);
      await platformSettingsQuery.refetch();
      toast.success(successMessage);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save platform settings";
      toast.error(message);
    } finally {
      setIsSavingPlatformSettings(false);
    }
  };

  const handleSetEmailMarketingEnabled = async (enabled: boolean) => {
    if (!sessionToken) {
      toast.error("Missing Monday session token");
      return;
    }
    if (!isMondaySettingsAdmin) {
      toast.error("Only admins can change feature flags");
      return;
    }
    setIsSavingFeatureFlags(true);
    try {
      const response = await fetch("/api/monday/settings/feature-flags", {
        method: "POST",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-monday-session-token": sessionToken,
        },
        body: JSON.stringify({ emailMarketingEnabled: enabled }),
      });
      const data = (await response.json()) as MondayFeatureFlagsResponse;
      if (!response.ok || !data.ok || !data.featureFlags) {
        throw new Error(data.error ?? "Failed to save feature flags");
      }
      setFeatureFlags(data.featureFlags);
      await featureFlagsQuery.refetch();
      toast.success("Feature flag updated");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update feature flag";
      toast.error(message);
    } finally {
      setIsSavingFeatureFlags(false);
    }
  };

  const handleRunRoutingRerun = async () => {
    if (!sessionToken) {
      toast.error("Missing Monday session token");
      return;
    }
    if (!isMondaySettingsAdmin) {
      toast.error("Only admins can run routing tools");
      return;
    }
    const itemId = routingRerunItemId.trim();
    if (!itemId) {
      toast.error("Enter a contact item id");
      return;
    }

    setIsRunningRoutingRerun(true);
    try {
      const response = await fetch("/api/monday/tools/routing/assign", {
        method: "POST",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-monday-session-token": sessionToken,
        },
        body: JSON.stringify({
          itemId,
          force: true,
        }),
      });
      const data = (await response.json()) as MondayRoutingAssignResponse;
      if (!response.ok || !data.result) {
        throw new Error(data.error ?? "Failed to run routing assignment");
      }
      const result = data.result;
      if (!result.ok) {
        throw new Error(result.message || "Routing assignment did not succeed");
      }
      toast.success(
        `Routing result: ${result.status} · district ${result.districtCode ?? "N/A"} · owner ${result.ownerId ?? "N/A"}`,
      );
      await Promise.all([routingStatusQuery.refetch(), recordsQuery.refetch()]);
      if (contactHistoryDialogRecord) {
        await contactUpdatesQuery.refetch();
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to run routing assignment";
      toast.error(message);
    } finally {
      setIsRunningRoutingRerun(false);
    }
  };

  const handleSaveBoardGeneralSettings = async () => {
    if (!sessionToken) {
      toast.error("Missing Monday session token");
      return;
    }
    if (!presetScopeOwnerId) {
      toast.error("Select an owner board before saving settings");
      return;
    }
    if (
      !isUserBoardColorTheme(boardGeneralSettingsDraft.colorTheme) ||
      !isUserBoardFontSize(boardGeneralSettingsDraft.fontSize) ||
      !isUserBoardTableDensity(boardGeneralSettingsDraft.tableDensity) ||
      !isUserBoardRecordSource(boardGeneralSettingsDraft.recordSource)
    ) {
      toast.error("Choose valid board settings before saving");
      return;
    }

    setIsSavingBoardGeneralSettings(true);
    try {
      const parsedCustomTheme = parseUserBoardCustomTheme(
        boardGeneralSettingsDraft.customTheme,
      );
      const response = await fetch("/api/monday/settings/user-board", {
        method: "POST",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-monday-session-token": sessionToken,
        },
        body: JSON.stringify({
          ownerId: presetScopeOwnerId,
          colorTheme: boardGeneralSettingsDraft.colorTheme,
          customTheme:
            boardGeneralSettingsDraft.colorTheme === "custom" ? parsedCustomTheme : undefined,
          fontSize: boardGeneralSettingsDraft.fontSize,
          tableDensity: boardGeneralSettingsDraft.tableDensity,
          hoverPopoversEnabled: boardGeneralSettingsDraft.hoverPopoversEnabled,
          pageSize: boardGeneralSettingsDraft.pageSize,
          displayMode: boardGeneralSettingsDraft.displayMode,
          recordSource: boardGeneralSettingsDraft.recordSource,
        }),
      });
      const data = (await response.json()) as MondayUserBoardSettingsResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to save board settings");
      }

      const parsedSettings = parseUserBoardGeneralSettings(data.settings);
      setBoardGeneralSettings(parsedSettings);
      setBoardGeneralSettingsDraft(parsedSettings);
      if (isUserBoardDisplayMode(parsedSettings.displayMode)) {
        setUserScopedDisplayMode(parsedSettings.displayMode);
      }
      await userBoardSettingsQuery.refetch();
      toast.success("General settings saved for this employee board");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save general settings";
      toast.error(message);
    } finally {
      setIsSavingBoardGeneralSettings(false);
    }
  };

  const openSendEmailDialog = (
    record: MondayRecord,
    options?: {
      progressUpdate?: {
        updateType: Exclude<ContactUpdateType, "general">;
        body: string;
      } | null;
      autoAdvanceToPreview?: boolean;
      preferredTemplateType?: Exclude<ContactUpdateType, "general"> | null;
    },
  ) => {
    const resolvePreferredTemplateId = () => {
      const templates = emailTemplates;
      if (templates.length === 0) return null;
      const preferredType =
        options?.preferredTemplateType ??
        options?.progressUpdate?.updateType ??
        null;
      if (preferredType === "welcome_email") {
        const matchedWelcomeTemplate = templates.find((template) =>
          template.name.toLowerCase().includes("welcome"),
        );
        if (matchedWelcomeTemplate) return matchedWelcomeTemplate.id;
      }
      return templates[0]?.id ?? null;
    };

    setSendEmailRecord(record);
    setSendEmailStep(options?.autoAdvanceToPreview ? 2 : 1);
    setSendEmailTemplateId(resolvePreferredTemplateId());
    setSendEmailOwnerUserId(record.ownerIds[0]?.trim() ?? "");
    setSendEmailProgressUpdate(options?.progressUpdate ?? null);
  };
  const closeSendEmailDialog = () => {
    setSendEmailRecord(null);
    setSendEmailStep(1);
    setSendEmailTemplateId(null);
    setSendEmailOwnerUserId("");
    setSendEmailProgressUpdate(null);
    setIsSendingEmail(false);
  };
  const sendEmailOwnerVars = useMemo(() => {
    const primaryOwner = sendEmailRecord?.ownerProfiles[0] ?? null;
    const ownerName =
      primaryOwner?.name?.trim() ??
      sendEmailRecord?.peopleText?.trim() ??
      "";
    const ownerEmail = primaryOwner?.email?.trim() ?? "";
    return { ownerName, ownerEmail };
  }, [sendEmailRecord]);
  useEffect(() => {
    if (!sendEmailRecord) return;
    if (sendEmailStep !== 2) return;
    if (sendEmailTemplateId) return;
    if (emailTemplates.length === 0) return;

    const preferredType = sendEmailProgressUpdate?.updateType ?? null;
    const matchedTemplateId =
      preferredType === "welcome_email"
        ? emailTemplates.find((template) =>
            template.name.toLowerCase().includes("welcome"),
          )?.id
        : null;
    setSendEmailTemplateId(matchedTemplateId ?? emailTemplates[0]?.id ?? null);
  }, [
    emailTemplates,
    sendEmailProgressUpdate?.updateType,
    sendEmailRecord,
    sendEmailStep,
    sendEmailTemplateId,
  ]);
  const sendEmailResolvedTemplate = useMemo(() => {
    if (!sendEmailTemplate) return null;
    const subject = interpolateTemplateVariables(sendEmailTemplate.name, {
      ownerName: sendEmailOwnerVars.ownerName,
      ownerEmail: sendEmailOwnerVars.ownerEmail,
    });
    const htmlSource =
      sendEmailTemplate.renderedHtml.trim().length > 0
        ? sendEmailTemplate.renderedHtml
        : sendEmailTemplate.content;
    const html = interpolateTemplateVariables(htmlSource, {
      ownerName: sendEmailOwnerVars.ownerName,
      ownerEmail: sendEmailOwnerVars.ownerEmail,
    });
    const text = interpolateTemplateVariables(sendEmailTemplate.content, {
      ownerName: sendEmailOwnerVars.ownerName,
      ownerEmail: sendEmailOwnerVars.ownerEmail,
    });
    return { subject, html, text };
  }, [sendEmailOwnerVars.ownerEmail, sendEmailOwnerVars.ownerName, sendEmailTemplate]);
  useEffect(() => {
    if (featureFlags.emailMarketingEnabled) return;
    if (!sendEmailRecord) return;
    setSendEmailRecord(null);
    setSendEmailStep(1);
    setSendEmailTemplateId(null);
    setSendEmailOwnerUserId("");
    setSendEmailProgressUpdate(null);
    setIsSendingEmail(false);
  }, [featureFlags.emailMarketingEnabled, sendEmailRecord]);
  useEffect(() => {
    if (!sendEmailRecord) return;
    const mailboxes = outlookTeamMailboxesQuery.data?.mailboxes ?? [];
    if (mailboxes.length === 0) return;
    const selectedExists = mailboxes.some(
      (entry) => entry.mondayUserId === sendEmailOwnerUserId,
    );
    if (selectedExists) return;
    const preferredId = outlookTeamMailboxesQuery.data?.defaultSenderUserId?.trim();
    if (preferredId) {
      setSendEmailOwnerUserId(preferredId);
      return;
    }
    const fallbackMailbox =
      mailboxes.find((entry) => entry.isContactOwner && entry.connected) ??
      mailboxes.find((entry) => entry.isCurrentUser && entry.connected) ??
      mailboxes.find((entry) => entry.connected) ??
      mailboxes[0];
    if (fallbackMailbox) {
      setSendEmailOwnerUserId(fallbackMailbox.mondayUserId);
    }
  }, [
    outlookTeamMailboxesQuery.data?.defaultSenderUserId,
    outlookTeamMailboxesQuery.data?.mailboxes,
    sendEmailOwnerUserId,
    sendEmailRecord,
  ]);
  const sendEmailMailboxOptions = outlookTeamMailboxesQuery.data?.mailboxes ?? [];
  const selectedSendEmailMailbox =
    sendEmailMailboxOptions.find(
      (entry) => entry.mondayUserId === sendEmailOwnerUserId,
    ) ?? null;
  const sendEmailCanSubmit =
    !isSendingEmail &&
    !!sendEmailRecord?.email &&
    sendEmailOwnerUserId.trim().length > 0 &&
    (selectedSendEmailMailbox ? selectedSendEmailMailbox.connected : true) &&
    !outlookTeamMailboxesQuery.isLoading &&
    !outlookTeamMailboxesQuery.isFetching;
  const handleConfirmSendEmail = async () => {
    if (!sessionToken || !sendEmailRecord || !sendEmailTemplate || !sendEmailResolvedTemplate) {
      toast.error("Missing email send context");
      return;
    }
    const recipient = sendEmailRecord.email?.trim() ?? "";
    if (!recipient) {
      toast.error("This contact does not have an email address");
      return;
    }
    const senderMailboxUserId = sendEmailOwnerUserId.trim();
    if (!senderMailboxUserId) {
      toast.error("Select a sender mailbox before sending");
      return;
    }
    if (selectedSendEmailMailbox && !selectedSendEmailMailbox.connected) {
      toast.error("Selected sender mailbox is not connected to Outlook");
      return;
    }
    setIsSendingEmail(true);
    try {
      const response = await fetch("/api/monday/email/send", {
        method: "POST",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-monday-session-token": sessionToken,
        },
        body: JSON.stringify({
          to: recipient,
          subject: sendEmailResolvedTemplate.subject,
          html: sendEmailResolvedTemplate.html,
          contactItemId: resolveContactUpdateTargetRecordId(sendEmailRecord),
          ownerMondayUserId: senderMailboxUserId,
        }),
      });
      const data = (await response.json()) as MondaySendEmailResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to send email");
      }
      let progressSyncError: string | null = null;
      if (sendEmailProgressUpdate) {
        try {
          const targetRecordId = resolveContactUpdateTargetRecordId(sendEmailRecord);
          const sendProgressDateTime = new Date().toISOString();
          let updateData: MondayCreateRecordUpdateResponse;
          if (canCreateUpdatesAsLoggedInMondayUser) {
            const update = await createMondayRecordUpdateAsContextUser({
              itemId: targetRecordId,
              body: sendEmailProgressUpdate.body,
              updateType: sendEmailProgressUpdate.updateType,
              dateTime: sendProgressDateTime,
            });
            updateData = { ok: true, update };
          } else {
            const updateResponse = await fetch(
              `/api/monday/records/${encodeURIComponent(targetRecordId)}/updates`,
              {
                method: "POST",
                cache: "no-store",
                headers: {
                  "content-type": "application/json",
                  "x-monday-session-token": sessionToken,
                },
                body: JSON.stringify({
                  body: sendEmailProgressUpdate.body,
                  updateType: sendEmailProgressUpdate.updateType,
                  dateTime: sendProgressDateTime,
                }),
              },
            );
            updateData = (await updateResponse.json()) as MondayCreateRecordUpdateResponse;
            if (!updateResponse.ok || !updateData.ok) {
              throw new Error(updateData.error ?? "Failed to track onboarding progress");
            }
          }

          if (identity?.userId) {
            fetch("/api/monday/touches", {
              method: "POST",
              headers: {
                "content-type": "application/json",
                "x-monday-session-token": sessionToken,
              },
              body: JSON.stringify({
                contactItemId: targetRecordId,
                contactName: sendEmailRecord.name ?? "",
                ownerId: identity.userId,
                source: "update",
              }),
            }).catch(() => {});
          }

          const [, refreshedRecordsResult] = await Promise.all([
            contactUpdatesQuery.refetch(),
            recordsQuery.refetch(),
          ]);
          const refreshedRecords = (refreshedRecordsResult.data?.pages ?? []).flatMap(
            (page) => page.records ?? [],
          );
          syncContactHistoryDialogFromRecords(refreshedRecords);

          if (updateData.update?.warning) {
            progressSyncError = updateData.update.warning;
          }
        } catch (error) {
          progressSyncError =
            error instanceof Error ? error.message : "Failed to sync welcome email progress";
        }
      }

      if (progressSyncError) {
        toast.success(`Email sent to ${recipient}`);
        toast.error(`Email sent, but welcome step sync failed: ${progressSyncError}`);
      } else if (sendEmailProgressUpdate) {
        toast.success(`Email sent to ${recipient} and welcome step marked complete`);
      } else {
        toast.success(`Email sent to ${recipient}`);
      }
      closeSendEmailDialog();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send email";
      toast.error(message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const ownerProfileById = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string | null; photoThumb: string | null }
    >();
    for (const record of records) {
      for (const owner of record.ownerProfiles) {
        if (!map.has(owner.id)) {
          map.set(owner.id, owner);
        }
      }
    }
    return map;
  }, [records]);

  const ownerOptions = useMemo(() => {
    return Array.from(
      new Map(
        records
          .flatMap((record) => {
            const ids = Array.isArray(record.ownerIds) ? record.ownerIds : [];
            return ids.map((id) => ({
              value: id,
              label:
                record.peopleText && record.peopleText.trim().length > 0
                  ? `${record.peopleText} (${id})`
                  : `User ${id}`,
            }));
          })
          .map((entry) => [entry.value, entry.label] as const),
      ),
    )
      .map(([value, label]) => {
        const ownerProfile = ownerProfileById.get(value);
        return {
          value,
          label,
          name: ownerProfile?.name ?? null,
          photoThumb: ownerProfile?.photoThumb ?? null,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [ownerProfileById, records]);
  const addContactOwnerOptions = useMemo(() => {
    const base = ownerOptions.map((option) => ({ ...option }));
    if (identity?.userId) {
      const exists = base.some((option) => option.value === identity.userId);
      if (!exists) {
        base.unshift({
          value: identity.userId,
          label: `Current User (${identity.userId})`,
          name: null,
          photoThumb: null,
        });
      }
    }
    return base;
  }, [identity?.userId, ownerOptions]);
  const ownerOptionHasSelectedValue = useMemo(() => {
    if (ownerFilter.trim().length === 0) return true;
    return ownerOptions.some((option) => option.value === ownerFilter);
  }, [ownerFilter, ownerOptions]);
  const lockedOwnerLabel = useMemo(() => {
    const normalizedOwner = ownerFilter.trim() || forcedOwnerId;
    if (!normalizedOwner) return "Owner: locked";
    const option = ownerOptions.find((entry) => entry.value === normalizedOwner);
    if (option) return `Owner: ${option.label}`;
    if (hasForcedOwnerScope) return `Owner: ${forcedOwnerId}`;
    return "Owner: me";
  }, [forcedOwnerId, hasForcedOwnerScope, ownerFilter, ownerOptions]);
  const boardColumnFilterOptions = useMemo(() => {
    const labels = new Set<string>();
    for (const record of records) {
      for (const detail of record.contactDetails) {
        const label = detail.label.trim();
        if (!label) continue;
        labels.add(label);
      }
    }
    return Array.from(labels).sort((a, b) => a.localeCompare(b));
  }, [records]);
  const boardColumnFilterKindByLabel = useMemo(() => {
    const byLabel = new Map<string, string[]>();
    for (const record of records) {
      for (const detail of record.contactDetails) {
        const label = detail.label.trim();
        const value = detail.value.trim();
        if (!label || !value) continue;
        const existing = byLabel.get(label);
        if (existing) {
          if (existing.length < 8) existing.push(value);
        } else {
          byLabel.set(label, [value]);
        }
      }
    }

    const kinds = new Map<string, "text" | "date">();
    for (const label of boardColumnFilterOptions) {
      const samples = byLabel.get(label) ?? [];
      const labelSuggestsDate = /\b(date|time)\b/i.test(label);
      const hasDateSamples =
        samples.length > 0 &&
        samples.every((sample) => normalizeAdvancedDate(sample).length > 0);
      kinds.set(label, labelSuggestsDate || hasDateSamples ? "date" : "text");
    }
    return kinds;
  }, [boardColumnFilterOptions, records]);

  const statusOptions = useMemo(() => {
    return uniqueSorted(records.map((record) => record.statusText)).map((value) => ({
      label: value,
      value,
    }));
  }, [records]);
  const activeAdvancedFilterConditions = useMemo(
    () => advancedFilterConditions.filter((condition) => isAdvancedConditionActive(condition)),
    [advancedFilterConditions],
  );
  const filteredRecords = useMemo(() => {
    if (activeAdvancedFilterConditions.length === 0) return records;
    return records.filter((record) =>
      doesRecordMatchAdvancedFilters(
        record,
        activeAdvancedFilterConditions,
        advancedFilterMatchMode,
      ),
    );
  }, [activeAdvancedFilterConditions, advancedFilterMatchMode, records]);
  const filteredRecordCountLabel = `${filteredRecords.length} total contact${
    filteredRecords.length === 1 ? "" : "s"
  }`;

  const handleAddAdvancedFilterCondition = () => {
    setActiveSavedAdvancedFilterId(null);
    const defaultTarget = boardColumnFilterOptions[0] ?? "";
    const defaultKind = boardColumnFilterKindByLabel.get(defaultTarget) ?? "text";
    setAdvancedFilterConditions((prev) => [
      ...prev,
      {
        ...createAdvancedFilterCondition("detail", defaultTarget),
        operator: defaultKind === "date" ? "on_or_after" : "contains",
      },
    ]);
  };

  const handleRemoveAdvancedFilterCondition = (conditionId: string) => {
    setActiveSavedAdvancedFilterId(null);
    setAdvancedFilterConditions((prev) =>
      prev.filter((condition) => condition.id !== conditionId),
    );
  };

  const handleChangeAdvancedFilterOperator = (
    conditionId: string,
    operator: AdvancedFilterOperator,
  ) => {
    setActiveSavedAdvancedFilterId(null);
    setAdvancedFilterConditions((prev) =>
      prev.map((condition) => {
        if (condition.id !== conditionId) return condition;
        return {
          ...condition,
          operator,
          value:
            operator === "is_empty" || operator === "is_not_empty" ? "" : condition.value,
          valueTo: operator === "between" ? condition.valueTo : "",
        };
      }),
    );
  };

  const handleChangeAdvancedFilterTarget = (conditionId: string, target: string) => {
    setActiveSavedAdvancedFilterId(null);
    setAdvancedFilterConditions((prev) =>
      prev.map((condition) => {
        if (condition.id !== conditionId) return condition;
        const normalizedTarget = target.trim();
        const kind = boardColumnFilterKindByLabel.get(normalizedTarget) ?? "text";
        const allowedOperators =
          kind === "date" ? ADVANCED_DATE_OPERATORS : ADVANCED_TEXT_OPERATORS;
        const operator = allowedOperators.includes(condition.operator)
          ? condition.operator
          : kind === "date"
            ? "on_or_after"
            : "contains";
        return {
          ...condition,
          field: "detail",
          target: normalizedTarget,
          operator,
        };
      }),
    );
  };

  const handleChangeAdvancedFilterValue = (conditionId: string, value: string) => {
    setActiveSavedAdvancedFilterId(null);
    setAdvancedFilterConditions((prev) =>
      prev.map((condition) => {
        if (condition.id !== conditionId) return condition;
        return { ...condition, value };
      }),
    );
  };

  const handleChangeAdvancedFilterValueTo = (conditionId: string, valueTo: string) => {
    setActiveSavedAdvancedFilterId(null);
    setAdvancedFilterConditions((prev) =>
      prev.map((condition) => {
        if (condition.id !== conditionId) return condition;
        return { ...condition, valueTo };
      }),
    );
  };

  const handleClearAdvancedFilters = () => {
    setActiveSavedAdvancedFilterId(null);
    setAdvancedFilterConditions([]);
    setAdvancedFilterMatchMode("all");
  };

  const handleSaveAdvancedFilterPreset = async () => {
    const name = pendingSavedAdvancedFilterName.trim();
    if (!name) {
      toast.error("Enter a name before saving a filter preset");
      return;
    }
    if (activeAdvancedFilterConditions.length === 0) {
      toast.error("Add at least one filter condition before saving");
      return;
    }
    if (!sessionToken) {
      toast.error("Missing Monday session token");
      return;
    }
    if (!presetScopeOwnerId) {
      toast.error("Missing owner board scope for saved filters");
      return;
    }

    const normalizedName = name.toLowerCase();
    const existingPreset = savedAdvancedFilterPresets.find(
      (preset) => preset.name.toLowerCase() === normalizedName,
    );
    const conditionsForSave = activeAdvancedFilterConditions
      .map((condition) => {
        const target = getBoardColumnTargetForCondition(condition);
        if (!target) return null;
        return {
          ...condition,
          field: "detail" as const,
          target,
        };
      })
      .filter((condition) => condition !== null) as AdvancedFilterCondition[];
    if (conditionsForSave.length === 0) {
      toast.error("Select at least one board column before saving");
      return;
    }
    setIsSavingAdvancedFilterPreset(true);
    try {
      const response = await fetch("/api/monday/user-filter-presets", {
        method: "POST",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-monday-session-token": sessionToken,
        },
        body: JSON.stringify({
          ownerId: presetScopeOwnerId,
          presetId: existingPreset?.id,
          name,
          matchMode: advancedFilterMatchMode,
          conditions: conditionsForSave,
        }),
      });
      const data = (await response.json()) as MondayUserFilterPresetUpsertResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to save filter preset");
      }
      const parsedPreset = parseSavedAdvancedFilterPreset(data.preset);
      if (!parsedPreset) {
        throw new Error("Invalid filter preset returned from server");
      }

      setSavedAdvancedFilterPresets((prev) => {
        const withoutExisting = prev.filter((entry) => entry.id !== parsedPreset.id);
        return [parsedPreset, ...withoutExisting].slice(0, 25);
      });
      setActiveSavedAdvancedFilterId(parsedPreset.id);
      setPendingSavedAdvancedFilterName("");
      toast.success(
        existingPreset ? `Updated filter preset "${name}"` : `Saved filter preset "${name}"`,
      );
      await userFilterPresetsQuery.refetch();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save filter preset";
      toast.error(message);
    } finally {
      setIsSavingAdvancedFilterPreset(false);
    }
  };

  const handleApplySavedAdvancedFilterPreset = (preset: SavedAdvancedFilterPreset) => {
    setAdvancedFilterMatchMode(preset.matchMode);
    setAdvancedFilterConditions(
      preset.conditions.map((condition) => ({
        ...condition,
        id: createAdvancedFilterId(),
      })),
    );
    setActiveSavedAdvancedFilterId(preset.id);
    setPendingSavedAdvancedFilterName(preset.name);
    toast.success(`Applied filter preset "${preset.name}"`);
  };

  const handleDeleteSavedAdvancedFilterPreset = async (presetId: string) => {
    if (!sessionToken) {
      toast.error("Missing Monday session token");
      return;
    }
    if (!presetScopeOwnerId) {
      toast.error("Missing owner board scope for saved filters");
      return;
    }
    setDeletingAdvancedFilterPresetIds((prev) => ({ ...prev, [presetId]: true }));
    try {
      const params = new URLSearchParams();
      params.set("ownerId", presetScopeOwnerId);
      const response = await fetch(
        `/api/monday/user-filter-presets/${encodeURIComponent(presetId)}?${params.toString()}`,
        {
          method: "DELETE",
          cache: "no-store",
          headers: { "x-monday-session-token": sessionToken },
        },
      );
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to delete filter preset");
      }
      setSavedAdvancedFilterPresets((prev) => prev.filter((preset) => preset.id !== presetId));
      setActiveSavedAdvancedFilterId((prev) => (prev === presetId ? null : prev));
      await userFilterPresetsQuery.refetch();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete filter preset";
      toast.error(message);
    } finally {
      setDeletingAdvancedFilterPresetIds((prev) => {
        const next = { ...prev };
        delete next[presetId];
        return next;
      });
    }
  };

  const retentionOptions = useMemo(() => {
    const fromApi = editOptionsQuery.data;
    const referredFallback = uniqueSorted(
      records.map((record) => record.referredToContractors),
    );
    const hiredFallback = uniqueSorted(records.map((record) => record.hiredWithContractor));
    const periodFallback = uniqueSorted(records.map((record) => record.retentionPeriod));
    const tagsFallback = uniqueSorted(
      records.flatMap((record) => splitCsvValues(record.tags)),
    );
    const hireDateFallback = uniqueSorted(
      records.map((record) => normalizeDateOnlyFromRecord(record.hireDate)).filter(Boolean),
    );

    return {
      referredToContractors: fromApi?.referredToContractors.length
        ? fromApi.referredToContractors
        : referredFallback,
      hiredWithContractor: fromApi?.hiredWithContractor.length
        ? fromApi.hiredWithContractor
        : hiredFallback,
      retentionPeriod: fromApi?.retentionPeriod.length
        ? fromApi.retentionPeriod
        : periodFallback,
      tags: fromApi?.tags.length ? fromApi.tags : tagsFallback,
      hireDate: hireDateFallback,
    };
  }, [editOptionsQuery.data, records]);

  const openRetentionDialog = (record: MondayRecord) => {
    setRetentionDialogRecord(record);
    setRetentionHireDatePopoverOpen(false);
    setRetentionDraft({
      referredToContractors: splitCsvValues(record.referredToContractors),
      hiredWithContractor: record.hiredWithContractor ?? "",
      hireDate: normalizeDateOnlyFromRecord(record.hireDate),
      retentionPeriod: record.retentionPeriod ?? "",
    });
  };

  const openTagsDialog = (record: MondayRecord) => {
    setTagsDialogRecord(record);
    setTagsDraft(splitCsvValues(record.tags));
  };
  const openStatusDialog = (record: MondayRecord) => {
    setStatusDialogRecord(record);
    setStatusDraft(record.statusText ?? "");
  };
  const openOwnerDialog = (record: MondayRecord) => {
    setOwnerDialogRecord(record);
    setOwnerDraft(record.ownerIds[0] ?? "");
  };
  const openContactHistoryDialog = (record: MondayRecord) => {
    setContactHistoryDialogRecord(record);
    setContactUpdateDraft("");
    setContactUpdateType("general");
    setContactDialogTab("updates");
  };

  const contactDialogIndex = useMemo(() => {
    if (!contactHistoryDialogRecord) return -1;
    return filteredRecords.findIndex((r) => r.id === contactHistoryDialogRecord.id);
  }, [contactHistoryDialogRecord, filteredRecords]);
  const contactDialogResumeFile = contactHistoryDialogRecord?.resumeFiles[0] ?? null;
  const isContactDialogUploadingResume = contactHistoryDialogRecord
    ? uploadingResumeByRecordId[contactHistoryDialogRecord.id] === true
    : false;
  const contactDialogResumeInputId = contactHistoryDialogRecord
    ? `contact-dialog-resume-upload-${contactHistoryDialogRecord.id}`
    : "";

  const navigateContactDialog = useCallback(
    (direction: -1 | 1) => {
      const nextIndex = contactDialogIndex + direction;
      if (nextIndex < 0 || nextIndex >= filteredRecords.length) return;
      const next = filteredRecords[nextIndex];
      if (next) openContactHistoryDialog(next);
    },
    [contactDialogIndex, filteredRecords],
  );

  const resolveContactUpdateTargetRecordId = (record: MondayRecord) => {
    const contactId = record.contactId?.trim();
    if (contactId && contactId.length > 0) return contactId;
    return record.id;
  };

  const normalizeEditableColumnDraft = useCallback((column: ContactColumnEntry) => {
    const normalizedType = column.type.toLowerCase();
    if (normalizedType === "date") {
      if (column.value) {
        try {
          const parsed = JSON.parse(column.value) as { date?: string };
          if (parsed.date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) {
            return parsed.date;
          }
        } catch {
          // ignore malformed value JSON
        }
      }
      const text = column.text?.trim() ?? "";
      return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
    }
    if (normalizedType === "dropdown") {
      const first = (column.text ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .find((entry) => entry.length > 0);
      return first ?? "";
    }
    return column.text ?? "";
  }, []);

  const startEditingContactColumn = useCallback((column: ContactColumnEntry) => {
    if (!column.isEditable) return;
    setEditingContactColumnId(column.id);
    setEditingContactColumnDraft(normalizeEditableColumnDraft(column));
  }, [normalizeEditableColumnDraft]);

  const cancelEditingContactColumn = useCallback(() => {
    setEditingContactColumnId(null);
    setEditingContactColumnDraft("");
  }, []);

  const saveEditingContactColumn = useCallback(async () => {
    if (!sessionToken || !contactHistoryDialogRecord || !editingContactColumnId) {
      toast.error("Missing monday session context");
      return;
    }
    const column = (contactColumnsQuery.data?.columns ?? []).find(
      (entry) => entry.id === editingContactColumnId,
    );
    if (!column) {
      toast.error("Column no longer available");
      return;
    }

    setIsSavingContactColumn(true);
    try {
      const targetRecordId = resolveContactUpdateTargetRecordId(
        contactHistoryDialogRecord,
      );
      const response = await fetch(
        `/api/monday/records/${encodeURIComponent(targetRecordId)}/columns`,
        {
          method: "PATCH",
          cache: "no-store",
          headers: {
            "content-type": "application/json",
            "x-monday-session-token": sessionToken,
          },
          body: JSON.stringify({
            columnId: column.id,
            columnType: column.type,
            value: editingContactColumnDraft,
          }),
        },
      );
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Failed to update column");
      }

      await contactColumnsQuery.refetch();
      const refreshedRecordsResult = await recordsQuery.refetch();
      const refreshedRecords = (refreshedRecordsResult.data?.pages ?? []).flatMap(
        (page) => page.records ?? [],
      );
      syncContactHistoryDialogFromRecords(refreshedRecords);
      cancelEditingContactColumn();
      toast.success(`Updated ${column.title}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update column value",
      );
    } finally {
      setIsSavingContactColumn(false);
    }
  }, [
    cancelEditingContactColumn,
    contactColumnsQuery,
    contactHistoryDialogRecord,
    editingContactColumnDraft,
    editingContactColumnId,
    recordsQuery,
    sessionToken,
  ]);

  useEffect(() => {
    cancelEditingContactColumn();
  }, [cancelEditingContactColumn, contactHistoryDialogRecord?.id, contactDialogTab]);

  const syncContactHistoryDialogFromRecords = (refreshedRecords: MondayRecord[]) => {
    setContactHistoryDialogRecord((prev) => {
      if (!prev) return prev;
      const previousRecordId = prev.id.trim();
      const prevContactId = prev.contactId?.trim() ?? "";
      const findSingleMatch = (
        predicate: (candidate: MondayRecord) => boolean,
      ): MondayRecord | null => {
        const matches = refreshedRecords.filter(predicate);
        return matches.length === 1 ? (matches[0] ?? null) : null;
      };
      const matchedRecord =
        refreshedRecords.find((candidate) => candidate.id.trim() === previousRecordId) ??
        findSingleMatch(
          (candidate) => (candidate.touchItemId?.trim() ?? "") === previousRecordId,
        ) ??
        (prevContactId
          ? findSingleMatch((candidate) => candidate.id.trim() === prevContactId) ??
            findSingleMatch((candidate) => (candidate.contactId?.trim() ?? "") === prevContactId)
          : null) ??
        findSingleMatch((candidate) => (candidate.contactId?.trim() ?? "") === previousRecordId);
      if (!matchedRecord) return prev;
      const matchedBatteryProgress =
        typeof matchedRecord.batteryProgress === "number" &&
          Number.isFinite(matchedRecord.batteryProgress)
          ? Math.max(0, Math.min(100, Math.round(matchedRecord.batteryProgress)))
          : null;
      return {
        ...prev,
        ...matchedRecord,
        ownerProfiles: normalizeOwnerProfiles(matchedRecord.ownerProfiles),
        ownerIds: normalizeOwnerIds(matchedRecord.ownerIds),
        resumeFiles: normalizeResumeFiles(matchedRecord.resumeFiles),
        batteryProgress: matchedBatteryProgress,
      };
    });
  };

  const openSyncContactBoardPicker = useCallback(
    (record: MondayRecord) => {
      if (!sessionToken) {
        toast.error("Missing monday session context");
        return;
      }
      if (syncMonthlyBoardOptions.length === 0) {
        toast.error("No monthly board mappings configured in platform settings.");
        return;
      }
      const recordMonthKey = (() => {
        if (!record.createdAt) return null;
        const parsed = Date.parse(record.createdAt);
        if (Number.isNaN(parsed)) return null;
        return new Date(parsed).toISOString().slice(0, 7);
      })();
      const defaultSelection =
        (recordMonthKey
          ? syncMonthlyBoardOptions.find((entry) => entry.monthKey === recordMonthKey)
          : null) ?? syncMonthlyBoardOptions[0];
      setSyncContactBoardSelection(defaultSelection?.value ?? "");
      setSyncContactBoardPickerRecord(record);
    },
    [sessionToken, syncMonthlyBoardOptions],
  );

  const handleSyncContactRecord = useCallback(
    async (
      record: MondayRecord,
      options?: {
        monthlyBoardId?: string;
      },
    ) => {
      if (!sessionToken) return;
      const syncKey = record.id;
      const resolvedSyncOwnerId =
        record.ownerIds.map((ownerId) => ownerId.trim()).find((ownerId) => ownerId.length > 0) ??
        record.ownerProfiles
          .map((profile) => profile.id.trim())
          .find((ownerId) => ownerId.length > 0) ??
        identity?.userId?.trim() ??
        "";
      setSyncingContactIds((prev) => new Set(prev).add(syncKey));
      try {
        const targetId = resolveContactUpdateTargetRecordId(record);
        const response = await fetch(
          `/api/monday/records/${encodeURIComponent(targetId)}/sync`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-monday-session-token": sessionToken,
            },
            body: JSON.stringify({
              ownerId: resolvedSyncOwnerId.length > 0 ? resolvedSyncOwnerId : undefined,
              monthlyBoardId: options?.monthlyBoardId,
            }),
          },
        );
        const data = (await response.json()) as {
          ok: boolean;
          error?: string;
          linkedItemCount?: number;
          createdParentUpdates?: number;
          createdSubitems?: number;
          createdSubitemUpdates?: number;
          updatedProgressColumns?: number;
          skippedSubitems?: number;
          warnings?: string[];
        };
        if (!response.ok || !data.ok) {
          throw new Error(data.error ?? "Sync failed");
        }
        const [, refreshedRecordsResult] = await Promise.all([
          contactUpdatesQuery.refetch(),
          recordsQuery.refetch(),
        ]);
        const refreshedRecords = (refreshedRecordsResult.data?.pages ?? []).flatMap(
          (page) => page.records ?? [],
        );
        syncContactHistoryDialogFromRecords(refreshedRecords);
        const parts = [
          data.createdParentUpdates && `${data.createdParentUpdates} updates`,
          data.createdSubitems && `${data.createdSubitems} subitems`,
          data.updatedProgressColumns && `${data.updatedProgressColumns} progress steps`,
        ].filter(Boolean);
        toast.success(
          parts.length > 0
            ? `Synced: ${parts.join(", ")}`
            : `Sync complete (${data.linkedItemCount ?? 0} linked items)`,
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Sync failed");
      } finally {
        setSyncingContactIds((prev) => {
          const next = new Set(prev);
          next.delete(syncKey);
          return next;
        });
      }
    },
    [
      contactUpdatesQuery,
      identity?.userId,
      recordsQuery,
      sessionToken,
      syncContactHistoryDialogFromRecords,
    ],
  );

  const confirmSyncContactFromSelectedBoard = useCallback(() => {
    const record = syncContactBoardPickerRecord;
    if (!record) return;
    const selectedBoard = syncMonthlyBoardOptions.find(
      (entry) => entry.value === syncContactBoardSelection,
    );
    if (!selectedBoard) {
      toast.error("Select a monthly board to sync.");
      return;
    }
    setSyncContactBoardPickerRecord(null);
    void handleSyncContactRecord(record, { monthlyBoardId: selectedBoard.boardId });
  }, [
    handleSyncContactRecord,
    syncContactBoardPickerRecord,
    syncContactBoardSelection,
    syncMonthlyBoardOptions,
  ]);

  const fetchBulkSyncStatus = useCallback(
    async (jobId?: string | null) => {
      if (!sessionToken) return null;
      const params = new URLSearchParams();
      if (jobId && jobId.trim().length > 0) {
        params.set("jobId", jobId.trim());
      }
      const response = await fetch(
        `/api/monday/sync/bulk/status${params.toString() ? `?${params.toString()}` : ""}`,
        {
          method: "GET",
          cache: "no-store",
          headers: { "x-monday-session-token": sessionToken },
        },
      );
      const data = (await response.json()) as MondayBulkSyncStatusResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to load bulk sync status");
      }
      const job = data.job ?? null;
      setLatestBulkSyncJob(job);
      if (job?.status === "running") {
        setActiveBulkSyncJobId(job.jobId);
        setSyncingContactIds((prev) => {
          const next = new Set(prev);
          next.add("__bulk_sync__");
          return next;
        });
      }
      return job;
    },
    [sessionToken],
  );

  const startBulkSyncJob = useCallback(
    async (records: MondayRecord[]) => {
      if (!sessionToken) {
        throw new Error("Missing monday session token");
      }
      const dedupedTargetIds = Array.from(
        new Set(
          records
            .map((record) => resolveContactUpdateTargetRecordId(record).trim())
            .filter((id) => id.length > 0),
        ),
      );
      if (dedupedTargetIds.length === 0) {
        throw new Error("No valid contact records selected");
      }
      const response = await fetch("/api/monday/sync/bulk/start", {
        method: "POST",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-monday-session-token": sessionToken,
        },
        body: JSON.stringify({
          contactItemIds: dedupedTargetIds,
          ownerId: identity?.userId,
        }),
      });
      const data = (await response.json()) as MondayBulkSyncStatusResponse;
      if (!response.ok || !data.ok || !data.job) {
        throw new Error(data.error ?? "Failed to start bulk sync");
      }
      finalizedBulkSyncJobIdRef.current = null;
      setLatestBulkSyncJob(data.job);
      setActiveBulkSyncJobId(data.job.jobId);
      setSyncingContactIds((prev) => {
        const next = new Set(prev);
        next.add("__bulk_sync__");
        return next;
      });
      return data.job;
    },
    [identity?.userId, sessionToken],
  );

  const cancelBulkSyncJob = useCallback(
    async (jobId: string) => {
      if (!sessionToken) return;
      const response = await fetch("/api/monday/sync/bulk/cancel", {
        method: "POST",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-monday-session-token": sessionToken,
        },
        body: JSON.stringify({ jobId }),
      });
      const data = (await response.json()) as MondayBulkSyncStatusResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to cancel bulk sync");
      }
      if (data.job) {
        setLatestBulkSyncJob(data.job);
      }
      setActiveBulkSyncJobId(null);
    },
    [sessionToken],
  );

  const retryFailedBulkSyncJob = useCallback(
    async (jobId: string) => {
      if (!sessionToken) {
        throw new Error("Missing monday session token");
      }
      const response = await fetch("/api/monday/sync/bulk/retry", {
        method: "POST",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-monday-session-token": sessionToken,
        },
        body: JSON.stringify({ jobId }),
      });
      const data = (await response.json()) as MondayBulkSyncStatusResponse;
      if (!response.ok || !data.ok || !data.job) {
        throw new Error(data.error ?? "Failed to retry failed contacts");
      }
      finalizedBulkSyncJobIdRef.current = null;
      setLatestBulkSyncJob(data.job);
      setActiveBulkSyncJobId(data.job.jobId);
      setSyncingContactIds((prev) => {
        const next = new Set(prev);
        next.add("__bulk_sync__");
        return next;
      });
      return data;
    },
    [sessionToken],
  );

  useEffect(() => {
    if (!sessionToken || staticMode || !isMondaySettingsAdmin) return;
    void fetchBulkSyncStatus(null)
      .then((job) => {
        if (job && job.status !== "running") {
          finalizedBulkSyncJobIdRef.current = job.jobId;
        }
      })
      .catch(() => null);
  }, [fetchBulkSyncStatus, isMondaySettingsAdmin, sessionToken, staticMode]);

  useEffect(() => {
    if (!sessionToken || !activeBulkSyncJobId) return;
    if (latestBulkSyncJob?.status !== "running") return;

    let cancelled = false;
    let inFlight = false;
    const tick = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        const response = await fetch("/api/monday/sync/bulk/tick", {
          method: "POST",
          cache: "no-store",
          headers: {
            "content-type": "application/json",
            "x-monday-session-token": sessionToken,
          },
          body: JSON.stringify({
            jobId: activeBulkSyncJobId,
            batchSize: 6,
            concurrency: 3,
          }),
        });
        const data = (await response.json()) as MondayBulkSyncStatusResponse;
        if (cancelled) return;
        if (response.ok && data.ok && data.job) {
          setLatestBulkSyncJob(data.job);
          return;
        }
        await fetchBulkSyncStatus(activeBulkSyncJobId);
      } catch {
        // status polling failures are tolerated; next interval retries
      } finally {
        inFlight = false;
      }
    };

    void tick();
    const timer = window.setInterval(() => {
      void tick();
    }, 2_500);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeBulkSyncJobId, fetchBulkSyncStatus, latestBulkSyncJob?.status, sessionToken]);

  useEffect(() => {
    if (!latestBulkSyncJob) return;
    if (latestBulkSyncJob.status === "running") return;
    if (finalizedBulkSyncJobIdRef.current === latestBulkSyncJob.jobId) return;

    finalizedBulkSyncJobIdRef.current = latestBulkSyncJob.jobId;
    setActiveBulkSyncJobId(null);
    setSyncingContactIds((prev) => {
      if (!prev.has("__bulk_sync__")) return prev;
      const next = new Set(prev);
      next.delete("__bulk_sync__");
      return next;
    });

    void (async () => {
      await recordsQuery.refetch();
      if (contactHistoryDialogRecord) {
        await contactUpdatesQuery.refetch();
      }
      if (latestBulkSyncJob.status === "cancelled") {
        toast.error("Bulk sync cancelled");
        return;
      }
      if (latestBulkSyncJob.status === "failed") {
        toast.error(latestBulkSyncJob.lastError ?? "Bulk sync failed");
        return;
      }
      const summary = `${latestBulkSyncJob.succeededContacts}/${latestBulkSyncJob.totalContacts} synced`;
      if (latestBulkSyncJob.failedContacts > 0) {
        toast.error(`${summary} (${latestBulkSyncJob.failedContacts} failed)`);
      } else {
        toast.success(summary);
      }
    })();
  }, [contactHistoryDialogRecord, contactUpdatesQuery, latestBulkSyncJob, recordsQuery]);

  const openQuestionnaireDialogForRecords = useCallback(
    (items: MondayRecord[]) => {
      if (staticMode) {
        toast.error("Unavailable in static mode");
        return;
      }
      if (!sessionToken) {
        toast.error("Missing monday session token");
        return;
      }
      const map = new Map<string, MondayRecord>();
      for (const record of items) {
        const id = resolveContactUpdateTargetRecordId(record);
        if (!id.trim()) continue;
        if (!map.has(id)) {
          map.set(id, record);
        }
      }
      const list = [...map.values()];
      if (list.length === 0) {
        toast.error("No valid contact records");
        return;
      }
      setQuestionnaireDialogRecords(list);
    },
    [sessionToken, staticMode],
  );

  const handleQuestionnaireSaved = useCallback(async () => {
    const refreshedRecordsResult = await recordsQuery.refetch();
    const refreshedRecords = (refreshedRecordsResult.data?.pages ?? []).flatMap(
      (page) => page.records ?? [],
    );
    syncContactHistoryDialogFromRecords(refreshedRecords);
    await contactUpdatesQuery.refetch();
    toast.success("Questionnaire updated");
  }, [contactUpdatesQuery, recordsQuery, syncContactHistoryDialogFromRecords]);

  const callMondayContextApi = async <TData,>(
    query: string,
    variables: Record<string, unknown>,
  ): Promise<TData> => {
    if (typeof monday.api !== "function") {
      throw new Error("Monday client API is unavailable in this context");
    }
    const result = (await monday.api(query, { variables })) as
      | {
        data?: TData;
        errors?: { message?: string | null }[];
      }
      | null
      | undefined;
    const errors = result?.errors ?? [];
    if (errors.length > 0) {
      const message = errors
        .map((entry) => entry.message ?? "")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
        .join(" | ");
      throw new Error(message || "Monday API returned an unknown error");
    }
    if (!result?.data) {
      throw new Error("Monday API returned no data");
    }
    return result.data;
  };

  const resolveMondayContextBoardId = async () => {
    const identityBoardId = identity?.boardId?.trim() ?? "";
    if (identityBoardId.length > 0) return identityBoardId;
    try {
      const contextPayload = (await monday.get("context")) as unknown;
      return extractBoardIdFromContextPayload(contextPayload);
    } catch {
      return "";
    }
  };

  const createMondayRecordUpdateAsContextUser = async (args: {
    itemId: string;
    body: string;
    updateType?: ContactUpdateType;
    date?: string;
    dateTime?: string;
  }) => {
    const itemId = args.itemId.trim();
    const body = args.body.trim();
    if (!itemId || !body) {
      throw new Error("Missing Monday update context");
    }
    const updateType = args.updateType ?? "general";
    const subitemTypeLabel = SUBITEM_TYPE_LABEL_BY_UPDATE_TYPE[updateType];
    const desiredSubitemName = updateType === "general"
      ? "General Update"
      : UPDATE_SUBITEM_NAME_BY_TYPE[updateType];

    const columnValues: Record<string, unknown> = {
      [SUBITEM_TYPE_COLUMN_ID]: { label: subitemTypeLabel },
    };
    const normalizedDateTime = args.dateTime?.trim();
    const parsedDateTime = normalizedDateTime
      ? new Date(normalizedDateTime)
      : null;
    if (parsedDateTime && !Number.isNaN(parsedDateTime.getTime())) {
      columnValues["date0"] = {
        date: parsedDateTime.toISOString().slice(0, 10),
        time: parsedDateTime.toISOString().slice(11, 19),
      };
    } else if (args.date) {
      columnValues["date0"] = { date: args.date };
    }

    interface CreateSubitemData {
      create_subitem?: { id?: string | number | null } | null;
    }
    const createdSubitemData = await callMondayContextApi<CreateSubitemData>(
      `
        mutation CreateSubitem($parentItemId: ID!, $itemName: String!, $columnValues: JSON!) {
          create_subitem(
            parent_item_id: $parentItemId
            item_name: $itemName
            column_values: $columnValues
            create_labels_if_missing: true
          ) { id }
        }
      `,
      {
        parentItemId: itemId,
        itemName: desiredSubitemName,
        columnValues: JSON.stringify(columnValues),
      },
    );
    const createdSubitemIdRaw = createdSubitemData.create_subitem?.id;
    const targetSubitemId =
      createdSubitemIdRaw === null || createdSubitemIdRaw === undefined
        ? ""
        : String(createdSubitemIdRaw).trim();
    if (!targetSubitemId) {
      throw new Error("Failed to create subitem for update");
    }

    // Post the update body on the subitem
    interface CreateUpdateData {
      create_update?: {
        id?: string | number | null;
        body?: string | null;
      } | null;
    }
    const createUpdateData = await callMondayContextApi<CreateUpdateData>(
      `
        mutation CreateMondayItemUpdate($itemId: ID!, $body: String!) {
          create_update(item_id: $itemId, body: $body) { id body }
        }
      `,
      { itemId: targetSubitemId, body },
    );
    const createdUpdateIdRaw = createUpdateData.create_update?.id;
    const createdUpdateId =
      createdUpdateIdRaw === null || createdUpdateIdRaw === undefined
        ? ""
        : String(createdUpdateIdRaw).trim();
    if (!createdUpdateId) {
      throw new Error("Monday did not return a new update id");
    }

    const markApprovalStepDoneViaServer = async (stepColumnId: string) => {
      if (!sessionToken) {
        throw new Error("Missing monday session token for step update");
      }
      const response = await fetch(
        `/api/monday/records/${encodeURIComponent(itemId)}/reset-step`,
        {
          method: "POST",
          cache: "no-store",
          headers: {
            "content-type": "application/json",
            "x-monday-session-token": sessionToken,
          },
          body: JSON.stringify({
            stepColumnId,
            action: "done",
          }),
        },
      );
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Failed to mark onboarding step done");
      }
    };

    let warning: string | null = null;
    let approvalStepMarked = false;
    if (updateType !== "general") {
      const approvalStepColumnId = APPROVAL_STEP_COLUMN_ID_BY_UPDATE_TYPE[updateType];
      if (!approvalStepColumnId) {
        warning = "No onboarding step mapping exists for this update type";
      } else {
        const boardId = await resolveMondayContextBoardId();
        try {
          if (boardId) {
            await callMondayContextApi<{
              change_multiple_column_values?: { id?: string | number | null } | null;
            }>(
              `
                mutation MarkApprovalStepDone(
                  $boardId: ID!
                  $itemId: ID!
                  $columnValues: JSON!
                ) {
                  change_multiple_column_values(
                    board_id: $boardId
                    item_id: $itemId
                    column_values: $columnValues
                    create_labels_if_missing: true
                  ) { id }
                }
              `,
              {
                boardId,
                itemId,
                columnValues: JSON.stringify({
                  [approvalStepColumnId]: { label: "Done" },
                }),
              },
            );
          } else {
            await markApprovalStepDoneViaServer(approvalStepColumnId);
          }
          approvalStepMarked = true;
        } catch (error) {
          if (boardId) {
            try {
              await markApprovalStepDoneViaServer(approvalStepColumnId);
              approvalStepMarked = true;
              warning = null;
            } catch (fallbackError) {
              const primaryMessage =
                error instanceof Error
                  ? error.message
                  : "Failed to mark onboarding step done via monday context";
              const fallbackMessage =
                fallbackError instanceof Error
                  ? fallbackError.message
                  : "Failed to mark onboarding step done via server fallback";
              warning = `${primaryMessage} | ${fallbackMessage}`;
            }
          } else {
            warning =
              error instanceof Error
                ? error.message
                : "Failed to mark onboarding step done";
          }
        }
      }
    }

    return {
      id: createdUpdateId,
      body: createUpdateData.create_update?.body ?? body,
      updateType,
      source: "subitem" as const,
      subitemName: desiredSubitemName,
      approvalStepMarked,
      warning,
    } satisfies NonNullable<MondayCreateRecordUpdateResponse["update"]>;
  };

  const handleCreateContactUpdate = async (
    options?: {
      body?: string;
      updateType?: ContactUpdateType;
      keepSelectedType?: boolean;
      date?: string;
    },
  ) => {
    if (staticMode) {
      toast.error("Updates are unavailable in static mode");
      return;
    }
    if (!sessionToken || !contactHistoryDialogRecord) {
      toast.error("Missing monday session context");
      return;
    }
    const updateType = options?.updateType ?? contactUpdateType;
    const body = (options?.body ?? contactUpdateDraft).trim();
    if (!body) {
      toast.error("Enter an update before posting");
      return;
    }

    setIsCreatingContactUpdate(true);
    try {
      const targetRecordId = resolveContactUpdateTargetRecordId(contactHistoryDialogRecord);
      let data: MondayCreateRecordUpdateResponse;
      if (canCreateUpdatesAsLoggedInMondayUser) {
        const update = await createMondayRecordUpdateAsContextUser({
          itemId: targetRecordId,
          body,
          updateType,
          date: options?.date,
        });
        data = { ok: true, update };
      } else {
        const response = await fetch(
          `/api/monday/records/${encodeURIComponent(targetRecordId)}/updates`,
          {
            method: "POST",
            cache: "no-store",
            headers: {
              "content-type": "application/json",
              "x-monday-session-token": sessionToken,
            },
            body: JSON.stringify({ body, updateType, date: options?.date }),
          },
        );
        data = (await response.json()) as MondayCreateRecordUpdateResponse;
        if (!response.ok || !data.ok) {
          throw new Error(data.error ?? "Failed to post Monday update");
        }
      }

      setContactUpdateDraft("");
      if (!options?.keepSelectedType) {
        setContactUpdateType("general");
      }

      if (sessionToken && contactHistoryDialogRecord && identity?.userId) {
        const contactId = resolveContactUpdateTargetRecordId(contactHistoryDialogRecord);
        fetch("/api/monday/touches", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-monday-session-token": sessionToken,
          },
          body: JSON.stringify({
            contactItemId: contactId,
            contactName: contactHistoryDialogRecord.name ?? "",
            ownerId: identity.userId,
            source: "update",
          }),
        }).catch(() => {});
      }

      const [, refreshedRecordsResult] = await Promise.all([
        contactUpdatesQuery.refetch(),
        recordsQuery.refetch(),
      ]);
      const refreshedRecords = (refreshedRecordsResult.data?.pages ?? []).flatMap(
        (page) => page.records ?? [],
      );
      syncContactHistoryDialogFromRecords(refreshedRecords);
      if (data.update?.warning) {
        toast.success("Update posted to monday.com");
        toast.error(`Onboarding step sync warning: ${data.update.warning}`);
      } else if (data.update?.approvalStepMarked) {
        toast.success("Update posted and onboarding step marked complete");
      } else {
        toast.success("Update posted to monday.com");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to post Monday update";
      toast.error(message);
    } finally {
      setIsCreatingContactUpdate(false);
    }
  };

  const handleBulkQuickActionUpdates = async (
    selectedItems: MondayRecord[],
    clearSelection: () => void,
    action: QuickContactActionButton,
  ) => {
    if (staticMode) {
      toast.error("Bulk updates are unavailable in static mode");
      return;
    }
    if (!sessionToken) {
      toast.error("Missing monday session token");
      return;
    }
    if (selectedItems.length === 0) {
      toast.error("Select at least one record");
      return;
    }

    const targetsByRecordId = new Map<string, MondayRecord>();
    for (const record of selectedItems) {
      const targetRecordId = resolveContactUpdateTargetRecordId(record);
      if (!targetRecordId.trim()) continue;
      if (!targetsByRecordId.has(targetRecordId)) {
        targetsByRecordId.set(targetRecordId, record);
      }
    }
    const targets = Array.from(targetsByRecordId.entries());
    if (targets.length === 0) {
      toast.error("No valid contact records in selection");
      return;
    }

    setBulkQuickActionType(action.type);
    try {
      const results = await Promise.all(
        targets.map(async ([targetRecordId]) => {
          try {
            let data: MondayCreateRecordUpdateResponse;
            if (canCreateUpdatesAsLoggedInMondayUser) {
              const update = await createMondayRecordUpdateAsContextUser({
                itemId: targetRecordId,
                body: action.defaultBody,
                updateType: action.type,
              });
              data = { ok: true, update };
            } else {
              const response = await fetch(
                `/api/monday/records/${encodeURIComponent(targetRecordId)}/updates`,
                {
                  method: "POST",
                  cache: "no-store",
                  headers: {
                    "content-type": "application/json",
                    "x-monday-session-token": sessionToken,
                  },
                  body: JSON.stringify({
                    body: action.defaultBody,
                    updateType: action.type,
                  }),
                },
              );
              data = (await response.json()) as MondayCreateRecordUpdateResponse;
              if (!response.ok || !data.ok) {
                throw new Error(data.error ?? "Failed to post Monday update");
              }
            }
            return {
              ok: true,
              warning: data.update?.warning ?? null,
            };
          } catch (error) {
            return {
              ok: false,
              warning: null,
              error:
                error instanceof Error ? error.message : "Failed to post Monday update",
            };
          }
        }),
      );

      const successCount = results.filter((result) => result.ok).length;
      const warningCount = results.filter((result) => result.warning).length;
      const failed = results.filter((result) => !result.ok);
      const failedCount = failed.length;

      const [, refreshedRecordsResult] = await Promise.all([
        contactHistoryDialogRecord ? contactUpdatesQuery.refetch() : Promise.resolve(null),
        recordsQuery.refetch(),
      ]);
      const refreshedRecords = (refreshedRecordsResult.data?.pages ?? []).flatMap(
        (page) => page.records ?? [],
      );
      syncContactHistoryDialogFromRecords(refreshedRecords);
      clearSelection();

      if (successCount > 0) {
        toast.success(
          `Applied "${action.label}" to ${successCount} record${successCount === 1 ? "" : "s"}.`,
        );
      }
      if (warningCount > 0) {
        toast.error(
          `${warningCount} record${warningCount === 1 ? "" : "s"} had onboarding sync warnings.`,
        );
      }
      if (failedCount > 0) {
        const firstError = failed[0]?.error ?? "Unknown error";
        toast.error(
          `Failed to apply action to ${failedCount} record${failedCount === 1 ? "" : "s"}: ${firstError}`,
        );
      }
    } finally {
      setBulkQuickActionType(null);
    }
  };

  const handleKanbanStepMove = async (move: KanbanMoveConfirmation) => {
    if (staticMode) {
      toast.error("Updates are unavailable in static mode");
      return;
    }
    if (!sessionToken) {
      toast.error("Missing monday session context");
      return;
    }

    setIsExecutingKanbanMove(true);
    try {
      const targetRecordId = resolveContactUpdateTargetRecordId(move.record);

      if (move.direction === "forward") {
        const stepConfig = KANBAN_STEP_CONFIG[move.toStepIndex - 1];
        if (!stepConfig) {
          toast.error("Invalid target step");
          return;
        }

        if (stepConfig.updateType && canCreateUpdatesAsLoggedInMondayUser) {
          await createMondayRecordUpdateAsContextUser({
            itemId: targetRecordId,
            body: stepConfig.defaultBody,
            updateType: stepConfig.updateType,
          });
        } else if (stepConfig.updateType) {
          const response = await fetch(
            `/api/monday/records/${encodeURIComponent(targetRecordId)}/updates`,
            {
              method: "POST",
              cache: "no-store",
              headers: {
                "content-type": "application/json",
                "x-monday-session-token": sessionToken,
              },
              body: JSON.stringify({
                body: stepConfig.defaultBody,
                updateType: stepConfig.updateType,
              }),
            },
          );
          const data = (await response.json()) as MondayCreateRecordUpdateResponse;
          if (!response.ok || !data.ok) {
            throw new Error(data.error ?? "Failed to post Monday update");
          }
        } else {
          if (canCreateUpdatesAsLoggedInMondayUser) {
            const boardId = await resolveMondayContextBoardId();
            await callMondayContextApi<{ create_update?: { id?: string } }>(
              `mutation CreateUpdate($itemId: ID!, $body: String!) { create_update(item_id: $itemId, body: $body) { id } }`,
              { itemId: targetRecordId, body: stepConfig.defaultBody },
            );
            if (boardId) {
              await callMondayContextApi<{
                change_multiple_column_values?: { id?: string } | null;
              }>(
                `mutation MarkStepDone($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
                  change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $columnValues, create_labels_if_missing: true) { id }
                }`,
                {
                  boardId,
                  itemId: targetRecordId,
                  columnValues: JSON.stringify({ [stepConfig.stepColumnId]: { label: "Done" } }),
                },
              );
            }
          } else {
            await fetch(
              `/api/monday/records/${encodeURIComponent(targetRecordId)}/updates`,
              {
                method: "POST",
                cache: "no-store",
                headers: {
                  "content-type": "application/json",
                  "x-monday-session-token": sessionToken,
                },
                body: JSON.stringify({
                  body: stepConfig.defaultBody,
                  updateType: "general",
                }),
              },
            );
            await fetch(
              `/api/monday/records/${encodeURIComponent(targetRecordId)}/reset-step`,
              {
                method: "POST",
                cache: "no-store",
                headers: {
                  "content-type": "application/json",
                  "x-monday-session-token": sessionToken,
                },
                body: JSON.stringify({
                  stepColumnId: stepConfig.stepColumnId,
                  action: "done",
                }),
              },
            );
          }
        }
        toast.success(`Moved "${move.record.name}" forward`);
      } else {
        const stepConfig = KANBAN_STEP_CONFIG[move.fromStepIndex - 1];
        if (!stepConfig) {
          toast.error("Invalid source step");
          return;
        }

        if (canCreateUpdatesAsLoggedInMondayUser) {
          const boardId = await resolveMondayContextBoardId();
          if (boardId) {
            await callMondayContextApi<{
              change_multiple_column_values?: { id?: string } | null;
            }>(
              `mutation ResetStep($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
                change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $columnValues, create_labels_if_missing: true) { id }
              }`,
              {
                boardId,
                itemId: targetRecordId,
                columnValues: JSON.stringify({ [stepConfig.stepColumnId]: { label: "" } }),
              },
            );
          }
        } else {
          const response = await fetch(
            `/api/monday/records/${encodeURIComponent(targetRecordId)}/reset-step`,
            {
              method: "POST",
              cache: "no-store",
              headers: {
                "content-type": "application/json",
                "x-monday-session-token": sessionToken,
              },
              body: JSON.stringify({
                stepColumnId: stepConfig.stepColumnId,
                action: "reset",
              }),
            },
          );
          const data = (await response.json()) as { ok: boolean; error?: string };
          if (!response.ok || !data.ok) {
            throw new Error(data.error ?? "Failed to reset step");
          }
        }
        toast.success(`Moved "${move.record.name}" back`);
      }

      await recordsQuery.refetch();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to move record";
      toast.error(message);
    } finally {
      setIsExecutingKanbanMove(false);
      setKanbanMoveConfirmation(null);
    }
  };

  const handleSaveRetention = async () => {
    if (!sessionToken || !retentionDialogRecord) {
      toast.error("Missing monday session context");
      return;
    }
    if (!window.confirm("Are you sure you want to update retention values?")) {
      return;
    }
    setIsSavingRetention(true);
    try {
      const contactId = retentionDialogRecord.contactId?.trim();
      const targetRecordId =
        contactId && contactId.length > 0
          ? contactId
          : retentionDialogRecord.id;
      const response = await fetch(`/api/monday/records/${targetRecordId}`, {
        method: "PATCH",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-monday-session-token": sessionToken,
        },
        body: JSON.stringify({
          referredToContractors:
            retentionDraft.referredToContractors.length > 0
              ? retentionDraft.referredToContractors
              : null,
          hiredWithContractor: retentionDraft.hiredWithContractor || null,
          hireDate: retentionDraft.hireDate || null,
          retentionPeriod: retentionDraft.retentionPeriod || null,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to update retention values");
      }
      toast.success("Retention values updated");
      setRetentionDialogRecord(null);
      await recordsQuery.refetch();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update retention values";
      toast.error(message);
    } finally {
      setIsSavingRetention(false);
    }
  };

  const handleSaveTags = async () => {
    if (!sessionToken || !tagsDialogRecord) {
      toast.error("Missing monday session context");
      return;
    }
    if (!window.confirm("Are you sure you want to update tags?")) {
      return;
    }
    setIsSavingTags(true);
    try {
      const contactId = tagsDialogRecord.contactId?.trim();
      const targetRecordId =
        contactId && contactId.length > 0 ? contactId : tagsDialogRecord.id;
      const response = await fetch(`/api/monday/records/${targetRecordId}`, {
        method: "PATCH",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-monday-session-token": sessionToken,
        },
        body: JSON.stringify({
          tags: tagsDraft,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to update tags");
      }
      toast.success("Tags updated");
      setTagsDialogRecord(null);
      await recordsQuery.refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update tags";
      toast.error(message);
    } finally {
      setIsSavingTags(false);
    }
  };
  const handleSaveStatus = async () => {
    if (!sessionToken || !statusDialogRecord) {
      toast.error("Missing monday session context");
      return;
    }
    if (!window.confirm("Are you sure you want to update status?")) {
      return;
    }
    setIsSavingStatus(true);
    try {
      const contactId = statusDialogRecord.contactId?.trim();
      const targetRecordId =
        contactId && contactId.length > 0 ? contactId : statusDialogRecord.id;
      const response = await fetch(`/api/monday/records/${targetRecordId}`, {
        method: "PATCH",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-monday-session-token": sessionToken,
        },
        body: JSON.stringify({
          status: statusDraft || null,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to update status");
      }
      toast.success("Status updated");
      setStatusDialogRecord(null);
      await recordsQuery.refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update status";
      toast.error(message);
    } finally {
      setIsSavingStatus(false);
    }
  };
  const handleSaveOwner = async () => {
    if (!sessionToken || !ownerDialogRecord) {
      toast.error("Missing monday session context");
      return;
    }
    if (!window.confirm("Are you sure you want to update owner?")) {
      return;
    }
    setIsSavingOwner(true);
    try {
      const contactId = ownerDialogRecord.contactId?.trim();
      const targetRecordId =
        contactId && contactId.length > 0 ? contactId : ownerDialogRecord.id;
      const response = await fetch(`/api/monday/records/${targetRecordId}`, {
        method: "PATCH",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-monday-session-token": sessionToken,
        },
        body: JSON.stringify({
          ownerId: ownerDraft || null,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to update owner");
      }
      toast.success("Owner updated");
      setOwnerDialogRecord(null);
      await recordsQuery.refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update owner";
      toast.error(message);
    } finally {
      setIsSavingOwner(false);
    }
  };

  const handleUploadResume = async (record: MondayRecord, file: File) => {
    if (!sessionToken) {
      toast.error("Missing monday session context");
      return;
    }
    if (file.size <= 0) {
      toast.error("Please choose a valid file");
      return;
    }

    const contactId = record.contactId?.trim();
    const targetRecordId = contactId && contactId.length > 0 ? contactId : record.id;

    setUploadingResumeByRecordId((prev) => ({
      ...prev,
      [record.id]: true,
    }));
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(
        `/api/monday/records/${encodeURIComponent(targetRecordId)}/resume`,
        {
          method: "POST",
          cache: "no-store",
          headers: {
            "x-monday-session-token": sessionToken,
          },
          body: formData,
        },
      );
      const data = (await response.json()) as MondayResumeUploadResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to upload resume");
      }
      toast.success("Resume uploaded");
      await recordsQuery.refetch();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to upload resume";
      toast.error(message);
    } finally {
      setUploadingResumeByRecordId((prev) => ({
        ...prev,
        [record.id]: false,
      }));
    }
  };

  const getResumeFileHref = (file: {
    assetId: string | null;
    url: string | null;
  }) => {
    if (file.assetId) {
      return `/api/monday/email-templates/assets/${encodeURIComponent(file.assetId)}`;
    }
    if (file.url) return file.url;
    return null;
  };

  const resetAddContactDialog = () => {
    setAddContactStep(1);
    setExistingContactsByEmail([]);
    setIsCheckingDuplicates(false);
    setIsCreatingContact(false);
    setAddContactValues({
      firstName: "",
      lastName: "",
      email: "",
      address: "",
      ownerId: identity?.userId ?? "",
    });
  };

  const handleCreateContact = async () => {
    if (!sessionToken) {
      toast.error("Missing monday session token");
      return;
    }
    setIsCreatingContact(true);
    try {
      const response = await fetch("/api/monday/contacts", {
        method: "POST",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-monday-session-token": sessionToken,
        },
        body: JSON.stringify(addContactValues),
      });
      const data = (await response.json()) as MondayCreateContactResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to create contact");
      }
      toast.success("Contact created");
      setAddContactOpen(false);
      resetAddContactDialog();
      await recordsQuery.refetch();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create contact";
      toast.error(message);
    } finally {
      setIsCreatingContact(false);
    }
  };

  const handleCheckDuplicatesAndContinue = async () => {
    if (!sessionToken) {
      toast.error("Missing monday session token");
      return;
    }
    if (
      !addContactValues.firstName.trim() ||
      !addContactValues.lastName.trim() ||
      !addContactValues.email.trim()
    ) {
      toast.error("First name, last name, and email are required");
      return;
    }
    setIsCheckingDuplicates(true);
    try {
      const params = new URLSearchParams();
      params.set("email", addContactValues.email.trim());
      const response = await fetch(`/api/monday/contacts?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
        headers: { "x-monday-session-token": sessionToken },
      });
      const data = (await response.json()) as MondayContactsLookupResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed duplicate lookup");
      }
      const existing = data.existing ?? [];
      if (existing.length > 0) {
        setExistingContactsByEmail(existing);
        setAddContactStep(2);
        return;
      }
      await handleCreateContact();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed duplicate lookup";
      toast.error(message);
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  const columns: ColumnDefinition<MondayRecord>[] = [
    {
      id: "helpdesk",
      header: "",
      accessorKey: "id",
      minWidth: "36",
      cell: (item: MondayRecord) => (
        <Tooltip>
          <TooltipTrigger asChild>
          <button
            type="button"
              className="flex h-full w-full items-center justify-center p-1 text-muted-foreground transition-colors hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                setHelpDeskLinkedContact(item);
                setHelpDeskOpen(true);
              }}
            >
              <CircleHelp className="h-3.5 w-3.5" />
            </button>
                </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            Submit a support ticket for {item.name}
                </TooltipContent>
              </Tooltip>
      ),
    },
    {
      id: "name",
      header: "Item",
      accessorKey: "name",
      cell: (item: MondayRecord) => (
        <NameCellContent
          item={item}
          tableDensity={tableDensity}
          approvalSteps={approvalSteps}
          hoverPopoversEnabled={boardGeneralSettings.hoverPopoversEnabled}
          onOpen={() => openContactHistoryDialog(item)}
        />
      ),
    },
    {
      id: "statusText",
      header: "District",
      accessorKey: "statusText",
      cell: (item: MondayRecord) => (
        <button
          type="button"
          onClick={() => openStatusDialog(item)}
          className="hover:bg-accent/40 w-full cursor-pointer rounded-md p-2 text-left"
        >
          {item.statusText ? (
            <span
              className={`inline-flex min-w-[86px] items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium ${getDistrictChipClassName(item.statusText)}`}
            >
              {item.statusText}
            </span>
          ) : (
            "—"
          )}
        </button>
      ),
    },
    {
      id: "peopleText",
      header: "Owner",
      accessorKey: "peopleText",
      cell: (item: MondayRecord) => {
        const isCompactOwner = tableDensity === "compact";
        return (
        <button
          type="button"
          onClick={() => openOwnerDialog(item)}
            className={`hover:bg-accent/40 flex w-full cursor-pointer items-center rounded-md text-center ${isCompactOwner ? "justify-start gap-1.5 px-2 py-1" : "justify-center p-2"}`}
        >
          {item.ownerProfiles.length > 0 ? (
              isCompactOwner ? (
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center -space-x-1.5">
                    {item.ownerProfiles.slice(0, 3).map((owner) => (
                      <Avatar
                        key={owner.id}
                        className="size-5 border border-background"
                      >
                        {owner.photoThumb ? (
                          <AvatarImage src={owner.photoThumb} alt={owner.name ?? owner.id} />
                        ) : null}
                        <AvatarFallback className="text-[8px] font-semibold">
                          {getNameInitials(owner.name ?? owner.id)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <span className="truncate text-xs">
                    {item.ownerProfiles
                      .map((owner) => owner.name?.trim() ?? owner.id)
                      .join(", ")}
                  </span>
                </div>
              ) : (
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center justify-center -space-x-2">
                {item.ownerProfiles.slice(0, 3).map((owner) => (
                  <Avatar
                    key={owner.id}
                    className="size-8 border-2 border-background shadow-sm"
                  >
                    {owner.photoThumb ? (
                      <AvatarImage src={owner.photoThumb} alt={owner.name ?? owner.id} />
                    ) : null}
                    <AvatarFallback className="text-xs font-semibold">
                      {getNameInitials(owner.name ?? owner.id)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="line-clamp-2 max-w-[180px] text-[11px] leading-tight">
                {item.ownerProfiles
                  .map((owner) => owner.name?.trim() ?? owner.id)
                  .join(", ")}
              </span>
            </div>
              )
          ) : (
            <span className="text-xs">{item.peopleText ?? "—"}</span>
          )}
        </button>
        );
      },
    },
    {
      id: "retention",
      header: "Retention",
      accessorKey: "referredToContractors",
      cell: (item: MondayRecord) => {
        const referredValues = splitCsvValues(item.referredToContractors);
        const MAX_VISIBLE = 2;
        const visibleReferred = referredValues.slice(0, MAX_VISIBLE);
        const extraReferred = referredValues.length - MAX_VISIBLE;
        const isCompact = tableDensity === "compact";

        if (isCompact) {
        return (
          <button
            type="button"
            onClick={() => openRetentionDialog(item)}
              title={[
                referredValues.length > 0 ? `Referred: ${referredValues.join(", ")}` : null,
                item.hiredWithContractor?.trim() ? `Hired: ${item.hiredWithContractor.trim()}` : null,
                item.hireDate ? `Date: ${formatUpdatedAt(item.hireDate)}` : null,
                item.retentionPeriod?.trim() ? `Period: ${item.retentionPeriod.trim()}` : null,
              ].filter(Boolean).join(" · ")}
              className="hover:bg-accent/40 flex w-full min-w-[280px] max-w-[520px] cursor-pointer items-center gap-x-3 overflow-hidden rounded-md px-2 py-1 text-left"
            >
              <span className="flex min-w-0 items-center gap-1 overflow-hidden text-xs">
                <span className="shrink-0 font-medium">Referred:</span>
                <span className={`truncate ${referredValues.length > 0 ? "" : "text-muted-foreground"}`}>
                  {referredValues.length > 0 ? referredValues.join(", ") : "—"}
                </span>
              </span>
              <span className="flex min-w-0 items-center gap-1 overflow-hidden text-xs">
                <span className="shrink-0 font-medium">Hired:</span>
                <span className={`truncate ${item.hiredWithContractor?.trim() ? "" : "text-muted-foreground"}`}>
                  {item.hiredWithContractor?.trim() || "—"}
                </span>
              </span>
              <span className="flex min-w-0 items-center gap-1 overflow-hidden text-xs">
                <span className="shrink-0 font-medium">Date:</span>
                <span className={`truncate ${item.hireDate ? "" : "text-muted-foreground"}`}>
                  {item.hireDate ? formatUpdatedAt(item.hireDate) : "—"}
                </span>
              </span>
              <span className="flex min-w-0 items-center gap-1 overflow-hidden text-xs">
                <span className="shrink-0 font-medium">Period:</span>
                <span className={`truncate ${item.retentionPeriod?.trim() ? "" : "text-muted-foreground"}`}>
                  {item.retentionPeriod?.trim() || "—"}
                </span>
              </span>
            </button>
          );
        }

        return (
          <button
            type="button"
            onClick={() => openRetentionDialog(item)}
            className="hover:bg-accent/40 flex w-full min-w-[100px] max-w-[340px] cursor-pointer flex-col items-start gap-1 rounded-md p-2 text-left"
          >
            <div className="flex w-full min-w-0 items-center gap-1 overflow-hidden">
              <span className="shrink-0 text-xs font-medium">Referred:</span>
              {referredValues.length > 0 ? (
                <>
                  {visibleReferred.map((value) => (
                    <BusinessInfoHoverCard key={value} companyName={value}>
                      <Badge
                        variant="secondary"
                        className="max-w-[100px] shrink-0 cursor-help truncate text-[10px]"
                        title={value}
                      >
                        {value}
                      </Badge>
                    </BusinessInfoHoverCard>
                  ))}
                  {extraReferred > 0 && (
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      +{extraReferred}
                    </Badge>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )}
            </div>
            <div className="flex w-full min-w-0 items-center gap-1 overflow-hidden">
              <span className="shrink-0 text-xs font-medium">Hired With:</span>
              {item.hiredWithContractor?.trim() ? (
                <BusinessInfoHoverCard companyName={item.hiredWithContractor}>
                  <Badge
                    variant="secondary"
                    className="max-w-[120px] shrink-0 cursor-help truncate text-[10px]"
                    title={item.hiredWithContractor}
                  >
                    {item.hiredWithContractor}
                  </Badge>
                </BusinessInfoHoverCard>
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )}
            </div>
            <div className="flex w-full min-w-0 items-center gap-1 overflow-hidden">
              <span className="shrink-0 text-xs font-medium">Hire Date:</span>
              <span className="truncate text-xs">
              {item.hireDate ? formatUpdatedAt(item.hireDate) : "—"}
            </span>
            </div>
            <div className="flex w-full min-w-0 items-center gap-1 overflow-hidden">
              <span className="shrink-0 text-xs font-medium">Period:</span>
              <span className="truncate text-xs">{item.retentionPeriod ?? "—"}</span>
            </div>
          </button>
        );
      },
    },
    {
      id: "tags",
      header: "Tags",
      accessorKey: "tags",
      cell: (item: MondayRecord) => {
        const tagValues = splitCsvValues(item.tags);
        const isCompactTags = tableDensity === "compact";
        return (
          <button
            type="button"
            onClick={() => openTagsDialog(item)}
            title={item.tags ?? ""}
            className={`hover:bg-accent/40 w-full cursor-pointer rounded-md text-left ${isCompactTags ? "px-2 py-1" : "p-2"}`}
          >
            {tagValues.length > 0 ? (
              <div className={`flex gap-1 ${isCompactTags ? "min-w-[200px] max-w-[400px] flex-nowrap overflow-hidden" : "max-w-[260px] flex-wrap"}`}>
                {tagValues.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="max-w-full shrink-0 truncate text-[10px]"
                    title={tag}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground text-xs">—</span>
            )}
          </button>
        );
      },
    },
    {
      id: "resume",
      header: "Resume",
      accessorKey: "resumeFiles",
      cell: (item: MondayRecord) => {
        const firstFile = item.resumeFiles[0] ?? null;
        const isUploading = uploadingResumeByRecordId[item.id] === true;
        const fileHref = firstFile ? getResumeFileHref(firstFile) : null;
        const fileInputId = `resume-upload-${item.id}`;
        return (
          <div className="flex items-center gap-2 px-2 py-1">
            {firstFile ? (
              <button
                type="button"
                onClick={() => {
                  if (!fileHref) {
                    toast.error("Unable to open resume file");
                    return;
                  }
                  setResumePreview({
                    fileName: firstFile.name,
                    href: fileHref,
                    recordName: item.name,
                  });
                }}
                className="text-primary hover:text-primary/80 min-w-0 truncate text-xs underline underline-offset-2"
                title={firstFile.name}
              >
                {firstFile.name}
              </button>
            ) : (
              <span className="text-muted-foreground text-xs">—</span>
            )}
              <input
              id={fileInputId}
                type="file"
              className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void handleUploadResume(item, file);
                  event.currentTarget.value = "";
                }}
                disabled={isUploading || staticMode}
              />
              {isUploading ? (
              <span className="text-muted-foreground shrink-0 text-[10px]">Uploading…</span>
            ) : (
              <label
                htmlFor={fileInputId}
                className="bg-muted hover:bg-accent text-muted-foreground hover:text-foreground inline-flex shrink-0 cursor-pointer items-center rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors"
              >
                {firstFile ? "Replace" : "Upload"}
              </label>
            )}
          </div>
        );
      },
    },
    {
      id: "createdAt",
      header: "Created at",
      accessorKey: "createdAt",
      sortable: true,
      cell: (item: MondayRecord) => {
        const formatted = formatDateTimeParts(item.createdAt);
        return (
          <div className="leading-tight">
            <div>{formatted.date}</div>
            {formatted.time ? (
              <div className="text-muted-foreground text-xs">{formatted.time}</div>
            ) : null}
          </div>
        );
      },
    },
    {
      id: "updatedAt",
      header: "Updated",
      accessorKey: "updatedAt",
      sortable: true,
      cell: (item: MondayRecord) => {
        const formatted = formatDateTimeParts(item.updatedAt);
        return (
          <div className="leading-tight">
            <div>{formatted.date}</div>
            {formatted.time ? (
              <div className="text-muted-foreground text-xs">{formatted.time}</div>
            ) : null}
          </div>
        );
      },
    },
  ];

  const entityActions: EntityAction<MondayRecord>[] = [
    {
      id: "open",
      label: "Open",
      icon: <ExternalLink className="h-4 w-4" />,
      variant: "outline",
      onClick: (record) => {
        if (!record.url) return;
        window.open(record.url, "_blank", "noopener,noreferrer");
      },
      isDisabled: (record) => !record.url,
    },
    ...(featureFlags.emailMarketingEnabled
      ? ([
    {
      id: "send-email",
      label: "Send Email",
      icon: <Mail className="h-4 w-4" />,
      variant: "secondary",
          onClick: (record: MondayRecord) => {
        openSendEmailDialog(record);
      },
          isDisabled: (record: MondayRecord) =>
            !record.email || !sessionToken || staticMode,
    },
      ] satisfies EntityAction<MondayRecord>[])
      : []),

  ];

  return (
    <GuidedTourProvider>
    <UserSettingsProvider settings={boardGeneralSettings}>
    <div className="monday-like-page mx-auto space-y-3 pb-10">
      <div
        data-board-filter-bar
        className={`sticky top-0 z-50 rounded-lg border px-2 py-1.5 ${boardThemeStyles.shellCardClassName}`}
        style={boardThemeInlineStyles.shellCardStyle}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          {/* Search */}
          <div data-tour="search" className="relative min-w-0 flex-1">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              placeholder="Search (2+ chars)…"
              className="bg-background h-8 w-full text-xs shadow-sm"
              />
              {search.trim().length > 0 && search.trim().length < 2 ? (
              <p className="text-muted-foreground absolute -bottom-4 left-0 text-[10px]">
                2+ chars needed
                </p>
              ) : null}
            </div>

          <div className="bg-border/60 h-5 w-px shrink-0" />

          {/* Owner + district filters */}
          <div data-tour="filters" className="flex items-center gap-1.5">
                <select
                  value={ownerFilter || "__all_owner__"}
                  onChange={(event) => {
                    if (!isOwnerFilterEditable) return;
                    const value = event.target.value;
                    setOwnerFilter(value === "__all_owner__" ? "" : value);
                  }}
            className="bg-background border-input h-8 shrink-0 rounded-md border px-2 text-xs shadow-sm"
            style={{ maxWidth: "160px" }}
                  disabled={!isOwnerFilterEditable}
                >
                  {isOwnerFilterEditable ? (
                    <option value="__all_owner__">Owner: all</option>
                  ) : (
              <option value={ownerFilter || forcedOwnerId || "__all_owner__"}>
                {lockedOwnerLabel}
              </option>
                  )}
                  {!ownerOptionHasSelectedValue && ownerFilter.trim().length > 0 ? (
                    <option value={ownerFilter}>{`Owner ${ownerFilter} (selected)`}</option>
                  ) : null}
                  {ownerOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={statusFilter || "__all_status__"}
                  onChange={(event) => {
                    const value = event.target.value;
                    setStatusFilter(value === "__all_status__" ? "" : value);
                  }}
            className="bg-background border-input h-8 shrink-0 rounded-md border px-2 text-xs shadow-sm"
            style={{ maxWidth: "150px" }}
                >
                  <option value="__all_status__">District: all</option>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 shrink-0 px-2.5" title="Advanced Filters">
                <Filter className="h-3.5 w-3.5" />
                {activeAdvancedFilterConditions.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 py-0 leading-none text-[10px]">
                    {activeAdvancedFilterConditions.length}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[88vh] max-w-4xl overflow-hidden border-2 border-border/80 bg-linear-to-b from-background to-muted/20 p-0 shadow-xl">
              <DialogHeader className="border-b-2 border-border/70 bg-muted/35 px-6 py-4">
                <DialogTitle>Advanced Filters</DialogTitle>
                <DialogDescription>
                  Build multi-condition logic, preview result count, and save presets per
                  owner board.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5 overflow-y-auto px-6 py-5">
                <div className="grid gap-3 rounded-md border-2 border-border/70 bg-card/70 p-3 shadow-sm md:grid-cols-[1fr_auto] md:items-center">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="border border-border/60 bg-primary/10 text-xs">
                      {activeAdvancedFilterConditions.length} active
                    </Badge>
                    <Badge variant="outline" className="border-border/70 bg-background/80 text-xs">
                      {advancedFilterConditions.length} total
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      Showing {filteredRecords.length} of {records.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="advanced-filter-match-mode"
                      className="text-muted-foreground text-xs font-medium"
                    >
                      Match mode
                    </label>
                    <select
                      id="advanced-filter-match-mode"
                      value={advancedFilterMatchMode}
                      onChange={(event) => {
                        const value = event.target.value === "any" ? "any" : "all";
                        setActiveSavedAdvancedFilterId(null);
                        setAdvancedFilterMatchMode(value);
                      }}
                      className="border-input h-8 rounded-md border-2 bg-background px-2 text-sm shadow-sm"
                    >
                      <option value="all">Match all conditions</option>
                      <option value="any">Match any condition</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border-2 border-border/70 bg-muted/15 p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">Conditions</p>
                      <p className="text-muted-foreground text-xs">
                        Add or remove conditions that run against Monday board columns.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                        className="h-8 border-2 px-3 text-xs shadow-sm"
                        onClick={handleAddAdvancedFilterCondition}
                      >
                        Add condition
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-3 text-xs"
                        onClick={handleClearAdvancedFilters}
                        disabled={advancedFilterConditions.length === 0}
                      >
                        Clear all
                      </Button>
                    </div>
                  </div>

                  {advancedFilterConditions.length === 0 ? (
                    <div className="rounded-md border-2 border-dashed border-border/70 bg-background/70 p-4 text-center">
                      <p className="text-muted-foreground text-sm">
                        No conditions yet. Add a condition to start filtering records.
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                      {advancedFilterConditions.map((condition, index) => {
                        const conditionTarget = getBoardColumnTargetForCondition(condition);
                        const boardColumnKind =
                          boardColumnFilterKindByLabel.get(conditionTarget) ?? "text";
                        const operatorOptions =
                          boardColumnKind === "date"
                            ? ADVANCED_DATE_OPERATORS
                            : ADVANCED_TEXT_OPERATORS;
                        const shouldHideValueInput =
                          condition.operator === "is_empty" ||
                          condition.operator === "is_not_empty";
                        const isDateField = boardColumnKind === "date";
                        const targetLabelLower = conditionTarget.toLowerCase();
                        const usesOwnerOptions =
                          targetLabelLower === "owner" && ownerOptions.length > 0;
                        const usesDistrictOptions =
                          (targetLabelLower === "status" ||
                            targetLabelLower === "district") &&
                          statusOptions.length > 0;
                        const hasBoardColumnOptions = boardColumnFilterOptions.length > 0;
                        return (
                          <div
                            key={condition.id}
                            className={`space-y-2 overflow-hidden rounded-md border-2 shadow-sm ${index % 2 === 0
                              ? "border-border/75 bg-background"
                              : "border-border/75 bg-muted/25"
                              }`}
                          >
                            <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-3 py-2">
                              <p className="text-[11px] font-semibold tracking-wide text-foreground/80 uppercase">
                                Condition {index + 1}
                              </p>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                onClick={() => handleRemoveAdvancedFilterCondition(condition.id)}
                              >
                                Remove
                              </Button>
                            </div>
                            <div className="flex flex-wrap items-end gap-2 px-3 pb-3">
                              <label className="space-y-1">
                                <span className="text-muted-foreground block text-[11px] font-medium tracking-wide uppercase">
                                  Column
                                </span>
                                <select
                                  value={conditionTarget}
                                  onChange={(event) =>
                                    handleChangeAdvancedFilterTarget(
                                      condition.id,
                                      event.target.value,
                                    )
                                  }
                                  className="border-input h-8 min-w-[220px] rounded-md border-2 bg-background/95 px-2 text-sm shadow-sm"
                                >
                                  {!hasBoardColumnOptions ? (
                                    <option value="">No board columns loaded</option>
                                  ) : null}
                                  {hasBoardColumnOptions ? (
                                    <option value="">Select board column</option>
                                  ) : null}
                                  {boardColumnFilterOptions.map((label) => (
                                    <option key={label} value={label}>
                                      {label}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label className="space-y-1">
                                <span className="text-muted-foreground block text-[11px] font-medium tracking-wide uppercase">
                                  Operator
                                </span>
                                <select
                                  value={condition.operator}
                                  onChange={(event) => {
                                    if (!isAdvancedFilterOperator(event.target.value)) return;
                                    handleChangeAdvancedFilterOperator(
                                      condition.id,
                                      event.target.value,
                                    );
                                  }}
                                  className="border-input h-8 rounded-md border-2 bg-background/95 px-2 text-sm shadow-sm"
                                >
                                  {operatorOptions.map((operator) => (
                                    <option key={operator} value={operator}>
                                      {ADVANCED_OPERATOR_LABELS[operator]}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              {!shouldHideValueInput ? (
                                <label className="space-y-1">
                                  <span className="text-muted-foreground block text-[11px] font-medium tracking-wide uppercase">
                                    Value
                                  </span>
                                  {usesOwnerOptions ? (
                                    <select
                                      value={condition.value}
                                      onChange={(event) =>
                                        handleChangeAdvancedFilterValue(
                                          condition.id,
                                          event.target.value,
                                        )
                                      }
                                      className="border-input h-8 min-w-[220px] rounded-md border-2 bg-background/95 px-2 text-sm shadow-sm"
                                    >
                                      <option value="">Select owner</option>
                                      {!ownerOptions.some(
                                        (option) => option.value === condition.value,
                                      ) && condition.value.trim().length > 0 ? (
                                        <option value={condition.value}>
                                          {`Owner ${condition.value} (selected)`}
                                        </option>
                                      ) : null}
                                      {ownerOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  ) : usesDistrictOptions ? (
                                    <select
                                      value={condition.value}
                                      onChange={(event) =>
                                        handleChangeAdvancedFilterValue(
                                          condition.id,
                                          event.target.value,
                                        )
                                      }
                                      className="border-input h-8 min-w-[200px] rounded-md border-2 bg-background/95 px-2 text-sm shadow-sm"
                                    >
                                      <option value="">Select district</option>
                                      {!statusOptions.some(
                                        (option) => option.value === condition.value,
                                      ) && condition.value.trim().length > 0 ? (
                                        <option value={condition.value}>
                                          {`District ${condition.value} (selected)`}
                                        </option>
                                      ) : null}
                                      {statusOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <Input
                                      type={isDateField ? "date" : "text"}
                                      value={condition.value}
                                      onChange={(event) =>
                                        handleChangeAdvancedFilterValue(
                                          condition.id,
                                          event.target.value,
                                        )
                                      }
                                      placeholder="Value"
                                      className="h-8 min-w-[200px] border-2 bg-background/95 text-sm shadow-sm"
                                    />
                                  )}
                                </label>
                              ) : (
                                <div className="pb-1">
                                  <p className="text-muted-foreground text-xs">
                                    No value input required for this operator.
                                  </p>
                                </div>
                              )}

                              {condition.operator === "between" ? (
                                <label className="space-y-1">
                                  <span className="text-muted-foreground block text-[11px] font-medium tracking-wide uppercase">
                                    {isDateField ? "End date" : "Second value"}
                                  </span>
                                  <Input
                                    type={isDateField ? "date" : "text"}
                                    value={condition.valueTo}
                                    onChange={(event) =>
                                      handleChangeAdvancedFilterValueTo(
                                        condition.id,
                                        event.target.value,
                                      )
                                    }
                                    placeholder={isDateField ? "End date" : "Second value"}
                                    className="h-8 min-w-[200px] border-2 bg-background/95 text-sm shadow-sm"
                                  />
                                </label>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-3 rounded-lg border-2 border-primary/25 bg-primary/5 p-4 shadow-sm">
                  <div>
                    <p className="text-sm font-medium">Saved Presets</p>
                    <p className="text-muted-foreground text-xs">
                      Save the active filter setup and reuse it for this owner board.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      value={pendingSavedAdvancedFilterName}
                      onChange={(event) => setPendingSavedAdvancedFilterName(event.target.value)}
                      placeholder="Saved filter name"
                      className="h-8 w-full max-w-xs border-2 bg-background/95 text-sm shadow-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 border-2 px-3 text-xs shadow-sm"
                      onClick={handleSaveAdvancedFilterPreset}
                      disabled={
                        isSavingAdvancedFilterPreset ||
                        !sessionToken ||
                        presetScopeOwnerId.length === 0
                      }
                    >
                      {isSavingAdvancedFilterPreset ? "Saving..." : "Save preset"}
                    </Button>
                  </div>
                  {presetScopeOwnerId.length === 0 ? (
                    <p className="text-muted-foreground text-xs">
                      Select an owner board to enable preset saving.
                    </p>
                  ) : null}

                  {savedAdvancedFilterPresets.length > 0 ? (
                    <div className="flex max-h-40 flex-wrap items-center gap-1.5 overflow-y-auto pr-1">
                      {savedAdvancedFilterPresets.map((preset) => (
                        <div
                          key={preset.id}
                          className="bg-background/95 flex items-center rounded-md border-2 border-border/70 pr-1 shadow-sm"
                        >
                          <Button
                            size="sm"
                            variant={
                              activeSavedAdvancedFilterId === preset.id ? "default" : "ghost"
                            }
                            className="h-8 rounded-r-none px-2 text-xs"
                            onClick={() => handleApplySavedAdvancedFilterPreset(preset)}
                          >
                            {preset.name}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-muted-foreground h-8 px-1.5 text-xs"
                            onClick={() => handleDeleteSavedAdvancedFilterPreset(preset.id)}
                            disabled={!!deletingAdvancedFilterPresetIds[preset.id]}
                          >
                            {deletingAdvancedFilterPresetIds[preset.id] ? "..." : "X"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      No saved filter presets yet.
                    </p>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className="bg-border/60 h-5 w-px shrink-0" />

          {/* Month navigation */}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 shrink-0 px-2"
                  onClick={() => {
              setActiveMonth(
                (prev) =>
                  new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() - 1, 1)),
              );
            }}
          >
            <ChevronLeft className="h-4 w-4" />
                </Button>
          <Badge variant="outline" className="h-8 shrink-0 rounded-sm px-2.5 text-xs whitespace-nowrap">
            {monthBounds.label}
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 shrink-0 px-2"
            onClick={() => {
              setActiveMonth(
                (prev) =>
                  new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() + 1, 1)),
              );
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

                {viewMode === "userScoped" ? (
            <>
              <div className="bg-border/60 h-5 w-px shrink-0" />
                  <Button
                    size="sm"
                    variant="default"
                className="h-8 shrink-0 px-2.5"
                    onClick={() => {
                      resetAddContactDialog();
                      setAddContactOpen(true);
                    }}
                    disabled={authLoading || !identity?.userId}
                  >
                    <UserPlus className="mr-1.5 h-4 w-4" />
                Add
                  </Button>
              <div data-tour="view-toggle" className="flex overflow-hidden rounded-md border shrink-0">
                <button
                  type="button"
                  onClick={() => setUserScopedDisplayMode("table")}
                  className={`flex h-8 w-8 items-center justify-center transition-colors ${userScopedDisplayMode === "table" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                  title="Table view"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setUserScopedDisplayMode("grid")}
                  className={`flex h-8 w-8 items-center justify-center transition-colors ${userScopedDisplayMode === "grid" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                  title="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setUserScopedDisplayMode("kanban")}
                  className={`flex h-8 w-8 items-center justify-center transition-colors ${userScopedDisplayMode === "kanban" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                  title="Kanban view"
                >
                  <Columns3 className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-border/60 h-5 w-px shrink-0" />
              <div className="flex overflow-hidden rounded-md border shrink-0">
                <button
                  type="button"
                  onClick={() => setUserScopedDisplayMode("table")}
                  className={`flex h-8 w-8 items-center justify-center transition-colors ${userScopedDisplayMode === "table" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                  title="Table view"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setUserScopedDisplayMode("kanban")}
                  className={`flex h-8 w-8 items-center justify-center transition-colors ${userScopedDisplayMode === "kanban" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                  title="Kanban view"
                >
                  <Columns3 className="h-4 w-4" />
                </button>
              </div>
            </>
          )}

          <div className="bg-border/60 h-5 w-px shrink-0" />

          {/* Reload */}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 shrink-0 px-2"
            title="Reload"
            onClick={() => {
              if (staticMode) return;
              void recordsQuery.refetch();
            }}
            disabled={staticMode || recordsQuery.isFetching}
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>

                {!staticMode && recordsQuery.hasNextPage && !shouldAutoLoadMore ? (
                  <Button
                    size="sm"
                    variant="secondary"
              className="h-8 shrink-0 px-2.5 text-xs"
                    onClick={() => {
                      handleLoadMoreRecords();
                    }}
                    disabled={recordsQuery.isFetchingNextPage}
                  >
              {recordsQuery.isFetchingNextPage ? "Loading…" : "Load more"}
                  </Button>
                ) : null}

          <div data-tour="toolbar-actions" className="flex items-center gap-0.5">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 shrink-0 px-2"
            title="Help Desk"
            onClick={() => {
              setHelpDeskLinkedContact(null);
              setHelpDeskOpen(true);
            }}
          >
            <CircleHelp className="h-4 w-4" />
                </Button>

                <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                  <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 shrink-0 px-2" title="Settings">
                <Settings className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
            <DialogContent className="h-[88vh] max-w-4xl overflow-scroll border-2 border-border/80 bg-linear-to-b from-background to-muted/20 p-0 shadow-xl flex flex-col">
              <DialogHeader className="border-b-2 border-border/70 bg-muted/35 px-6 py-4">
                      <DialogTitle>Monday Settings</DialogTitle>
                    </DialogHeader>
              <Tabs defaultValue="general-settings" className="flex h-full flex-1 flex-col">
                <div className="border-b-2 border-border/60 bg-card/70 px-6 py-3">
                  <TabsList className="h-auto w-full justify-start gap-1.5 overflow-x-auto rounded-md border-2 border-border/70 bg-background/70 p-1">
                        <TabsTrigger
                      value="general-settings"
                      className="h-8 shrink-0 whitespace-nowrap rounded-md border border-transparent px-3 text-xs font-medium data-[state=active]:border-border/70 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                        >
                      General Settings
                        </TabsTrigger>
                        <TabsTrigger
                          value="email-settings"
                      className="h-8 shrink-0 whitespace-nowrap rounded-md border border-transparent px-3 text-xs font-medium data-[state=active]:border-border/70 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                        >
                          Email Settings
                        </TabsTrigger>
                    <TabsTrigger
                      value="email-templates"
                      className="h-8 shrink-0 whitespace-nowrap rounded-md border border-transparent px-3 text-xs font-medium data-[state=active]:border-border/70 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                      Email Templates
                        </TabsTrigger>
                        <TabsTrigger
                          value="user-zip-map"
                      className="h-8 shrink-0 whitespace-nowrap rounded-md border border-transparent px-3 text-xs font-medium data-[state=active]:border-border/70 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                        >
                          User {"<->"} Zipcode map
                        </TabsTrigger>
                    <TabsTrigger
                      value="feature-flags"
                      className="h-8 shrink-0 whitespace-nowrap rounded-md border border-transparent px-3 text-xs font-medium data-[state=active]:border-border/70 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                      Feature Flags
                        </TabsTrigger>
                    {isMasterAdmin ? (
                      <TabsTrigger
                        value="monthly-board-mapping"
                        className="h-8 shrink-0 whitespace-nowrap rounded-md border border-transparent px-3 text-xs font-medium data-[state=active]:border-border/70 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                      >
                        Monthly Board Mapping
                      </TabsTrigger>
                    ) : null}
                    {isMasterAdmin ? (
                      <TabsTrigger
                        value="platform-settings"
                        className="h-8 shrink-0 whitespace-nowrap rounded-md border border-transparent px-3 text-xs font-medium data-[state=active]:border-border/70 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                      >
                        Platform Settings
                      </TabsTrigger>
                    ) : null}
                      </TabsList>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  <div className="min-h-80 flex-1 rounded-lg border-2 border-border/70 bg-background/90 p-4 shadow-sm">
                    <TabsContent value="general-settings" className="mt-0">
                      <div className="space-y-0 divide-y divide-border/60">

                        {/* Header row */}
                        <div className="flex items-center justify-between pb-4">
                          <div>
                            <p className="text-sm font-semibold">Appearance</p>
                            <p className="text-muted-foreground text-xs">
                              Scope: {presetScopeOwnerId.length > 0 ? `Owner ${presetScopeOwnerId}` : "No owner selected"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setBoardGeneralSettingsDraft(boardGeneralSettings);
                              }}
                              disabled={!hasUnsavedBoardGeneralSettings}
                            >
                              Reset
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                void handleSaveBoardGeneralSettings();
                              }}
                              disabled={
                                isSavingBoardGeneralSettings ||
                                !sessionToken ||
                                presetScopeOwnerId.length === 0 ||
                                !hasUnsavedBoardGeneralSettings
                              }
                            >
                              {isSavingBoardGeneralSettings ? "Saving…" : "Save"}
                            </Button>
                          </div>
                        </div>

                        {/* Color Theme */}
                        <div className="flex items-center justify-between py-3.5">
                          <div className="min-w-0 flex-1 pr-6">
                            <p className="text-sm font-medium">Color Theme</p>
                            <p className="text-muted-foreground text-xs">
                              {USER_BOARD_COLOR_THEME_OPTIONS.find(
                                (o) => o.value === boardGeneralSettingsDraft.colorTheme,
                              )?.description ?? "Board accent and filter bar styling."}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1.5">
                            {USER_BOARD_COLOR_THEME_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                title={option.label}
                                onClick={() => {
                                  setBoardGeneralSettingsDraft((prev) => ({
                                    ...prev,
                                    colorTheme: option.value,
                                  }));
                                }}
                                className={`h-7 w-7 rounded-full transition-all ${option.swatchClassName} ${boardGeneralSettingsDraft.colorTheme === option.value
                                  ? "ring-2 ring-offset-2 ring-primary scale-110"
                                  : "opacity-60 hover:opacity-100 hover:scale-105"
                                  }`}
                                style={
                                  option.value === "custom"
                                    ? {
                                      backgroundColor:
                                        boardGeneralSettingsDraft.customTheme?.colorHex ??
                                        "#0ea5e9",
                                      opacity:
                                        boardGeneralSettingsDraft.customTheme?.alpha ?? 0.22,
                                    }
                                    : undefined
                                }
                              />
                            ))}
                          </div>
                        </div>

                        {boardGeneralSettingsDraft.colorTheme === "custom" ? (
                          <div className="rounded-md border p-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="space-y-1.5">
                                <span className="text-sm font-medium">Custom Color</span>
                                <input
                                  type="color"
                                  value={
                                    boardGeneralSettingsDraft.customTheme?.colorHex ?? "#0ea5e9"
                                  }
                                  onChange={(event) => {
                                    const nextHex = event.target.value;
                                    setBoardGeneralSettingsDraft((prev) => ({
                                      ...prev,
                                      customTheme: parseUserBoardCustomTheme({
                                        colorHex: nextHex,
                                        alpha: prev.customTheme?.alpha,
                                      }),
                                    }));
                                  }}
                                  className="h-10 w-full cursor-pointer rounded border bg-transparent p-1"
                                />
                              </label>
                              <label className="space-y-1.5">
                                <span className="text-sm font-medium">Transparency</span>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  step={1}
                                  value={Math.round(
                                    (boardGeneralSettingsDraft.customTheme?.alpha ?? 0.22) * 100,
                                  )}
                                  onChange={(event) => {
                                    const nextAlpha = Number(event.target.value) / 100;
                                    setBoardGeneralSettingsDraft((prev) => ({
                                      ...prev,
                                      customTheme: parseUserBoardCustomTheme({
                                        colorHex: prev.customTheme?.colorHex,
                                        alpha: nextAlpha,
                                      }),
                                    }));
                                  }}
                                  className="w-full"
                                />
                                <p className="text-muted-foreground text-xs">
                                  {Math.round(
                                    (boardGeneralSettingsDraft.customTheme?.alpha ?? 0.22) * 100,
                                  )}
                                  % opacity
                                </p>
                              </label>
                            </div>
                          </div>
                        ) : null}

                        {/* Font Size */}
                        <div className="flex items-center justify-between py-3.5">
                          <div className="min-w-0 flex-1 pr-6">
                            <p className="text-sm font-medium">Font Size</p>
                            <p className="text-muted-foreground text-xs">Scale the board text and action buttons.</p>
                          </div>
                          <div className="flex shrink-0 overflow-hidden rounded-md border">
                            {USER_BOARD_FONT_SIZE_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                  setBoardGeneralSettingsDraft((prev) => ({
                                    ...prev,
                                    fontSize: option.value,
                                  }));
                                }}
                                className={`h-8 px-3 text-xs font-medium transition-colors ${boardGeneralSettingsDraft.fontSize === option.value
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-background text-muted-foreground hover:bg-muted"
                                  }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Table Density */}
                        <div className="flex items-center justify-between py-3.5">
                          <div className="min-w-0 flex-1 pr-6">
                            <p className="text-sm font-medium">Row Density</p>
                            <p className="text-muted-foreground text-xs">
                              {USER_BOARD_TABLE_DENSITY_OPTIONS.find(
                                (o) => o.value === boardGeneralSettingsDraft.tableDensity,
                              )?.description}
                            </p>
                          </div>
                          <div className="flex shrink-0 overflow-hidden rounded-md border">
                            {USER_BOARD_TABLE_DENSITY_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                  setBoardGeneralSettingsDraft((prev) => ({
                                    ...prev,
                                    tableDensity: option.value,
                                  }));
                                }}
                                className={`flex h-8 items-center gap-2 px-3 text-xs font-medium transition-colors ${boardGeneralSettingsDraft.tableDensity === option.value
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-background text-muted-foreground hover:bg-muted"
                                  }`}
                              >
                                <span className="flex flex-col gap-px">
                                  {option.value === "expanded" ? (
                                    <>
                                      <span className="block h-[3px] w-4 rounded-sm bg-current opacity-80" />
                                      <span className="block h-[3px] w-4 rounded-sm bg-current opacity-40" />
                                      <span className="block h-[3px] w-4 rounded-sm bg-current opacity-40" />
                                    </>
                                  ) : (
                                    <>
                                      <span className="block h-0.5 w-4 rounded-sm bg-current opacity-80" />
                                      <span className="block h-0.5 w-4 rounded-sm bg-current opacity-40" />
                                      <span className="block h-0.5 w-4 rounded-sm bg-current opacity-40" />
                                      <span className="block h-0.5 w-4 rounded-sm bg-current opacity-40" />
                                    </>
                                  )}
                                </span>
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Hover Popovers */}
                        <div className="flex items-center justify-between py-3.5">
                          <div className="min-w-0 flex-1 pr-6">
                            <p className="text-sm font-medium">Hover Popovers</p>
                            <p className="text-muted-foreground text-xs">
                              Show or hide hover details on contact name and progress bar columns.
                            </p>
                          </div>
                          <div className="flex shrink-0 overflow-hidden rounded-md border">
                            <button
                              type="button"
                              onClick={() => {
                                setBoardGeneralSettingsDraft((prev) => ({
                                  ...prev,
                                  hoverPopoversEnabled: true,
                                }));
                              }}
                              className={`h-8 px-3 text-xs font-medium transition-colors ${boardGeneralSettingsDraft.hoverPopoversEnabled
                                ? "bg-primary text-primary-foreground"
                                : "bg-background text-muted-foreground hover:bg-muted"
                                }`}
                            >
                              Enabled
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setBoardGeneralSettingsDraft((prev) => ({
                                  ...prev,
                                  hoverPopoversEnabled: false,
                                }));
                              }}
                              className={`h-8 px-3 text-xs font-medium transition-colors ${!boardGeneralSettingsDraft.hoverPopoversEnabled
                                ? "bg-primary text-primary-foreground"
                                : "bg-background text-muted-foreground hover:bg-muted"
                                }`}
                            >
                              Disabled
                            </button>
                          </div>
                        </div>

                        {/* Records Per Page */}
                        <div className="flex items-center justify-between py-3.5">
                          <div className="min-w-0 flex-1 pr-6">
                            <p className="text-sm font-medium">Records Per Page</p>
                            <p className="text-muted-foreground text-xs">How many records to show per page.</p>
                          </div>
                          <div className="flex shrink-0 overflow-hidden rounded-md border">
                            {USER_BOARD_PAGE_SIZE_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                  setBoardGeneralSettingsDraft((prev) => ({
                                    ...prev,
                                    pageSize: option.value,
                                  }));
                                }}
                                className={`h-8 px-3 text-xs font-medium transition-colors ${boardGeneralSettingsDraft.pageSize === option.value
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-background text-muted-foreground hover:bg-muted"
                                  }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Default View */}
                        <div className="flex items-center justify-between py-3.5">
                          <div className="min-w-0 flex-1 pr-6">
                            <p className="text-sm font-medium">Default View</p>
                            <p className="text-muted-foreground text-xs">Starting layout when the board loads.</p>
                          </div>
                          <div className="flex shrink-0 overflow-hidden rounded-md border">
                            {(["table", "grid", "kanban"] as UserBoardDisplayMode[]).map((mode) => (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => {
                                  setBoardGeneralSettingsDraft((prev) => ({
                                    ...prev,
                                    displayMode: mode,
                                  }));
                                }}
                                className={`flex h-8 items-center gap-1.5 px-3 text-xs font-medium capitalize transition-colors ${boardGeneralSettingsDraft.displayMode === mode
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-background text-muted-foreground hover:bg-muted"
                                  }`}
                              >
                                {mode === "table" ? <List className="h-3.5 w-3.5" /> : mode === "grid" ? <LayoutGrid className="h-3.5 w-3.5" /> : <Columns3 className="h-3.5 w-3.5" />}
                                {mode}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Monthly Records */}
                        <div className="flex items-center justify-between py-3.5">
                          <div className="min-w-0 flex-1 pr-6">
                            <p className="text-sm font-medium">Monthly Records</p>
                            <p className="text-muted-foreground text-xs">
                              {USER_BOARD_RECORD_SOURCE_OPTIONS.find(
                                (o) => o.value === boardGeneralSettingsDraft.recordSource,
                              )?.description ??
                                "Choose how monthly records are selected."}
                            </p>
                          </div>
                          <div className="flex shrink-0 overflow-hidden rounded-md border">
                            {USER_BOARD_RECORD_SOURCE_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                  setBoardGeneralSettingsDraft((prev) => ({
                                    ...prev,
                                    recordSource: option.value,
                                  }));
                                }}
                                className={`h-8 px-3 text-xs font-medium transition-colors ${boardGeneralSettingsDraft.recordSource === option.value
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-background text-muted-foreground hover:bg-muted"
                                  }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Preview strip */}
                        <div
                          className={`mt-3 flex items-center justify-between rounded-md px-4 py-3 ${boardDraftThemeStyles.previewClassName}`}
                          style={boardDraftThemeInlineStyles.previewStyle}
                        >
                          <p className="text-xs text-muted-foreground">
                            Preview — {USER_BOARD_COLOR_THEME_OPTIONS.find((o) => o.value === boardGeneralSettingsDraft.colorTheme)?.label},{" "}
                            {USER_BOARD_FONT_SIZE_OPTIONS.find((o) => o.value === boardGeneralSettingsDraft.fontSize)?.label}
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className={`justify-start rounded-md ${quickActionButtonDraftSizeClass} ${boardDraftThemeStyles.actionButtonClassName}`}
                            style={boardDraftThemeInlineStyles.actionButtonStyle}
                            disabled
                          >
                            Quick Action
                          </Button>
                        </div>

                      </div>
                    </TabsContent>

                        <TabsContent value="email-templates" className="mt-0">
                          <div className="grid gap-4 md:grid-cols-[260px_1fr]">
                            <div className="space-y-2">
                              <p className="text-sm font-medium">
                                Templates ({emailTemplates.length})
                              </p>
                              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                                {emailTemplates.map((template) => {
                                  const isActive = template.id === selectedTemplate?.id;
                                  return (
                                    <button
                                      key={template.id}
                                      type="button"
                                      className={[
                                        "w-full rounded-md border px-3 py-2 text-left text-sm transition-colors",
                                        isActive
                                          ? "border-primary bg-primary/10"
                                          : "hover:bg-muted/60",
                                      ].join(" ")}
                                      onClick={() => {
                                        setSelectedTemplateId(template.id);
                                      }}
                                    >
                                      <p className="line-clamp-1 font-medium">{template.name}</p>
                                      <p className="text-muted-foreground mt-1 text-xs">
                                        Updated {formatUpdatedAt(template.updatedAt)}
                                      </p>
                                    </button>
                                  );
                                })}
                                {emailTemplates.length === 0 && !emailTemplatesQuery.isLoading ? (
                                  <p className="text-muted-foreground text-sm">
                                    No templates found on board 18401299370.
                                  </p>
                                ) : null}
                                {emailTemplatesQuery.isLoading ? (
                                  <p className="text-muted-foreground text-sm">
                                    Loading templates...
                                  </p>
                                ) : null}
                              </div>
                            </div>
                            <div className="bg-background min-h-[420px] rounded-md border p-4">
                              {selectedTemplate ? (
                                <div className="space-y-4">
                                  <div className="border-b pb-3">
                                    <p className="text-xs font-semibold tracking-wide uppercase">
                                      Subject
                                    </p>
                                    <p className="mt-1 text-base font-medium">
                                      {selectedTemplate.name}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold tracking-wide uppercase">
                                      Email Preview (Lead View)
                                    </p>
                                    <div className="bg-card mt-2 rounded-md border p-4">
                                      {selectedTemplate.content.trim().length === 0 ? (
                                        <p className="text-muted-foreground text-sm">
                                          No content found in column doc_mm0wq4r.
                                        </p>
                                      ) : selectedTemplate.renderedHtml.trim().length > 0 ? (
                                        <div
                                          className="prose prose-sm dark:prose-invert max-w-none **:wrap-break-word"
                                          style={{ whiteSpace: "pre-wrap" }}
                                          dangerouslySetInnerHTML={{
                                            __html: selectedTemplate.renderedHtml,
                                          }}
                                        />
                                      ) : (
                                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                          {selectedTemplate.content}
                                        </div>
                                      )}
                                      {selectedTemplate.docLink ? (
                                        <p className="mt-3 text-xs">
                                          <a
                                            href={selectedTemplate.docLink}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-primary underline underline-offset-2"
                                          >
                                            Open source Monday Workdoc
                                          </a>
                                        </p>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-muted-foreground text-sm">
                                  Select an email template to preview.
                                </p>
                              )}
                            </div>
                          </div>
                        </TabsContent>
                        <TabsContent value="user-zip-map" className="mt-0">
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">User {"<->"} Zipcode map</p>
                            <p className="text-muted-foreground text-sm">
                              Configure and monitor district routing for newly created contact
                              records.
                            </p>
                          </div>

                          <div className="grid gap-3 md:grid-cols-3">
                            <div className="rounded-md border-2 border-border/70 bg-card/60 p-3 shadow-sm">
                              <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                                Routing Status
                              </p>
                              <p className="mt-1 text-sm font-medium">
                                {routingStatusQuery.isLoading
                                  ? "Loading..."
                                  : routingStatusQuery.data?.enabled
                                    ? routingStatusQuery.data.ok
                                      ? "Configured"
                                      : "Configured with issues"
                                    : "Not configured"}
                              </p>
                            </div>
                            <div className="rounded-md border-2 border-border/70 bg-card/60 p-3 shadow-sm">
                              <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                                County Mappings
                              </p>
                              <p className="mt-1 text-sm font-medium">
                                {routingStatusQuery.data?.countyMappingsCount ?? 0}
                              </p>
                            </div>
                            <div className="rounded-md border-2 border-border/70 bg-card/60 p-3 shadow-sm">
                              <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                                District Owner Mappings
                              </p>
                              <p className="mt-1 text-sm font-medium">
                                {routingStatusQuery.data?.districtOwnerMappingsCount ?? 0}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-3 rounded-md border-2 border-border/70 bg-muted/20 p-4 shadow-sm">
                            <p className="text-sm font-medium">Routing boards</p>
                            <div className="grid gap-3 md:grid-cols-3">
                              <div className="rounded-md border border-border/60 bg-background/80 p-3">
                                <p className="text-xs font-semibold uppercase">Contact board</p>
                                <p className="text-muted-foreground mt-1 break-all text-xs">
                                  {routingStatusQuery.data?.contactBoardId ?? "Not configured"}
                                </p>
                                {routingStatusQuery.data?.contactBoardUrl ? (
                                  <Button asChild size="sm" variant="outline" className="mt-2 h-7 text-xs">
                                    <a
                                      href={routingStatusQuery.data.contactBoardUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      Open board
                                    </a>
                                  </Button>
                                ) : null}
                              </div>
                              <div className="rounded-md border border-border/60 bg-background/80 p-3">
                                <p className="text-xs font-semibold uppercase">
                                  County {"->"} District board
                                </p>
                                <p className="text-muted-foreground mt-1 break-all text-xs">
                                  {routingStatusQuery.data?.countyBoardId ?? "Not configured"}
                                </p>
                                {routingStatusQuery.data?.countyBoardUrl ? (
                                  <Button asChild size="sm" variant="outline" className="mt-2 h-7 text-xs">
                                    <a
                                      href={routingStatusQuery.data.countyBoardUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      Open board
                                    </a>
                                  </Button>
                                ) : null}
                              </div>
                              <div className="rounded-md border border-border/60 bg-background/80 p-3">
                                <p className="text-xs font-semibold uppercase">
                                  District {"->"} Owner board
                                </p>
                                <p className="text-muted-foreground mt-1 break-all text-xs">
                                  {routingStatusQuery.data?.districtBoardId ?? "Not configured"}
                                </p>
                                {routingStatusQuery.data?.districtBoardUrl ? (
                                  <Button asChild size="sm" variant="outline" className="mt-2 h-7 text-xs">
                                    <a
                                      href={routingStatusQuery.data.districtBoardUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      Open board
                                    </a>
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2 rounded-md border-2 border-border/70 bg-background/80 p-4 shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-medium">Routing diagnostics</p>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => {
                                  void routingStatusQuery.refetch();
                                }}
                                disabled={routingStatusQuery.isFetching}
                              >
                                {routingStatusQuery.isFetching ? "Refreshing..." : "Refresh"}
                              </Button>
                            </div>
                            {routingStatusQuery.error ? (
                              <p className="text-destructive text-xs">
                                {routingStatusQuery.error instanceof Error
                                  ? routingStatusQuery.error.message
                                  : "Failed to load routing diagnostics"}
                              </p>
                            ) : null}
                            {(routingStatusQuery.data?.issues ?? []).length > 0 ? (
                              <ul className="list-disc space-y-1 pl-4 text-xs">
                                {(routingStatusQuery.data?.issues ?? []).map((issue) => (
                                  <li key={issue} className="text-destructive">
                                    {issue}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-muted-foreground text-xs">
                                No routing issues detected.
                              </p>
                            )}
                          </div>

                          <div className="space-y-3 rounded-md border-2 border-primary/30 bg-primary/5 p-4 shadow-sm">
                            <div className="space-y-1">
                              <p className="text-sm font-medium">Manual rerun</p>
                              <p className="text-muted-foreground text-xs">
                                Re-run owner assignment for one contact item id.
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Input
                                value={routingRerunItemId}
                                onChange={(event) => setRoutingRerunItemId(event.target.value)}
                                placeholder="Item ID"
                                className="h-8 w-full max-w-xs border-2 bg-background/95 text-sm shadow-sm"
                              />
                              <Button
                                size="sm"
                                className="h-8 px-3 text-xs"
                                onClick={() => {
                                  void handleRunRoutingRerun();
                                }}
                                disabled={isRunningRoutingRerun}
                              >
                                {isRunningRoutingRerun ? "Running..." : "Run assignment"}
                              </Button>
                            </div>
                          </div>
                          </div>
                        </TabsContent>
                        <TabsContent value="email-settings" className="mt-0">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Email Settings</p>
                              <p className="text-muted-foreground text-sm">
                                Configure outbound email account settings for sending
                                monday-designed templates.
                              </p>
                            </div>
                            <div className="space-y-3 rounded-md border p-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant={
                                    outlookStatusQuery.data?.connected
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {outlookStatusQuery.data?.connected
                                    ? "Outlook connected"
                                    : "Outlook not connected"}
                                </Badge>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    void handleConnectOutlook();
                                  }}
                                  disabled={isConnectingOutlook}
                                >
                                  {isConnectingOutlook ? "Connecting..." : "Connect Outlook"}
                                </Button>
                                {outlookStatusQuery.data?.connected ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      void handleDisconnectOutlook();
                                    }}
                                    disabled={isDisconnectingOutlook}
                                  >
                                    {isDisconnectingOutlook
                                      ? "Disconnecting..."
                                      : "Disconnect"}
                                  </Button>
                                ) : null}
                              </div>
                              <div className="text-muted-foreground text-sm">
                                {outlookStatusQuery.data?.connection?.email ? (
                                  <p>
                                    Connected mailbox:{" "}
                                    {outlookStatusQuery.data.connection.email}
                                  </p>
                                ) : (
                                  <p>
                                    Use OAuth to connect Outlook, then use this account
                                    for sending and engagement tracking.
                                  </p>
                                )}
                                {outlookStatusQuery.data?.connection?.updatedAt ? (
                                  <p className="mt-1">
                                    Last updated:{" "}
                                    {new Date(
                                      outlookStatusQuery.data.connection.updatedAt,
                                    ).toLocaleString()}
                                  </p>
                                ) : null}
                              </div>
                              <div className="rounded-md border bg-muted/30 p-3">
                                <p className="text-xs font-semibold tracking-wide uppercase">
                                  Callback URL
                                </p>
                                <p className="mt-1 break-all font-mono text-xs">
                                  {callbackUrl}
                                </p>
                              </div>
                              {isMasterAdmin ? (
                                <div className="space-y-3 rounded-md border-2 border-primary/30 bg-primary/5 p-3">
                                  <div className="space-y-1">
                                    <p className="text-sm font-medium">Global Reply-To Addresses</p>
                                    <p className="text-muted-foreground text-xs">
                                      One email per line (or comma-separated). Every outbound message
                                      includes the sender&apos;s mailbox plus these addresses in
                                      Reply-To.
                                    </p>
                                  </div>
                                  <Textarea
                                    value={platformSettingsDraft.replyToEmails.join("\n")}
                                    onChange={(event) => {
                                      const nextReplyToEmails = parseDelimitedList(
                                        event.target.value,
                                      ).map((entry) => entry.toLowerCase());
                                      setPlatformSettingsDraft((prev) => ({
                                        ...prev,
                                        replyToEmails: nextReplyToEmails,
                                      }));
                                    }}
                                    rows={4}
                                    placeholder="info@floridaroadjobs.com"
                                    className="font-mono text-xs"
                                  />
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={
                                        isSavingPlatformSettings ||
                                        platformSettings.replyToEmails.join(",") ===
                                          platformSettingsDraft.replyToEmails.join(",")
                                      }
                                      onClick={() => {
                                        setPlatformSettingsDraft((prev) => ({
                                          ...prev,
                                          replyToEmails: [...platformSettings.replyToEmails],
                                        }));
                                      }}
                                    >
                                      Reset
                                    </Button>
                                    <Button
                                      size="sm"
                                      disabled={isSavingPlatformSettings}
                                      onClick={() => {
                                        void handleSavePlatformSettings(
                                          "Reply-to settings updated",
                                        );
                                      }}
                                    >
                                      {isSavingPlatformSettings ? "Saving..." : "Save reply-to"}
                                    </Button>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </TabsContent>
                    <TabsContent value="feature-flags" className="mt-0">
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Feature Flags</p>
                            <p className="text-muted-foreground text-sm">
                              Toggle app capabilities without code changes.
                            </p>
                          </div>
                          <div className="space-y-3 rounded-md border p-4">
                            <label className="flex items-start gap-3 text-sm">
                              <input
                                type="checkbox"
                                checked={featureFlags.emailMarketingEnabled}
                                disabled={isSavingFeatureFlags}
                                onChange={(event) => {
                                  void handleSetEmailMarketingEnabled(
                                    event.target.checked,
                                  );
                                }}
                              />
                              <div className="space-y-1">
                                <p className="font-medium">Email Marketing</p>
                                <p className="text-muted-foreground text-xs">
                                  Enables email marketing capabilities, including the
                                  Email action in the table.
                                </p>
                                {isSavingFeatureFlags ? (
                                  <p className="text-muted-foreground text-[11px]">
                                    Saving...
                                  </p>
                                ) : null}
                              </div>
                            </label>
                          </div>
                        </div>
                      </TabsContent>
                    {isMasterAdmin ? (
                      <TabsContent value="monthly-board-mapping" className="mt-0">
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Monthly Board Mapping</p>
                            <p className="text-muted-foreground text-sm">
                              Configure which monthly board should sync by month/year.
                            </p>
                          </div>
                          <div className="space-y-3 rounded-md border p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-medium">Mappings</p>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const currentMonthKey = new Date()
                                    .toISOString()
                                    .slice(0, 7);
                                  setPlatformSettingsDraft((prev) => ({
                                    ...prev,
                                    monthlyBoardMappings: [
                                      ...prev.monthlyBoardMappings,
                                      { monthKey: currentMonthKey, boardId: "" },
                                    ],
                                  }));
                                }}
                              >
                                Add row
                              </Button>
                            </div>
                            {platformSettingsDraft.monthlyBoardMappings.length === 0 ? (
                              <p className="text-muted-foreground text-xs">
                                No mappings yet. Add at least one month/year to board ID mapping.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {platformSettingsDraft.monthlyBoardMappings.map(
                                  (mapping, index) => (
                                    <div
                                      key={`${mapping.monthKey}-${mapping.boardId}-${index}`}
                                      className="grid gap-2 md:grid-cols-[180px_1fr_auto]"
                                    >
                                      <Input
                                        type="month"
                                        value={mapping.monthKey}
                                        onChange={(event) => {
                                          const value = event.target.value;
                                          setPlatformSettingsDraft((prev) => ({
                                            ...prev,
                                            monthlyBoardMappings:
                                              prev.monthlyBoardMappings.map((entry, entryIndex) =>
                                                entryIndex === index
                                                  ? { ...entry, monthKey: value }
                                                  : entry,
                                              ),
                                          }));
                                        }}
                                      />
                                      <Input
                                        value={mapping.boardId}
                                        onChange={(event) => {
                                          const value = event.target.value.trim();
                                          setPlatformSettingsDraft((prev) => ({
                                            ...prev,
                                            monthlyBoardMappings:
                                              prev.monthlyBoardMappings.map((entry, entryIndex) =>
                                                entryIndex === index
                                                  ? { ...entry, boardId: value }
                                                  : entry,
                                              ),
                                          }));
                                        }}
                                        placeholder="Monthly board ID"
                                      />
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                          setPlatformSettingsDraft((prev) => ({
                                            ...prev,
                                            monthlyBoardMappings:
                                              prev.monthlyBoardMappings.filter(
                                                (_, entryIndex) => entryIndex !== index,
                                              ),
                                          }));
                                        }}
                                      >
                                        Remove
                                      </Button>
                                    </div>
                                  ),
                                )}
                              </div>
                            )}
                          </div>
                          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                            <p className="text-xs font-semibold tracking-wide uppercase">
                              Monthly Board Webhook URL
                            </p>
                            <p className="mt-1 break-all font-mono text-xs">
                              {monthlyWebhookUrl}
                            </p>
                            <p className="text-muted-foreground mt-2 text-xs">
                              Configure this URL as a webhook on each mapped monthly board.
                              New monthly updates and subitem changes will sync to the linked
                              contact in the API board.
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isSavingPlatformSettings || !hasUnsavedPlatformSettings}
                              onClick={() => {
                                setPlatformSettingsDraft(platformSettings);
                              }}
                            >
                              Reset
                            </Button>
                            <Button
                              size="sm"
                              disabled={isSavingPlatformSettings || !hasUnsavedPlatformSettings}
                              onClick={() => {
                                void handleSavePlatformSettings(
                                  "Monthly board mappings updated",
                                );
                              }}
                            >
                              {isSavingPlatformSettings ? "Saving..." : "Save mappings"}
                            </Button>
                          </div>
                        </div>
                      </TabsContent>
                    ) : null}
                    {isMasterAdmin ? (
                      <TabsContent value="platform-settings" className="mt-0">
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Platform Settings</p>
                            <p className="text-muted-foreground text-sm">
                              Manage role assignments for settings access.
                            </p>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2 rounded-md border p-4">
                              <p className="text-sm font-medium">Admin User IDs</p>
                              <p className="text-muted-foreground text-xs">
                                One user ID per line. Admins can modify feature flags and admin
                                tools.
                              </p>
                              <Textarea
                                value={platformSettingsDraft.adminUserIds.join("\n")}
                                onChange={(event) => {
                                  setPlatformSettingsDraft((prev) => ({
                                    ...prev,
                                    adminUserIds: parseDelimitedList(event.target.value),
                                  }));
                                }}
                                rows={8}
                                className="font-mono text-xs"
                                placeholder={"53441186\n38959704"}
                              />
                            </div>
                            <div className="space-y-2 rounded-md border p-4">
                              <p className="text-sm font-medium">Employee User IDs</p>
                              <p className="text-muted-foreground text-xs">
                                Optional reference list for employee role assignments.
                              </p>
                              <Textarea
                                value={platformSettingsDraft.employeeUserIds.join("\n")}
                                onChange={(event) => {
                                  setPlatformSettingsDraft((prev) => ({
                                    ...prev,
                                    employeeUserIds: parseDelimitedList(event.target.value),
                                  }));
                                }}
                                rows={8}
                                className="font-mono text-xs"
                                placeholder={"49566535\n38959704"}
                              />
                            </div>
                          </div>
                          <div className="rounded-md border border-amber-300 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-500/50 dark:bg-amber-950/30 dark:text-amber-100">
                            Master admin ({masterAdminUserId}) is always included in admin IDs.
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isSavingPlatformSettings || !hasUnsavedPlatformSettings}
                              onClick={() => {
                                setPlatformSettingsDraft(platformSettings);
                              }}
                            >
                              Reset
                            </Button>
                            <Button
                              size="sm"
                              disabled={isSavingPlatformSettings || !hasUnsavedPlatformSettings}
                              onClick={() => {
                                void handleSavePlatformSettings("Platform settings updated");
                              }}
                            >
                              {isSavingPlatformSettings ? "Saving..." : "Save platform settings"}
                            </Button>
                          </div>
                        </div>
                      </TabsContent>
                    ) : null}
                  </div>
                      </div>
                    </Tabs>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
      <div className="max-w-[1600px] container">

      <Dialog
        open={addContactOpen}
        onOpenChange={(open) => {
          setAddContactOpen(open);
          if (!open) {
            resetAddContactDialog();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
          </DialogHeader>
          {addContactStep === 1 ? (
            <AddNewContactForm
              values={addContactValues}
              ownerOptions={addContactOwnerOptions}
              isSubmitting={isCheckingDuplicates || isCreatingContact}
              onChange={(key, value) => {
                setAddContactValues((prev) => ({ ...prev, [key]: value }));
              }}
              onSubmit={() => {
                void handleCheckDuplicatesAndContinue();
              }}
            />
          ) : (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Before we create, we found these records with the same email.
                </p>
                <p className="text-muted-foreground text-sm">
                  Do you want to use one of these existing records?
                </p>
              </div>
              <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border p-2">
                {existingContactsByEmail.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between gap-3 rounded-md border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{record.name || record.id}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {record.email ?? "No email"} · {record.owner ?? "No owner"}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Updated: {record.updatedAt ? formatUpdatedAt(record.updatedAt) : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {record.url ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            window.open(record.url ?? "", "_blank", "noopener,noreferrer")
                          }
                        >
                          Open
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        onClick={() => {
                          toast.success("Using existing contact");
                          setAddContactOpen(false);
                          resetAddContactDialog();
                        }}
                      >
                        Use Existing
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between gap-2">
                <Button
                  variant="outline"
                  onClick={() => setAddContactStep(1)}
                  disabled={isCreatingContact}
                >
                  Back
                </Button>
                <Button
                  onClick={() => {
                    void handleCreateContact();
                  }}
                  disabled={isCreatingContact}
                >
                  {isCreatingContact ? "Creating..." : "Create New Anyway"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!retentionDialogRecord}
        onOpenChange={(open) => {
          if (!open) setRetentionDialogRecord(null);
        }}
      >
          <DialogContent
            className="max-w-lg"
            onInteractOutside={(event) => {
              event.preventDefault();
            }}
            onEscapeKeyDown={(event) => {
              event.preventDefault();
            }}
          >
          <DialogHeader>
            <DialogTitle>Update Retention</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* <div className="space-y-2 rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Business Connections Overview</p>
                <p className="text-muted-foreground text-xs">
                  Snapshot of linked contractor relationships (mock data preview).
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="bg-background space-y-2 rounded-md border p-2.5">
                  <p className="text-xs font-semibold tracking-wide uppercase">
                    Referred To Contractor(s)
                  </p>
                  {retentionDraft.referredToContractors.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {retentionDraft.referredToContractors.map((contractor) => (
                        <BusinessInfoHoverCard
                          key={contractor}
                          companyName={contractor}
                        >
                          <Badge variant="secondary" className="cursor-help text-[11px]">
                            {contractor}
                          </Badge>
                        </BusinessInfoHoverCard>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs">No referrals selected.</p>
                  )}
                </div>
                <div className="bg-background space-y-2 rounded-md border p-2.5">
                  <p className="text-xs font-semibold tracking-wide uppercase">
                    Hired With Contractor
                  </p>
                  {retentionDraft.hiredWithContractor.trim() ? (
                    <BusinessInfoHoverCard
                      companyName={retentionDraft.hiredWithContractor}
                    >
                      <Badge variant="secondary" className="cursor-help text-[11px]">
                        {retentionDraft.hiredWithContractor}
                      </Badge>
                    </BusinessInfoHoverCard>
                  ) : (
                    <p className="text-muted-foreground text-xs">No contractor selected.</p>
                  )}
                </div>
              </div>
            </div> */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Referred To Contractor(s)</label>
              <MultiSelect
                key={`${retentionDialogRecord?.id ?? "no-item"}-${retentionDraft.referredToContractors.join("|")}`}
                options={Array.from(
                  new Set([
                    ...retentionOptions.referredToContractors,
                    ...retentionDraft.referredToContractors,
                  ]),
                )
                  .filter((value) => value.trim().length > 0)
                  .map((value) => ({ label: value, value }))}
                defaultValue={retentionDraft.referredToContractors}
                onValueChange={(values) => {
                  setRetentionDraft((prev) => ({
                    ...prev,
                    referredToContractors: values,
                  }));
                }}
                placeholder="Select contractor(s)"
                disablePortal
                popoverSide="bottom"
                popoverAvoidCollisions={false}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Hired With Contractor</label>
              <select
                value={retentionDraft.hiredWithContractor || "__none__"}
                onChange={(event) => {
                  const value = event.target.value;
                  setRetentionDraft((prev) => ({
                    ...prev,
                    hiredWithContractor: value === "__none__" ? "" : value,
                  }));
                }}
                className="bg-background border-input h-9 w-full rounded-md border px-3 text-sm"
              >
                <option value="__none__">Select value</option>
                {Array.from(
                  new Set([
                    ...retentionOptions.hiredWithContractor,
                    retentionDraft.hiredWithContractor,
                  ]),
                )
                  .filter((value): value is string => !!value && value.trim().length > 0)
                  .map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Hire Date</label>
              <div className="flex items-center gap-2">
                <Popover
                  open={retentionHireDatePopoverOpen}
                  onOpenChange={setRetentionHireDatePopoverOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 flex-1 justify-start font-normal"
                    >
                      {retentionDraft.hireDate || "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="start" portal={false}>
                    <Calendar
                      mode="single"
                      selected={
                        retentionDraft.hireDate
                          ? new Date(`${retentionDraft.hireDate}T00:00:00`)
                          : undefined
                      }
                      onSelect={(date) => {
                        if (!date) return;
                        setRetentionDraft((prev) => ({
                          ...prev,
                          hireDate: toDateOnlyLocal(date),
                        }));
                        setRetentionHireDatePopoverOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRetentionDraft((prev) => ({ ...prev, hireDate: "" }));
                  }}
                  disabled={!retentionDraft.hireDate}
                >
                  Clear
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Retention Period</label>
              <select
                value={retentionDraft.retentionPeriod || "__none__"}
                onChange={(event) => {
                  const value = event.target.value;
                  setRetentionDraft((prev) => ({
                    ...prev,
                    retentionPeriod: value === "__none__" ? "" : value,
                  }));
                }}
                className="bg-background border-input h-9 w-full rounded-md border px-3 text-sm"
              >
                <option value="__none__">Select value</option>
                {Array.from(
                  new Set([
                    ...retentionOptions.retentionPeriod,
                    retentionDraft.retentionPeriod,
                  ]),
                )
                  .filter((value): value is string => !!value && value.trim().length > 0)
                  .map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setRetentionDialogRecord(null)}
                disabled={isSavingRetention}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  void handleSaveRetention();
                }}
                disabled={isSavingRetention}
              >
                {isSavingRetention ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!statusDialogRecord}
        onOpenChange={(open) => {
          if (!open) setStatusDialogRecord(null);
        }}
      >
          <DialogContent
            className="max-w-lg"
            onInteractOutside={(event) => {
              event.preventDefault();
            }}
            onEscapeKeyDown={(event) => {
              event.preventDefault();
            }}
          >
          <DialogHeader>
            <DialogTitle>Update Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                value={statusDraft || "__none__"}
                onChange={(event) => {
                  const value = event.target.value;
                  setStatusDraft(value === "__none__" ? "" : value);
                }}
                className="bg-background border-input h-9 w-full rounded-md border px-3 text-sm"
              >
                <option value="__none__">Select value</option>
                {Array.from(new Set([...statusOptions.map((entry) => entry.value), statusDraft]))
                  .filter((value): value is string => !!value && value.trim().length > 0)
                  .map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setStatusDialogRecord(null)}
                disabled={isSavingStatus}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  void handleSaveStatus();
                }}
                disabled={isSavingStatus}
              >
                {isSavingStatus ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!ownerDialogRecord}
        onOpenChange={(open) => {
          if (!open) setOwnerDialogRecord(null);
        }}
      >
          <DialogContent
            className="max-w-lg"
            onInteractOutside={(event) => {
              event.preventDefault();
            }}
            onEscapeKeyDown={(event) => {
              event.preventDefault();
            }}
          >
          <DialogHeader>
            <DialogTitle>Update Owner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Owner</label>
              <Select
                value={ownerDraft || "__none__"}
                onValueChange={(value) => {
                  setOwnerDraft(value === "__none__" ? "" : value);
                }}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select value</SelectItem>
                  {Array.from(
                    new Map(
                      [
                        ...ownerOptions.map((option) => [option.value, option] as const),
                        ownerDraft.trim().length > 0
                          ? [
                            ownerDraft,
                            {
                              value: ownerDraft,
                              label: `User ${ownerDraft}`,
                              name: null,
                              photoThumb: null,
                            },
                          ]
                          : null,
                      ].filter(
                        (
                          entry,
                        ): entry is readonly [
                          string,
                          {
                            value: string;
                            label: string;
                            name: string | null;
                            photoThumb: string | null;
                          },
                        ] => !!entry,
                      ),
                    ),
                  )
                    .map(([, option]) => option)
                    .map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-5">
                            {option.photoThumb ? (
                              <AvatarImage
                                src={option.photoThumb}
                                alt={option.name ?? option.value}
                              />
                            ) : null}
                            <AvatarFallback className="text-[10px] font-semibold">
                              {getNameInitials(option.name ?? option.value)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">
                            {option.name ?? option.label}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setOwnerDialogRecord(null)}
                disabled={isSavingOwner}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  void handleSaveOwner();
                }}
                disabled={isSavingOwner}
              >
                {isSavingOwner ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!tagsDialogRecord}
        onOpenChange={(open) => {
          if (!open) setTagsDialogRecord(null);
        }}
      >
          <DialogContent
            className="max-w-lg overflow-visible"
            onInteractOutside={(event) => {
              event.preventDefault();
            }}
            onEscapeKeyDown={(event) => {
              event.preventDefault();
            }}
          >
          <DialogHeader>
            <DialogTitle>Update Tags</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tags</label>
              <MultiSelect
                key={`${tagsDialogRecord?.id ?? "no-item"}-${splitCsvValues(tagsDialogRecord?.tags).join("|")}`}
                options={sortFiscalYearTagsDesc(
                  Array.from(new Set([...retentionOptions.tags, ...tagsDraft])).filter(
                    (value) => value.trim().length > 0,
                  ),
                )
                  .map((value) => ({ label: value, value }))}
                defaultValue={tagsDraft}
                onValueChange={(values) => setTagsDraft(values)}
                placeholder="Select tags"
                disablePortal
                popoverSide="bottom"
                popoverAvoidCollisions={false}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setTagsDialogRecord(null)}
                disabled={isSavingTags}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  void handleSaveTags();
                }}
                disabled={isSavingTags}
              >
                {isSavingTags ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!contactHistoryDialogRecord}
        onOpenChange={(open) => {
            if (!open && !isTourLockingDialog()) setContactHistoryDialogRecord(null);
          }}
        >
          <DialogContent
            data-tour="contact-dialog"
            className="flex h-[90vh] max-h-[90vh] max-w-6xl flex-col overflow-hidden p-0"
            onPointerDownOutside={(e) => { if (isTourLockingDialog()) e.preventDefault(); }}
            onEscapeKeyDown={(e) => { if (isTourLockingDialog()) e.preventDefault(); }}
          >
            <DialogHeader className="z-10 border-b bg-background p-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  disabled={contactDialogIndex <= 0}
                  onClick={() => navigateContactDialog(-1)}
                  title="Previous contact"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  disabled={contactDialogIndex < 0 || contactDialogIndex >= filteredRecords.length - 1}
                  onClick={() => navigateContactDialog(1)}
                  title="Next contact"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <DialogTitle className="min-w-0 flex-1 truncate">
              {contactHistoryDialogRecord?.name ?? "Contact"} · Conversation history
            </DialogTitle>
                {contactDialogIndex >= 0 ? (
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {contactDialogIndex + 1} / {filteredRecords.length}
                  </span>
                ) : null}
                {contactHistoryDialogRecord?.url ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="ml-2"
                    onClick={() => {
                      window.open(
                        contactHistoryDialogRecord.url ?? "",
                        "_blank",
                        "noopener,noreferrer",
                      );
                    }}
                  >
                    Open
                  </Button>
                ) : null}
                {!staticMode && contactHistoryDialogRecord ? (
                  <>
                    <input
                      id={contactDialogResumeInputId}
                      type="file"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        void handleUploadResume(contactHistoryDialogRecord, file);
                        event.currentTarget.value = "";
                      }}
                      disabled={isContactDialogUploadingResume || !sessionToken}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="ml-2"
                      disabled={isContactDialogUploadingResume || !sessionToken}
                      onClick={() => {
                        const input = document.getElementById(contactDialogResumeInputId);
                        if (input instanceof HTMLInputElement) {
                          input.click();
                        }
                      }}
                    >
                      <Upload className="mr-1.5 h-3.5 w-3.5" />
                      {isContactDialogUploadingResume
                        ? "Uploading..."
                        : contactDialogResumeFile
                          ? "Replace Resume"
                          : "Upload Resume"}
                    </Button>
                  </>
                ) : null}
                {!staticMode && isMondaySettingsAdmin && contactHistoryDialogRecord ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="ml-2"
                    disabled={
                      isCreatingContactUpdate ||
                      syncingContactIds.has(contactHistoryDialogRecord.id)
                    }
                    onClick={() => {
                      openSyncContactBoardPicker(contactHistoryDialogRecord);
                    }}
                  >
                    {syncingContactIds.has(contactHistoryDialogRecord.id)
                      ? "Syncing..."
                      : "Sync User"}
                  </Button>
                ) : null}
              </div>
              {contactHistoryDialogRecord ? (
                <div
                  data-tour="contact-header"
                  className="mt-3 flex flex-row items-start justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold">
                      {contactHistoryDialogRecord.name ?? "Contact"}
                    </p>
                    <p className="text-muted-foreground truncate text-sm">
                      {contactHistoryDialogRecord.email ?? "—"}
                    </p>
                    <p className="text-muted-foreground truncate text-sm">
                      {contactHistoryDialogRecord.phone ?? "—"}
                    </p>
                  </div>
                  {!staticMode ? (
                    <div data-tour="onboarding-stepper" className="w-full max-w-xl shrink-0">
                      <OnboardingStepper
                        record={contactHistoryDialogRecord}
                        approvalSteps={approvalSteps}
                        isProcessing={isCreatingContactUpdate}
                        emailMarketingEnabled={featureFlags.emailMarketingEnabled}
                        onQuickAction={({ updateType, body, method }) => {
                          setContactUpdateType(updateType);
                          if (
                            updateType === "welcome_email" &&
                            featureFlags.emailMarketingEnabled &&
                            method === "platform"
                          ) {
                            openSendEmailDialog(contactHistoryDialogRecord, {
                              progressUpdate: { updateType, body },
                              autoAdvanceToPreview: true,
                              preferredTemplateType: "welcome_email",
                            });
                            return;
                          }
                          void handleCreateContactUpdate({
                            updateType,
                            body,
                            keepSelectedType: true,
                          });
                        }}
                        onQuestionnaireAction={(record) => {
                          openQuestionnaireDialogForRecords([record]);
                        }}
                        onGenericStepAction={({ body, stepColumnId }) => {
                          void (async () => {
                            if (!sessionToken) return;
                            const targetRecordId = resolveContactUpdateTargetRecordId(contactHistoryDialogRecord);
                            await handleCreateContactUpdate({
                              updateType: "general",
                              body,
                              keepSelectedType: true,
                            });
                            try {
                              await fetch(
                                `/api/monday/records/${encodeURIComponent(targetRecordId)}/reset-step`,
                                {
                                  method: "POST",
                                  headers: {
                                    "content-type": "application/json",
                                    "x-monday-session-token": sessionToken,
                                  },
                                  body: JSON.stringify({ stepColumnId, action: "done" }),
                                },
                              );
                              await recordsQuery.refetch();
                              const refreshedRecords = (recordsQuery.data?.pages ?? []).flatMap(
                                (page) => page.records ?? [],
                              );
                              syncContactHistoryDialogFromRecords(refreshedRecords);
                              toast.success("Onboarding step marked complete");
                            } catch {
                              toast.error("Failed to mark step complete");
                            }
                          })();
                        }}
                        actionButtonClassName={boardThemeStyles.actionButtonClassName}
                        actionButtonStyle={boardThemeInlineStyles.actionButtonStyle}
                        buttonSizeClassName={quickActionButtonSizeClass}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
          </DialogHeader>
            <div className="flex min-h-0 flex-1 flex-col p-4">
          {contactHistoryDialogRecord ? (
            <div className="flex min-h-0 flex-1 flex-col space-y-3">

                <Tabs
                  value={contactDialogTab}
                  onValueChange={setContactDialogTab}
                  className="flex min-h-0 flex-1 flex-col"
                >
                  <TabsList data-tour="contact-tabs">
                    <TabsTrigger value="updates">Updates</TabsTrigger>
                    <TabsTrigger value="info">Additional Information</TabsTrigger>
                  </TabsList>

                  <TabsContent value="updates" className="mt-3 flex min-h-0 flex-1 flex-col">
                    <ContactUpdates
                      subitems={contactUpdatesQuery.data?.subitems ?? []}
                      isLoading={contactUpdatesQuery.isLoading}
                      isEmpty={(contactUpdatesQuery.data?.subitems?.length ?? 0) === 0}
                      isStaticMode={staticMode}
                      draft={contactUpdateDraft}
                      onDraftChange={setContactUpdateDraft}
                      onSubmit={({ updateType, date }) => {
                        setContactUpdateType(updateType);
                        void handleCreateContactUpdate({ updateType, date });
                      }}
                      onDeleteSubitem={async (subitemId) => {
                        if (!sessionToken) return;
                        const res = await fetch("/api/monday/subitems", {
                          method: "DELETE",
                          headers: {
                            "content-type": "application/json",
                            "x-monday-session-token": sessionToken,
                          },
                          body: JSON.stringify({ subitemId }),
                        });
                        const json = (await res.json()) as { ok: boolean; error?: string };
                        if (!json.ok) throw new Error(json.error ?? "Delete failed");
                        toast.success("Update deleted");
                        await contactUpdatesQuery.refetch();
                      }}
                      onUpdateSubitemDate={async (subitemId, date) => {
                        if (!sessionToken) return;
                        const res = await fetch("/api/monday/subitems", {
                          method: "PATCH",
                          headers: {
                            "content-type": "application/json",
                            "x-monday-session-token": sessionToken,
                          },
                          body: JSON.stringify({ subitemId, date }),
                        });
                        const json = (await res.json()) as { ok: boolean; error?: string };
                        if (!json.ok) throw new Error(json.error ?? "Date update failed");
                        toast.success("Date updated");
                        await contactUpdatesQuery.refetch();
                      }}
                      isSubmitting={isCreatingContactUpdate}
                      sessionToken={sessionToken}
                      currentUserId={forcedOwnerId || identity?.userId || null}
                    />
                  </TabsContent>

                  <TabsContent value="info" className="mt-3 min-h-0 flex-1">
                    {contactColumnsQuery.isLoading ? (
                      <div className="space-y-2 p-3">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div key={i} className="grid grid-cols-[140px_1fr] gap-3">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                    </div>
                        ))}
                  </div>
                    ) : contactColumnsQuery.error ? (
                  <div className="rounded-md border p-3">
                        <p className="text-destructive text-sm">
                          {contactColumnsQuery.error instanceof Error
                            ? contactColumnsQuery.error.message
                            : "Failed to load contact details"}
                        </p>
                        </div>
                    ) : (
                      <div className="h-full overflow-y-auto rounded-md border">
                        <table className="w-full text-sm">
                          <tbody>
                            {(contactColumnsQuery.data?.columns ?? []).map((col) => (
                              <tr
                                key={col.id}
                                className="border-b last:border-b-0"
                              >
                                <td className="text-muted-foreground bg-muted/30 w-[180px] shrink-0 border-r px-3 py-2 text-xs font-medium">
                                  {col.title}
                                </td>
                                <td className="group relative break-words px-3 py-2 pr-10 text-xs">
                                  {editingContactColumnId === col.id ? (
                                    <div className="space-y-2">
                                      {(() => {
                                        const normalizedType = col.type.toLowerCase();
                                        if (
                                          normalizedType === "status" ||
                                          normalizedType === "dropdown"
                                        ) {
                                          const options = Array.from(
                                            new Set((col.options ?? []).filter(Boolean)),
                                          );
                                          return (
                                            <Select
                                              value={
                                                editingContactColumnDraft.length > 0
                                                  ? editingContactColumnDraft
                                                  : "__clear__"
                                              }
                                              onValueChange={(value) => {
                                                setEditingContactColumnDraft(
                                                  value === "__clear__" ? "" : value,
                                                );
                                              }}
                                            >
                                              <SelectTrigger className="h-8 text-xs">
                                                <SelectValue placeholder="Select value" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="__clear__">Clear</SelectItem>
                                                {options.map((option) => (
                                                  <SelectItem key={option} value={option}>
                                                    {option}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          );
                                        }
                                        if (normalizedType === "date") {
                                          return (
                                            <Input
                                              type="date"
                                              className="h-8 text-xs"
                                              value={editingContactColumnDraft}
                                              onChange={(event) =>
                                                setEditingContactColumnDraft(
                                                  event.target.value,
                                                )
                                              }
                                            />
                                          );
                                        }
                                        if (
                                          normalizedType === "long_text" ||
                                          normalizedType === "long-text"
                                        ) {
                                          return (
                                            <Textarea
                                              className="min-h-[72px] text-xs"
                                              value={editingContactColumnDraft}
                                              onChange={(event) =>
                                                setEditingContactColumnDraft(
                                                  event.target.value,
                                                )
                                              }
                                            />
                                          );
                                        }
                                        if (
                                          normalizedType === "numbers" ||
                                          normalizedType === "numeric"
                                        ) {
                                          return (
                                            <Input
                                              type="number"
                                              className="h-8 text-xs"
                                              value={editingContactColumnDraft}
                                              onChange={(event) =>
                                                setEditingContactColumnDraft(
                                                  event.target.value,
                                                )
                                              }
                                            />
                                          );
                                        }
                                        return (
                                          <Input
                                            type="text"
                                            className="h-8 text-xs"
                                            value={editingContactColumnDraft}
                                            onChange={(event) =>
                                              setEditingContactColumnDraft(
                                                event.target.value,
                                              )
                                            }
                                          />
                                        );
                                      })()}
                                      <div className="flex items-center gap-1">
                                        <Button
                                          type="button"
                                          size="icon"
                                          variant="outline"
                                          className="h-6 w-6"
                                          onClick={() => {
                                            void saveEditingContactColumn();
                                          }}
                                          disabled={isSavingContactColumn}
                                        >
                                          <Check className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                          type="button"
                                          size="icon"
                                          variant="ghost"
                                          className="h-6 w-6"
                                          onClick={cancelEditingContactColumn}
                                          disabled={isSavingContactColumn}
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      {col.text || (
                                        <span className="text-muted-foreground">—</span>
                                      )}
                                      {col.isEditable ? (
                                        <Button
                                          type="button"
                                          size="icon"
                                          variant="ghost"
                                          className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
                                          onClick={() => {
                                            startEditingContactColumn(col);
                                          }}
                                          title={`Edit ${col.title}`}
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                      ) : null}
                                    </>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                    </div>
                    )}
                  </TabsContent>
                </Tabs>
            </div>
          ) : null}
            </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!syncContactBoardPickerRecord}
        onOpenChange={(open) => {
          if (!open) {
            setSyncContactBoardPickerRecord(null);
            setSyncContactBoardSelection("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sync User</DialogTitle>
            <DialogDescription>
              Choose which monthly board to scrape for{" "}
              {syncContactBoardPickerRecord?.name ?? "this contact"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select
              value={syncContactBoardSelection}
              onValueChange={setSyncContactBoardSelection}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select monthly board" />
              </SelectTrigger>
              <SelectContent>
                {syncMonthlyBoardOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label} · {option.boardId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {syncMonthlyBoardOptions.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                No monthly board mappings are configured in platform settings.
              </p>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSyncContactBoardPickerRecord(null);
                setSyncContactBoardSelection("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmSyncContactFromSelectedBoard}
              disabled={
                !syncContactBoardSelection ||
                !syncContactBoardPickerRecord ||
                syncingContactIds.has(syncContactBoardPickerRecord?.id ?? "")
              }
            >
              {syncContactBoardPickerRecord &&
              syncingContactIds.has(syncContactBoardPickerRecord.id)
                ? "Syncing..."
                : "Start Sync"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

        <QuestionnaireFormDialog
          open={questionnaireDialogRecords.length > 0}
          onOpenChange={(next) => {
            if (!next) setQuestionnaireDialogRecords([]);
          }}
          records={questionnaireDialogRecords}
          sessionToken={sessionToken ?? ""}
          staticMode={staticMode}
          resolveItemId={resolveContactUpdateTargetRecordId}
          onSaved={handleQuestionnaireSaved}
        />

        <p className="text-muted-foreground px-1 text-xs font-medium">
          {filteredRecordCountLabel}
        </p>

        {userScopedDisplayMode === "kanban" ? (
          <KanbanBoard
            records={filteredRecords}
            approvalSteps={approvalSteps}
            isLoading={authLoading || (!staticMode && recordsQuery.isLoading)}
            onMoveRequest={setKanbanMoveConfirmation}
            onRecordClick={openContactHistoryDialog}
            onHelpDesk={(r) => {
              setHelpDeskLinkedContact(r);
              setHelpDeskOpen(true);
            }}
          />
        ) : isTouchScopedView && userScopedDisplayMode === "grid" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(authLoading || (!staticMode && recordsQuery.isLoading))
              ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-44 animate-pulse rounded-xl border bg-muted" />
              ))
              : filteredRecords.map((record) => (
                <ContactCard
                  key={record.id}
                  record={record}
                  approvalSteps={approvalSteps}
                  onClick={openContactHistoryDialog}
                  onHelpDesk={(r) => {
                    setHelpDeskLinkedContact(r);
                    setHelpDeskOpen(true);
                  }}
                />
              ))}
          </div>
        ) : (
          <BoardTable
            data={filteredRecords}
        columns={columns}
        isLoading={authLoading || (!staticMode && recordsQuery.isLoading)}
        initialSort={{ id: "createdAt", direction: "desc" }}
        getRowId={(item) => item.id}
        entityActions={entityActions}
            enableInfiniteScroll={shouldAutoLoadMore}
            hasNextPage={!!recordsQuery.hasNextPage}
            isFetchingNextPage={recordsQuery.isFetchingNextPage}
            onLoadMore={handleLoadMoreRecords}
            bulkActions={({ selectedItems, clearSelection }) => {
              const eligibleByAction = new Map<string, MondayRecord[]>();
              for (const action of CONTACT_UPDATE_ACTION_BUTTONS) {
                const stepConfig = STEP_ACTION_CONFIG.find((s) => s.updateType === action.type);
                if (!stepConfig) {
                  eligibleByAction.set(action.type, [...selectedItems]);
                  continue;
                }
                eligibleByAction.set(
                  action.type,
                  selectedItems.filter((item) => {
                    const currentStep = getRecordStepIndex(item.batteryProgress, approvalSteps.length);
                    return currentStep === stepConfig.stepIndex;
                  }),
                );
              }
              const questionnaireStepIndex = STEP_ACTION_CONFIG.find(
                (s) => s.actionVariant === "questionnaire",
              )?.stepIndex ?? -1;
              const questionnaireEligible = selectedItems.filter((item) => {
                const currentStep = getRecordStepIndex(item.batteryProgress, approvalSteps.length);
                return currentStep === questionnaireStepIndex;
              });
              const bulkSyncProgressPercent =
                latestBulkSyncJob && latestBulkSyncJob.totalContacts > 0
                  ? Math.round(
                      (latestBulkSyncJob.processedContacts / latestBulkSyncJob.totalContacts) *
                        100,
                    )
                  : 0;

              return (
                <div className="flex w-full flex-wrap items-center justify-between gap-2">
                  <p className="text-muted-foreground text-xs">
                    {selectedItems.length} selected
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {CONTACT_UPDATE_ACTION_BUTTONS.map((action) => {
                      const eligible = eligibleByAction.get(action.type) ?? [];
                      const hasEligible = eligible.length > 0;
                      return (
                        <Button
                          key={action.type}
                          type="button"
                          size="sm"
                          variant="secondary"
                          className={`justify-start rounded-md ${quickActionButtonSizeClass} ${boardThemeStyles.actionButtonClassName}`}
                          style={boardThemeInlineStyles.actionButtonStyle}
                          disabled={!!bulkQuickActionType || !hasEligible}
                          onClick={() => {
                            bulkClearSelectionRef.current = clearSelection;
                            setBulkQuickActionConfirmation({
                              action,
                              selectedItems: eligible,
                            });
                            if (eligible.length < selectedItems.length) {
                              toast(
                                `${selectedItems.length - eligible.length} contact${selectedItems.length - eligible.length === 1 ? "" : "s"} skipped (not at this step)`,
                              );
                            }
                          }}
                        >
                          {bulkQuickActionType === action.type
                            ? "Applying..."
                            : `${action.label} (${eligible.length})`}
                        </Button>
                      );
                    })}
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className={`justify-start rounded-md ${quickActionButtonSizeClass} ${boardThemeStyles.actionButtonClassName}`}
                      style={boardThemeInlineStyles.actionButtonStyle}
                      disabled={!!bulkQuickActionType || questionnaireEligible.length === 0}
                      onClick={() => {
                        openQuestionnaireDialogForRecords([...questionnaireEligible]);
                        if (questionnaireEligible.length < selectedItems.length) {
                          toast(
                            `${selectedItems.length - questionnaireEligible.length} contact${selectedItems.length - questionnaireEligible.length === 1 ? "" : "s"} skipped (not at questionnaire step)`,
                          );
                        }
                      }}
                    >
                      {`${QUESTIONNAIRE_UPDATE_ACTION.label} (${questionnaireEligible.length})`}
                    </Button>
                    {isMondaySettingsAdmin && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className={`justify-start rounded-md ${quickActionButtonSizeClass}`}
                        disabled={!!bulkQuickActionType || syncingContactIds.size > 0}
                        onClick={() => {
                          void (async () => {
                            try {
                              const items = [...selectedItems];
                              const job = await startBulkSyncJob(items);
                              clearSelection();
                              toast.success(
                                `Bulk sync started for ${job.totalContacts} contact${job.totalContacts === 1 ? "" : "s"}`,
                              );
                            } catch (error) {
                              toast.error(
                                error instanceof Error
                                  ? error.message
                                  : "Failed to start bulk sync",
                              );
                            }
                          })();
                        }}
                      >
                        {syncingContactIds.has("__bulk_sync__")
                          ? latestBulkSyncJob
                            ? `Syncing ${latestBulkSyncJob.processedContacts}/${latestBulkSyncJob.totalContacts}...`
                            : "Syncing..."
                          : `Sync Users (${selectedItems.length})`}
                      </Button>
                    )}
                    {isMondaySettingsAdmin &&
                    latestBulkSyncJob &&
                    latestBulkSyncJob.status === "running" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className={`justify-start rounded-md ${quickActionButtonSizeClass}`}
                        onClick={() => {
                          void (async () => {
                            try {
                              await cancelBulkSyncJob(latestBulkSyncJob.jobId);
                            } catch (error) {
                              toast.error(
                                error instanceof Error
                                  ? error.message
                                  : "Failed to cancel bulk sync",
                              );
                            }
                          })();
                        }}
                      >
                        Cancel Bulk Sync
                      </Button>
                    ) : null}
                    {isMondaySettingsAdmin &&
                    latestBulkSyncJob &&
                    latestBulkSyncJob.status !== "running" &&
                    latestBulkSyncJob.failedContacts > 0 ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className={`justify-start rounded-md ${quickActionButtonSizeClass}`}
                        disabled={syncingContactIds.has("__bulk_sync__")}
                        onClick={() => {
                          void (async () => {
                            try {
                              const result = await retryFailedBulkSyncJob(
                                latestBulkSyncJob.jobId,
                              );
                              toast.success(
                                `Retry started for ${result.retriedContacts ?? 0} failed contact${result.retriedContacts === 1 ? "" : "s"}`,
                              );
                            } catch (error) {
                              toast.error(
                                error instanceof Error
                                  ? error.message
                                  : "Failed to retry failed bulk sync contacts",
                              );
                            }
                          })();
                        }}
                      >
                        Retry Failed ({latestBulkSyncJob.failedContacts})
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={clearSelection}
                      disabled={!!bulkQuickActionType}
                    >
                      Clear
                    </Button>
                  </div>
                  {isMondaySettingsAdmin && latestBulkSyncJob ? (
                    <div className="w-full rounded-md border px-2 py-1">
                      <div className="mb-1 flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">
                          Bulk Sync {latestBulkSyncJob.status}
                        </span>
                        <span className="text-muted-foreground">
                          {latestBulkSyncJob.processedContacts}/{latestBulkSyncJob.totalContacts}
                        </span>
                      </div>
                      <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                        <div
                          className="bg-primary h-full transition-[width] duration-300 ease-out"
                          style={{ width: `${Math.max(0, Math.min(100, bulkSyncProgressPercent))}%` }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            }}
          />
        )}

        <p className="text-muted-foreground px-1 text-xs font-medium">
          {filteredRecordCountLabel}
        </p>

        <Dialog
          open={!!bulkQuickActionConfirmation}
          onOpenChange={(open) => {
            if (open) return;
            if (bulkQuickActionType) return;
            setBulkQuickActionConfirmation(null);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Bulk Quick Action</DialogTitle>
              <DialogDescription>
                {bulkQuickActionConfirmation
                  ? `Apply "${bulkQuickActionConfirmation.action.label}" to ${bulkQuickActionConfirmation.selectedItems.length} selected record${bulkQuickActionConfirmation.selectedItems.length === 1 ? "" : "s"}?`
                  : "Confirm this bulk action."}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setBulkQuickActionConfirmation(null)}
                disabled={!!bulkQuickActionType}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const confirmation = bulkQuickActionConfirmation;
                  if (!confirmation) return;
                  setBulkQuickActionConfirmation(null);
                  void handleBulkQuickActionUpdates(
                    confirmation.selectedItems,
                    () => bulkClearSelectionRef.current?.(),
                    confirmation.action,
                  );
                }}
                disabled={!!bulkQuickActionType}
              >
                {bulkQuickActionType ? "Applying..." : "Confirm"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={!!kanbanMoveConfirmation}
          onOpenChange={(open) => {
            if (open) return;
            if (isExecutingKanbanMove) return;
            setKanbanMoveConfirmation(null);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Move</DialogTitle>
              <DialogDescription>
                {kanbanMoveConfirmation
                  ? `Move "${kanbanMoveConfirmation.record.name}" ${kanbanMoveConfirmation.direction === "forward" ? "forward to" : "back to"} "${kanbanMoveConfirmation.toStepIndex === 0
                    ? "Not Started"
                    : approvalSteps[kanbanMoveConfirmation.toStepIndex - 1]?.title ?? `Step ${kanbanMoveConfirmation.toStepIndex}`
                  }"?`
                  : "Confirm this move."}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setKanbanMoveConfirmation(null)}
                disabled={isExecutingKanbanMove}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!kanbanMoveConfirmation) return;
                  void handleKanbanStepMove(kanbanMoveConfirmation);
                }}
                disabled={isExecutingKanbanMove}
              >
                {isExecutingKanbanMove ? "Moving..." : "Confirm"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      <Dialog
        open={!!resumePreview}
        onOpenChange={(open) => {
          if (!open) setResumePreview(null);
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              Resume · {resumePreview?.recordName ?? "Contact"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Resume preview dialog with open in new tab fallback.
            </DialogDescription>
          </DialogHeader>
          {resumePreview ? (
            <div className="space-y-3">
              {(() => {
                const lowerName = resumePreview.fileName.toLowerCase();
                const isPdf = lowerName.endsWith(".pdf");
                const isDocxDocument =
                  lowerName.endsWith(".docx") ||
                  lowerName.endsWith(".docm") ||
                  lowerName.endsWith(".dotx") ||
                  lowerName.endsWith(".dotm");
                const isLegacyWordDocument =
                  lowerName.endsWith(".doc") ||
                  lowerName.endsWith(".rtf");
                const officeEmbedUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
                  resumePreview.href,
                )}`;
                const isImage =
                  lowerName.endsWith(".png") ||
                  lowerName.endsWith(".jpg") ||
                  lowerName.endsWith(".jpeg") ||
                  lowerName.endsWith(".gif") ||
                  lowerName.endsWith(".webp") ||
                  lowerName.endsWith(".svg");
                return (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-medium">{resumePreview.fileName}</p>
                      <a
                        href={resumePreview.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary text-xs underline"
                      >
                        Open in new tab
                      </a>
                    </div>
                    <div className="bg-muted/20 h-[65vh] overflow-hidden rounded-md border">
                      {isPdf ? (
                        <PdfResumePreview
                          fileUrl={resumePreview.href}
                          fileName={resumePreview.fileName}
                        />
                      ) : isDocxDocument ? (
                        <DocxResumePreview
                          fileUrl={resumePreview.href}
                          fileName={resumePreview.fileName}
                        />
                      ) : isLegacyWordDocument ? (
                        <iframe
                          src={officeEmbedUrl}
                          title={`Word preview: ${resumePreview.fileName}`}
                          className="h-full w-full border-0 bg-white"
                        />
                      ) : isImage ? (
                        <object
                          data={resumePreview.href}
                          className="h-full w-full"
                        >
                          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
                            <p className="text-sm font-medium">Image preview unavailable</p>
                            <a
                              href={resumePreview.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary text-xs underline"
                            >
                              Open resume in new tab
                            </a>
                          </div>
                        </object>
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
                          <p className="text-sm font-medium">
                            This file type cannot be previewed inline.
                          </p>
                          <a
                            href={resumePreview.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary text-xs underline"
                          >
                            Open resume in new tab
                          </a>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!sendEmailRecord}
        onOpenChange={(open) => {
          if (!open) closeSendEmailDialog();
        }}
      >
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-scroll border-slate-200 bg-[#f8faff]">
          <DialogHeader>
            <DialogTitle>Send Email</DialogTitle>
          </DialogHeader>
          {sendEmailRecord ? (
            <div className="space-y-4">
              <div className="rounded-md border border-blue-100 bg-[#eef4ff] px-3 py-2 text-sm text-slate-700">
                Recipient:{" "}
                <span className="font-medium text-slate-900">
                  {sendEmailRecord.name}
                  {" · "}
                  {sendEmailRecord.email ?? "No email"}
                </span>
              </div>
              {sendEmailStep === 1 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Step 1: Choose an email template
                  </p>
                  <div className="max-h-[420px] overflow-y-auto rounded-md border border-blue-100 bg-[#f3f7ff] p-2">
                    <div className="grid gap-2 md:grid-cols-2">
                      {emailTemplates.map((template) => {
                        const isActive = template.id === sendEmailTemplateId;
                        const resolvedTemplateName = interpolateTemplateVariables(
                          template.name,
                          {
                            ownerName: sendEmailOwnerVars.ownerName,
                            ownerEmail: sendEmailOwnerVars.ownerEmail,
                          },
                        );
                        const resolvedRenderedHtml = interpolateTemplateVariables(
                          template.renderedHtml,
                          {
                            ownerName: sendEmailOwnerVars.ownerName,
                            ownerEmail: sendEmailOwnerVars.ownerEmail,
                          },
                        );
                        const resolvedContent = interpolateTemplateVariables(
                          template.content,
                          {
                            ownerName: sendEmailOwnerVars.ownerName,
                            ownerEmail: sendEmailOwnerVars.ownerEmail,
                          },
                        );
                        const hasRenderedHtml = resolvedRenderedHtml.trim().length > 0;
                        const hasPlainContent = resolvedContent.trim().length > 0;
                        return (
                          <button
                            key={template.id}
                            type="button"
                            className={[
                              "w-full rounded-md border p-3 text-left text-sm shadow-sm transition-all",
                              isActive
                                ? "border-blue-400 bg-blue-50 ring-2 ring-blue-200"
                                : "border-blue-100 bg-white hover:border-blue-300 hover:bg-blue-50/60",
                            ].join(" ")}
                            onClick={() => {
                              setSendEmailTemplateId(template.id);
                            }}
                          >
                            <p className="line-clamp-1 font-medium text-slate-900">
                              {resolvedTemplateName}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Updated {formatUpdatedAt(template.updatedAt)}
                            </p>
                            <div className="mt-2 h-28 overflow-hidden rounded-md border border-slate-200 bg-[#fcfdff] p-2">
                              {hasRenderedHtml ? (
                                <div
                                  className="prose prose-sm max-w-none scale-[0.92] origin-top-left **:wrap-break-word"
                                  style={{ whiteSpace: "pre-wrap" }}
                                  dangerouslySetInnerHTML={{
                                    __html: resolvedRenderedHtml,
                                  }}
                                />
                              ) : hasPlainContent ? (
                                <p className="line-clamp-6 whitespace-pre-wrap text-xs leading-snug text-slate-600">
                                  {resolvedContent}
                                </p>
                              ) : (
                                <p className="text-xs text-slate-500">No preview content.</p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {emailTemplates.length === 0 && !emailTemplatesQuery.isLoading ? (
                      <p className="text-muted-foreground text-sm">
                        No templates found.
                      </p>
                    ) : null}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={closeSendEmailDialog}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => setSendEmailStep(2)}
                      disabled={!sendEmailTemplate}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}

              {sendEmailStep === 2 ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Step 2: Preview template</p>
                  <div className="rounded-md border p-4">
                    {sendEmailTemplate ? (
                      <>
                        <p className="text-xs font-semibold tracking-wide uppercase">Subject</p>
                        <p className="mt-1 text-base font-medium">
                          {sendEmailResolvedTemplate?.subject ?? sendEmailTemplate.name}
                        </p>
                        <p className="mt-3 text-xs font-semibold tracking-wide uppercase">
                          Email Preview (Lead View)
                        </p>
                        <div className="bg-card mt-2 rounded-md border p-4">
                          {(sendEmailResolvedTemplate?.text ?? "").trim().length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                              No content found in template.
                            </p>
                          ) : (sendEmailResolvedTemplate?.html ?? "").trim().length > 0 ? (
                            <div
                              className="prose prose-sm dark:prose-invert max-w-none **:wrap-break-word"
                              style={{ whiteSpace: "pre-wrap" }}
                              dangerouslySetInnerHTML={{
                                __html: sendEmailResolvedTemplate?.html ?? "",
                              }}
                            />
                          ) : (
                            <div className="whitespace-pre-wrap text-sm leading-relaxed">
                              {sendEmailResolvedTemplate?.text ?? ""}
                            </div>
                          )}
                        </div>
                      </>
                    ) : emailTemplatesQuery.isLoading ? (
                      <p className="text-muted-foreground text-sm">Loading templates…</p>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        No templates found. Choose another action or add templates in settings.
                      </p>
                    )}
                  </div>
                  <div className="flex justify-between gap-2">
                    <Button variant="outline" onClick={() => setSendEmailStep(1)}>
                      Back
                    </Button>
                    <Button
                      onClick={() => setSendEmailStep(3)}
                      disabled={!sendEmailTemplate}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}

              {sendEmailStep === 3 && sendEmailTemplate ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Step 3: Confirm send</p>
                  <div className="space-y-3 rounded-md border p-4 text-sm">
                    <p>Are you sure you want to send this email?</p>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold tracking-wide uppercase">
                        From mailbox
                      </p>
                      {outlookTeamMailboxesQuery.isLoading ||
                      outlookTeamMailboxesQuery.isFetching ? (
                        <p className="text-muted-foreground text-xs">
                          Loading mailbox options…
                        </p>
                      ) : sendEmailMailboxOptions.length === 0 ? (
                        <p className="text-muted-foreground text-xs">
                          No team sender mailboxes are configured for this workspace.
                        </p>
                      ) : (
                        <select
                          value={sendEmailOwnerUserId}
                          onChange={(event) => {
                            setSendEmailOwnerUserId(event.target.value);
                          }}
                          className="bg-background border-input h-9 w-full rounded-md border px-2 text-xs shadow-sm"
                          disabled={
                            isSendingEmail ||
                            outlookTeamMailboxesQuery.isLoading ||
                            outlookTeamMailboxesQuery.isFetching
                          }
                        >
                          <option value="">Select sender mailbox</option>
                          {sendEmailMailboxOptions.map((mailbox) => {
                            const displayName =
                              mailbox.name?.trim() ||
                              mailbox.mailboxDisplayName?.trim() ||
                              mailbox.userEmail?.trim() ||
                              mailbox.mondayUserId;
                            const mailboxEmail =
                              mailbox.mailboxEmail?.trim() ||
                              mailbox.userEmail?.trim() ||
                              "no mailbox email";
                            return (
                              <option
                                key={mailbox.mondayUserId}
                                value={mailbox.mondayUserId}
                              >
                                {`${displayName} • ${mailboxEmail} • ${mailbox.connected ? "connected" : "not connected"}`}
                              </option>
                            );
                          })}
                        </select>
                      )}
                      {selectedSendEmailMailbox ? (
                        <p
                          className={`text-xs ${selectedSendEmailMailbox.connected ? "text-emerald-700" : "text-rose-600"}`}
                        >
                          {selectedSendEmailMailbox.connected
                            ? "Selected mailbox is connected and ready."
                            : "Selected mailbox is not connected. Connect Outlook before sending."}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex justify-between gap-2">
                    <Button variant="outline" onClick={() => setSendEmailStep(2)}>
                      Back
                    </Button>
                    <Button
                      onClick={() => {
                        void handleConfirmSendEmail();
                      }}
                      disabled={!sendEmailCanSubmit}
                    >
                      {isSendingEmail ? "Sending..." : "Send Email"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      </div>
      <HelpDeskDialog
        open={helpDeskOpen}
        onOpenChange={(v) => {
          setHelpDeskOpen(v);
          if (!v) setHelpDeskLinkedContact(null);
        }}
        linkedContact={helpDeskLinkedContact}
        sessionToken={sessionToken}
        currentUserId={forcedOwnerId || identity?.userId || null}
      />

      {!staticMode && recordsQuery.hasNextPage && shouldAutoLoadMore ? (
        <div ref={loadMoreAnchorRef} className="h-2" />
      ) : null}
    </div>
    </UserSettingsProvider>
    </GuidedTourProvider>
  );
}

export default function MondayBoardPage() {
  return <MondayBoardView viewMode="all" />;
}
