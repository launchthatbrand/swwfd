"use client";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Skeleton } from "~/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  BriefcaseBusiness,
  Columns3,
  Filter,
  LayoutGrid,
  Pencil,
  CircleHelp,
  List,
  MoreHorizontal,
  MessageSquareText,
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
import { EntityList } from "@launchthatapp/ui/entity-list";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useAction,
  useConvex,
  useMutation as useConvexMutation,
} from "convex/react";
import { api } from "@convex-config/_generated/api";

import { Badge } from "@launchthatapp/ui/badge";
import { Button } from "@launchthatapp/ui/button";
import { Calendar } from "@launchthatapp/ui/calendar";

import { Input } from "@launchthatapp/ui/input";
import type { MondayClientSdk } from "monday-sdk-js";
import { MultiSelect } from "~/components/ui/multi-select";
import { Textarea } from "@launchthatapp/ui/textarea";
import mondaySdkInitialize from "monday-sdk-js";
import { toast } from "@launchthatapp/ui/toast";
import { DEFAULT_QUESTIONNAIRE_FIELD_OPTIONS } from "~/components/forms/questionaire-form";

import type {
  AddNewContactValues,
  AdvancedFilterCondition,
  AdvancedFilterField,
  AdvancedFilterMatchMode,
  AdvancedFilterOperator,
  ApprovalStepConfig,
  KanbanMoveConfirmation,
  GridSortState,
  MondayBoardViewMode,
  MondayBulkSyncJob,
  MondayBulkSyncStatusResponse,
  MondayBoardViewProps,
  MondayContactCandidate,
  MondayContactsLookupResponse,
  MondayCreateContactResponse,
  MondayCreateRecordUpdateResponse,
  MondayEmailTemplate,
  MondayEmailSystemTag,
  MondayEmailTemplatesResponse,
  MondayFeatureFlags,
  MondayFeatureFlagsResponse,
  MondayIdentity,
  MondayJobListing,
  MondayJobsResponse,
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
  MondaySendEmailBatchResponse,
  MondayUserBoardSettingsResponse,
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
  GRID_SORT_OPTIONS,
  isEmbeddedMondaySessionToken,
  isUserBoardColorTheme,
  isUserBoardDisplayMode,
  isUserBoardFontSize,
  isUserBoardPageSize,
  isUserBoardRecordSource,
  isUserBoardTableDensity,
  KANBAN_STEP_CONFIG,
  LAST_INTERACTION_DATE_COLUMN_ID,
  MONDAY_DEV_BYPASS_TOKEN,
  QUESTIONNAIRE_ENTRY_LEVEL_OPTIONS,
  QUESTIONNAIRE_TRANSPORTATION,
  QUESTIONNAIRE_SKILLED_OPTIONS,
  QUESTIONNAIRE_WORK_SCHEDULE,
  QUESTIONNAIRE_YES_NO,
  SUBITEM_INTERNAL_EXTERNAL_COLUMN_ID,
  SUBITEM_NOTES_COLUMN_ID,
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
  createAdvancedFilterCondition,
  createAdvancedFilterId,
  doesRecordMatchAdvancedFilters,
  extractBoardIdFromContextPayload,
  extractThemeFromContextPayload,
  formatUpdatedAt,
  getMonthBounds,
  getNameInitials,
  getApprovalStepProgress,
  getRecordStepIndexFromApprovalSteps,
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
  sortRecordsForGrid,
  sortFiscalYearTagsDesc,
  splitCsvValues,
  toDateOnly,
  toDateOnlyLocal,
  uniqueSorted,
  getAdvancedOperatorsForField,
  getDefaultAdvancedOperatorForField,
  isAdvancedDateField,
  isAdvancedDateOperator,
  doesRecordMatchAdvancedCondition,
  getBoardColumnTargetForCondition,
  getRecordFieldValuesForCondition,
  normalizeAdvancedDate,
  getRecordFieldValues,
  LEGACY_FIELD_TO_BOARD_COLUMN_LABEL,
} from "./helpers";

import { fetchMondayApi } from "./services/monday-api";

import {
  AddContactDialog,
  OnboardingContractorStepDialogs,
  MarkAsHiredWorkflowDialog,
  RecordMetaDialogs,
  RetentionDialog,
  BoardAuxDialogs,
  BoardViewModeToggle,
  BulkQuestionnaireDialogs,
  CommunicationDialogs,
  ContactBulkActionsBar,
  ContactDialogRightPanel,
  ContactHistoryDialog,
  buildBoardEntityActions,
  buildBoardTableColumns,
  ContactUpdates,
  DocxResumePreview,
  GuidedTourProvider,
  GridSortToolbar,
  HelpDeskDialog,
  GridBoardView,
  KanbanBoardView,
  MondayChatView,
  PdfResumePreview,
  ResumeReferralStepDialog,
  SendEmailDialog,
  TableBoardView,
  UserSettingsProvider,
} from "./components";
import {
  buildDefaultPlatformSettings,
  buildSubitemName,
  COMMUNICATION_QUICK_ACTIONS,
  type BulkCommunicationQuickActionState,
  type BulkUniqueCommunicationSession,
  type ContactJobRow,
  type MergeFieldKey,
  MERGE_FIELD_CONFIG,
  parseJobReferralHistoryFromText,
  type ReferredJobHistoryRow,
  toTimeOnly,
} from "./board-local";
import { useAdvancedFilters } from "./hooks/useAdvancedFilters";
import { useBulkActions } from "./hooks/useBulkActions";
import { useBulkSyncMutations } from "./hooks/useBulkSyncMutations";
import { useCommunicationActions } from "./hooks/useCommunicationActions";
import {
  useMondayContactQueries,
  type ContactColumnEntry,
} from "./hooks/useMondayContactQueries";
import { useMondayEmailQueries } from "./hooks/useMondayEmailQueries";
import { useMondayPlatformQueries } from "./hooks/useMondayPlatformQueries";
import { useMondayRecordsQuery } from "./hooks/useMondayRecordsQuery";
import { useMondayUserQueries } from "./hooks/useMondayUserQueries";
import { useContactDialogController } from "./hooks/useContactDialogController";
import { useContactDialogOnboardingStepperProps } from "./hooks/useContactDialogOnboardingStepperProps";
import { useKanbanActions } from "./hooks/useKanbanActions";
import { useMondayBoardQueries } from "./hooks/useMondayBoardQueries";
import { useMondayRecords } from "./hooks/useMondayRecords";
import { useMondaySession } from "./hooks/useMondaySession";
import { useMondaySettings } from "./hooks/useMondaySettings";
import { useOnboardingWorkflows } from "./hooks/useOnboardingWorkflows";
import { useSendEmailFlow } from "./hooks/useSendEmailFlow";

const MASTER_ADMIN_USER_ID = "53441186";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_PLATFORM_SETTINGS = buildDefaultPlatformSettings(MASTER_ADMIN_USER_ID);
const EMAIL_TEMPLATE_TAG_KEY_PATTERN = /^[a-z][a-z0-9_.-]*$/;
const INTERVIEWING_STEP_COLUMN_ID = "color_mm1dgeqy";
const HIRED_STEP_COLUMN_ID = "color_mm1d80yc";
const SCREENING_STEP_COLUMN_ID =
  APPROVAL_STEP_COLUMN_ID_BY_UPDATE_TYPE.questionnaire ?? "color_mm1dwr4k";
const RESUME_STEP_COLUMN_ID = APPROVAL_STEP_COLUMN_ID_BY_UPDATE_TYPE.resume ?? "color_mm1dnr11";

export function MondayBoardView({
  viewMode = "all",
  initialOwnerFilter,
  forcedOwnerId: forcedOwnerIdProp,
}: MondayBoardViewProps) {
  const isTouchScopedView = viewMode === "userScoped";
  const [userScopedDisplayMode, setUserScopedDisplayMode] = useState<UserBoardDisplayMode>("table");
  const isViewportLockedBoardMode =
    userScopedDisplayMode === "kanban" || userScopedDisplayMode === "chat";

  useEffect(() => {
    if (typeof document === "undefined") return;

    const body = document.body;
    const html = document.documentElement;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscrollBehavior = body.style.overscrollBehavior;
    const previousHtmlOverflow = html.style.overflow;
    const previousHtmlOverscrollBehavior = html.style.overscrollBehavior;

    if (isViewportLockedBoardMode) {
      body.style.overflow = "hidden";
      body.style.overscrollBehavior = "none";
      html.style.overflow = "hidden";
      html.style.overscrollBehavior = "none";
    } else {
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscrollBehavior;
      html.style.overflow = previousHtmlOverflow;
      html.style.overscrollBehavior = previousHtmlOverscrollBehavior;
    }

    return () => {
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscrollBehavior;
      html.style.overflow = previousHtmlOverflow;
      html.style.overscrollBehavior = previousHtmlOverscrollBehavior;
    };
  }, [isViewportLockedBoardMode]);
  const [gridSort, setGridSort] = useState<GridSortState>({
    field: "createdAt",
    direction: "desc",
  });
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
  const [communicationQuickAction, setCommunicationQuickAction] =
    useState<CommunicationQuickActionDefinition | null>(null);
  const [bulkCommunicationModePrompt, setBulkCommunicationModePrompt] =
    useState<BulkCommunicationQuickActionState | null>(null);
  const [bulkCommunicationQuickAction, setBulkCommunicationQuickAction] =
    useState<BulkCommunicationQuickActionState | null>(null);
  const [isCreatingBulkCommunicationUpdate, setIsCreatingBulkCommunicationUpdate] = useState(false);
  const [bulkUniqueCommunicationSession, setBulkUniqueCommunicationSession] =
    useState<BulkUniqueCommunicationSession | null>(null);
  const [bulkUniqueCommunicationIndex, setBulkUniqueCommunicationIndex] = useState(0);
  const [bulkUniqueCommunicationSubmittedTargetIds, setBulkUniqueCommunicationSubmittedTargetIds] =
    useState<Set<string>>(() => new Set());
  const bulkUniqueDraftValuesByTargetIdRef = useRef<
    Map<
      string,
      {
        body: string;
        methodOfCommunication: CommunicationQuickActionMethod;
        date: string;
        time: string;
      }
    >
  >(new Map());
  const [bulkUniqueCommunicationBody, setBulkUniqueCommunicationBody] = useState("");
  const [bulkUniqueCommunicationMethod, setBulkUniqueCommunicationMethod] =
    useState<CommunicationQuickActionMethod>("Email");
  const [bulkUniqueCommunicationDate, setBulkUniqueCommunicationDate] = useState(
    toDateOnly(new Date()),
  );
  const [bulkUniqueCommunicationTime, setBulkUniqueCommunicationTime] = useState(
    toTimeOnly(new Date()),
  );
  const [contactDialogTab, setContactDialogTab] = useState("updates");
  const [referringJobId, setReferringJobId] = useState<string | null>(null);
  const [contactDialogSelectedResumeKey, setContactDialogSelectedResumeKey] = useState<string | null>(null);
  const [editingContactColumnId, setEditingContactColumnId] = useState<string | null>(null);
  const [editingContactColumnDraft, setEditingContactColumnDraft] = useState("");
  const [isSavingContactColumn, setIsSavingContactColumn] = useState(false);
  const [syncContactBoardPickerRecord, setSyncContactBoardPickerRecord] =
    useState<MondayRecord | null>(null);
  const [syncContactBoardSelection, setSyncContactBoardSelection] = useState("");
  const hasHydratedInitialQueryParamsRef = useRef(false);
  const [bulkQuickActionType, setBulkQuickActionType] = useState<
    Exclude<ContactUpdateType, "general"> | null
  >(null);
  const [bulkQuickActionConfirmation, setBulkQuickActionConfirmation] = useState<{
    action: QuickContactActionButton;
    selectedItems: MondayRecord[];
  } | null>(null);
  const [mergeDialogState, setMergeDialogState] = useState<{
    records: MondayRecord[];
    masterRecordId: string;
    fieldSourceByKey: Record<MergeFieldKey, string>;
  } | null>(null);
  const [isMergingRecords, setIsMergingRecords] = useState(false);
  const [questionnaireDialogRecords, setQuestionnaireDialogRecords] = useState<
    MondayRecord[]
  >([]);
  const [crossViewSelectedRecordIds, setCrossViewSelectedRecordIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [bulkQuestionnaireEmailRecords, setBulkQuestionnaireEmailRecords] = useState<
    MondayRecord[]
  >([]);
  const [bulkQuickEmailAction, setBulkQuickEmailAction] = useState<QuickContactActionButton | null>(
    null,
  );
  const [bulkQuestionnaireEmailIndex, setBulkQuestionnaireEmailIndex] = useState(0);
  const [bulkQuestionnaireTemplateId, setBulkQuestionnaireTemplateId] = useState<string | null>(null);
  const [bulkQuestionnaireSentTargetIds, setBulkQuestionnaireSentTargetIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [isSendingBulkQuestionnaireEmail, setIsSendingBulkQuestionnaireEmail] = useState(false);
  const bulkClearSelectionRef = useRef<(() => void) | null>(null);
  const mergeClearSelectionRef = useRef<(() => void) | null>(null);
  const [kanbanMoveConfirmation, setKanbanMoveConfirmation] =
    useState<KanbanMoveConfirmation | null>(null);
  const [isExecutingKanbanMove, setIsExecutingKanbanMove] = useState(false);
  const [retentionDraft, setRetentionDraft] = useState({
    referredToContractors: [] as string[],
    hiredWithContractor: "",
    hireDate: "",
    retentionPeriod: "",
  });
  const [resumeReferralDialogState, setResumeReferralDialogState] = useState<{
    targetRecordId: string;
    selectedContractors: string[];
  } | null>(null);
  const [interviewingContractorDialogState, setInterviewingContractorDialogState] = useState<{
    targetRecordId: string;
    stepColumnId: string;
    selectedContractors: string[];
    availableContractors: string[];
  } | null>(null);
  const [hiredContractorDialogState, setHiredContractorDialogState] = useState<{
    targetRecordId: string;
    stepColumnId: string;
    selectedContractor: string;
    availableContractors: string[];
  } | null>(null);
  const [markAsHiredWorkflowDialogState, setMarkAsHiredWorkflowDialogState] = useState<{
    targetRecordId: string;
    referredToContractors: string[];
    hiredWithContractor: string;
    hireDate: string;
    availableContractors: string[];
    screeningAlreadyDone: boolean;
  } | null>(null);
  const [tagsDraft, setTagsDraft] = useState<string[]>([]);
  const [statusDraft, setStatusDraft] = useState("");
  const [ownerDraft, setOwnerDraft] = useState("");
  const [isSavingRetention, setIsSavingRetention] = useState(false);
  const [isSavingResumeReferralStep, setIsSavingResumeReferralStep] = useState(false);
  const [isSavingInterviewingStep, setIsSavingInterviewingStep] = useState(false);
  const [isSavingHiredStep, setIsSavingHiredStep] = useState(false);
  const [isSavingMarkAsHiredWorkflow, setIsSavingMarkAsHiredWorkflow] = useState(false);
  const [retentionHireDatePopoverOpen, setRetentionHireDatePopoverOpen] =
    useState(false);
  const [markAsHiredHireDatePopoverOpen, setMarkAsHiredHireDatePopoverOpen] =
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
    internalExternalStatus?: "Internal" | "External";
  } | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [pendingOnboardingActionsByTargetId, setPendingOnboardingActionsByTargetId] =
    useState<Record<string, boolean>>({});
  const [featureFlags, setFeatureFlags] = useState<MondayFeatureFlags>(
    DEFAULT_MONDAY_FEATURE_FLAGS,
  );
  const [platformSettings, setPlatformSettings] = useState<MondayPlatformSettings>({
    ...DEFAULT_PLATFORM_SETTINGS,
  });
  const [platformSettingsDraft, setPlatformSettingsDraft] = useState<MondayPlatformSettings>({
    ...DEFAULT_PLATFORM_SETTINGS,
  });
  const [newEmailSystemTagKey, setNewEmailSystemTagKey] = useState("");
  const [newEmailSystemTagColumnId, setNewEmailSystemTagColumnId] = useState("");
  const [isSavingPlatformSettings, setIsSavingPlatformSettings] = useState(false);
  const [isSavingFeatureFlags, setIsSavingFeatureFlags] = useState(false);
  const [isConnectingOutlook, setIsConnectingOutlook] = useState(false);
  const [isDisconnectingOutlook, setIsDisconnectingOutlook] = useState(false);
  const [isConnectingZoho, setIsConnectingZoho] = useState(false);
  const [isDisconnectingZoho, setIsDisconnectingZoho] = useState(false);
  const [routingRerunItemId, setRoutingRerunItemId] = useState("");
  const [isRunningRoutingRerun, setIsRunningRoutingRerun] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeMonth, setActiveMonth] = useState(
    () => new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)),
  );
  const [isGlobalDateScope, setIsGlobalDateScope] = useState(false);
  const loadMoreAnchorRef = useRef<HTMLDivElement | null>(null);
  const monday = useMemo<MondayClientSdk>(() => {
    const sdk: MondayClientSdk = mondaySdkInitialize();
    console.info("[MondayThemeSync] Initialized monday-sdk-js instance");
    return sdk;
  }, []);

  const setOnboardingActionPending = useCallback(
    (targetRecordId: string, pending: boolean) => {
      const normalizedTargetRecordId = targetRecordId.trim();
      if (!normalizedTargetRecordId) return;
      setPendingOnboardingActionsByTargetId((prev) => {
        if (pending) {
          if (prev[normalizedTargetRecordId]) return prev;
          return { ...prev, [normalizedTargetRecordId]: true };
        }
        if (!prev[normalizedTargetRecordId]) return prev;
        const next = { ...prev };
        delete next[normalizedTargetRecordId];
        return next;
      });
    },
    [],
  );

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
  const normalizeEmailSystemTags = useCallback((values: MondayEmailSystemTag[]) => {
    const deduped = new Map<string, MondayEmailSystemTag>();
    for (const entry of values) {
      const tag = entry.tag.trim().toLowerCase();
      const columnId = entry.columnId.trim();
      const columnTitle = entry.columnTitle.trim();
      if (!EMAIL_TEMPLATE_TAG_KEY_PATTERN.test(tag)) continue;
      if (!/^[a-zA-Z0-9_]+$/.test(columnId)) continue;
      const key = `${tag}:${columnId}`;
      deduped.set(key, {
        tag,
        columnId,
        columnTitle: columnTitle.length > 0 ? columnTitle : columnId,
      });
    }
    return Array.from(deduped.values()).sort((a, b) => a.tag.localeCompare(b.tag));
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
      emailSystemTags: normalizeEmailSystemTags(platformSettings.emailSystemTags),
      monthlyBoardMappings: normalizeMonthlyBoardMappings(
        platformSettings.monthlyBoardMappings,
      ),
    }),
    [
      normalizeMonthlyBoardMappings,
      normalizeEmailSystemTags,
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
      emailSystemTags: normalizeEmailSystemTags(platformSettingsDraft.emailSystemTags),
      monthlyBoardMappings: normalizeMonthlyBoardMappings(
        platformSettingsDraft.monthlyBoardMappings,
      ),
    }),
    [
      normalizeMonthlyBoardMappings,
      normalizeEmailSystemTags,
      normalizeReplyToEmailList,
      normalizeUserIdList,
      platformSettingsDraft,
    ],
  );
  const platformMappingsSignature = (mappings: MondayPlatformSettings["monthlyBoardMappings"]) =>
    mappings.map((entry) => `${entry.monthKey}:${entry.boardId}`).join(",");
  const emailSystemTagsSignature = (tags: MondayEmailSystemTag[]) =>
    tags
      .map((entry) => `${entry.tag}:${entry.columnId}:${entry.columnTitle}`)
      .join(",");
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
    (platformSettingsNormalized.zohoSenderEmail ?? "") !==
    (platformSettingsDraftNormalized.zohoSenderEmail ?? "") ||
    (platformSettingsNormalized.zohoReplyToFallbackEmail ?? "") !==
    (platformSettingsDraftNormalized.zohoReplyToFallbackEmail ?? "") ||
    emailSystemTagsSignature(platformSettingsNormalized.emailSystemTags) !==
    emailSystemTagsSignature(platformSettingsDraftNormalized.emailSystemTags) ||
    platformMappingsSignature(platformSettingsNormalized.monthlyBoardMappings) !==
    platformMappingsSignature(platformSettingsDraftNormalized.monthlyBoardMappings);
  const canOverrideUserScopeOwner =
    viewMode === "userScoped" &&
    !hasForcedOwnerScope &&
    isMondayEmbeddedContext &&
    isMondaySettingsAdmin;
  const presetScopeOwnerId = useMemo(() => {
    if (viewMode === "all") return "__route_all__";
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
  const activeAdvancedFilterConditions = useMemo(
    () => advancedFilterConditions.filter((condition) => isAdvancedConditionActive(condition)),
    [advancedFilterConditions],
  );
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
  const resolveContactUpdateTargetRecordId = useCallback((record: MondayRecord) => {
    const contactId = record.contactId?.trim();
    if (contactId && contactId.length > 0) return contactId;
    return record.id;
  }, []);

  const sendEmailTargetRecordId =
    sendEmailRecord?.contactId?.trim() || sendEmailRecord?.id?.trim() || "";
  const bulkQuestionnaireActiveRecord =
    bulkQuestionnaireEmailRecords[bulkQuestionnaireEmailIndex] ?? null;
  const bulkQuestionnaireTargetRecordId = bulkQuestionnaireActiveRecord
    ? resolveContactUpdateTargetRecordId(bulkQuestionnaireActiveRecord)
    : "";

  const recordsQuery = useMondayRecordsQuery({
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
  });

  const shouldAutoLoadMore =
    !staticMode &&
    activeAdvancedFilterConditions.length === 0 &&
    (boardGeneralSettings.pageSize === 0 || isGlobalDateScope);
  const handleLoadMoreRecords = () => {
    if (recordsQuery.isFetchingNextPage) return;
    if (!recordsQuery.hasNextPage) return;
    void recordsQuery.fetchNextPage();
  };

  const {
    featureFlagsQuery: featureFlagsConvex,
    platformSettingsQuery: platformSettingsConvex,
    platformBoardColumnsQuery,
  } = useMondayPlatformQueries({
    sessionToken,
    staticMode,
    settingsOpen,
    isMasterAdmin,
  });

  const featureFlagsQuery = useMemo(
    () => ({
      data: staticMode ? undefined : featureFlagsConvex,
      error: null as Error | null,
      refetch: async () => { },
    }),
    [featureFlagsConvex, staticMode],
  );

  const platformSettingsQuery = useMemo(
    () => ({
      data: staticMode ? undefined : platformSettingsConvex,
      error: null as Error | null,
      refetch: async () => { },
    }),
    [platformSettingsConvex, staticMode],
  );

  const platformBoardColumnOptions = useMemo(
    () =>
      (platformBoardColumnsQuery.data ?? []).map((column) => ({
        ...column,
        label: `${column.title} (${column.id})`,
      })),
    [platformBoardColumnsQuery.data],
  );

  const {
    userProfileQuery,
    ownerDirectoryQuery,
    editOptionsQuery,
    userFilterPresetsQuery,
    userBoardSettingsQuery,
  } = useMondayUserQueries({
    sessionToken,
    staticMode,
    identityUserId: identity?.userId,
    accountId: identity?.accountId,
    presetScopeOwnerId,
    parseSavedAdvancedFilterPreset,
    parseUserBoardGeneralSettings,
  });

  const {
    emailTemplatesQuery,
    outlookStatusQuery,
    zohoStatusQuery,
    outlookTeamMailboxesQuery,
    sendEmailContactOwnerId,
  } = useMondayEmailQueries({
    sessionToken,
    staticMode,
    identityUserId: identity?.userId,
    settingsOpen,
    sendEmailRecord,
    bulkQuestionnaireEmailRecordsCount: bulkQuestionnaireEmailRecords.length,
    emailMarketingEnabled: featureFlags.emailMarketingEnabled,
  });

  const {
    contactUpdatesQuery,
    jobsQuery,
    contactColumnsQuery,
    routingStatusQuery,
    sendEmailContactColumnsQuery,
    bulkQuestionnaireContactColumnsQuery,
  } = useMondayContactQueries({
    sessionToken,
    staticMode,
    identityUserId: identity?.userId,
    settingsOpen,
    contactHistoryDialogRecord,
    contactDialogTab,
    sendEmailRecord,
    sendEmailTargetRecordId,
    bulkQuestionnaireTargetRecordId,
    bulkQuestionnaireEmailRecordsCount: bulkQuestionnaireEmailRecords.length,
    resolveContactUpdateTargetRecordId,
  });

  const convex = useConvex();

  const upsertFilterPreset = useConvexMutation(
    api.mondayUserFilterPresets.upsertForOwnerBoard,
  );
  const removeFilterPreset = useConvexMutation(
    api.mondayUserFilterPresets.removeForOwnerBoard,
  );
  const setPlatformSettingsMutation = useConvexMutation(api.mondaySettings.setPlatformSettings);
  const setFeatureFlagsMutation = useConvexMutation(api.mondaySettings.setFeatureFlags);
  const upsertUserBoardSettingsMutation = useConvexMutation(
    api.mondayUserBoardSettings.upsertForOwnerBoard,
  );

  const patchRecordAction = useAction(api.mondayRecordsNode.patchRecord);
  const patchRecordColumnAction = useAction(api.mondayRecordsNode.patchRecordColumn);
  const getRecordColumnsAction = useAction(api.mondayRecordsNode.getRecordColumns);
  const createRecordUpdateAction = useAction(api.mondayRecordsNode.createRecordUpdate);
  const resetApprovalStepAction = useAction(api.mondayRecordsNode.resetApprovalStep);
  const assignRoutingAction = useAction(api.mondayRoutingNode.assignOwnerByDistrict);
  const deleteSubitemAction = useAction(api.mondaySubitemsNode.deleteSubitem);
  const patchSubitemAction = useAction(api.mondaySubitemsNode.patchSubitem);

  const {
    latestBulkSyncJob,
    syncingContactIds,
    setSyncingContactIds,
    fetchBulkSyncStatus,
    startBulkSyncJob,
    cancelBulkSyncJob,
    retryFailedBulkSyncJob,
  } = useBulkSyncMutations({
    sessionToken,
    staticMode,
    isMondaySettingsAdmin,
    mondayAccountId: identity?.accountId,
    identityUserId: identity?.userId,
    mondayAppClientId: identity?.appClientId,
    monthlyBoardMappings: platformSettings.monthlyBoardMappings,
    resolveContactUpdateTargetRecordId,
    onJobCompleted: () => {
      void recordsQuery.refetch();
      if (contactHistoryDialogRecord) {
        void contactUpdatesQuery.refetch();
      }
    },
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
    const zohoParam = params.get("zoho");
    const zohoMessage = params.get("zohoMessage");

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
    if (zohoParam === "connected") {
      toast.success("Zoho account connected");
      void zohoStatusQuery.refetch();
    } else if (zohoParam === "error" && zohoMessage) {
      toast.error(zohoMessage);
    }
  }, [hasForcedOwnerScope, outlookStatusQuery, zohoStatusQuery]);

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
        | {
          type?: string;
          status?: "connected" | "error";
          message?: string | null;
        }
        | null;
      if (!data) return;
      if (data.type === "outlook-oauth-result") {
        if (data.status === "connected") {
          toast.success("Outlook account connected");
          void outlookStatusQuery.refetch();
        } else if (data.status === "error") {
          toast.error(data.message ?? "Outlook OAuth failed");
        }
        return;
      }
      if (data.type === "zoho-oauth-result") {
        if (data.status === "connected") {
          toast.success("Zoho account connected");
          void zohoStatusQuery.refetch();
        } else if (data.status === "error") {
          toast.error(data.message ?? "Zoho OAuth failed");
        }
      }
    };
    window.addEventListener("message", handleOutlookOAuthMessage);
    return () =>
      window.removeEventListener("message", handleOutlookOAuthMessage);
  }, [outlookStatusQuery, zohoStatusQuery]);

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

        const verifySessionWithConvex = async (token: string): Promise<MondayIdentity> => {
          const result = await convex.action(api.mondayAuth.verifyAndProvision, {
            sessionToken: token,
          });
          return {
            userId: result.userId,
            accountId: result.accountId,
            boardId: result.boardId,
            appClientId: result.appClientId,
          };
        };

        if (!maybeToken) {
          try {
            const devIdentity = await verifySessionWithConvex("");
            setSessionToken(MONDAY_DEV_BYPASS_TOKEN);
            setIdentity(devIdentity);
            setIsMondayEmbeddedContext(false);
            return;
          } catch (devError) {
            const message =
              devError instanceof Error
                ? devError.message
                : "Missing Monday session token from SDK/query string";
            throw new Error(message);
          }
        }

        let verifiedIdentity: MondayIdentity;
        try {
          verifiedIdentity = await verifySessionWithConvex(maybeToken);
        } catch (firstError) {
          const message =
            firstError instanceof Error
              ? firstError.message
              : "Unable to verify Monday session";
          if (
            message === "signature verification failed" &&
            sdkToken &&
            sdkToken !== maybeToken
          ) {
            maybeToken = sdkToken;
            verifiedIdentity = await verifySessionWithConvex(maybeToken);
          } else {
            throw new Error(message);
          }
        }

        setSessionToken(maybeToken);
        setIdentity(verifiedIdentity);
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
  }, [convex, monday, staticMode]);

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
    if (!settingsOpen) return;
    if (!zohoStatusQuery.error) return;
    const message =
      zohoStatusQuery.error instanceof Error
        ? zohoStatusQuery.error.message
        : "Unknown loading error";
    toast.error(message);
  }, [settingsOpen, staticMode, zohoStatusQuery.error]);

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

  useEffect(() => {
    if (staticMode) return;
    if (!isGlobalDateScope) return;
    if (recordsQuery.isLoading || recordsQuery.isFetchingNextPage) return;
    if (!recordsQuery.hasNextPage) return;
    void recordsQuery.fetchNextPage();
  }, [
    isGlobalDateScope,
    recordsQuery,
    recordsQuery.hasNextPage,
    recordsQuery.isFetchingNextPage,
    recordsQuery.isLoading,
    staticMode,
  ]);

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
        interviewingWithContractors: index % 4 === 0 ? "Contractor A" : null,
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
        lastTouchpointAt: new Date(
          Date.UTC(2026, 1, (index % 28) + 1, 14, index % 60, 0),
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
    const sourceRecords = staticMode ? staticRecords : apiRecords;
    return sourceRecords.filter((record) => {
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
  const zohoCallbackUrl = useMemo(() => {
    if (typeof window === "undefined") return "/api/monday/email/zoho/callback";
    const path = zohoStatusQuery.data?.callbackPath ?? "/api/monday/email/zoho/callback";
    return `${window.location.origin}${path}`;
  }, [zohoStatusQuery.data?.callbackPath]);
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
      const data = await fetchMondayApi<
        {
          ok?: boolean;
          error?: string;
          authorizeUrl?: string;
        }
      >(

        "/api/monday/email/outlook/connect",
        {
          sessionToken
        }
      );
      if (!data.ok || !data.authorizeUrl) {
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
      const data = await fetchMondayApi<{ ok?: boolean; error?: string }>(
        "/api/monday/email/outlook/disconnect",
        {
          sessionToken,
          method: "POST"
        }
      );
      if (!data.ok) {
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

  const handleConnectZoho = async () => {
    if (!sessionToken) {
      toast.error("Missing Monday session token");
      return;
    }
    setIsConnectingZoho(true);
    try {
      const data = await fetchMondayApi<{
        ok?: boolean;
        error?: string;
        authorizeUrl?: string;
      }>("/api/monday/email/zoho/connect", {
        sessionToken,
      });
      if (!data.ok || !data.authorizeUrl) {
        throw new Error(data.error ?? "Failed to initialize Zoho OAuth");
      }
      const popup = window.open(data.authorizeUrl, "_blank");
      if (!popup) {
        window.location.assign(data.authorizeUrl);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to initialize Zoho OAuth";
      toast.error(message);
    } finally {
      setIsConnectingZoho(false);
    }
  };

  const handleDisconnectZoho = async () => {
    if (!sessionToken) {
      toast.error("Missing Monday session token");
      return;
    }
    setIsDisconnectingZoho(true);
    try {
      const data = await fetchMondayApi<{ ok?: boolean; error?: string }>(
        "/api/monday/email/zoho/disconnect",
        {
          sessionToken,
          method: "POST",
        },
      );
      if (!data.ok) {
        throw new Error(data.error ?? "Failed to disconnect Zoho");
      }
      toast.success("Zoho account disconnected");
      await zohoStatusQuery.refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to disconnect Zoho";
      toast.error(message);
    } finally {
      setIsDisconnectingZoho(false);
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
    const normalizedZohoSenderEmail = platformSettingsDraft.zohoSenderEmail
      ? platformSettingsDraft.zohoSenderEmail.trim().toLowerCase()
      : null;
    const normalizedZohoReplyToFallbackEmail = platformSettingsDraft.zohoReplyToFallbackEmail
      ? platformSettingsDraft.zohoReplyToFallbackEmail.trim().toLowerCase()
      : null;
    const invalidReplyToEmails = normalizedReplyToEmails.filter(
      (email) => !EMAIL_PATTERN.test(email),
    );
    if (invalidReplyToEmails.length > 0) {
      toast.error(`Invalid reply-to emails: ${invalidReplyToEmails.join(", ")}`);
      return;
    }
    if (normalizedZohoSenderEmail && !EMAIL_PATTERN.test(normalizedZohoSenderEmail)) {
      toast.error("Invalid Zoho sender email address.");
      return;
    }
    if (
      normalizedZohoReplyToFallbackEmail &&
      !EMAIL_PATTERN.test(normalizedZohoReplyToFallbackEmail)
    ) {
      toast.error("Invalid Zoho fallback reply-to email address.");
      return;
    }
    const normalizedEmailSystemTags = normalizeEmailSystemTags(
      platformSettingsDraft.emailSystemTags,
    );
    const invalidEmailSystemTags = platformSettingsDraft.emailSystemTags.filter((entry) => {
      const tag = entry.tag.trim().toLowerCase();
      const columnId = entry.columnId.trim();
      return (
        tag.length > 0 &&
        (!EMAIL_TEMPLATE_TAG_PATTERN.test(tag) || !/^[a-zA-Z0-9_]+$/.test(columnId))
      );
    });
    if (invalidEmailSystemTags.length > 0) {
      toast.error(
        "Each email template tag needs a valid key (letters/numbers/._-) and a column.",
      );
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
      zohoSenderEmail: normalizedZohoSenderEmail,
      zohoReplyToFallbackEmail: normalizedZohoReplyToFallbackEmail,
      emailSystemTags: normalizedEmailSystemTags,
      monthlyBoardMappings: normalizedMonthlyBoardMappings,
    };

    setIsSavingPlatformSettings(true);
    try {
      const saved = await setPlatformSettingsMutation({
        adminUserIds: nextPayload.adminUserIds,
        employeeUserIds: nextPayload.employeeUserIds,
        replyToEmails: nextPayload.replyToEmails,
        zohoSenderEmail: nextPayload.zohoSenderEmail,
        zohoReplyToFallbackEmail: nextPayload.zohoReplyToFallbackEmail,
        emailSystemTags: nextPayload.emailSystemTags,
        monthlyBoardMappings: nextPayload.monthlyBoardMappings,
        updatedByMondayUserId: normalizedIdentityUserId,
      });
      const nextSettings: MondayPlatformSettings = {
        ...saved,
        masterAdminUserId: MASTER_ADMIN_USER_ID,
      };
      setPlatformSettings(nextSettings);
      setPlatformSettingsDraft(nextSettings);
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
      const saved = await setFeatureFlagsMutation({
        emailMarketingEnabled: enabled,
        updatedByMondayUserId: normalizedIdentityUserId,
      });
      setFeatureFlags(saved);
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
      const data = await assignRoutingAction({
        sessionToken,
        itemId,
        force: true,
      });
      if (!data.result) {
        throw new Error("Failed to run routing assignment");
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
      toast.error("Settings scope is unavailable for this route");
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
      const accountId = identity?.accountId?.trim();
      if (!accountId) {
        throw new Error("Missing Monday account context");
      }
      const saved = await upsertUserBoardSettingsMutation({
        accountId,
        ownerMondayUserId: presetScopeOwnerId,
        viewerMondayUserId: normalizedIdentityUserId,
        colorTheme: boardGeneralSettingsDraft.colorTheme,
        customTheme:
          boardGeneralSettingsDraft.colorTheme === "custom" ? parsedCustomTheme : undefined,
        fontSize: boardGeneralSettingsDraft.fontSize,
        tableDensity: boardGeneralSettingsDraft.tableDensity,
        hoverPopoversEnabled: boardGeneralSettingsDraft.hoverPopoversEnabled,
        pageSize: boardGeneralSettingsDraft.pageSize,
        displayMode: isUserBoardDisplayMode(boardGeneralSettingsDraft.displayMode)
          ? boardGeneralSettingsDraft.displayMode
          : undefined,
        recordSource: boardGeneralSettingsDraft.recordSource,
      });

      const parsedSettings = parseUserBoardGeneralSettings(saved);
      setBoardGeneralSettings(parsedSettings);
      setBoardGeneralSettingsDraft(parsedSettings);
      if (isUserBoardDisplayMode(parsedSettings.displayMode)) {
        setUserScopedDisplayMode(parsedSettings.displayMode);
      }
      toast.success("General settings saved for this board view");
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
        internalExternalStatus?: "Internal" | "External";
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
      if (preferredType === "followup") {
        const matchedQuestionnaireTemplate = templates.find((template) => {
          const name = template.name.toLowerCase();
          return name.includes("questionnaire") || name.includes("questionaire");
        });
        if (matchedQuestionnaireTemplate) return matchedQuestionnaireTemplate.id;
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
    if (sendEmailProgressUpdate && sendEmailRecord) {
      const targetRecordId =
        sendEmailRecord.contactId?.trim() || sendEmailRecord.id?.trim() || "";
      if (targetRecordId) {
        setOnboardingActionPending(targetRecordId, false);
      }
    }
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
  const sendEmailTemplateVariables = useMemo(() => {
    const vars: Record<string, string> = {
      "owner.name": sendEmailOwnerVars.ownerName,
      "owner.email": sendEmailOwnerVars.ownerEmail,
      "contact.name": sendEmailRecord?.name?.trim() ?? "",
      "contact.email": sendEmailRecord?.email?.trim() ?? "",
    };
    const columnValues = new Map(
      (sendEmailContactColumnsQuery.data?.columns ?? []).map((column) => {
        const fallbackFromValue =
          typeof column.value === "string" &&
            column.value.trim().startsWith("{") &&
            column.value.trim().endsWith("}")
            ? (() => {
              try {
                const parsed = JSON.parse(column.value) as {
                  label?: { text?: unknown };
                  labels?: unknown;
                  text?: unknown;
                };
                if (typeof parsed.label?.text === "string") return parsed.label.text;
                if (Array.isArray(parsed.labels)) {
                  const labels = parsed.labels.filter(
                    (value): value is string => typeof value === "string",
                  );
                  if (labels.length > 0) return labels.join(", ");
                }
                if (typeof parsed.text === "string") return parsed.text;
              } catch {
                // ignore parse errors
              }
              return "";
            })()
            : "";
        return [column.id, (column.text?.trim() || fallbackFromValue || "").trim()];
      }),
    );
    for (const entry of platformSettings.emailSystemTags) {
      vars[entry.tag] = columnValues.get(entry.columnId) ?? "";
    }
    return vars;
  }, [
    platformSettings.emailSystemTags,
    sendEmailContactColumnsQuery.data?.columns,
    sendEmailOwnerVars.ownerEmail,
    sendEmailOwnerVars.ownerName,
    sendEmailRecord?.email,
    sendEmailRecord?.name,
  ]);
  const preferredBulkQuickEmailTemplateId = useMemo(() => {
    if (emailTemplates.length === 0) return null;
    const actionType = bulkQuickEmailAction?.type ?? "followup";
    const matchedTemplate = emailTemplates.find((template) => {
      const name = template.name.toLowerCase();
      if (actionType === "welcome_email") {
        return name.includes("welcome");
      }
      return name.includes("questionnaire") || name.includes("questionaire");
    });
    return matchedTemplate?.id ?? emailTemplates[0]?.id ?? null;
  }, [bulkQuickEmailAction?.type, emailTemplates]);
  const bulkQuestionnaireTemplate = useMemo(() => {
    if (!bulkQuestionnaireTemplateId) return null;
    return (
      emailTemplates.find((template) => template.id === bulkQuestionnaireTemplateId) ?? null
    );
  }, [bulkQuestionnaireTemplateId, emailTemplates]);
  useEffect(() => {
    if (bulkQuestionnaireEmailRecords.length === 0) return;
    if (
      bulkQuestionnaireTemplateId &&
      emailTemplates.some((template) => template.id === bulkQuestionnaireTemplateId)
    ) {
      return;
    }
    setBulkQuestionnaireTemplateId(preferredBulkQuickEmailTemplateId);
  }, [
    bulkQuestionnaireEmailRecords.length,
    bulkQuestionnaireTemplateId,
    emailTemplates,
    preferredBulkQuickEmailTemplateId,
  ]);
  const bulkQuestionnaireOwnerVars = useMemo(() => {
    const primaryOwner = bulkQuestionnaireActiveRecord?.ownerProfiles[0] ?? null;
    const ownerName =
      primaryOwner?.name?.trim() ??
      bulkQuestionnaireActiveRecord?.peopleText?.trim() ??
      "";
    const ownerEmail = primaryOwner?.email?.trim() ?? "";
    return { ownerName, ownerEmail };
  }, [bulkQuestionnaireActiveRecord]);
  const bulkQuestionnaireTemplateVariables = useMemo(() => {
    const vars: Record<string, string> = {
      "owner.name": bulkQuestionnaireOwnerVars.ownerName,
      "owner.email": bulkQuestionnaireOwnerVars.ownerEmail,
      "contact.name": bulkQuestionnaireActiveRecord?.name?.trim() ?? "",
      "contact.email": bulkQuestionnaireActiveRecord?.email?.trim() ?? "",
    };
    const columnValues = new Map(
      (bulkQuestionnaireContactColumnsQuery.data?.columns ?? []).map((column) => {
        const fallbackFromValue =
          typeof column.value === "string" &&
            column.value.trim().startsWith("{") &&
            column.value.trim().endsWith("}")
            ? (() => {
              try {
                const parsed = JSON.parse(column.value) as {
                  label?: { text?: unknown };
                  labels?: unknown;
                  text?: unknown;
                };
                if (typeof parsed.label?.text === "string") return parsed.label.text;
                if (Array.isArray(parsed.labels)) {
                  const labels = parsed.labels.filter(
                    (value): value is string => typeof value === "string",
                  );
                  if (labels.length > 0) return labels.join(", ");
                }
                if (typeof parsed.text === "string") return parsed.text;
              } catch {
                // ignore parse errors
              }
              return "";
            })()
            : "";
        return [column.id, (column.text?.trim() || fallbackFromValue || "").trim()];
      }),
    );
    for (const entry of platformSettings.emailSystemTags) {
      vars[entry.tag] = columnValues.get(entry.columnId) ?? "";
    }
    return vars;
  }, [
    bulkQuestionnaireActiveRecord?.email,
    bulkQuestionnaireActiveRecord?.name,
    bulkQuestionnaireContactColumnsQuery.data?.columns,
    bulkQuestionnaireOwnerVars.ownerEmail,
    bulkQuestionnaireOwnerVars.ownerName,
    platformSettings.emailSystemTags,
  ]);
  const bulkQuestionnaireResolvedTemplate = useMemo(() => {
    if (!bulkQuestionnaireTemplate) return null;
    const subject = interpolateTemplateVariables(
      bulkQuestionnaireTemplate.name,
      bulkQuestionnaireTemplateVariables,
    );
    const htmlSource =
      bulkQuestionnaireTemplate.renderedHtml.trim().length > 0
        ? bulkQuestionnaireTemplate.renderedHtml
        : bulkQuestionnaireTemplate.content;
    const html = interpolateTemplateVariables(htmlSource, bulkQuestionnaireTemplateVariables);
    const text = interpolateTemplateVariables(
      bulkQuestionnaireTemplate.content,
      bulkQuestionnaireTemplateVariables,
    );
    return { subject, html, text };
  }, [bulkQuestionnaireTemplate, bulkQuestionnaireTemplateVariables]);
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
        : preferredType === "followup"
          ? emailTemplates.find((template) => {
            const name = template.name.toLowerCase();
            return name.includes("questionnaire") || name.includes("questionaire");
          })?.id
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
    const subject = interpolateTemplateVariables(
      sendEmailTemplate.name,
      sendEmailTemplateVariables,
    );
    const htmlSource =
      sendEmailTemplate.renderedHtml.trim().length > 0
        ? sendEmailTemplate.renderedHtml
        : sendEmailTemplate.content;
    const html = interpolateTemplateVariables(htmlSource, sendEmailTemplateVariables);
    const text = interpolateTemplateVariables(
      sendEmailTemplate.content,
      sendEmailTemplateVariables,
    );
    return { subject, html, text };
  }, [sendEmailTemplate, sendEmailTemplateVariables]);
  useEffect(() => {
    if (featureFlags.emailMarketingEnabled) return;
    if (!sendEmailRecord) return;
    if (sendEmailProgressUpdate) {
      const targetRecordId =
        sendEmailRecord.contactId?.trim() || sendEmailRecord.id?.trim() || "";
      if (targetRecordId) {
        setOnboardingActionPending(targetRecordId, false);
      }
    }
    setSendEmailRecord(null);
    setSendEmailStep(1);
    setSendEmailTemplateId(null);
    setSendEmailOwnerUserId("");
    setSendEmailProgressUpdate(null);
    setIsSendingEmail(false);
  }, [
    featureFlags.emailMarketingEnabled,
    sendEmailProgressUpdate,
    sendEmailRecord,
    setOnboardingActionPending,
  ]);
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
    !outlookTeamMailboxesQuery.isLoading &&
    !outlookTeamMailboxesQuery.isFetching;
  const sendEmailProviderHint =
    selectedSendEmailMailbox?.connected
      ? "Provider: Outlook (single-contact send). If this sender mailbox becomes unavailable, Zoho is used as fallback."
      : "Provider: Zoho fallback (sender mailbox not connected). Replies route to the contact owner's mailbox when available.";
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
    setIsSendingEmail(true);
    try {
      const data = await fetchMondayApi<MondaySendEmailBatchResponse>(
        "/api/monday/email/send/batch",
        {
          sessionToken,
          method: "POST",
          body: {
            subject: sendEmailResolvedTemplate.subject,
            html: sendEmailResolvedTemplate.html,
            recipients: [
              {
                to: recipient,
                contactItemId: resolveContactUpdateTargetRecordId(sendEmailRecord),
                ownerMondayUserId: senderMailboxUserId,
              },
            ],
          }
        }
      );
      if (!data.ok) {
        throw new Error(data.error ?? "Failed to send email");
      }
      let progressSyncError: string | null = null;
      const progressStepLabel =
        sendEmailProgressUpdate?.updateType === "followup"
          ? "questionnaire step"
          : sendEmailProgressUpdate?.updateType === "welcome_email"
            ? "welcome step"
            : "email progress";
      const deriveGeneralEmailUpdateType = (): ContactUpdateType => {
        const normalizedTemplateName = sendEmailTemplate.name.toLowerCase();
        if (normalizedTemplateName.includes("welcome")) return "welcome_email";
        if (
          normalizedTemplateName.includes("questionnaire") ||
          normalizedTemplateName.includes("questionaire") ||
          normalizedTemplateName.includes("followup")
        ) {
          return "followup";
        }
        return "general";
      };
      const derivedGeneralEmailUpdateType = deriveGeneralEmailUpdateType();
      const emailUpdateSummary = sendEmailResolvedTemplate.subject.trim().length > 0
        ? `Email Sent - ${sendEmailResolvedTemplate.subject.trim()}`
        : "General Email Update";
      const syncLabel = sendEmailProgressUpdate ? progressStepLabel : "email update";
      try {
        const targetRecordId = resolveContactUpdateTargetRecordId(sendEmailRecord);
        const sendProgressDateTime = new Date().toISOString();
        const updatePayload = sendEmailProgressUpdate
          ? {
            body: sendEmailProgressUpdate.body,
            updateType: sendEmailProgressUpdate.updateType as ContactUpdateType,
            internalExternalStatus: sendEmailProgressUpdate.internalExternalStatus ?? "External",
            methodOfCommunication: undefined as string | undefined,
            suppressApprovalStepMarking: false,
            fallbackErrorMessage: "Failed to track onboarding progress",
          }
          : {
            body: emailUpdateSummary,
            updateType: derivedGeneralEmailUpdateType,
            internalExternalStatus: "External" as "Internal" | "External",
            methodOfCommunication: "Email",
            suppressApprovalStepMarking: derivedGeneralEmailUpdateType !== "general",
            fallbackErrorMessage: "Failed to log email update",
          };
        let updateData: MondayCreateRecordUpdateResponse;

        const syncViaServer = async () => {
          console.log("[sendEmail] falling back to server-side update sync", {
            targetRecordId,
            updateType: updatePayload.updateType,
          });
          const serverResult = await createRecordUpdateAction({
            sessionToken,
            itemId: targetRecordId,
            body: updatePayload.body,
            updateType: updatePayload.updateType,
            dateTime: sendProgressDateTime,
            internalExternalStatus: updatePayload.internalExternalStatus,
            methodOfCommunication: updatePayload.methodOfCommunication,
            suppressApprovalStepMarking: updatePayload.suppressApprovalStepMarking,
          });
          return { ok: true as const, update: serverResult.update };
        };

        if (canCreateUpdatesAsLoggedInMondayUser) {
          try {
            console.log("[sendEmail] attempting context-user update sync", {
              targetRecordId,
              updateType: updatePayload.updateType,
              userId: identity?.userId,
            });
            const update = await createMondayRecordUpdateAsContextUser({
              itemId: targetRecordId,
              body: updatePayload.body,
              updateType: updatePayload.updateType,
              dateTime: sendProgressDateTime,
              internalExternalStatus: updatePayload.internalExternalStatus,
              methodOfCommunication: updatePayload.methodOfCommunication,
              suppressApprovalStepMarking: updatePayload.suppressApprovalStepMarking,
            });
            updateData = { ok: true, update };
          } catch (contextError) {
            const contextMsg =
              contextError instanceof Error ? contextError.message : String(contextError);
            console.warn(
              "[sendEmail] context-user update sync failed, falling back to server",
              { error: contextMsg, targetRecordId, userId: identity?.userId },
            );
            updateData = await syncViaServer();
          }
        } else {
          updateData = await syncViaServer();
        }

        if (identity?.userId) {
          fetchMondayApi<{ ok?: boolean; error?: string }>(
            "/api/monday/touches",
            {
              sessionToken,
              method: "POST",
              body: {
                contactItemId: targetRecordId,
                contactName: sendEmailRecord.name ?? "",
                ownerId: identity.userId,
                source: "update",
              }
            }
          ).catch(() => { });
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
        const msg =
          error instanceof Error
            ? error.message
            : `Failed to sync ${syncLabel}`;
        console.error("[sendEmail] post-send sync failed", {
          error: msg,
          userId: identity?.userId,
          canCreateUpdatesAsLoggedInMondayUser,
        });
        progressSyncError = msg;
      }

      if (progressSyncError) {
        toast.success(`Email sent to ${recipient}`);
        toast.error(`Email sent, but ${syncLabel} sync failed: ${progressSyncError}`);
      } else if (sendEmailProgressUpdate) {
        toast.success(`Email sent to ${recipient} and ${progressStepLabel} marked complete`);
      } else {
        toast.success(`Email sent to ${recipient} and logged in updates`);
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

  const ownerDirectoryProfileById = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string | null; photoThumb: string | null }
    >();
    for (const owner of ownerDirectoryQuery.data ?? []) {
      if (!owner.id) continue;
      map.set(owner.id, {
        id: owner.id,
        name: owner.name,
        photoThumb: owner.photoThumb,
      });
    }
    return map;
  }, [ownerDirectoryQuery.data]);

  const ownerOptions = useMemo(() => {
    const ownerIdsFromDirectory = uniqueSorted(
      Array.from(ownerDirectoryProfileById.keys()).map((ownerId) => ownerId.trim()),
    );
    const ownerIdsFromRecords = uniqueSorted(
      records.flatMap((record) =>
        (Array.isArray(record.ownerIds) ? record.ownerIds : [])
          .map((ownerId) => ownerId.trim())
          .filter((ownerId) => ownerId.length > 0),
      ),
    );
    const ownerIds = uniqueSorted([...ownerIdsFromDirectory, ...ownerIdsFromRecords]);
    return Array.from(
      new Map(
        ownerIds
          .map((id) => {
            const ownerProfile =
              ownerDirectoryProfileById.get(id) ?? ownerProfileById.get(id);
            const ownerName = ownerProfile?.name?.trim() ?? "";
            return {
              value: id,
              label: ownerName ? `${ownerName} (${id})` : `User ${id}`,
            };
          })
          .map((entry) => [entry.value, entry.label] as const),
      ),
    )
      .map(([value, label]) => {
        const ownerProfile =
          ownerDirectoryProfileById.get(value) ?? ownerProfileById.get(value);
        return {
          value,
          label,
          name: ownerProfile?.name ?? null,
          photoThumb: ownerProfile?.photoThumb ?? null,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [
    ownerDirectoryProfileById,
    ownerProfileById,
    records,
  ]);
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
    for (const column of platformBoardColumnsQuery.data ?? []) {
      const label = column.title.trim();
      if (!label) continue;
      labels.add(label);
    }
    // Fallback: when board columns are unavailable, keep deriving from loaded record detail labels.
    if (labels.size === 0) {
      for (const record of records) {
        const details = Array.isArray(record.contactDetails) ? record.contactDetails : [];
        for (const detail of details) {
          const label = detail.label.trim();
          if (!label) continue;
          labels.add(label);
        }
      }
    }
    return Array.from(labels).sort((a, b) => a.localeCompare(b));
  }, [platformBoardColumnsQuery.data, records]);
  const boardColumnFilterKindByLabel = useMemo(() => {
    const byLabel = new Map<string, string[]>();
    const platformTypeByLabel = new Map<string, string>();
    for (const column of platformBoardColumnsQuery.data ?? []) {
      const label = column.title.trim();
      if (!label) continue;
      platformTypeByLabel.set(label, column.type.trim().toLowerCase());
    }
    for (const record of records) {
      const details = Array.isArray(record.contactDetails) ? record.contactDetails : [];
      for (const detail of details) {
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
      const platformType = platformTypeByLabel.get(label) ?? "";
      const typeSuggestsDate =
        platformType.includes("date") ||
        platformType.includes("timeline") ||
        platformType.includes("week");
      const labelSuggestsDate = /\b(date|time)\b/i.test(label);
      const hasDateSamples =
        samples.length > 0 &&
        samples.every((sample) => normalizeAdvancedDate(sample).length > 0);
      kinds.set(
        label,
        typeSuggestsDate || labelSuggestsDate || hasDateSamples ? "date" : "text",
      );
    }
    return kinds;
  }, [boardColumnFilterOptions, platformBoardColumnsQuery.data, records]);
  const boardColumnValueOptionsByLabel = useMemo(() => {
    const byLabel = new Map<string, string[]>();
    for (const record of records) {
      const details = Array.isArray(record.contactDetails) ? record.contactDetails : [];
      for (const detail of details) {
        const label = detail.label.trim();
        const value = detail.value.trim();
        if (!label || !value) continue;
        const existing = byLabel.get(label) ?? [];
        if (!existing.includes(value) && existing.length < 200) {
          existing.push(value);
          byLabel.set(label, existing);
        } else if (!byLabel.has(label)) {
          byLabel.set(label, existing);
        }
      }
    }
    for (const values of byLabel.values()) {
      values.sort((a, b) => a.localeCompare(b));
    }
    return byLabel;
  }, [records]);

  const statusOptions = useMemo(() => {
    const combinedStatusValues = uniqueSorted([
      ...records.map((record) => record.statusText),
      ...(editOptionsQuery.data?.status ?? []),
    ]);
    return combinedStatusValues.map((value) => ({
      label: value,
      value,
    }));
  }, [editOptionsQuery.data?.status, records]);
  const questionnaireFieldOptions = useMemo(
    () => ({
      ...DEFAULT_QUESTIONNAIRE_FIELD_OPTIONS,
      gender: editOptionsQuery.data?.questionnaireGender ?? [],
      entryLevel:
        editOptionsQuery.data?.questionnaireEntryLevel?.length
          ? editOptionsQuery.data.questionnaireEntryLevel
          : [...QUESTIONNAIRE_ENTRY_LEVEL_OPTIONS],
      skilled:
        editOptionsQuery.data?.questionnaireSkilled?.length
          ? editOptionsQuery.data.questionnaireSkilled
          : [...QUESTIONNAIRE_SKILLED_OPTIONS],
      ethnicity: editOptionsQuery.data?.questionnaireEthnicity ?? [],
      educationLevel: editOptionsQuery.data?.questionnaireEducationLevel ?? [],
      usWorkEligible:
        editOptionsQuery.data?.questionnaireUsWorkEligible?.length
          ? editOptionsQuery.data.questionnaireUsWorkEligible
          : [...QUESTIONNAIRE_YES_NO],
      veteran:
        editOptionsQuery.data?.questionnaireVeteran?.length
          ? editOptionsQuery.data.questionnaireVeteran
          : [...QUESTIONNAIRE_YES_NO],
      secondChance:
        editOptionsQuery.data?.questionnaireSecondChance?.length
          ? editOptionsQuery.data.questionnaireSecondChance
          : [...QUESTIONNAIRE_YES_NO],
      transportation:
        editOptionsQuery.data?.questionnaireTransportation?.length
          ? editOptionsQuery.data.questionnaireTransportation
          : [...QUESTIONNAIRE_TRANSPORTATION],
      workSchedule:
        editOptionsQuery.data?.questionnaireWorkSchedule?.length
          ? editOptionsQuery.data.questionnaireWorkSchedule
          : [...QUESTIONNAIRE_WORK_SCHEDULE],
      candidateEducation: editOptionsQuery.data?.questionnaireCandidateEducation ?? [],
      desiredHourlyWage: editOptionsQuery.data?.questionnaireDesiredHourlyWage ?? [],
    }),
    [editOptionsQuery.data],
  );
  const filteredRecords = useMemo(() => {
    if (activeAdvancedFilterConditions.length === 0) return records;
    if (!staticMode && !useUserRecordsEndpoint) {
      // Advanced conditions are applied on the server for the main records endpoint.
      return records;
    }
    return records.filter((record) =>
      doesRecordMatchAdvancedFilters(
        record,
        activeAdvancedFilterConditions,
        advancedFilterMatchMode,
      ),
    );
  }, [
    activeAdvancedFilterConditions,
    advancedFilterMatchMode,
    records,
    staticMode,
    useUserRecordsEndpoint,
  ]);
  useEffect(() => {
    const shouldDebugFilters =
      process.env.NODE_ENV !== "production" ||
      process.env.NEXT_PUBLIC_MONDAY_DEBUG_FILTERS === "1";
    if (!shouldDebugFilters) return;
    if (activeAdvancedFilterConditions.length === 0) return;

    const conditionDiagnostics = activeAdvancedFilterConditions.map((condition) => {
      const target = getBoardColumnTargetForCondition(condition);
      const matchedRecords = records.filter((record) =>
        doesRecordMatchAdvancedCondition(record, condition),
      );
      const sampledValues = records
        .slice(0, 40)
        .map((record) => {
          const values = getRecordFieldValuesForCondition(record, condition);
          if (values.length === 0) return null;
          return {
            id: record.id,
            name: record.name,
            values: values.slice(0, 6),
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
        .slice(0, 10);
      return {
        id: condition.id,
        field: condition.field,
        target,
        operator: condition.operator,
        value: condition.value,
        valueTo: condition.valueTo,
        matchedCount: matchedRecords.length,
        sampleMatches: matchedRecords.slice(0, 8).map((record) => ({
          id: record.id,
          name: record.name,
        })),
        sampleValues: sampledValues,
      };
    });

    console.info("[MondayAdvancedFilters][debug]", {
      matchMode: advancedFilterMatchMode,
      totalRecords: records.length,
      filteredRecords: filteredRecords.length,
      conditions: conditionDiagnostics,
    });
  }, [activeAdvancedFilterConditions, advancedFilterMatchMode, filteredRecords.length, records]);
  const sortedGridRecords = useMemo(() => {
    if (!(isTouchScopedView && userScopedDisplayMode === "grid")) {
      return filteredRecords;
    }
    return sortRecordsForGrid(filteredRecords, gridSort);
  }, [filteredRecords, gridSort, isTouchScopedView, userScopedDisplayMode]);
  const selectedCrossViewRecords = useMemo(
    () => filteredRecords.filter((record) => crossViewSelectedRecordIds.has(record.id)),
    [crossViewSelectedRecordIds, filteredRecords],
  );
  const clearCrossViewSelection = useCallback(() => {
    setCrossViewSelectedRecordIds(new Set());
  }, []);
  useEffect(() => {
    setCrossViewSelectedRecordIds((prev) => {
      const next = new Set(
        [...prev].filter((recordId) => filteredRecords.some((record) => record.id === recordId)),
      );
      if (next.size === prev.size) return prev;
      return next;
    });
  }, [filteredRecords]);
  useEffect(() => {
    setCrossViewSelectedRecordIds(new Set());
  }, [userScopedDisplayMode]);
  const toggleGridRecordSelection = useCallback((record: MondayRecord) => {
    setCrossViewSelectedRecordIds((prev) => {
      const next = new Set(prev);
      if (next.has(record.id)) {
        next.delete(record.id);
      } else {
        next.add(record.id);
      }
      return next;
    });
  }, []);
  const toggleKanbanRecordSelection = useCallback(
    (record: MondayRecord) => {
      setCrossViewSelectedRecordIds((prev) => {
        const next = new Set(prev);
        if (next.has(record.id)) {
          next.delete(record.id);
          return next;
        }
        const targetStepIndex = getRecordStepIndexFromApprovalSteps(record, approvalSteps);
        const selectedRecords = filteredRecords.filter((entry) => next.has(entry.id));
        const hasMixedSteps = selectedRecords.some(
          (entry) => getRecordStepIndexFromApprovalSteps(entry, approvalSteps) !== targetStepIndex,
        );
        if (hasMixedSteps) {
          toast("Kanban bulk selection must stay within the same column");
          return prev;
        }
        next.add(record.id);
        return next;
      });
    },
    [approvalSteps, filteredRecords],
  );
  const selectedKanbanStepIndex = useMemo(() => {
    if (selectedCrossViewRecords.length === 0) return null;
    return getRecordStepIndexFromApprovalSteps(selectedCrossViewRecords[0], approvalSteps);
  }, [approvalSteps, selectedCrossViewRecords]);
  const isHydratingGlobalRecords =
    !staticMode &&
    shouldAutoLoadMore &&
    !!recordsQuery.hasNextPage &&
    (recordsQuery.isLoading || recordsQuery.isFetchingNextPage);
  const filteredRecordCountLabel = isHydratingGlobalRecords
    ? `${filteredRecords.length} loaded contact${filteredRecords.length === 1 ? "" : "s"} (loading all...)`
    : `${filteredRecords.length} total contact${filteredRecords.length === 1 ? "" : "s"}`;
  const sessionState = useMondaySession({
    sessionToken,
    staticMode,
    authLoading,
    isMasterAdmin,
    isMondaySettingsAdmin,
  });
  const boardQueriesState = useMondayBoardQueries({
    recordsQuery,
    jobsQuery,
    contactUpdatesQuery,
    contactColumnsQuery,
    emailTemplatesQuery,
    platformSettingsQuery,
    featureFlagsQuery,
  });
  const recordsState = useMondayRecords({
    records,
    filteredRecords,
    sortedGridRecords,
  });
  const advancedFiltersState = useAdvancedFilters({
    filteredRecords,
    activeConditionsCount: activeAdvancedFilterConditions.length,
  });
  const settingsState = useMondaySettings({
    settingsOpen,
    boardGeneralSettings,
    platformSettings,
    featureFlags,
  });
  const onboardingState = useOnboardingWorkflows({
    isSavingMarkAsHiredWorkflow,
    isMergingRecords,
  });
  const communicationState = useCommunicationActions({
    bulkCommunicationModePrompt,
    bulkCommunicationQuickAction,
    bulkUniqueCommunicationSession,
  });
  const kanbanActionsState = useKanbanActions({
    confirmation: kanbanMoveConfirmation,
    isExecuting: isExecutingKanbanMove,
  });
  const sendEmailState = useSendEmailFlow({
    sendEmailRecord,
    sendEmailStep,
    isSendingEmail,
  });

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
    if (!identity?.accountId?.trim() || !identity.userId?.trim()) {
      toast.error("Missing Monday account identity");
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
      const preset = await upsertFilterPreset({
        accountId: identity.accountId.trim(),
        ownerMondayUserId: presetScopeOwnerId,
        viewerMondayUserId: identity.userId.trim(),
        presetId: existingPreset?.id,
        name,
        matchMode: advancedFilterMatchMode,
        conditions: conditionsForSave,
      });
      const parsedPreset = parseSavedAdvancedFilterPreset(preset);
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
    if (!identity?.accountId?.trim()) {
      toast.error("Missing Monday account identity");
      return;
    }
    setDeletingAdvancedFilterPresetIds((prev) => ({ ...prev, [presetId]: true }));
    try {
      await removeFilterPreset({
        accountId: identity.accountId.trim(),
        ownerMondayUserId: presetScopeOwnerId,
        presetId,
      });
      setSavedAdvancedFilterPresets((prev) => prev.filter((preset) => preset.id !== presetId));
      setActiveSavedAdvancedFilterId((prev) => (prev === presetId ? null : prev));
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

  const contractorOptionCatalog = useMemo(
    () =>
      Array.from(
        new Set(
          [...retentionOptions.referredToContractors, ...retentionOptions.hiredWithContractor]
            .map((value) => value.trim())
            .filter((value) => value.length > 0),
        ),
      ),
    [retentionOptions.hiredWithContractor, retentionOptions.referredToContractors],
  );

  const parseContractorValues = useCallback(
    (
      rawValue: string | null | undefined,
      preferredOptions: string[] = [],
    ) => {
      const source = rawValue?.trim();
      if (!source) return [] as string[];
      const candidateOptions = Array.from(
        new Set(
          [...preferredOptions, ...contractorOptionCatalog]
            .map((value) => value.trim())
            .filter((value) => value.length > 0),
        ),
      );
      if (candidateOptions.length === 0) {
        return splitCsvValues(source);
      }
      const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const matches = candidateOptions
        .slice()
        .sort((a, b) => b.length - a.length)
        .map((option) => {
          const pattern = new RegExp(
            `(?:^|,\\s*)(${escapeRegex(option)})(?=\\s*(?:,|$))`,
            "i",
          );
          const matched = pattern.exec(source);
          if (!matched) return null;
          return {
            option,
            index: matched.index,
          };
        })
        .filter((entry): entry is { option: string; index: number } => entry !== null)
        .sort((a, b) => a.index - b.index)
        .map((entry) => entry.option);
      if (matches.length > 0) {
        return matches;
      }
      return splitCsvValues(source);
    },
    [contractorOptionCatalog],
  );

  const getMergeTargetRecordId = useCallback((record: MondayRecord) => {
    const contactId = record.contactId?.trim();
    if (contactId && contactId.length > 0) return contactId;
    return record.id.trim();
  }, []);

  const getMergeFieldValueFromRecord = useCallback(
    (record: MondayRecord, key: MergeFieldKey) => {
      switch (key) {
        case "ownerId":
          return record.ownerIds[0]?.trim() ?? null;
        case "status":
          return record.statusText?.trim() || null;
        case "tags":
          return splitCsvValues(record.tags ?? null);
        case "referredToContractors":
          return parseContractorValues(
            record.referredToContractors,
            retentionOptions.referredToContractors,
          );
        case "interviewingWithContractors":
          return parseContractorValues(
            record.interviewingWithContractors,
            retentionOptions.referredToContractors,
          );
        case "hiredWithContractor":
          return record.hiredWithContractor?.trim() || null;
        case "hireDate": {
          const dateOnly = normalizeDateOnlyFromRecord(record.hireDate);
          return dateOnly.length > 0 ? dateOnly : null;
        }
        case "retentionPeriod":
          return record.retentionPeriod?.trim() || null;
        default:
          return null;
      }
    },
    [parseContractorValues, retentionOptions.referredToContractors],
  );

  const getMergeFieldDisplayValue = useCallback(
    (record: MondayRecord, key: MergeFieldKey) => {
      if (key === "ownerId") {
        return record.peopleText?.trim() || record.ownerIds[0]?.trim() || "—";
      }
      const value = getMergeFieldValueFromRecord(record, key);
      if (Array.isArray(value)) {
        return value.length > 0 ? value.join(", ") : "—";
      }
      return value && String(value).trim().length > 0 ? String(value) : "—";
    },
    [getMergeFieldValueFromRecord],
  );

  const openMergeDialogForRecords = useCallback((selectedItems: MondayRecord[]) => {
    const dedupedRecordsById = new Map<string, MondayRecord>();
    for (const record of selectedItems) {
      const targetRecordId = getMergeTargetRecordId(record);
      if (!targetRecordId) continue;
      if (!dedupedRecordsById.has(targetRecordId)) {
        dedupedRecordsById.set(targetRecordId, record);
      }
    }
    const records = Array.from(dedupedRecordsById.values());
    if (records.length < 2 || records.length > 4) {
      toast.error("Select between 2 and 4 contacts to merge.");
      return;
    }
    const masterRecord = records[0]!;
    const masterRecordId = getMergeTargetRecordId(masterRecord);
    const fieldSourceByKey = MERGE_FIELD_CONFIG.reduce(
      (acc, field) => {
        acc[field.key] = masterRecordId;
        return acc;
      },
      {} as Record<MergeFieldKey, string>,
    );
    setMergeDialogState({
      records,
      masterRecordId,
      fieldSourceByKey,
    });
  }, [getMergeTargetRecordId]);

  const openRetentionDialog = (record: MondayRecord) => {
    setRetentionDialogRecord(record);
    setRetentionHireDatePopoverOpen(false);
    setRetentionDraft({
      referredToContractors: parseContractorValues(record.referredToContractors),
      hiredWithContractor: record.hiredWithContractor ?? "",
      hireDate: normalizeDateOnlyFromRecord(record.hireDate),
      retentionPeriod: record.retentionPeriod ?? "",
    });
  };

  const openMarkAsHiredWorkflowDialog = (record: MondayRecord) => {
    const targetRecordId = resolveContactUpdateTargetRecordId(record);
    if (!targetRecordId) {
      toast.error("Missing monday update target");
      return;
    }
    const referredToContractors = parseContractorValues(
      record.referredToContractors,
      retentionOptions.referredToContractors,
    );
    const interviewingContractors = parseContractorValues(
      record.interviewingWithContractors,
      retentionOptions.referredToContractors,
    );
    const availableContractors = uniqueSorted(
      [
        ...retentionOptions.referredToContractors,
        ...referredToContractors,
        ...interviewingContractors,
        record.hiredWithContractor ?? "",
      ].filter((value) => value.trim().length > 0),
    );
    const preferredReferredToContractors =
      referredToContractors.length > 0 ? referredToContractors : interviewingContractors;
    const fallbackHiredContractor = record.hiredWithContractor?.trim() ?? "";
    const hiredWithContractor = fallbackHiredContractor
      ? fallbackHiredContractor
      : preferredReferredToContractors[0] ?? "";
    const approvalProgress = getApprovalStepProgress(record, approvalSteps);
    const screeningAlreadyDone =
      approvalProgress.states.find((state) => state.step.id === SCREENING_STEP_COLUMN_ID)?.state ===
      "done";
    setOnboardingActionPending(targetRecordId, true);
    setMarkAsHiredHireDatePopoverOpen(false);
    setMarkAsHiredWorkflowDialogState({
      targetRecordId,
      referredToContractors: preferredReferredToContractors,
      hiredWithContractor,
      hireDate: normalizeDateOnlyFromRecord(record.hireDate),
      availableContractors,
      screeningAlreadyDone,
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
    setContactDialogSelectedResumeKey(null);
  };

  const contactDialogIndex = useMemo(() => {
    if (!contactHistoryDialogRecord) return -1;
    return filteredRecords.findIndex((r) => r.id === contactHistoryDialogRecord.id);
  }, [contactHistoryDialogRecord, filteredRecords]);
  const contactDialogState = useContactDialogController({
    record: contactHistoryDialogRecord,
    index: contactDialogIndex,
    total: filteredRecords.length,
  });
  const contactDialogResumeFiles = useMemo(
    () => contactHistoryDialogRecord?.resumeFiles ?? [],
    [contactHistoryDialogRecord?.resumeFiles],
  );
  const getResumeFileKey = useCallback(
    (
      file: {
        assetId: string | null;
        name: string;
        url: string | null;
      },
      index: number,
    ) =>
      file.assetId?.trim() ||
      file.url?.trim() ||
      `${file.name.trim().toLowerCase() || "resume"}-${index}`,
    [],
  );
  const contactDialogSelectedResumeIndex = useMemo(() => {
    if (contactDialogResumeFiles.length === 0) return -1;
    if (!contactDialogSelectedResumeKey) return 0;
    const matchedIndex = contactDialogResumeFiles.findIndex(
      (file, index) => getResumeFileKey(file, index) === contactDialogSelectedResumeKey,
    );
    return matchedIndex >= 0 ? matchedIndex : 0;
  }, [contactDialogResumeFiles, contactDialogSelectedResumeKey, getResumeFileKey]);
  const contactDialogResumeFile =
    contactDialogSelectedResumeIndex >= 0
      ? (contactDialogResumeFiles[contactDialogSelectedResumeIndex] ?? null)
      : null;
  const contactDialogResumeFileName =
    contactDialogResumeFile?.name?.trim() && contactDialogResumeFile.name.trim().length > 0
      ? contactDialogResumeFile.name.trim()
      : "Resume";
  const contactDialogResumeHref = contactDialogResumeFile
    ? getResumeFileHref(contactDialogResumeFile)
    : null;
  const isContactDialogUploadingResume = contactHistoryDialogRecord
    ? uploadingResumeByRecordId[contactHistoryDialogRecord.id] === true
    : false;
  const contactDialogResumeInputId = contactHistoryDialogRecord
    ? `contact-dialog-resume-upload-${contactHistoryDialogRecord.id}`
    : "";
  const jobsForContactDialog = useMemo(() => {
    const jobs = jobsQuery.data?.jobs ?? [];
    if (!contactHistoryDialogRecord || jobs.length === 0) return jobs;
    const contactDistrict = (contactHistoryDialogRecord.statusText ?? "").trim().toLowerCase();
    if (!contactDistrict) return jobs;
    const matching: MondayJobListing[] = [];
    const remaining: MondayJobListing[] = [];
    for (const job of jobs) {
      const districtText = (job.district ?? "").trim().toLowerCase();
      if (districtText.length > 0 && districtText.includes(contactDistrict)) {
        matching.push(job);
      } else {
        remaining.push(job);
      }
    }
    return [...matching, ...remaining];
  }, [jobsQuery.data?.jobs, contactHistoryDialogRecord]);
  const referredJobsHistory = useMemo(() => {
    const subitems = contactUpdatesQuery.data?.subitems ?? [];
    const deduped = new Map<string, ReferredJobHistoryRow>();
    for (const subitem of subitems) {
      if (subitem.updateType !== "job_referral") continue;
      const parsed = parseJobReferralHistoryFromText(subitem.name);
      const dedupeKey =
        parsed.jobId?.trim().length
          ? `job:${parsed.jobId.trim()}`
          : `title:${parsed.title.trim().toLowerCase()}`;
      if (!dedupeKey || deduped.has(dedupeKey)) continue;
      deduped.set(dedupeKey, {
        id: dedupeKey,
        jobId: parsed.jobId,
        title: parsed.title,
        referredAt: subitem.createdAt,
        subitemId: subitem.id,
      });
    }
    return Array.from(deduped.values());
  }, [contactUpdatesQuery.data?.subitems]);
  const referredJobIds = useMemo(
    () =>
      new Set(
        referredJobsHistory
          .map((entry) => entry.jobId?.trim())
          .filter((entry): entry is string => !!entry && entry.length > 0),
      ),
    [referredJobsHistory],
  );
  const referredJobTitleKeys = useMemo(
    () =>
      new Set(
        referredJobsHistory
          .map((entry) => entry.title.trim().toLowerCase())
          .filter((entry) => entry.length > 0),
      ),
    [referredJobsHistory],
  );
  const contactJobRows = useMemo<ContactJobRow[]>(
    () =>
      jobsForContactDialog.map((job) => ({
        id: job.id,
        title: job.title,
        district: job.district ?? "",
        location: job.locationSecondary || job.location || "",
        contractor: job.contractor ?? "",
        categoriesText: job.categories.join(", "),
        postedDate: job.postedDate ?? "",
        websiteUrl: job.websiteUrl,
        applyEmail: job.applyEmail,
        applyPhone: job.applyPhone,
        isAlreadyReferred:
          referredJobIds.has(job.id) ||
          referredJobTitleKeys.has(job.title.trim().toLowerCase()),
        rawJob: job,
      })),
    [jobsForContactDialog, referredJobIds, referredJobTitleKeys],
  );
  const contactJobColumns = useMemo<ColumnDefinition<ContactJobRow>[]>(
    () => [
      {
        id: "title",
        header: "Job",
        accessorKey: "title",
        sortable: true,
        cell: (item) => (
          <div className="px-2 py-2">
            <p className="truncate font-medium">{item.title}</p>
            <p className="text-muted-foreground truncate text-xs">
              {item.location || "Location unavailable"}
            </p>
          </div>
        ),
      },
      {
        id: "district",
        header: "District",
        accessorKey: "district",
        sortable: true,
        cell: (item) => (
          <span className="block truncate px-2 py-2">{item.district || "—"}</span>
        ),
      },
      {
        id: "contractor",
        header: "Contractor",
        accessorKey: "contractor",
        sortable: true,
        cell: (item) => (
          <span className="block truncate px-2 py-2">{item.contractor || "—"}</span>
        ),
      },
      {
        id: "categoriesText",
        header: "Categories",
        accessorKey: "categoriesText",
        sortable: true,
        cell: (item) => (
          <span className="block truncate px-2 py-2">{item.categoriesText || "—"}</span>
        ),
      },
      {
        id: "postedDate",
        header: "Posted",
        accessorKey: "postedDate",
        sortable: true,
        cell: (item) => (
          <span className="block truncate px-2 py-2">{item.postedDate || "—"}</span>
        ),
      },
    ],
    [],
  );
  const contactJobActions: EntityAction<ContactJobRow>[] = [
    {
      id: "refer",
      label: (item) => (item.isAlreadyReferred ? "Referred" : "Refer"),
      icon: <BriefcaseBusiness className="h-3.5 w-3.5" />,
      variant: "outline",
      isDisabled: (item) =>
        item.isAlreadyReferred ||
        isCreatingContactUpdate ||
        referringJobId === item.id,
      onClick: (item) => {
        void handleReferContactToJob(item.rawJob);
      },
    },
  ];
  useEffect(() => {
    if (contactDialogResumeFiles.length === 0) {
      if (contactDialogSelectedResumeKey !== null) {
        setContactDialogSelectedResumeKey(null);
      }
      return;
    }
    if (!contactDialogSelectedResumeKey) {
      setContactDialogSelectedResumeKey(
        getResumeFileKey(contactDialogResumeFiles[0]!, 0),
      );
      return;
    }
    const keyExists = contactDialogResumeFiles.some(
      (file, index) => getResumeFileKey(file, index) === contactDialogSelectedResumeKey,
    );
    if (!keyExists) {
      setContactDialogSelectedResumeKey(
        getResumeFileKey(contactDialogResumeFiles[0]!, 0),
      );
    }
  }, [
    contactDialogResumeFiles,
    contactDialogSelectedResumeKey,
    getResumeFileKey,
  ]);
  const renderResumePreviewContent = (
    fileName: string,
    href: string,
    previewHeightClass = "h-[65vh]",
  ) => {
    const lowerName = fileName.toLowerCase();
    const isPdf = lowerName.endsWith(".pdf");
    const isDocxDocument =
      lowerName.endsWith(".docx") ||
      lowerName.endsWith(".docm") ||
      lowerName.endsWith(".dotx") ||
      lowerName.endsWith(".dotm");
    const isLegacyWordDocument = lowerName.endsWith(".doc") || lowerName.endsWith(".rtf");
    const officeEmbedUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
      href,
    )}`;
    const isImage =
      lowerName.endsWith(".png") ||
      lowerName.endsWith(".jpg") ||
      lowerName.endsWith(".jpeg") ||
      lowerName.endsWith(".gif") ||
      lowerName.endsWith(".webp") ||
      lowerName.endsWith(".svg");

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-sm font-medium">{fileName}</p>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary text-xs underline"
          >
            Open in new tab
          </a>
        </div>
        <div className={`bg-muted/20 ${previewHeightClass} overflow-hidden rounded-md border`}>
          {isPdf ? (
            <PdfResumePreview fileUrl={href} fileName={fileName} />
          ) : isDocxDocument ? (
            <DocxResumePreview fileUrl={href} fileName={fileName} />
          ) : isLegacyWordDocument ? (
            <iframe
              src={officeEmbedUrl}
              title={`Word preview: ${fileName}`}
              className="h-full w-full border-0 bg-white"
            />
          ) : isImage ? (
            <object data={href} className="h-full w-full">
              <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
                <p className="text-sm font-medium">Image preview unavailable</p>
                <a
                  href={href}
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
              <p className="text-sm font-medium">This file type cannot be previewed inline.</p>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-xs underline"
              >
                Open resume in new tab
              </a>
            </div>
          )}
        </div>
      </div>
    );
  };

  const navigateContactDialog = useCallback(
    (direction: -1 | 1) => {
      const nextIndex = contactDialogIndex + direction;
      if (nextIndex < 0 || nextIndex >= filteredRecords.length) return;
      const next = filteredRecords[nextIndex];
      if (next) openContactHistoryDialog(next);
    },
    [contactDialogIndex, filteredRecords],
  );

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
      const values = (column.text ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
      return Array.from(new Set(values)).join(", ");
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
      await patchRecordColumnAction({
        sessionToken,
        itemId: targetRecordId,
        columnId: column.id,
        columnType: column.type,
        value: editingContactColumnDraft,
      });

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
        const data = await fetchMondayApi<
          {
            ok: boolean;
            error?: string;
            linkedItemCount?: number;
            createdParentUpdates?: number;
            createdSubitems?: number;
            createdSubitemUpdates?: number;
            updatedProgressColumns?: number;
            skippedSubitems?: number;
            warnings?: string[];
          }
        >(

          `/api/monday/records/${encodeURIComponent(targetId)}/sync`,
          {
            sessionToken,
            method: "POST",
            body: {
              ownerId: resolvedSyncOwnerId.length > 0 ? resolvedSyncOwnerId : undefined,
              monthlyBoardId: options?.monthlyBoardId,
            }
          }
        );
        if (!data.ok) {
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

  const openBulkQuickEmailDialog = useCallback(
    (action: QuickContactActionButton, items: MondayRecord[]) => {
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
      setBulkQuickEmailAction(action);
      setBulkQuestionnaireEmailRecords(list);
      setBulkQuestionnaireEmailIndex(0);
      setBulkQuestionnaireTemplateId(null);
      setBulkQuestionnaireSentTargetIds(new Set());
    },
    [sessionToken, staticMode],
  );

  const closeBulkQuestionnaireEmailDialog = useCallback(() => {
    if (isSendingBulkQuestionnaireEmail) return;
    setBulkQuickEmailAction(null);
    setBulkQuestionnaireEmailRecords([]);
    setBulkQuestionnaireEmailIndex(0);
    setBulkQuestionnaireTemplateId(null);
    setBulkQuestionnaireSentTargetIds(new Set());
  }, [isSendingBulkQuestionnaireEmail]);

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
    methodOfCommunication?: string;
    internalExternalStatus?: "Internal" | "External";
    subitemNameOverride?: string;
    suppressApprovalStepMarking?: boolean;
  }) => {
    const itemId = args.itemId.trim();
    const body = args.body.trim();
    if (!itemId || !body) {
      throw new Error("Missing Monday update context");
    }
    const updateType = args.updateType ?? "general";
    const suppressApprovalStepMarking = args.suppressApprovalStepMarking === true;
    const subitemTypeLabel = SUBITEM_TYPE_LABEL_BY_UPDATE_TYPE[updateType];
    const normalizedSubitemNameOverride = args.subitemNameOverride?.trim();
    const baseSubitemName = normalizedSubitemNameOverride && normalizedSubitemNameOverride.length > 0
      ? normalizedSubitemNameOverride
      : updateType === "general"
        ? body
        : UPDATE_SUBITEM_NAME_BY_TYPE[updateType];
    const desiredSubitemName = buildSubitemName(baseSubitemName, "General Update");

    const columnValues: Record<string, unknown> = {
      [SUBITEM_TYPE_COLUMN_ID]: { label: subitemTypeLabel },
    };
    const actorMondayUserId = identity?.userId?.trim() ?? "";
    if (/^\d+$/.test(actorMondayUserId)) {
      columnValues.person = {
        personsAndTeams: [{ id: Number(actorMondayUserId), kind: "person" }],
      };
    }
    const methodOfCommunication = args.methodOfCommunication?.trim();
    if (methodOfCommunication) {
      columnValues["method_of_communication__1"] = { label: methodOfCommunication };
    }
    const internalExternalStatus = args.internalExternalStatus?.trim();
    if (internalExternalStatus) {
      columnValues[SUBITEM_INTERNAL_EXTERNAL_COLUMN_ID] = { label: internalExternalStatus };
    }
    columnValues[SUBITEM_NOTES_COLUMN_ID] = { text: body };
    const normalizedDateTime = args.dateTime?.trim();
    const parsedDateTime = normalizedDateTime
      ? new Date(normalizedDateTime)
      : null;
    const hasValidDateTime = !!parsedDateTime && !Number.isNaN(parsedDateTime.getTime());
    const fallbackNow = new Date();
    const normalizedDate = args.date?.trim();
    const interactionDateOnly = hasValidDateTime
      ? parsedDateTime.toISOString().slice(0, 10)
      : normalizedDate || fallbackNow.toISOString().slice(0, 10);
    if (hasValidDateTime) {
      columnValues["date0"] = {
        date: parsedDateTime.toISOString().slice(0, 10),
        time: parsedDateTime.toISOString().slice(11, 19),
      };
    } else if (normalizedDate) {
      columnValues["date0"] = { date: normalizedDate };
    } else {
      columnValues["date0"] = {
        date: fallbackNow.toISOString().slice(0, 10),
        time: fallbackNow.toISOString().slice(11, 19),
      };
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

    const markApprovalStepDoneViaServer = async (stepColumnId: string) => {
      if (!sessionToken) {
        throw new Error("Missing monday session token for step update");
      }
      await resetApprovalStepAction({
        sessionToken,
        itemId,
        stepColumnId,
        action: "done",
      });
    };

    const markLastInteractionDateViaServer = async (dateOnly: string) => {
      if (!sessionToken) {
        throw new Error("Missing monday session token for last interaction sync");
      }
      await patchRecordAction({
        sessionToken,
        itemId,
        lastInteractionDate: dateOnly,
      });
    };

    let warning: string | null = null;
    const appendWarning = (nextWarning: string | null) => {
      const normalizedWarning = nextWarning?.trim() ?? "";
      if (!normalizedWarning) return;
      warning = warning ? `${warning} | ${normalizedWarning}` : normalizedWarning;
    };

    const boardId = await resolveMondayContextBoardId();
    try {
      if (boardId) {
        await callMondayContextApi<{
          change_multiple_column_values?: { id?: string | number | null } | null;
        }>(
          `
            mutation SyncLastInteractionDate(
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
              [LAST_INTERACTION_DATE_COLUMN_ID]: { date: interactionDateOnly },
            }),
          },
        );
      } else {
        await markLastInteractionDateViaServer(interactionDateOnly);
      }
    } catch (error) {
      if (boardId) {
        try {
          await markLastInteractionDateViaServer(interactionDateOnly);
        } catch (fallbackError) {
          const primaryMessage =
            error instanceof Error
              ? error.message
              : "Failed to sync last interaction date via monday context";
          const fallbackMessage =
            fallbackError instanceof Error
              ? fallbackError.message
              : "Failed to sync last interaction date via server fallback";
          appendWarning(`${primaryMessage} | ${fallbackMessage}`);
        }
      } else {
        appendWarning(
          error instanceof Error ? error.message : "Failed to sync last interaction date",
        );
      }
    }

    let approvalStepMarked = false;
    if (updateType !== "general" && !suppressApprovalStepMarking) {
      const approvalStepColumnId = APPROVAL_STEP_COLUMN_ID_BY_UPDATE_TYPE[updateType];
      if (!approvalStepColumnId) {
        appendWarning("No onboarding step mapping exists for this update type");
      } else {
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
            } catch (fallbackError) {
              const primaryMessage =
                error instanceof Error
                  ? error.message
                  : "Failed to mark onboarding step done via monday context";
              const fallbackMessage =
                fallbackError instanceof Error
                  ? fallbackError.message
                  : "Failed to mark onboarding step done via server fallback";
              appendWarning(`${primaryMessage} | ${fallbackMessage}`);
            }
          } else {
            appendWarning(
              error instanceof Error
                ? error.message
                : "Failed to mark onboarding step done",
            );
          }
        }
      }
    }

    return {
      id: targetSubitemId,
      body,
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
      dateTime?: string;
      methodOfCommunication?: string;
      internalExternalStatus?: "Internal" | "External";
      subitemNameOverride?: string;
      referredToContractors?: string[];
      targetRecordId?: string;
    },
  ) => {
    if (staticMode) {
      toast.error("Updates are unavailable in static mode");
      return;
    }
    if (!sessionToken) {
      toast.error("Missing monday session context");
      return;
    }
    const targetRecordId =
      options?.targetRecordId?.trim() ??
      (contactHistoryDialogRecord
        ? resolveContactUpdateTargetRecordId(contactHistoryDialogRecord)
        : "");
    if (!targetRecordId) {
      toast.error("Missing monday update target");
      return;
    }
    const updateType = options?.updateType ?? contactUpdateType;
    const normalizedReferredToContractors = (options?.referredToContractors ?? [])
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    if (updateType === "resume" && normalizedReferredToContractors.length === 0) {
      setResumeReferralDialogState({
        targetRecordId,
        selectedContractors: parseContractorValues(
          contactHistoryDialogRecord?.referredToContractors ?? null,
          retentionOptions.referredToContractors,
        ),
      });
      return;
    }
    const resumeSummary =
      updateType === "resume"
        ? `Resume Sent To Contractors - ${normalizedReferredToContractors.join(", ")}`
        : null;
    const body = (resumeSummary ?? options?.body ?? contactUpdateDraft).trim();
    const resolvedMethodOfCommunication =
      options?.methodOfCommunication ?? (updateType === "resume" ? "Email" : undefined);
    const resolvedSubitemNameOverride = resumeSummary ?? options?.subitemNameOverride;
    const resolvedInternalExternalStatus =
      options?.internalExternalStatus ??
      (updateType === "welcome_email" || updateType === "followup"
        ? "Internal"
        : undefined);
    if (!body) {
      toast.error("Enter an update before posting");
      return;
    }

    setIsCreatingContactUpdate(true);
    let data: MondayCreateRecordUpdateResponse;
    const writePath = canCreateUpdatesAsLoggedInMondayUser
      ? "monday-context-user"
      : "server-fallback";
    try {
      if (updateType === "resume") {
        await patchRecordAction({
          sessionToken,
          itemId: targetRecordId,
          referredToContractors: normalizedReferredToContractors,
        });
      }
      if (canCreateUpdatesAsLoggedInMondayUser) {
        const update = await createMondayRecordUpdateAsContextUser({
          itemId: targetRecordId,
          body,
          updateType,
          date: options?.date,
          dateTime: options?.dateTime,
          methodOfCommunication: resolvedMethodOfCommunication,
          internalExternalStatus: resolvedInternalExternalStatus,
          subitemNameOverride: resolvedSubitemNameOverride,
        });
        data = { ok: true, update };
      } else {
        const created = await createRecordUpdateAction({
          sessionToken,
          itemId: targetRecordId,
          body,
          updateType,
          date: options?.date,
          dateTime: options?.dateTime,
          methodOfCommunication: resolvedMethodOfCommunication,
          internalExternalStatus: resolvedInternalExternalStatus,
          subitemNameOverride: resolvedSubitemNameOverride,
        });
        data = { ok: true, update: created.update };
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to post Monday update";
      console.error("[monday][contact-update] write failed", {
        targetRecordId,
        updateType,
        writePath,
        error: message,
      });
      toast.error(`Failed to post update (${writePath}): ${message}`);
      setIsCreatingContactUpdate(false);
      return;
    }

    setContactUpdateDraft("");
    if (!options?.keepSelectedType) {
      setContactUpdateType("general");
    }

    if (sessionToken && contactHistoryDialogRecord && identity?.userId) {
      const contactId = resolveContactUpdateTargetRecordId(contactHistoryDialogRecord);
      fetchMondayApi<{ ok?: boolean; error?: string }>(
        "/api/monday/touches",
        {
          sessionToken,
          method: "POST",
          body: {
            contactItemId: contactId,
            contactName: contactHistoryDialogRecord.name ?? "",
            ownerId: identity.userId,
            source: "update",
          }
        }
      ).catch(() => { });
    }

    try {
      const [, refreshedRecordsResult] = await Promise.all([
        contactUpdatesQuery.refetch(),
        recordsQuery.refetch(),
      ]);
      const refreshedRecords = (refreshedRecordsResult.data?.pages ?? []).flatMap(
        (page) => page.records ?? [],
      );
      syncContactHistoryDialogFromRecords(refreshedRecords);
    } catch (error) {
      const syncMessage =
        error instanceof Error
          ? error.message
          : "Failed to refresh contact data after posting update";
      console.error("[monday][contact-update] update posted but sync failed", {
        targetRecordId,
        updateType,
        error: syncMessage,
      });
      if (data.update?.warning) {
        toast.success("Update posted to monday.com");
        toast.error(`Onboarding step sync warning: ${data.update.warning}`);
      } else if (data.update?.approvalStepMarked) {
        toast.success("Update posted and onboarding step marked complete");
      } else {
        toast.success("Update posted to monday.com");
      }
      toast.error(
        `Update posted, but refreshing contact history failed: ${syncMessage}`,
      );
      setIsCreatingContactUpdate(false);
      return;
    }

    if (data.update?.warning) {
      toast.success("Update posted to monday.com");
      toast.error(`Onboarding step sync warning: ${data.update.warning}`);
    } else if (data.update?.approvalStepMarked) {
      toast.success("Update posted and onboarding step marked complete");
    } else {
      toast.success("Update posted to monday.com");
    }

    setIsCreatingContactUpdate(false);
  };

  const handleSubmitCommunicationQuickAction = async (values: {
    body: string;
    methodOfCommunication: CommunicationQuickActionMethod;
    date: string;
    time: string;
  }) => {
    const dateOnly = values.date.trim();
    const timeOnly = values.time.trim();
    const dateTime =
      dateOnly && timeOnly ? `${dateOnly}T${timeOnly}:00` : undefined;
    await handleCreateContactUpdate({
      updateType: "general",
      body: values.body,
      keepSelectedType: true,
      date: dateOnly || undefined,
      dateTime,
      methodOfCommunication: values.methodOfCommunication,
    });
    setCommunicationQuickAction(null);
  };
  const resolveBulkCommunicationTargets = useCallback((selectedItems: MondayRecord[]) => {
    const targetsByRecordId = new Map<string, MondayRecord>();
    for (const record of selectedItems) {
      const targetRecordId = resolveContactUpdateTargetRecordId(record);
      if (!targetRecordId.trim()) continue;
      if (!targetsByRecordId.has(targetRecordId)) {
        targetsByRecordId.set(targetRecordId, record);
      }
    }
    return Array.from(targetsByRecordId.entries()).map(([targetRecordId, record]) => ({
      targetRecordId,
      record,
    }));
  }, []);
  const createCommunicationUpdateForTarget = useCallback(
    async (args: {
      targetRecordId: string;
      values: {
        body: string;
        methodOfCommunication: CommunicationQuickActionMethod;
        date: string;
        time: string;
      };
    }) => {
      const { targetRecordId, values } = args;
      const dateOnly = values.date.trim();
      const timeOnly = values.time.trim();
      const dateTime =
        dateOnly && timeOnly ? `${dateOnly}T${timeOnly}:00` : undefined;

      let data: MondayCreateRecordUpdateResponse;
      if (canCreateUpdatesAsLoggedInMondayUser) {
        const update = await createMondayRecordUpdateAsContextUser({
          itemId: targetRecordId,
          body: values.body,
          updateType: "general",
          date: dateOnly || undefined,
          dateTime,
          methodOfCommunication: values.methodOfCommunication,
        });
        data = { ok: true, update };
      } else {
        const created = await createRecordUpdateAction({
          sessionToken,
          itemId: targetRecordId,
          body: values.body,
          updateType: "general",
          date: dateOnly || undefined,
          dateTime,
          methodOfCommunication: values.methodOfCommunication,
        });
        data = { ok: true, update: created.update };
      }
      return data;
    },
    [canCreateUpdatesAsLoggedInMondayUser, createMondayRecordUpdateAsContextUser, sessionToken],
  );
  const handleSubmitBulkCommunicationQuickAction = async (values: {
    body: string;
    methodOfCommunication: CommunicationQuickActionMethod;
    date: string;
    time: string;
  }) => {
    if (staticMode) {
      toast.error("Bulk updates are unavailable in static mode");
      return;
    }
    if (!sessionToken) {
      toast.error("Missing monday session token");
      return;
    }
    if (!bulkCommunicationQuickAction) {
      toast.error("Missing bulk communication context");
      return;
    }
    const selectedItems = bulkCommunicationQuickAction.selectedItems;
    if (selectedItems.length === 0) {
      toast.error("Select at least one record");
      return;
    }
    const targets = resolveBulkCommunicationTargets(selectedItems);
    if (targets.length === 0) {
      toast.error("No valid contact records in selection");
      return;
    }

    setIsCreatingBulkCommunicationUpdate(true);
    try {
      const results = await Promise.all(
        targets.map(async ({ targetRecordId }) => {
          try {
            const data = await createCommunicationUpdateForTarget({ targetRecordId, values });
            return { ok: true, warning: data.update?.warning ?? null, error: "" };
          } catch (error) {
            return {
              ok: false,
              warning: null,
              error: error instanceof Error ? error.message : "Failed to post Monday update",
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
      bulkCommunicationQuickAction.clearSelection();
      setBulkCommunicationQuickAction(null);

      if (successCount > 0) {
        toast.success(
          `Applied "${bulkCommunicationQuickAction.action.label}" to ${successCount} record${successCount === 1 ? "" : "s"}.`,
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
          `Failed to apply update to ${failedCount} record${failedCount === 1 ? "" : "s"}: ${firstError}`,
        );
      }
    } finally {
      setIsCreatingBulkCommunicationUpdate(false);
    }
  };
  const openBulkCommunicationModePrompt = useCallback(
    (payload: BulkCommunicationQuickActionState) => {
      setBulkCommunicationModePrompt(payload);
    },
    [],
  );
  const openBulkUniqueCommunicationSession = useCallback(
    (payload: BulkCommunicationQuickActionState) => {
      const targets = resolveBulkCommunicationTargets(payload.selectedItems);
      if (targets.length === 0) {
        toast.error("No valid contact records in selection");
        return;
      }
      const now = new Date();
      setBulkUniqueCommunicationSession({
        action: payload.action,
        targets,
        clearSelection: payload.clearSelection,
      });
      setBulkUniqueCommunicationIndex(0);
      setBulkUniqueCommunicationSubmittedTargetIds(new Set());
      bulkUniqueDraftValuesByTargetIdRef.current = new Map();
      setBulkUniqueCommunicationBody(payload.action.defaultBody);
      setBulkUniqueCommunicationMethod(payload.action.method);
      setBulkUniqueCommunicationDate(toDateOnly(now));
      setBulkUniqueCommunicationTime(toTimeOnly(now));
    },
    [resolveBulkCommunicationTargets],
  );
  const closeBulkUniqueCommunicationSession = useCallback(() => {
    if (isCreatingBulkCommunicationUpdate) return;
    setBulkUniqueCommunicationSession(null);
    setBulkUniqueCommunicationIndex(0);
    setBulkUniqueCommunicationSubmittedTargetIds(new Set());
    bulkUniqueDraftValuesByTargetIdRef.current = new Map();
  }, [isCreatingBulkCommunicationUpdate]);
  const bulkUniqueActiveTarget = bulkUniqueCommunicationSession?.targets[bulkUniqueCommunicationIndex] ?? null;
  const persistBulkUniqueDraft = useCallback(() => {
    if (!bulkUniqueActiveTarget) return;
    bulkUniqueDraftValuesByTargetIdRef.current.set(bulkUniqueActiveTarget.targetRecordId, {
      body: bulkUniqueCommunicationBody,
      methodOfCommunication: bulkUniqueCommunicationMethod,
      date: bulkUniqueCommunicationDate,
      time: bulkUniqueCommunicationTime,
    });
  }, [
    bulkUniqueActiveTarget,
    bulkUniqueCommunicationBody,
    bulkUniqueCommunicationDate,
    bulkUniqueCommunicationMethod,
    bulkUniqueCommunicationTime,
  ]);
  const loadBulkUniqueDraftForIndex = useCallback(
    (nextIndex: number) => {
      const target = bulkUniqueCommunicationSession?.targets[nextIndex];
      if (!target) return;
      const stored = bulkUniqueDraftValuesByTargetIdRef.current.get(target.targetRecordId);
      if (stored) {
        setBulkUniqueCommunicationBody(stored.body);
        setBulkUniqueCommunicationMethod(stored.methodOfCommunication);
        setBulkUniqueCommunicationDate(stored.date);
        setBulkUniqueCommunicationTime(stored.time);
        return;
      }
      const now = new Date();
      setBulkUniqueCommunicationBody(bulkUniqueCommunicationSession?.action.defaultBody ?? "");
      setBulkUniqueCommunicationMethod(bulkUniqueCommunicationSession?.action.method ?? "Email");
      setBulkUniqueCommunicationDate(toDateOnly(now));
      setBulkUniqueCommunicationTime(toTimeOnly(now));
    },
    [bulkUniqueCommunicationSession],
  );
  const navigateBulkUniqueCommunication = useCallback(
    (nextIndex: number) => {
      if (!bulkUniqueCommunicationSession) return;
      if (nextIndex < 0 || nextIndex >= bulkUniqueCommunicationSession.targets.length) return;
      persistBulkUniqueDraft();
      setBulkUniqueCommunicationIndex(nextIndex);
      loadBulkUniqueDraftForIndex(nextIndex);
    },
    [bulkUniqueCommunicationSession, loadBulkUniqueDraftForIndex, persistBulkUniqueDraft],
  );
  const submitBulkUniqueCommunicationForActiveTarget = async () => {
    if (staticMode) {
      toast.error("Bulk updates are unavailable in static mode");
      return;
    }
    if (!sessionToken) {
      toast.error("Missing monday session token");
      return;
    }
    if (!bulkUniqueCommunicationSession || !bulkUniqueActiveTarget) {
      toast.error("Missing bulk communication context");
      return;
    }
    if (!bulkUniqueCommunicationBody.trim()) {
      toast.error("Comments are required");
      return;
    }

    setIsCreatingBulkCommunicationUpdate(true);
    try {
      await createCommunicationUpdateForTarget({
        targetRecordId: bulkUniqueActiveTarget.targetRecordId,
        values: {
          body: bulkUniqueCommunicationBody.trim(),
          methodOfCommunication: bulkUniqueCommunicationMethod,
          date: bulkUniqueCommunicationDate,
          time: bulkUniqueCommunicationTime,
        },
      });
      const nextSubmitted = new Set(bulkUniqueCommunicationSubmittedTargetIds);
      nextSubmitted.add(bulkUniqueActiveTarget.targetRecordId);
      setBulkUniqueCommunicationSubmittedTargetIds(nextSubmitted);
      persistBulkUniqueDraft();

      const nextIndex = bulkUniqueCommunicationSession.targets.findIndex(
        (target, index) =>
          index > bulkUniqueCommunicationIndex && !nextSubmitted.has(target.targetRecordId),
      );
      if (nextIndex >= 0) {
        setBulkUniqueCommunicationIndex(nextIndex);
        loadBulkUniqueDraftForIndex(nextIndex);
        return;
      }

      const firstRemainingIndex = bulkUniqueCommunicationSession.targets.findIndex(
        (target) => !nextSubmitted.has(target.targetRecordId),
      );
      if (firstRemainingIndex >= 0) {
        setBulkUniqueCommunicationIndex(firstRemainingIndex);
        loadBulkUniqueDraftForIndex(firstRemainingIndex);
        return;
      }

      const [, refreshedRecordsResult] = await Promise.all([
        contactHistoryDialogRecord ? contactUpdatesQuery.refetch() : Promise.resolve(null),
        recordsQuery.refetch(),
      ]);
      const refreshedRecords = (refreshedRecordsResult.data?.pages ?? []).flatMap(
        (page) => page.records ?? [],
      );
      syncContactHistoryDialogFromRecords(refreshedRecords);
      bulkUniqueCommunicationSession.clearSelection();
      closeBulkUniqueCommunicationSession();
      toast.success(
        `Applied "${bulkUniqueCommunicationSession.action.label}" to ${nextSubmitted.size} record${nextSubmitted.size === 1 ? "" : "s"}.`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to post Monday update";
      toast.error(message);
    } finally {
      setIsCreatingBulkCommunicationUpdate(false);
    }
  };

  const handleReferContactToJob = async (job: MondayJobListing) => {
    if (!contactHistoryDialogRecord) {
      toast.error("Open a contact before creating a referral");
      return;
    }
    const targetRecordId =
      contactHistoryDialogRecord.contactId?.trim() ||
      contactHistoryDialogRecord.id.trim();
    if (!targetRecordId) {
      toast.error("Missing contact id for referral");
      return;
    }
    const normalizedJobTitle = job.title.trim().toLowerCase();
    if (
      referredJobIds.has(job.id) ||
      (normalizedJobTitle.length > 0 && referredJobTitleKeys.has(normalizedJobTitle))
    ) {
      toast("This contact is already referred to that job.");
      return;
    }

    const details = [
      `Job ID: ${job.id}`,
      job.district ? `District: ${job.district}` : null,
      job.location ? `Location: ${job.location}` : null,
      job.contractor ? `Contractor: ${job.contractor}` : null,
      job.applyEmail ? `Apply Email: ${job.applyEmail}` : null,
      job.applyPhone ? `Apply Phone: ${job.applyPhone}` : null,
      job.websiteUrl ? `URL: ${job.websiteUrl}` : null,
    ].filter((value): value is string => !!value);

    setReferringJobId(job.id);
    try {
      await handleCreateContactUpdate({
        targetRecordId,
        updateType: "job_referral",
        body: [`Referred to Job: ${job.title}`, ...details].join("\n"),
        subitemNameOverride: `Referral - ${job.title}`,
        keepSelectedType: true,
      });
    } finally {
      setReferringJobId(null);
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
    if (action.type === "resume") {
      toast.error(
        "Resume Submitted requires contractor selection per contact. Use contact dialog or Kanban move to complete this step.",
      );
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
              const created = await createRecordUpdateAction({
                sessionToken,
                itemId: targetRecordId,
                body: action.defaultBody,
                updateType: action.type,
              });
              data = { ok: true, update: created.update };
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

  const renderBulkActionsBar = (
    selectedItems: MondayRecord[],
    clearSelection: () => void,
  ) => {
    return (
      <ContactBulkActionsBar
        selectedItems={selectedItems}
        clearSelection={clearSelection}
        approvalSteps={approvalSteps}
        getMergeTargetRecordId={getMergeTargetRecordId}
        bulkQuickActionType={bulkQuickActionType}
        isCreatingBulkCommunicationUpdate={isCreatingBulkCommunicationUpdate}
        isMergingRecords={isMergingRecords}
        isMondaySettingsAdmin={isMondaySettingsAdmin}
        syncingContactIds={syncingContactIds}
        latestBulkSyncJob={latestBulkSyncJob}
        quickActionButtonSizeClass={quickActionButtonSizeClass}
        actionButtonClassName={boardThemeStyles.actionButtonClassName}
        actionButtonStyle={boardThemeInlineStyles.actionButtonStyle}
        onOpenMergeDialog={(recordsToMerge, clearSelectionForMerge) => {
          mergeClearSelectionRef.current = clearSelectionForMerge;
          openMergeDialogForRecords(recordsToMerge);
        }}
        onStartBulkSync={(recordsToSync, clearSelectionForSync) => {
          void (async () => {
            try {
              const job = await startBulkSyncJob([...recordsToSync]);
              clearSelectionForSync();
              toast.success(
                `Bulk sync started for ${job.totalContacts} contact${job.totalContacts === 1 ? "" : "s"}`,
              );
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : "Failed to start bulk sync",
              );
            }
          })();
        }}
        onConfirmQuickAction={(action, recordsToUpdate, clearSelectionForQuickAction) => {
          bulkClearSelectionRef.current = clearSelectionForQuickAction;
          setBulkQuickActionConfirmation({
            action,
            selectedItems: recordsToUpdate,
          });
        }}
        onOpenQuestionnaire={openQuestionnaireDialogForRecords}
        onOpenBulkCommunicationPrompt={(action, recordsForCommunication, clearSelectionForCommunication) => {
          openBulkCommunicationModePrompt({
            action,
            selectedItems: recordsForCommunication,
            clearSelection: clearSelectionForCommunication,
          });
        }}
        onCancelBulkSync={(jobId) => {
          void (async () => {
            try {
              await cancelBulkSyncJob(jobId);
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : "Failed to cancel bulk sync",
              );
            }
          })();
        }}
        onRetryFailedBulkSync={(jobId) => {
          void (async () => {
            try {
              const result = await retryFailedBulkSyncJob(jobId);
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
      />
    );
  };

  const resolveBulkQuestionnaireTemplateForRecord = useCallback(
    async (record: MondayRecord) => {
      if (!sessionToken) {
        throw new Error("Missing monday session token");
      }
      const targetRecordId = resolveContactUpdateTargetRecordId(record);
      if (!targetRecordId.trim()) {
        throw new Error("Missing monday update target");
      }
      const templateId = bulkQuestionnaireTemplateId ?? preferredBulkQuickEmailTemplateId;
      if (!templateId) {
        throw new Error("No email templates found");
      }
      const template =
        emailTemplates.find((entry) => entry.id === templateId) ?? emailTemplates[0] ?? null;
      if (!template) {
        throw new Error("No email templates found");
      }

      const data = await getRecordColumnsAction({
        sessionToken,
        itemId: targetRecordId,
      });

      const primaryOwner = record.ownerProfiles[0] ?? null;
      const ownerName = primaryOwner?.name?.trim() ?? record.peopleText?.trim() ?? "";
      const ownerEmail = primaryOwner?.email?.trim() ?? "";
      const vars: Record<string, string> = {
        "owner.name": ownerName,
        "owner.email": ownerEmail,
        "contact.name": record.name?.trim() ?? "",
        "contact.email": record.email?.trim() ?? "",
      };
      const columnValues = new Map(
        (data.columns ?? []).map((column) => {
          const fallbackFromValue =
            typeof column.value === "string" &&
              column.value.trim().startsWith("{") &&
              column.value.trim().endsWith("}")
              ? (() => {
                try {
                  const parsed = JSON.parse(column.value) as {
                    label?: { text?: unknown };
                    labels?: unknown;
                    text?: unknown;
                  };
                  if (typeof parsed.label?.text === "string") return parsed.label.text;
                  if (Array.isArray(parsed.labels)) {
                    const labels = parsed.labels.filter(
                      (value): value is string => typeof value === "string",
                    );
                    if (labels.length > 0) return labels.join(", ");
                  }
                  if (typeof parsed.text === "string") return parsed.text;
                } catch {
                  // ignore parse errors
                }
                return "";
              })()
              : "";
          return [column.id, (column.text?.trim() || fallbackFromValue || "").trim()];
        }),
      );
      for (const entry of platformSettings.emailSystemTags) {
        vars[entry.tag] = columnValues.get(entry.columnId) ?? "";
      }

      const subject = interpolateTemplateVariables(template.name, vars);
      const htmlSource =
        template.renderedHtml.trim().length > 0 ? template.renderedHtml : template.content;
      const html = interpolateTemplateVariables(htmlSource, vars);

      return { html, subject, targetRecordId };
    },
    [
      bulkQuestionnaireTemplateId,
      emailTemplates,
      platformSettings.emailSystemTags,
      preferredBulkQuickEmailTemplateId,
      sessionToken,
    ],
  );

  const sendBulkQuestionnaireEmailForRecord = useCallback(
    async (record: MondayRecord) => {
      if (!sessionToken) {
        throw new Error("Missing monday session token");
      }
      const recipient = record.email?.trim() ?? "";
      if (!recipient) {
        throw new Error("This contact does not have an email address");
      }

      const { subject, html, targetRecordId } =
        await resolveBulkQuestionnaireTemplateForRecord(record);

      const senderMailboxUserId =
        record.ownerIds[0]?.trim() || identity?.userId?.trim() || "";
      if (!senderMailboxUserId) {
        throw new Error("Contact has no owner mailbox to send from");
      }

      const sendData = await fetchMondayApi<MondaySendEmailResponse>(
        "/api/monday/email/send",
        {
          sessionToken,
          method: "POST",
          body: {
            to: recipient,
            subject,
            html,
            contactItemId: targetRecordId,
            ownerMondayUserId: senderMailboxUserId,
          }
        }
      );
      if (!sendData.ok) {
        throw new Error(sendData.error ?? "Failed to send email");
      }

      const actionType = bulkQuickEmailAction?.type ?? "followup";
      const updateBody = bulkQuickEmailAction?.defaultBody?.trim() || "Questionnaire Sent";
      await createRecordUpdateAction({
        sessionToken,
        itemId: targetRecordId,
        body: updateBody,
        updateType: actionType,
        dateTime: new Date().toISOString(),
        internalExternalStatus: "External",
      });

      if (identity?.userId) {
        fetchMondayApi<{ ok?: boolean; error?: string }>(
          "/api/monday/touches",
          {
            sessionToken,
            method: "POST",
            body: {
              contactItemId: targetRecordId,
              contactName: record.name ?? "",
              ownerId: identity.userId,
              source: "update",
            }
          }
        ).catch(() => { });
      }

      return targetRecordId;
    },
    [bulkQuickEmailAction, identity?.userId, resolveBulkQuestionnaireTemplateForRecord, sessionToken],
  );

  const handleSendBulkQuestionnaireToActiveRecord = async () => {
    const activeRecord = bulkQuestionnaireEmailRecords[bulkQuestionnaireEmailIndex];
    if (!activeRecord) return;
    setIsSendingBulkQuestionnaireEmail(true);
    try {
      const targetRecordId = await sendBulkQuestionnaireEmailForRecord(activeRecord);
      const nextSentSet = new Set(bulkQuestionnaireSentTargetIds);
      nextSentSet.add(targetRecordId);
      setBulkQuestionnaireSentTargetIds(nextSentSet);

      const [, refreshedRecordsResult] = await Promise.all([
        contactHistoryDialogRecord ? contactUpdatesQuery.refetch() : Promise.resolve(null),
        recordsQuery.refetch(),
      ]);
      const refreshedRecords = (refreshedRecordsResult.data?.pages ?? []).flatMap(
        (page) => page.records ?? [],
      );
      syncContactHistoryDialogFromRecords(refreshedRecords);

      const findNextUnsentIndex = () => {
        for (
          let index = bulkQuestionnaireEmailIndex + 1;
          index < bulkQuestionnaireEmailRecords.length;
          index += 1
        ) {
          const record = bulkQuestionnaireEmailRecords[index];
          if (!record) continue;
          const id = resolveContactUpdateTargetRecordId(record);
          if (id && !nextSentSet.has(id)) return index;
        }
        for (let index = 0; index <= bulkQuestionnaireEmailIndex; index += 1) {
          const record = bulkQuestionnaireEmailRecords[index];
          if (!record) continue;
          const id = resolveContactUpdateTargetRecordId(record);
          if (id && !nextSentSet.has(id)) return index;
        }
        return -1;
      };
      const nextIndex = findNextUnsentIndex();

      if (nextIndex >= 0) {
        setBulkQuestionnaireEmailIndex(nextIndex);
        toast.success(`Email sent to ${activeRecord.email?.trim() ?? activeRecord.name}`);
      } else {
        toast.success(
          `${bulkQuickEmailAction?.label ?? "Bulk email"} sent to all selected contacts`,
        );
        bulkClearSelectionRef.current?.();
        setBulkQuestionnaireEmailRecords([]);
        setBulkQuestionnaireEmailIndex(0);
        setBulkQuestionnaireTemplateId(null);
        setBulkQuestionnaireSentTargetIds(new Set());
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : `Failed to send ${bulkQuickEmailAction?.label ?? "bulk email"}`;
      toast.error(message);
    } finally {
      setIsSendingBulkQuestionnaireEmail(false);
    }
  };

  const handleSendBulkQuestionnaireToAll = async () => {
    if (bulkQuestionnaireEmailRecords.length === 0) return;
    setIsSendingBulkQuestionnaireEmail(true);
    const nextSentSet = new Set(bulkQuestionnaireSentTargetIds);
    let successCount = 0;
    let failedCount = 0;
    let firstError = "";
    try {
      const recipientPayloads: Array<{
        record: MondayRecord;
        targetRecordId: string;
        recipientEmail: string;
        senderMailboxUserId: string;
        subject: string;
        html: string;
      }> = [];
      for (const record of bulkQuestionnaireEmailRecords) {
        const targetRecordId = resolveContactUpdateTargetRecordId(record);
        if (!targetRecordId || nextSentSet.has(targetRecordId)) continue;
        const recipientEmail = record.email?.trim() ?? "";
        if (!recipientEmail) {
          failedCount += 1;
          if (!firstError) firstError = "One or more contacts are missing email addresses.";
          continue;
        }
        const senderMailboxUserId =
          record.ownerIds[0]?.trim() || identity?.userId?.trim() || "";
        if (!senderMailboxUserId) {
          failedCount += 1;
          if (!firstError) firstError = "Contact has no owner mailbox to send from.";
          continue;
        }
        const { subject, html } = await resolveBulkQuestionnaireTemplateForRecord(record);
        recipientPayloads.push({
          record,
          targetRecordId,
          recipientEmail,
          senderMailboxUserId,
          subject,
          html,
        });
      }

      if (recipientPayloads.length > 0) {
        const batchData = await fetchMondayApi<MondaySendEmailBatchResponse>(
          "/api/monday/email/send/batch",
          {
            sessionToken,
            method: "POST",
            body: {
              recipients: recipientPayloads.map((entry) => ({
                to: entry.recipientEmail,
                contactItemId: entry.targetRecordId,
                ownerMondayUserId: entry.senderMailboxUserId,
                subject: entry.subject,
                html: entry.html,
              })),
            },
          },
        );

        const results = batchData.results ?? [];
        for (const row of results) {
          const matchingPayload = recipientPayloads.find(
            (entry) => entry.targetRecordId === row.contactItemId,
          );
          if (!matchingPayload) continue;
          if (row.ok) {
            nextSentSet.add(matchingPayload.targetRecordId);
            successCount += 1;
            const actionType = bulkQuickEmailAction?.type ?? "followup";
            const updateBody =
              bulkQuickEmailAction?.defaultBody?.trim() || "Questionnaire Sent";
            await createRecordUpdateAction({
              sessionToken,
              itemId: matchingPayload.targetRecordId,
              body: updateBody,
              updateType: actionType,
              dateTime: new Date().toISOString(),
              internalExternalStatus: "External",
            });
            if (identity?.userId) {
              fetchMondayApi<{ ok?: boolean; error?: string }>(
                "/api/monday/touches",
                {
                  sessionToken,
                  method: "POST",
                  body: {
                    contactItemId: matchingPayload.targetRecordId,
                    contactName: matchingPayload.record.name ?? "",
                    ownerId: identity.userId,
                    source: "update",
                  },
                },
              ).catch(() => {});
            }
          } else {
            failedCount += 1;
            if (!firstError) {
              firstError =
                row.error ?? `Failed to send ${bulkQuickEmailAction?.label ?? "bulk email"}`;
            }
          }
        }
      }

      setBulkQuestionnaireSentTargetIds(nextSentSet);

      if (successCount > 0) {
        const [, refreshedRecordsResult] = await Promise.all([
          contactHistoryDialogRecord ? contactUpdatesQuery.refetch() : Promise.resolve(null),
          recordsQuery.refetch(),
        ]);
        const refreshedRecords = (refreshedRecordsResult.data?.pages ?? []).flatMap(
          (page) => page.records ?? [],
        );
        syncContactHistoryDialogFromRecords(refreshedRecords);
      }

      if (failedCount === 0) {
        toast.success(
          `${bulkQuickEmailAction?.label ?? "Bulk email"} sent to ${successCount} contact${successCount === 1 ? "" : "s"}`,
        );
        bulkClearSelectionRef.current?.();
        setBulkQuestionnaireEmailRecords([]);
        setBulkQuestionnaireEmailIndex(0);
        setBulkQuestionnaireTemplateId(null);
        setBulkQuestionnaireSentTargetIds(new Set());
        return;
      }

      toast.error(
        `Failed for ${failedCount} contact${failedCount === 1 ? "" : "s"}${firstError ? `: ${firstError}` : ""}`,
      );
      const nextIndex = bulkQuestionnaireEmailRecords.findIndex((record) => {
        const id = resolveContactUpdateTargetRecordId(record);
        return !!id && !nextSentSet.has(id);
      });
      if (nextIndex >= 0) {
        setBulkQuestionnaireEmailIndex(nextIndex);
      }
    } finally {
      setIsSendingBulkQuestionnaireEmail(false);
    }
  };
  const bulkQuestionnaireDialogOpen = bulkQuestionnaireEmailRecords.length > 0;
  const bulkQuestionnairePendingCount = bulkQuestionnaireEmailRecords.filter((record) => {
    const id = resolveContactUpdateTargetRecordId(record);
    return !!id && !bulkQuestionnaireSentTargetIds.has(id);
  }).length;
  const bulkActionsState = useBulkActions({
    selectedRecords: selectedCrossViewRecords,
    pendingCount: bulkQuestionnairePendingCount,
  });
  const bulkQuestionnaireActiveAlreadySent =
    !!bulkQuestionnaireTargetRecordId &&
    bulkQuestionnaireSentTargetIds.has(bulkQuestionnaireTargetRecordId);

  const handleConfirmMergeRecords = async () => {
    if (staticMode) {
      toast.error("Merge is unavailable in static mode");
      return;
    }
    if (!sessionToken || !mergeDialogState) {
      toast.error("Missing monday session context");
      return;
    }

    const recordsByTargetId = new Map<string, MondayRecord>();
    for (const record of mergeDialogState.records) {
      const targetRecordId = getMergeTargetRecordId(record);
      if (!targetRecordId) continue;
      if (!recordsByTargetId.has(targetRecordId)) {
        recordsByTargetId.set(targetRecordId, record);
      }
    }

    const masterRecordId = mergeDialogState.masterRecordId.trim();
    const masterRecord = recordsByTargetId.get(masterRecordId) ?? null;
    if (!masterRecordId || !masterRecord) {
      toast.error("Choose a valid master contact to continue");
      return;
    }

    const sourceItemIds = Array.from(recordsByTargetId.keys()).filter(
      (targetRecordId) => targetRecordId !== masterRecordId,
    );
    if (sourceItemIds.length === 0) {
      toast.error("Select at least one duplicate contact to merge");
      return;
    }
    if (sourceItemIds.length > 3) {
      toast.error("You can merge up to 4 contacts at once");
      return;
    }

    const fieldOverrides: {
      ownerId?: string | null;
      status?: string | null;
      tags?: string[] | null;
      referredToContractors?: string[] | null;
      interviewingWithContractors?: string[] | null;
      hiredWithContractor?: string | null;
      hireDate?: string | null;
      retentionPeriod?: string | null;
    } = {};

    for (const field of MERGE_FIELD_CONFIG) {
      const sourceRecordId =
        mergeDialogState.fieldSourceByKey[field.key]?.trim() || masterRecordId;
      const sourceRecord = recordsByTargetId.get(sourceRecordId) ?? masterRecord;
      const value = getMergeFieldValueFromRecord(sourceRecord, field.key);
      if (field.key === "tags") {
        fieldOverrides.tags = Array.isArray(value) ? value : null;
      } else if (field.key === "referredToContractors") {
        fieldOverrides.referredToContractors = Array.isArray(value) ? value : null;
      } else if (field.key === "interviewingWithContractors") {
        fieldOverrides.interviewingWithContractors = Array.isArray(value) ? value : null;
      } else if (field.key === "ownerId") {
        fieldOverrides.ownerId = typeof value === "string" ? value : null;
      } else if (field.key === "status") {
        fieldOverrides.status = typeof value === "string" ? value : null;
      } else if (field.key === "hiredWithContractor") {
        fieldOverrides.hiredWithContractor = typeof value === "string" ? value : null;
      } else if (field.key === "hireDate") {
        fieldOverrides.hireDate = typeof value === "string" ? value : null;
      } else if (field.key === "retentionPeriod") {
        fieldOverrides.retentionPeriod = typeof value === "string" ? value : null;
      }
    }

    setIsMergingRecords(true);
    try {
      const data = await fetchMondayApi<
        {
          ok?: boolean;
          error?: string;
          createdSubitems?: number;
          skippedDuplicates?: number;
          deletedSourceCount?: number;
        }
      >(

        "/api/monday/records/merge",
        {
          sessionToken,
          method: "POST",
          body: {
            masterItemId: masterRecordId,
            sourceItemIds,
            fieldOverrides,
            deleteSources: true,
          }
        }
      );
      if (!data.ok) {
        throw new Error(data.error ?? "Failed to merge selected contacts");
      }

      const [, refreshedRecordsResult] = await Promise.all([
        contactHistoryDialogRecord ? contactUpdatesQuery.refetch() : Promise.resolve(null),
        recordsQuery.refetch(),
      ]);
      const refreshedRecords = (refreshedRecordsResult.data?.pages ?? []).flatMap(
        (page) => page.records ?? [],
      );
      syncContactHistoryDialogFromRecords(refreshedRecords);
      mergeClearSelectionRef.current?.();
      setMergeDialogState(null);
      toast.success(
        `Merged ${sourceItemIds.length} duplicate contact${sourceItemIds.length === 1 ? "" : "s"} into master (${data.createdSubitems ?? 0} updates copied, ${data.skippedDuplicates ?? 0} duplicates skipped).`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to merge selected contacts";
      toast.error(message);
    } finally {
      setIsMergingRecords(false);
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
        if (stepConfig.updateType === "resume") {
          setResumeReferralDialogState({
            targetRecordId,
            selectedContractors: splitCsvValues(move.record.referredToContractors),
          });
          return;
        }

        if (stepConfig.updateType && canCreateUpdatesAsLoggedInMondayUser) {
          await createMondayRecordUpdateAsContextUser({
            itemId: targetRecordId,
            body: stepConfig.defaultBody,
            updateType: stepConfig.updateType,
          });
        } else if (stepConfig.updateType) {
          await createRecordUpdateAction({
            sessionToken,
            itemId: targetRecordId,
            body: stepConfig.defaultBody,
            updateType: stepConfig.updateType,
          });
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
            await createRecordUpdateAction({
              sessionToken,
              itemId: targetRecordId,
              body: stepConfig.defaultBody,
              updateType: "general",
            });
            await resetApprovalStepAction({
              sessionToken,
              itemId: targetRecordId,
              stepColumnId: stepConfig.stepColumnId,
              action: "done",
            });
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
          await resetApprovalStepAction({
            sessionToken,
            itemId: targetRecordId,
            stepColumnId: stepConfig.stepColumnId,
            action: "reset",
          });
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

  const handleKanbanBulkMoveForward = async () => {
    if (staticMode) {
      toast.error("Updates are unavailable in static mode");
      return;
    }
    if (!sessionToken) {
      toast.error("Missing monday session context");
      return;
    }
    if (selectedCrossViewRecords.length === 0 || selectedKanbanStepIndex === null) {
      toast.error("Select at least one record in the same column");
      return;
    }

    const toStepIndex = selectedKanbanStepIndex + 1;
    const stepConfig = KANBAN_STEP_CONFIG[toStepIndex - 1];
    if (!stepConfig) {
      toast.error("Selected records are already at the final step");
      return;
    }

    if (stepConfig.updateType === "questionnaire") {
      openQuestionnaireDialogForRecords(selectedCrossViewRecords);
      clearCrossViewSelection();
      return;
    }

    if (stepConfig.updateType) {
      const mappedAction = CONTACT_UPDATE_ACTION_BUTTONS.find(
        (action) => action.type === stepConfig.updateType,
      );
      if (mappedAction) {
        await handleBulkQuickActionUpdates(
          selectedCrossViewRecords,
          clearCrossViewSelection,
          mappedAction,
        );
        return;
      }
    }

    setIsExecutingKanbanMove(true);
    try {
      const results = await Promise.all(
        selectedCrossViewRecords.map(async (record) => {
          const targetRecordId = resolveContactUpdateTargetRecordId(record);
          if (!targetRecordId) {
            return { ok: false, error: "Missing record id" };
          }
          try {
            await resetApprovalStepAction({
              sessionToken,
              itemId: targetRecordId,
              stepColumnId: stepConfig.stepColumnId,
              action: "done",
            });
            return { ok: true, error: "" };
          } catch (error) {
            return {
              ok: false,
              error: error instanceof Error ? error.message : "Failed to move record",
            };
          }
        }),
      );

      const successCount = results.filter((result) => result.ok).length;
      const failedCount = results.length - successCount;
      await recordsQuery.refetch();
      if (successCount > 0) {
        toast.success(
          `Moved ${successCount} record${successCount === 1 ? "" : "s"} forward`,
        );
      }
      if (failedCount > 0) {
        const firstError = results.find((result) => !result.ok)?.error ?? "Unknown error";
        toast.error(
          `Failed to move ${failedCount} record${failedCount === 1 ? "" : "s"}: ${firstError}`,
        );
      }
      clearCrossViewSelection();
    } finally {
      setIsExecutingKanbanMove(false);
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
      await patchRecordAction({
        sessionToken,
        itemId: targetRecordId,
        referredToContractors:
          retentionDraft.referredToContractors.length > 0
            ? retentionDraft.referredToContractors
            : null,
        hiredWithContractor: retentionDraft.hiredWithContractor || null,
        hireDate: retentionDraft.hireDate || null,
        retentionPeriod: retentionDraft.retentionPeriod || null,
      });
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

  const closeResumeReferralDialog = () => {
    const targetRecordId = resumeReferralDialogState?.targetRecordId?.trim() ?? "";
    if (targetRecordId) {
      setOnboardingActionPending(targetRecordId, false);
    }
    setResumeReferralDialogState(null);
    setIsSavingResumeReferralStep(false);
  };

  type OnboardingStepAction = "reset" | "done" | "skipped";
  const updateOnboardingStepStatus = async (args: {
    targetRecordId: string;
    stepColumnId: string;
    action: OnboardingStepAction;
  }) => {
    if (!sessionToken) {
      throw new Error("Missing monday session context");
    }
    await resetApprovalStepAction({
      sessionToken,
      itemId: args.targetRecordId,
      stepColumnId: args.stepColumnId,
      action: args.action,
    });
  };

  const completeGenericOnboardingStep = async (args: {
    targetRecordId: string;
    body: string;
    stepColumnId: string;
    recordPatch?: Record<string, unknown>;
    successMessage?: string;
  }) => {
    if (!sessionToken) {
      throw new Error("Missing monday session context");
    }

    await handleCreateContactUpdate({
      updateType: "general",
      body: args.body,
      keepSelectedType: true,
      targetRecordId: args.targetRecordId,
    });

    if (args.recordPatch) {
      await patchRecordAction({
        sessionToken,
        itemId: args.targetRecordId,
        ...(args.recordPatch as Omit<
          Parameters<typeof patchRecordAction>[0],
          "sessionToken" | "itemId"
        >),
      });
    }

    await updateOnboardingStepStatus({
      targetRecordId: args.targetRecordId,
      stepColumnId: args.stepColumnId,
      action: "done",
    });

    const refreshedRecordsResult = await recordsQuery.refetch();
    const refreshedRecords = (refreshedRecordsResult.data?.pages ?? []).flatMap(
      (page) => page.records ?? [],
    );
    syncContactHistoryDialogFromRecords(refreshedRecords);
    toast.success(args.successMessage ?? "Onboarding step marked complete");
  };

  const handleConfirmResumeReferralStep = async () => {
    if (!sessionToken || !resumeReferralDialogState) {
      toast.error("Missing monday session context");
      closeResumeReferralDialog();
      return;
    }

    if (resumeReferralDialogState.selectedContractors.length === 0) {
      toast.error("Select at least one contractor before continuing");
      return;
    }

    setIsSavingResumeReferralStep(true);
    try {
      await handleCreateContactUpdate({
        updateType: "resume",
        targetRecordId: resumeReferralDialogState.targetRecordId,
        referredToContractors: resumeReferralDialogState.selectedContractors,
        keepSelectedType: true,
      });

      closeResumeReferralDialog();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to complete resume submitted step";
      toast.error(message);
    } finally {
      setIsSavingResumeReferralStep(false);
    }
  };

  const closeInterviewingContractorDialog = () => {
    const targetRecordId = interviewingContractorDialogState?.targetRecordId?.trim() ?? "";
    if (targetRecordId) {
      setOnboardingActionPending(targetRecordId, false);
    }
    setInterviewingContractorDialogState(null);
    setIsSavingInterviewingStep(false);
  };

  const handleConfirmInterviewingStep = async () => {
    if (!sessionToken || !interviewingContractorDialogState) {
      toast.error("Missing monday session context");
      closeInterviewingContractorDialog();
      return;
    }
    if (interviewingContractorDialogState.selectedContractors.length === 0) {
      toast.error("Select at least one contractor before continuing");
      return;
    }
    const interviewingSummary = `Interviewing - ${interviewingContractorDialogState.selectedContractors.join(", ")}`;

    setIsSavingInterviewingStep(true);
    try {
      await completeGenericOnboardingStep({
        targetRecordId: interviewingContractorDialogState.targetRecordId,
        body: interviewingSummary,
        stepColumnId: interviewingContractorDialogState.stepColumnId,
        recordPatch: {
          interviewingWithContractors: interviewingContractorDialogState.selectedContractors,
        },
      });
      closeInterviewingContractorDialog();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to complete interviewing step";
      toast.error(message);
    } finally {
      setIsSavingInterviewingStep(false);
    }
  };

  const closeHiredContractorDialog = () => {
    const targetRecordId = hiredContractorDialogState?.targetRecordId?.trim() ?? "";
    if (targetRecordId) {
      setOnboardingActionPending(targetRecordId, false);
    }
    setHiredContractorDialogState(null);
    setIsSavingHiredStep(false);
  };

  const handleConfirmHiredStep = async () => {
    if (!sessionToken || !hiredContractorDialogState) {
      toast.error("Missing monday session context");
      closeHiredContractorDialog();
      return;
    }
    const selectedContractor = hiredContractorDialogState.selectedContractor.trim();
    if (!selectedContractor) {
      toast.error("Select a contractor before continuing");
      return;
    }
    const hiredSummary = `Hired - ${selectedContractor}`;

    setIsSavingHiredStep(true);
    try {
      await completeGenericOnboardingStep({
        targetRecordId: hiredContractorDialogState.targetRecordId,
        body: hiredSummary,
        stepColumnId: hiredContractorDialogState.stepColumnId,
        recordPatch: {
          hiredWithContractor: selectedContractor,
        },
      });
      closeHiredContractorDialog();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to complete hired step";
      toast.error(message);
    } finally {
      setIsSavingHiredStep(false);
    }
  };

  const closeMarkAsHiredWorkflowDialog = () => {
    const targetRecordId = markAsHiredWorkflowDialogState?.targetRecordId?.trim() ?? "";
    if (targetRecordId) {
      setOnboardingActionPending(targetRecordId, false);
    }
    setMarkAsHiredWorkflowDialogState(null);
    setMarkAsHiredHireDatePopoverOpen(false);
    setIsSavingMarkAsHiredWorkflow(false);
  };

  const handleConfirmMarkAsHiredWorkflow = async () => {
    if (!sessionToken || !markAsHiredWorkflowDialogState) {
      toast.error("Missing monday session context");
      closeMarkAsHiredWorkflowDialog();
      return;
    }

    const targetRecordId = markAsHiredWorkflowDialogState.targetRecordId.trim();
    const referredToContractors = Array.from(
      new Set(
        markAsHiredWorkflowDialogState.referredToContractors
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
      ),
    );
    const hiredWithContractor = markAsHiredWorkflowDialogState.hiredWithContractor.trim();
    const hireDate = markAsHiredWorkflowDialogState.hireDate.trim();

    if (!targetRecordId) {
      toast.error("Missing monday update target");
      return;
    }
    if (referredToContractors.length === 0) {
      toast.error("Select at least one referred contractor");
      return;
    }
    if (!hiredWithContractor) {
      toast.error("Select the hired-with contractor");
      return;
    }
    if (!hireDate) {
      toast.error("Choose a hire date");
      return;
    }

    const interviewingWithContractors = Array.from(
      new Set([...referredToContractors, hiredWithContractor]),
    );

    setIsSavingMarkAsHiredWorkflow(true);
    try {
      const hiredSummary = [
        `Hired - ${hiredWithContractor}`,
        `Referred To Contractor(s): ${referredToContractors.join(", ")}`,
        `Interviewing With Contractor(s): ${interviewingWithContractors.join(", ")}`,
        `Hire Date: ${hireDate}`,
      ].join("\n");

      await handleCreateContactUpdate({
        updateType: "general",
        targetRecordId,
        body: hiredSummary,
        keepSelectedType: true,
      });

      await patchRecordAction({
        sessionToken,
        itemId: targetRecordId,
        referredToContractors,
        interviewingWithContractors,
        hiredWithContractor,
        hireDate,
      });

      if (!markAsHiredWorkflowDialogState.screeningAlreadyDone) {
        await updateOnboardingStepStatus({
          targetRecordId,
          stepColumnId: SCREENING_STEP_COLUMN_ID,
          action: "skipped",
        });
      }
      await updateOnboardingStepStatus({
        targetRecordId,
        stepColumnId: RESUME_STEP_COLUMN_ID,
        action: "done",
      });
      await updateOnboardingStepStatus({
        targetRecordId,
        stepColumnId: INTERVIEWING_STEP_COLUMN_ID,
        action: "done",
      });
      await updateOnboardingStepStatus({
        targetRecordId,
        stepColumnId: HIRED_STEP_COLUMN_ID,
        action: "done",
      });

      const refreshedRecordsResult = await recordsQuery.refetch();
      const refreshedRecords = (refreshedRecordsResult.data?.pages ?? []).flatMap(
        (page) => page.records ?? [],
      );
      syncContactHistoryDialogFromRecords(refreshedRecords);
      toast.success("Marked as hired and advanced onboarding steps");
      closeMarkAsHiredWorkflowDialog();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to complete Mark as Hired workflow";
      toast.error(message);
    } finally {
      setIsSavingMarkAsHiredWorkflow(false);
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
      await patchRecordAction({
        sessionToken,
        itemId: targetRecordId,
        tags: tagsDraft,
      });
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
      await patchRecordAction({
        sessionToken,
        itemId: targetRecordId,
        status: statusDraft || null,
      });
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
      await patchRecordAction({
        sessionToken,
        itemId: targetRecordId,
        ownerId: ownerDraft || null,
      });
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

    const contactId = record.contactId?.trim() ?? "";
    const recordId = record.id.trim();
    const targetRecordIds = Array.from(
      new Set([contactId, recordId].filter((value) => value.length > 0)),
    );
    if (targetRecordIds.length === 0) {
      toast.error("Missing record id for resume upload");
      return;
    }

    setUploadingResumeByRecordId((prev) => ({
      ...prev,
      [record.id]: true,
    }));
    try {
      let lastErrorMessage = "Failed to upload resume";
      let uploaded = false;
      let uploadedTargetRecordId: string | null = null;

      for (let index = 0; index < targetRecordIds.length; index += 1) {
        const targetRecordId = targetRecordIds[index]!;
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
        if (response.ok && data.ok) {
          uploaded = true;
          uploadedTargetRecordId = targetRecordId;
          break;
        }

        lastErrorMessage = data.error ?? "Failed to upload resume";

        // If the first target fails and we still have another possible Monday item id,
        // retry once against that alternate target before surfacing the error.
        const hasFallback = index < targetRecordIds.length - 1;
        if (!hasFallback) {
          throw new Error(lastErrorMessage);
        }
      }

      if (!uploaded) {
        throw new Error(lastErrorMessage);
      }

      let updateSyncError: string | null = null;
      const updateTargetRecordId = uploadedTargetRecordId ?? targetRecordIds[0] ?? "";
      if (updateTargetRecordId) {
        const resumeAddedDateTime = new Date().toISOString();
        try {
          if (canCreateUpdatesAsLoggedInMondayUser) {
            await createMondayRecordUpdateAsContextUser({
              itemId: updateTargetRecordId,
              body: "Resume Added",
              updateType: "resume",
              dateTime: resumeAddedDateTime,
              subitemNameOverride: "Resume Added",
              suppressApprovalStepMarking: true,
            });
          } else {
            await createRecordUpdateAction({
              sessionToken,
              itemId: updateTargetRecordId,
              body: "Resume Added",
              updateType: "resume",
              dateTime: resumeAddedDateTime,
              subitemNameOverride: "Resume Added",
              suppressApprovalStepMarking: true,
            });
          }
        } catch (error) {
          updateSyncError =
            error instanceof Error ? error.message : "Failed to log resume update";
        }
      } else {
        updateSyncError = "Missing record id for resume update log";
      }

      const refreshedRecordsResult = await recordsQuery.refetch();
      const refreshedRecords = (refreshedRecordsResult.data?.pages ?? []).flatMap(
        (page) => page.records ?? [],
      );
      syncContactHistoryDialogFromRecords(refreshedRecords);
      if (contactHistoryDialogRecord) {
        await contactUpdatesQuery.refetch();
      }
      if (updateSyncError) {
        toast.success("Resume uploaded");
        toast.error(`Resume uploaded, but failed to log update: ${updateSyncError}`);
      } else {
        toast.success("Resume uploaded and logged as Resume Added");
      }
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

  function getResumeFileHref(file: {
    assetId: string | null;
    url: string | null;
  }) {
    if (file.assetId) {
      return `/api/monday/email-templates/assets/${encodeURIComponent(file.assetId)}`;
    }
    if (file.url) return file.url;
    return null;
  }

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
      const data = await fetchMondayApi<MondayCreateContactResponse>(
        "/api/monday/contacts",
        {
          sessionToken,
          method: "POST",
          body: addContactValues
        }
      );
      if (!data.ok) {
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
      const data = await fetchMondayApi<MondayContactsLookupResponse>(
        `/api/monday/contacts?${params.toString()}`,
        {
          sessionToken
        }
      );
      if (!data.ok) {
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

  const columns = buildBoardTableColumns({
    tableDensity,
    approvalSteps,
    hoverPopoversEnabled: boardGeneralSettings.hoverPopoversEnabled,
    uploadingResumeByRecordId,
    staticMode,
    onHelpDesk: (item) => {
      setHelpDeskLinkedContact(item);
      setHelpDeskOpen(true);
    },
    onOpenContact: openContactHistoryDialog,
    onOpenStatus: openStatusDialog,
    onOpenOwner: openOwnerDialog,
    onOpenRetention: openRetentionDialog,
    onOpenTags: openTagsDialog,
    onUploadResume: handleUploadResume,
    getResumeFileHref,
    onPreviewResume: ({ record, file, href }) => {
      if (!href) {
        toast.error("Unable to open resume file");
        return;
      }
      setResumePreview({
        fileName: file.name,
        href,
        recordName: record.name,
      });
    },
  });

  const entityActions = buildBoardEntityActions({
    featureFlags,
    openSendEmailDialog,
    sessionToken,
    staticMode,
  });
  const contactDialogOnboardingStepperProps = useContactDialogOnboardingStepperProps({
    record: contactHistoryDialogRecord,
    approvalSteps,
    isCreatingContactUpdate,
    isSendingEmail,
    pendingOnboardingActionsByTargetId,
    resolveContactUpdateTargetRecordId,
    emailMarketingEnabled: featureFlags.emailMarketingEnabled,
    setOnboardingActionPending,
    setContactUpdateType,
    setResumeReferralDialogState,
    parseContractorValues,
    retentionReferredToContractors: retentionOptions.referredToContractors,
    openSendEmailDialog,
    handleCreateContactUpdate,
    openQuestionnaireDialogForRecords,
    sessionToken,
    interviewingStepColumnId: INTERVIEWING_STEP_COLUMN_ID,
    hiredStepColumnId: HIRED_STEP_COLUMN_ID,
    setInterviewingContractorDialogState,
    setHiredContractorDialogState,
    completeGenericOnboardingStep,
    actionButtonClassName: boardThemeStyles.actionButtonClassName,
    actionButtonStyle: boardThemeInlineStyles.actionButtonStyle,
    buttonSizeClassName: quickActionButtonSizeClass,
  });

  return (
    <GuidedTourProvider>
      <UserSettingsProvider settings={boardGeneralSettings}>
        <div
          className={`monday-like-page mx-auto ${isViewportLockedBoardMode ? "h-[calc(100vh-20px)] overflow-hidden pb-0" : "pb-10"}`}
        >
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
                            const selectedBoardColumnOptions = isDateField
                              ? []
                              : (boardColumnValueOptionsByLabel.get(conditionTarget) ?? []);
                            const usesBoardColumnValueOptions =
                              selectedBoardColumnOptions.length > 0 && !usesOwnerOptions;
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
                                      ) : usesBoardColumnValueOptions ? (
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
                                          <option value="">Select value</option>
                                          {!selectedBoardColumnOptions.includes(condition.value) &&
                                            condition.value.trim().length > 0 ? (
                                            <option value={condition.value}>
                                              {`${condition.value} (selected)`}
                                            </option>
                                          ) : null}
                                          {selectedBoardColumnOptions.map((value) => (
                                            <option key={value} value={value}>
                                              {value}
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
                title={
                  isGlobalDateScope
                    ? "Global mode active. Click Global to return to month mode."
                    : "Previous month"
                }
                disabled={isGlobalDateScope}
                onClick={() => {
                  setActiveMonth(
                    (prev) =>
                      new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() - 1, 1)),
                  );
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={isGlobalDateScope ? "secondary" : "outline"}
                className="h-8 shrink-0 rounded-sm px-2.5 text-xs whitespace-nowrap"
                title={
                  isGlobalDateScope
                    ? "Switch back to month mode"
                    : "Switch to global mode (all records)"
                }
                onClick={() => {
                  setIsGlobalDateScope((prev) => !prev);
                }}
              >
                {isGlobalDateScope ? "Global" : monthBounds.label}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 shrink-0 px-2"
                title={
                  isGlobalDateScope
                    ? "Global mode active. Click Global to return to month mode."
                    : "Next month"
                }
                disabled={isGlobalDateScope}
                onClick={() => {
                  setActiveMonth(
                    (prev) =>
                      new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() + 1, 1)),
                  );
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <div className="bg-border/60 h-5 w-px shrink-0" />
              <BoardViewModeToggle
                mode={userScopedDisplayMode}
                availableModes={["table", "grid", "kanban", "chat"]}
                onChange={setUserScopedDisplayMode}
                dataTour="view-toggle"
              />

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

                <Dialog open={settingsState.settingsOpen} onOpenChange={setSettingsOpen}>
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
                                    Scope: {presetScopeOwnerId === "__route_all__"
                                      ? "All board"
                                      : presetScopeOwnerId.length > 0
                                        ? `Owner ${presetScopeOwnerId}`
                                        : "No owner selected"}
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
                                  {(
                                    ["table", "grid", "kanban", "chat"] as UserBoardDisplayMode[]
                                  ).map((mode) => (
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
                                      {mode === "table" ? (
                                        <List className="h-3.5 w-3.5" />
                                      ) : mode === "grid" ? (
                                        <LayoutGrid className="h-3.5 w-3.5" />
                                      ) : mode === "kanban" ? (
                                        <Columns3 className="h-3.5 w-3.5" />
                                      ) : (
                                        <MessageSquareText className="h-3.5 w-3.5" />
                                      )}
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
                                <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge
                                      variant={zohoStatusQuery.data?.connected ? "default" : "secondary"}
                                    >
                                      {zohoStatusQuery.data?.connected
                                        ? "Zoho connected"
                                        : "Zoho not connected"}
                                    </Badge>
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        void handleConnectZoho();
                                      }}
                                      disabled={isConnectingZoho}
                                    >
                                      {isConnectingZoho ? "Connecting..." : "Connect Zoho"}
                                    </Button>
                                    {zohoStatusQuery.data?.connected ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          void handleDisconnectZoho();
                                        }}
                                        disabled={isDisconnectingZoho}
                                      >
                                        {isDisconnectingZoho ? "Disconnecting..." : "Disconnect"}
                                      </Button>
                                    ) : null}
                                  </div>
                                  <div className="text-muted-foreground text-sm">
                                    {zohoStatusQuery.data?.connection?.senderEmail ? (
                                      <p>
                                        Zoho sender: {zohoStatusQuery.data.connection.senderEmail}
                                      </p>
                                    ) : (
                                      <p>
                                        Connect Zoho to enable marketing blast sends and fallback
                                        sends when Outlook is unavailable.
                                      </p>
                                    )}
                                  </div>
                                  <div className="rounded-md border bg-muted/30 p-3">
                                    <p className="text-xs font-semibold tracking-wide uppercase">
                                      Zoho Callback URL
                                    </p>
                                    <p className="mt-1 break-all font-mono text-xs">
                                      {zohoCallbackUrl}
                                    </p>
                                  </div>
                                </div>
                                {isMasterAdmin ? (
                                  <div className="space-y-3 rounded-md border-2 border-primary/30 bg-primary/5 p-3">
                                    <div className="space-y-1">
                                      <p className="text-sm font-medium">Zoho Sender Configuration</p>
                                      <p className="text-muted-foreground text-xs">
                                        Zoho sends use one sender mailbox. Single-contact fallbacks
                                        and multi-contact blasts always use this address.
                                      </p>
                                    </div>
                                    <div className="grid gap-2 md:grid-cols-2">
                                      <Input
                                        value={platformSettingsDraft.zohoSenderEmail ?? ""}
                                        onChange={(event) => {
                                          const nextValue = event.target.value.trim();
                                          setPlatformSettingsDraft((prev) => ({
                                            ...prev,
                                            zohoSenderEmail: nextValue.length > 0 ? nextValue : null,
                                          }));
                                        }}
                                        placeholder="marketing@floridaroadjobs.com"
                                        className="h-8 text-xs"
                                      />
                                      <Input
                                        value={platformSettingsDraft.zohoReplyToFallbackEmail ?? ""}
                                        onChange={(event) => {
                                          const nextValue = event.target.value.trim();
                                          setPlatformSettingsDraft((prev) => ({
                                            ...prev,
                                            zohoReplyToFallbackEmail:
                                              nextValue.length > 0 ? nextValue : null,
                                          }));
                                        }}
                                        placeholder="reply-fallback@floridaroadjobs.com"
                                        className="h-8 text-xs"
                                      />
                                    </div>
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
                                <div className="space-y-3 rounded-md border p-4">
                                  <div className="space-y-1">
                                    <p className="text-sm font-medium">Email Template System Tags</p>
                                    <p className="text-muted-foreground text-xs">
                                      Built-ins always available:{" "}
                                      <code>{"{{owner.name}}"}</code>,{" "}
                                      <code>{"{{owner.email}}"}</code>,{" "}
                                      <code>{"{{contact.name}}"}</code>,{" "}
                                      <code>{"{{contact.email}}"}</code>.
                                    </p>
                                    <p className="text-muted-foreground text-xs">
                                      Add custom tags mapped to any top-level API board column.
                                    </p>
                                  </div>
                                  <div className="grid gap-2 md:grid-cols-[1fr_1.3fr_auto]">
                                    <Input
                                      value={newEmailSystemTagKey}
                                      onChange={(event) => setNewEmailSystemTagKey(event.target.value)}
                                      placeholder="contact.city"
                                    />
                                    <Select
                                      value={newEmailSystemTagColumnId || "__none__"}
                                      onValueChange={(value) =>
                                        setNewEmailSystemTagColumnId(
                                          value === "__none__" ? "" : value,
                                        )
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select contact column" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__none__">Select contact column</SelectItem>
                                        {platformBoardColumnOptions.map((column) => (
                                          <SelectItem key={column.id} value={column.id}>
                                            {column.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => {
                                        const tag = newEmailSystemTagKey.trim().toLowerCase();
                                        const columnId = newEmailSystemTagColumnId.trim();
                                        const selectedColumn = platformBoardColumnOptions.find(
                                          (column) => column.id === columnId,
                                        );
                                        if (!EMAIL_TEMPLATE_TAG_PATTERN.test(tag)) {
                                          toast.error(
                                            "Tag key must start with a letter and use letters, numbers, dots, dashes, or underscores.",
                                          );
                                          return;
                                        }
                                        if (!columnId) {
                                          toast.error("Select a contact column for this tag.");
                                          return;
                                        }
                                        setPlatformSettingsDraft((prev) => ({
                                          ...prev,
                                          emailSystemTags: normalizeEmailSystemTags([
                                            ...prev.emailSystemTags,
                                            {
                                              tag,
                                              columnId,
                                              columnTitle: selectedColumn?.title ?? columnId,
                                            },
                                          ]),
                                        }));
                                        setNewEmailSystemTagKey("");
                                        setNewEmailSystemTagColumnId("");
                                      }}
                                      disabled={platformBoardColumnsQuery.isLoading}
                                    >
                                      Add Tag
                                    </Button>
                                  </div>
                                  <div className="space-y-2">
                                    {platformSettingsDraft.emailSystemTags.length === 0 ? (
                                      <p className="text-muted-foreground text-xs">
                                        No custom tags configured yet.
                                      </p>
                                    ) : (
                                      platformSettingsDraft.emailSystemTags.map((entry, index) => {
                                        const selectedColumn = platformBoardColumnOptions.find(
                                          (column) => column.id === entry.columnId,
                                        );
                                        return (
                                          <div
                                            key={`${entry.tag}:${entry.columnId}:${index}`}
                                            className="grid gap-2 md:grid-cols-[1fr_1.3fr_auto]"
                                          >
                                            <Input
                                              value={entry.tag}
                                              onChange={(event) => {
                                                const value = event.target.value;
                                                setPlatformSettingsDraft((prev) => ({
                                                  ...prev,
                                                  emailSystemTags: prev.emailSystemTags.map(
                                                    (tagEntry, entryIndex) =>
                                                      entryIndex === index
                                                        ? { ...tagEntry, tag: value }
                                                        : tagEntry,
                                                  ),
                                                }));
                                              }}
                                            />
                                            <Select
                                              value={entry.columnId}
                                              onValueChange={(value) => {
                                                const selected = platformBoardColumnOptions.find(
                                                  (column) => column.id === value,
                                                );
                                                setPlatformSettingsDraft((prev) => ({
                                                  ...prev,
                                                  emailSystemTags: prev.emailSystemTags.map(
                                                    (tagEntry, entryIndex) =>
                                                      entryIndex === index
                                                        ? {
                                                          ...tagEntry,
                                                          columnId: value,
                                                          columnTitle:
                                                            selected?.title ??
                                                            tagEntry.columnTitle,
                                                        }
                                                        : tagEntry,
                                                  ),
                                                }));
                                              }}
                                            >
                                              <SelectTrigger>
                                                <SelectValue placeholder="Select contact column" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {platformBoardColumnOptions.map((column) => (
                                                  <SelectItem key={column.id} value={column.id}>
                                                    {column.label}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                            <Button
                                              type="button"
                                              variant="outline"
                                              onClick={() => {
                                                setPlatformSettingsDraft((prev) => ({
                                                  ...prev,
                                                  emailSystemTags: prev.emailSystemTags.filter(
                                                    (_, entryIndex) => entryIndex !== index,
                                                  ),
                                                }));
                                              }}
                                            >
                                              Remove
                                            </Button>
                                            <p className="text-muted-foreground text-xs md:col-span-3">
                                              Token:{" "}
                                              <code>{`{{${entry.tag.trim().toLowerCase()}}}`}</code>
                                              {" · "}
                                              Column: {selectedColumn?.title ?? entry.columnTitle} (
                                              {entry.columnId})
                                            </p>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                  {platformBoardColumnsQuery.isLoading ? (
                                    <p className="text-muted-foreground text-xs">
                                      Loading API board columns...
                                    </p>
                                  ) : null}
                                  {platformBoardColumnsQuery.error ? (
                                    <p className="text-destructive text-xs">
                                      {platformBoardColumnsQuery.error instanceof Error
                                        ? platformBoardColumnsQuery.error.message
                                        : "Failed to load API board columns"}
                                    </p>
                                  ) : null}
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
          <div
            className={
              userScopedDisplayMode === "chat"
                ? "w-full"
                : "max-w-[1600px] container"
            }
          >

            <AddContactDialog
              open={addContactOpen}
              onOpenChange={setAddContactOpen}
              onReset={resetAddContactDialog}
              step={addContactStep}
              values={addContactValues}
              ownerOptions={addContactOwnerOptions}
              isCheckingDuplicates={isCheckingDuplicates}
              isCreatingContact={isCreatingContact}
              onChange={(key, value) => {
                setAddContactValues((prev) => ({ ...prev, [key]: value }));
              }}
              onCheckDuplicatesAndContinue={() => {
                void handleCheckDuplicatesAndContinue();
              }}
              existingContactsByEmail={existingContactsByEmail}
              onBackToForm={() => setAddContactStep(1)}
              onCreateNewAnyway={() => {
                void handleCreateContact();
              }}
            />

            <ResumeReferralStepDialog
              state={resumeReferralDialogState}
              onClose={closeResumeReferralDialog}
              onStateChange={setResumeReferralDialogState}
              contractorOptions={retentionOptions.referredToContractors}
              isSaving={isSavingResumeReferralStep}
              onConfirm={() => {
                void handleConfirmResumeReferralStep();
              }}
            />

            <OnboardingContractorStepDialogs
              interviewingState={interviewingContractorDialogState}
              setInterviewingState={setInterviewingContractorDialogState}
              closeInterviewingDialog={closeInterviewingContractorDialog}
              isSavingInterviewingStep={isSavingInterviewingStep}
              onConfirmInterviewing={() => {
                void handleConfirmInterviewingStep();
              }}
              hiredState={hiredContractorDialogState}
              setHiredState={setHiredContractorDialogState}
              closeHiredDialog={closeHiredContractorDialog}
              isSavingHiredStep={isSavingHiredStep}
              onConfirmHired={() => {
                void handleConfirmHiredStep();
              }}
            />

            <MarkAsHiredWorkflowDialog
              state={markAsHiredWorkflowDialogState}
              onClose={closeMarkAsHiredWorkflowDialog}
              setState={setMarkAsHiredWorkflowDialogState}
              hireDatePopoverOpen={markAsHiredHireDatePopoverOpen}
              setHireDatePopoverOpen={setMarkAsHiredHireDatePopoverOpen}
              toDateOnlyLocal={toDateOnlyLocal}
              isSaving={isSavingMarkAsHiredWorkflow}
              onConfirm={() => {
                void handleConfirmMarkAsHiredWorkflow();
              }}
            />

            <RetentionDialog
              record={retentionDialogRecord}
              onClose={() => setRetentionDialogRecord(null)}
              draft={retentionDraft}
              setDraft={setRetentionDraft}
              options={{
                referredToContractors: retentionOptions.referredToContractors,
                hiredWithContractor: retentionOptions.hiredWithContractor,
                retentionPeriod: retentionOptions.retentionPeriod,
              }}
              hireDatePopoverOpen={retentionHireDatePopoverOpen}
              setHireDatePopoverOpen={setRetentionHireDatePopoverOpen}
              toDateOnlyLocal={toDateOnlyLocal}
              isSaving={isSavingRetention}
              onSave={() => {
                void handleSaveRetention();
              }}
            />

            <RecordMetaDialogs
              statusDialogRecord={statusDialogRecord}
              setStatusDialogRecord={setStatusDialogRecord}
              statusDraft={statusDraft}
              setStatusDraft={setStatusDraft}
              statusOptions={statusOptions}
              isSavingStatus={isSavingStatus}
              onSaveStatus={() => {
                void handleSaveStatus();
              }}
              ownerDialogRecord={ownerDialogRecord}
              setOwnerDialogRecord={setOwnerDialogRecord}
              ownerDraft={ownerDraft}
              setOwnerDraft={setOwnerDraft}
              ownerOptions={ownerOptions}
              isSavingOwner={isSavingOwner}
              onSaveOwner={() => {
                void handleSaveOwner();
              }}
              getNameInitials={getNameInitials}
              tagsDialogRecord={tagsDialogRecord}
              setTagsDialogRecord={setTagsDialogRecord}
              tagsDraft={tagsDraft}
              setTagsDraft={setTagsDraft}
              retentionTags={retentionOptions.tags}
              splitCsvValues={splitCsvValues}
              sortFiscalYearTagsDesc={sortFiscalYearTagsDesc}
              isSavingTags={isSavingTags}
              onSaveTags={() => {
                void handleSaveTags();
              }}
            />

            <ContactHistoryDialog
              open={!!contactHistoryDialogRecord}
              onOpenChange={(open) => {
                if (!open) setContactHistoryDialogRecord(null);
              }}
              record={contactHistoryDialogRecord}
              contactDialogIndex={contactDialogState.index}
              filteredRecordsLength={contactDialogState.total}
              onNavigate={(direction) => navigateContactDialog(direction)}
              staticMode={staticMode}
              onboardingStepperProps={contactDialogOnboardingStepperProps}
              canOpenRecordUrl={!!contactHistoryDialogRecord?.url}
              onOpenRecordUrl={() => {
                if (!contactHistoryDialogRecord?.url) return;
                window.open(contactHistoryDialogRecord.url, "_blank", "noopener,noreferrer");
              }}
              showSyncAction={!staticMode && isMondaySettingsAdmin && !!contactHistoryDialogRecord}
              syncActionLabel={
                contactHistoryDialogRecord &&
                  syncingContactIds.has(contactHistoryDialogRecord.id)
                  ? "Syncing..."
                  : "Sync User"
              }
              syncActionDisabled={
                !contactHistoryDialogRecord ||
                isCreatingContactUpdate ||
                syncingContactIds.has(contactHistoryDialogRecord.id)
              }
              onSync={() => {
                if (!contactHistoryDialogRecord) return;
                openSyncContactBoardPicker(contactHistoryDialogRecord);
              }}
              resumeInputId={contactDialogResumeInputId}
              onResumeInputChange={(file) => {
                if (!contactHistoryDialogRecord) return;
                void handleUploadResume(contactHistoryDialogRecord, file);
              }}
              isContactDialogUploadingResume={isContactDialogUploadingResume}
              canUploadResume={!!sessionToken}
              hasResumeFile={!!contactDialogResumeFile}
              onTriggerResumeUpload={() => {
                const input = document.getElementById(contactDialogResumeInputId);
                if (input instanceof HTMLInputElement) {
                  input.click();
                }
              }}
              communicationQuickActions={COMMUNICATION_QUICK_ACTIONS}
              quickActionButtonSizeClass={quickActionButtonSizeClass}
              actionButtonClassName={boardThemeStyles.actionButtonClassName}
              actionButtonStyle={boardThemeInlineStyles.actionButtonStyle}
              onSelectCommunicationQuickAction={setCommunicationQuickAction}
              communicationActionsDisabled={isCreatingContactUpdate || !sessionToken}
              markAsHiredDisabled={(() => {
                if (!contactHistoryDialogRecord || !sessionToken) return true;
                const targetRecordId =
                  resolveContactUpdateTargetRecordId(contactHistoryDialogRecord);
                return (
                  isCreatingContactUpdate ||
                  onboardingState.isSavingMarkAsHiredWorkflow ||
                  pendingOnboardingActionsByTargetId[targetRecordId]
                );
              })()}
              onMarkAsHired={() => {
                if (!contactHistoryDialogRecord) return;
                const targetRecordId =
                  resolveContactUpdateTargetRecordId(contactHistoryDialogRecord);
                if (pendingOnboardingActionsByTargetId[targetRecordId]) return;
                openMarkAsHiredWorkflowDialog(contactHistoryDialogRecord);
              }}
              rightPanel={
                <ContactDialogRightPanel
                  tab={contactDialogTab}
                  onTabChange={setContactDialogTab}
                  updates={contactUpdatesQuery.data?.subitems ?? []}
                  updatesLoading={contactUpdatesQuery.isLoading}
                  updatesEmpty={(contactUpdatesQuery.data?.subitems?.length ?? 0) === 0}
                  staticMode={staticMode}
                  updateDraft={contactUpdateDraft}
                  onUpdateDraftChange={setContactUpdateDraft}
                  onSubmitUpdate={({ updateType, date }) => {
                    setContactUpdateType(updateType);
                    void handleCreateContactUpdate({ updateType, date });
                  }}
                  onDeleteSubitem={async (subitemId) => {
                    if (!sessionToken) return;
                    await deleteSubitemAction({ sessionToken, subitemId });
                    toast.success("Update deleted");
                    await contactUpdatesQuery.refetch();
                  }}
                  onUpdateSubitemDate={async (subitemId, date) => {
                    if (!sessionToken) return;
                    await patchSubitemAction({ sessionToken, subitemId, date });
                    toast.success("Date updated");
                    await contactUpdatesQuery.refetch();
                  }}
                  isSubmittingUpdate={isCreatingContactUpdate}
                  currentUserId={forcedOwnerId || identity?.userId || null}
                  columnsLoading={contactColumnsQuery.isLoading}
                  columnsError={contactColumnsQuery.error}
                  columns={contactColumnsQuery.data?.columns ?? []}
                  editingColumnId={editingContactColumnId}
                  editingColumnDraft={editingContactColumnDraft}
                  onEditingColumnDraftChange={setEditingContactColumnDraft}
                  isSavingColumn={isSavingContactColumn}
                  onSaveEditingColumn={() => {
                    void saveEditingContactColumn();
                  }}
                  onCancelEditingColumn={cancelEditingContactColumn}
                  onStartEditingColumn={startEditingContactColumn}
                  resumeFiles={contactDialogResumeFiles}
                  selectedResumeIndex={contactDialogSelectedResumeIndex}
                  setSelectedResumeKey={setContactDialogSelectedResumeKey}
                  getResumeFileKey={getResumeFileKey}
                  resumeHref={contactDialogResumeHref}
                  resumeFileName={contactDialogResumeFileName}
                  renderResumePreviewContent={renderResumePreviewContent}
                  isUploadingResume={isContactDialogUploadingResume}
                  sessionToken={sessionToken}
                  onTriggerResumeUpload={() => {
                    const input = document.getElementById(contactDialogResumeInputId);
                    if (input instanceof HTMLInputElement) {
                      input.click();
                    }
                  }}
                  referredJobsHistory={referredJobsHistory}
                  formatUpdatedAt={formatUpdatedAt}
                  jobsFetching={jobsQuery.isFetching}
                  onRefreshJobs={() => {
                    void jobsQuery.refetch();
                  }}
                  jobsError={jobsQuery.error}
                  contactJobRows={contactJobRows}
                  contactJobColumns={contactJobColumns}
                  contactJobActions={contactJobActions}
                  jobsLoading={jobsQuery.isLoading}
                />
              }
            />

            <CommunicationDialogs
              communicationQuickAction={communicationQuickAction}
              setCommunicationQuickAction={setCommunicationQuickAction}
              isCreatingContactUpdate={isCreatingContactUpdate}
              handleSubmitCommunicationQuickAction={handleSubmitCommunicationQuickAction}
              bulkCommunicationModePrompt={communicationState.bulkCommunicationModePrompt}
              setBulkCommunicationModePrompt={setBulkCommunicationModePrompt}
              setBulkCommunicationQuickAction={setBulkCommunicationQuickAction}
              openBulkUniqueCommunicationSession={openBulkUniqueCommunicationSession}
              bulkCommunicationQuickAction={communicationState.bulkCommunicationQuickAction}
              isCreatingBulkCommunicationUpdate={isCreatingBulkCommunicationUpdate}
              handleSubmitBulkCommunicationQuickAction={handleSubmitBulkCommunicationQuickAction}
              bulkUniqueCommunicationSession={communicationState.bulkUniqueCommunicationSession}
              closeBulkUniqueCommunicationSession={closeBulkUniqueCommunicationSession}
              bulkUniqueActiveTarget={bulkUniqueActiveTarget}
              bulkUniqueCommunicationIndex={bulkUniqueCommunicationIndex}
              navigateBulkUniqueCommunication={navigateBulkUniqueCommunication}
              bulkUniqueCommunicationMethod={bulkUniqueCommunicationMethod}
              setBulkUniqueCommunicationMethod={setBulkUniqueCommunicationMethod}
              bulkUniqueCommunicationDate={bulkUniqueCommunicationDate}
              setBulkUniqueCommunicationDate={setBulkUniqueCommunicationDate}
              toDateOnly={toDateOnly}
              bulkUniqueCommunicationTime={bulkUniqueCommunicationTime}
              setBulkUniqueCommunicationTime={setBulkUniqueCommunicationTime}
              bulkUniqueCommunicationBody={bulkUniqueCommunicationBody}
              setBulkUniqueCommunicationBody={setBulkUniqueCommunicationBody}
              bulkUniqueCommunicationSubmittedTargetIds={bulkUniqueCommunicationSubmittedTargetIds}
              submitBulkUniqueCommunicationForActiveTarget={submitBulkUniqueCommunicationForActiveTarget}
              syncContactBoardPickerRecord={syncContactBoardPickerRecord}
              setSyncContactBoardPickerRecord={setSyncContactBoardPickerRecord}
              setSyncContactBoardSelection={setSyncContactBoardSelection}
              syncContactBoardSelection={syncContactBoardSelection}
              confirmSyncContactFromSelectedBoard={confirmSyncContactFromSelectedBoard}
              syncingContactIds={syncingContactIds}
              syncMonthlyBoardOptions={syncMonthlyBoardOptions}
              questionnaireDialogRecords={questionnaireDialogRecords}
              setQuestionnaireDialogRecords={setQuestionnaireDialogRecords}
              sessionToken={sessionToken}
              staticMode={staticMode}
              resolveContactUpdateTargetRecordId={resolveContactUpdateTargetRecordId}
              handleQuestionnaireSaved={handleQuestionnaireSaved}
              questionnaireFieldOptions={questionnaireFieldOptions}
            />

            {userScopedDisplayMode === "chat" ? null : (
              <p className="text-muted-foreground px-1 text-xs font-medium">
                {advancedFiltersState.hasActiveAdvancedFilters
                  ? `${recordsState.filteredRecordCountLabel} (advanced filters)`
                  : filteredRecordCountLabel}
              </p>
            )}

            {isTouchScopedView && userScopedDisplayMode === "grid" ? (
              <GridSortToolbar
                gridSort={gridSort}
                options={GRID_SORT_OPTIONS}
                onFieldChange={(field) => {
                  setGridSort((prev) => ({ ...prev, field }));
                }}
                onToggleDirection={() => {
                  setGridSort((prev) => ({
                    ...prev,
                    direction: prev.direction === "asc" ? "desc" : "asc",
                  }));
                }}
              />
            ) : null}

            {userScopedDisplayMode === "chat" ? (
              <MondayChatView
                accountId={identity?.accountId ?? null}
                userId={identity?.userId ?? null}
                userName={userProfileQuery.data?.name ?? null}
                sessionToken={sessionToken}
                records={filteredRecords}
                approvalSteps={approvalSteps}
                isLoadingRecords={
                  sessionState.authLoading || (!sessionState.staticMode && recordsQuery.isLoading)
                }
              />
            ) : userScopedDisplayMode === "kanban" ? (
              <KanbanBoardView
                records={filteredRecords}
                approvalSteps={approvalSteps}
                isLoading={sessionState.authLoading || (!sessionState.staticMode && recordsQuery.isLoading)}
                selectedCrossViewRecords={selectedCrossViewRecords}
                selectedKanbanStepIndex={selectedKanbanStepIndex}
                selectedRecordIds={crossViewSelectedRecordIds}
                isExecutingKanbanMove={kanbanActionsState.isExecuting}
                onKanbanBulkMoveForward={() => {
                  void handleKanbanBulkMoveForward();
                }}
                onClearCrossViewSelection={clearCrossViewSelection}
                onKanbanMoveRequest={setKanbanMoveConfirmation}
                onRecordClick={openContactHistoryDialog}
                onHelpDesk={(r) => {
                  setHelpDeskLinkedContact(r);
                  setHelpDeskOpen(true);
                }}
                onToggleKanbanRecordSelection={toggleKanbanRecordSelection}
              />
            ) : isTouchScopedView && userScopedDisplayMode === "grid" ? (
              <GridBoardView
                records={sortedGridRecords}
                approvalSteps={approvalSteps}
                isLoading={sessionState.authLoading || (!sessionState.staticMode && recordsQuery.isLoading)}
                selectedRecordIds={crossViewSelectedRecordIds}
                selectedCrossViewRecords={selectedCrossViewRecords}
                onRecordClick={openContactHistoryDialog}
                onHelpDesk={(r) => {
                  setHelpDeskLinkedContact(r);
                  setHelpDeskOpen(true);
                }}
                onToggleGridRecordSelection={toggleGridRecordSelection}
                onClearCrossViewSelection={clearCrossViewSelection}
                renderBulkActionsBar={renderBulkActionsBar}
              />
            ) : (
              <TableBoardView
                records={filteredRecords}
                columns={columns}
                isLoading={sessionState.authLoading || (!sessionState.staticMode && recordsQuery.isLoading)}
                entityActions={entityActions}
                shouldAutoLoadMore={shouldAutoLoadMore}
                hasNextPage={!!(boardQueriesState.recordsQuery as typeof recordsQuery).hasNextPage}
                isFetchingNextPage={
                  (boardQueriesState.recordsQuery as typeof recordsQuery).isFetchingNextPage
                }
                onLoadMore={handleLoadMoreRecords}
                renderBulkActionsBar={renderBulkActionsBar}
              />
            )}

            <p className="text-muted-foreground px-1 text-xs font-medium">
              {bulkActionsState.selectedCount > 0
                ? `${filteredRecordCountLabel} • ${bulkActionsState.selectedCount} selected`
                : filteredRecordCountLabel}
            </p>

            <BulkQuestionnaireDialogs
              bulkQuickActionConfirmation={bulkQuickActionConfirmation}
              setBulkQuickActionConfirmation={setBulkQuickActionConfirmation}
              bulkQuickActionType={bulkQuickActionType}
              isSendingBulkQuestionnaireEmail={isSendingBulkQuestionnaireEmail}
              openBulkQuickEmailDialog={openBulkQuickEmailDialog}
              handleBulkQuickActionUpdates={handleBulkQuickActionUpdates}
              clearBulkSelection={() => bulkClearSelectionRef.current?.()}
              bulkQuestionnaireDialogOpen={bulkQuestionnaireDialogOpen}
              closeBulkQuestionnaireEmailDialog={closeBulkQuestionnaireEmailDialog}
              bulkQuickEmailAction={bulkQuickEmailAction}
              bulkQuestionnaireEmailIndex={bulkQuestionnaireEmailIndex}
              setBulkQuestionnaireEmailIndex={setBulkQuestionnaireEmailIndex}
              bulkQuestionnaireEmailRecords={bulkQuestionnaireEmailRecords}
              bulkQuestionnaireActiveRecord={bulkQuestionnaireActiveRecord}
              bulkQuestionnaireActiveAlreadySent={bulkQuestionnaireActiveAlreadySent}
              bulkQuestionnaireResolvedTemplate={bulkQuestionnaireResolvedTemplate}
              bulkQuestionnaireTemplate={bulkQuestionnaireTemplate}
              bulkQuestionnaireContactColumnsLoading={bulkQuestionnaireContactColumnsQuery.isLoading}
              emailTemplatesLoading={emailTemplatesQuery.isLoading}
              bulkQuestionnairePendingCount={bulkActionsState.pendingCount}
              bulkQuestionnaireSentCount={bulkQuestionnaireSentTargetIds.size}
              handleSendBulkQuestionnaireToAll={handleSendBulkQuestionnaireToAll}
              handleSendBulkQuestionnaireToActiveRecord={handleSendBulkQuestionnaireToActiveRecord}
            />

            <BoardAuxDialogs
              mergeDialogState={mergeDialogState}
              setMergeDialogState={setMergeDialogState}
              isMergingRecords={isMergingRecords}
              handleConfirmMergeRecords={handleConfirmMergeRecords}
              getMergeTargetRecordId={getMergeTargetRecordId}
              getMergeFieldDisplayValue={getMergeFieldDisplayValue}
              kanbanMoveConfirmation={kanbanActionsState.confirmation}
              setKanbanMoveConfirmation={setKanbanMoveConfirmation}
              isExecutingKanbanMove={kanbanActionsState.isExecuting}
              approvalSteps={approvalSteps}
              handleKanbanStepMove={handleKanbanStepMove}
              resumePreview={resumePreview}
              setResumePreview={setResumePreview}
              renderResumePreviewContent={renderResumePreviewContent}
            />

            <SendEmailDialog
              open={sendEmailState.isOpen}
              onOpenChange={(open) => {
                if (!open) closeSendEmailDialog();
              }}
              onClose={closeSendEmailDialog}
              record={sendEmailState.sendEmailRecord}
              title={
                sendEmailProgressUpdate?.updateType === "followup"
                  ? "Send Questionnaire Email"
                  : sendEmailProgressUpdate?.updateType === "welcome_email"
                    ? "Send Welcome Email"
                    : "Send Email"
              }
              step={sendEmailState.sendEmailStep}
              onStepChange={setSendEmailStep}
              templates={emailTemplates}
              templatesLoading={emailTemplatesQuery.isLoading}
              templateId={sendEmailTemplateId}
              onTemplateIdChange={setSendEmailTemplateId}
              template={sendEmailTemplate}
              templateVariables={sendEmailTemplateVariables}
              resolvedTemplate={sendEmailResolvedTemplate}
              mailboxOptions={sendEmailMailboxOptions}
              mailboxLoading={
                outlookTeamMailboxesQuery.isLoading || outlookTeamMailboxesQuery.isFetching
              }
              ownerUserId={sendEmailOwnerUserId}
              onOwnerUserIdChange={setSendEmailOwnerUserId}
              selectedMailbox={selectedSendEmailMailbox}
              providerHint={sendEmailProviderHint}
              canSubmit={sendEmailCanSubmit}
              isSending={sendEmailState.isSendingEmail}
              onConfirmSend={() => {
                void handleConfirmSendEmail();
              }}
            />
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

          {!sessionState.staticMode &&
            (boardQueriesState.recordsQuery as typeof recordsQuery).hasNextPage &&
            shouldAutoLoadMore ? (
            <div ref={loadMoreAnchorRef} className="h-2" />
          ) : null}
        </div>
      </UserSettingsProvider>
    </GuidedTourProvider>
  );
}
