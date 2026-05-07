export interface MondayRecord extends Record<string, unknown> {
  id: string;
  contactId?: string | null;
  touchItemId?: string | null;
  touchedAt?: string | null;
  touchedBy?: string | null;
  touchSource?: string | null;
  name: string;
  url: string | null;
  groupTitle: string | null;
  statusText: string | null;
  peopleText: string | null;
  ownerIds: string[];
  ownerProfiles: {
    id: string;
    name: string | null;
    email?: string | null;
    photoThumb: string | null;
  }[];
  email: string | null;
  phone: string | null;
  address: string | null;
  referredToContractors: string | null;
  hiredWithContractor: string | null;
  hireDate: string | null;
  retentionPeriod: string | null;
  tags: string | null;
  batteryProgress: number | null;
  batteryRawValue: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  contactDetails: {
    label: string;
    value: string;
  }[];
  resumeFiles: {
    assetId: string | null;
    name: string;
    url: string | null;
  }[];
}

export interface MondayResponse {
  ok: boolean;
  error?: string;
  boardName?: string | null;
  records?: MondayRecord[];
  nextCursor?: string | null;
  approvalSteps?: ApprovalStepConfig[];
}

export interface MondayEmailTemplate {
  id: string;
  name: string;
  url: string | null;
  updatedAt: string | null;
  content: string;
  renderedHtml: string;
  docLink: string | null;
}

export interface MondayEmailTemplatesResponse {
  ok: boolean;
  error?: string;
  boardName?: string | null;
  boardId?: string;
  workdocColumnId?: string;
  templates?: MondayEmailTemplate[];
}

export interface MondayIdentity {
  userId: string;
  accountId: string;
  boardId?: string;
  appClientId?: string;
  expiresAt?: number;
}

export interface MondayUserProfileResponse {
  ok: boolean;
  error?: string;
  user?: {
    id: string;
    email: string | null;
    name: string | null;
  } | null;
}

export interface OutlookConnectionStatusResponse {
  ok: boolean;
  error?: string;
  connected?: boolean;
  callbackPath?: string;
  connection?: {
    email: string | null;
    displayName: string | null;
    accessTokenExpiresAt: number;
    scopes: string[];
    updatedAt: number;
  } | null;
}

export interface MondayRecordEditOptionsResponse {
  ok: boolean;
  error?: string;
  options?: {
    referredToContractors: string[];
    hiredWithContractor: string[];
    retentionPeriod: string[];
    tags: string[];
  };
}

export interface MondayContactCandidate {
  id: string;
  name: string;
  url: string | null;
  email: string | null;
  owner: string | null;
  updatedAt: string | null;
}

export interface MondayContactsLookupResponse {
  ok: boolean;
  error?: string;
  identity?: { userId: string };
  existing?: MondayContactCandidate[];
}

export interface MondayCreateContactResponse {
  ok: boolean;
  error?: string;
  created?: { id: string };
}

export interface MondayRecordUpdate {
  id: string;
  body: string;
  updateType:
  | "general"
  | "welcome_email"
  | "followup"
  | "questionnaire"
  | "resume"
  | "resume_referral";
  source: "item" | "subitem";
  subitemId: string | null;
  subitemName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  creatorId: string | null;
  creatorName: string | null;
}

export interface MondaySubitemEntry {
  id: string;
  name: string;
  typeLabel: string | null;
  updateType:
  | "general"
  | "welcome_email"
  | "followup"
  | "questionnaire"
  | "resume"
  | "resume_referral";
  methodOfCommunication: string | null;
  createdAt: string | null;
  creatorProfile: {
    id: string;
    name: string | null;
    photoThumb: string | null;
  } | null;
  updates: {
    id: string;
    body: string;
    createdAt: string | null;
    updatedAt: string | null;
    creatorId: string | null;
    creatorName: string | null;
  }[];
}

export interface MondayRecordUpdatesResponse {
  ok: boolean;
  error?: string;
  itemId?: string;
  itemName?: string | null;
  updates?: MondayRecordUpdate[];
  subitems?: MondaySubitemEntry[];
}

export interface MondayCreateRecordUpdateResponse {
  ok: boolean;
  error?: string;
  update?: {
    id: string;
    body: string;
    updateType:
    | "general"
    | "welcome_email"
    | "followup"
    | "questionnaire"
    | "resume"
    | "resume_referral";
    source: "item" | "subitem";
    subitemName?: string | null;
    approvalStepColumnId?: string | null;
    approvalStepMarked?: boolean;
    warning?: string | null;
  };
}

export interface MondayResumeUploadResponse {
  ok: boolean;
  error?: string;
}

export interface ResumePreviewState {
  fileName: string;
  href: string;
  recordName: string;
}

export interface MockBusinessInfo {
  name: string;
  industry: string;
  city: string;
  state: string;
  teamSize: number;
  activeProjects: number;
  reliabilityScore: number;
}

export interface ApprovalStepConfig {
  id: string;
  title: string;
}

export interface MondaySendEmailResponse {
  ok: boolean;
  error?: string;
}

export interface MondayFeatureFlags {
  emailMarketingEnabled: boolean;
}

export interface MondayPlatformSettings {
  masterAdminUserId: string;
  adminUserIds: string[];
  employeeUserIds: string[];
  replyToEmails: string[];
}

export interface MondayFeatureFlagsResponse {
  ok: boolean;
  error?: string;
  featureFlags?: MondayFeatureFlags;
}

export interface MondayPlatformSettingsResponse {
  ok: boolean;
  error?: string;
  platformSettings?: MondayPlatformSettings;
}

export interface MondayUserFilterPresetsResponse {
  ok: boolean;
  error?: string;
  presets?: unknown[];
}

export interface MondayUserFilterPresetUpsertResponse {
  ok: boolean;
  error?: string;
  preset?: unknown;
}

export interface MondayUserBoardSettingsResponse {
  ok: boolean;
  error?: string;
  settings?: unknown;
}

export interface MondayRoutingStatus {
  ok: boolean;
  enabled: boolean;
  contactBoardId: string | null;
  countyBoardId: string | null;
  districtBoardId: string | null;
  countyMappingsCount: number;
  districtOwnerMappingsCount: number;
  contactBoardUrl: string | null;
  countyBoardUrl: string | null;
  districtBoardUrl: string | null;
  issues: string[];
}

export interface MondayRoutingStatusResponse {
  ok: boolean;
  error?: string;
  status?: MondayRoutingStatus;
}

export interface MondayRoutingAssignResult {
  ok: boolean;
  status: string;
  itemId: string;
  source: "webhook" | "manual";
  message: string;
  countyName: string | null;
  countyFips: string | null;
  districtCode: string | null;
  ownerId: string | null;
  matchedAddress: string | null;
}

export interface MondayRoutingAssignResponse {
  ok: boolean;
  error?: string;
  result?: MondayRoutingAssignResult;
}

export interface MondayMetricsSummaryTotals {
  allContacts: number;
  candidatesGroup: number;
  reentry: number;
  veterans: number;
  hiredTotal: number;
  hiredCandidatesGroup: number;
  hiredReentry: number;
  hiredVeterans: number;
}

export interface MondayMetricsMonthlyPoint extends MondayMetricsSummaryTotals {
  monthKey: string;
  monthLabel: string;
}

export interface MondayMetricsOwnerBreakdown extends MondayMetricsSummaryTotals {
  ownerId: string;
  ownerLabel: string;
}

export interface MondayMetricsSummary {
  fiscalYear: string;
  ownerId: string | null;
  boardName: string | null;
  totals: MondayMetricsSummaryTotals;
  monthly: MondayMetricsMonthlyPoint[];
  ownerBreakdown: MondayMetricsOwnerBreakdown[];
  generatedAt: string;
}

export interface MondayMetricsResponse {
  ok: boolean;
  error?: string;
  summary?: MondayMetricsSummary;
}

export interface AddNewContactValues {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  ownerId: string;
}

export type AdvancedFilterMatchMode = "all" | "any";

export type AdvancedFilterField =
  | "owner"
  | "district"
  | "name"
  | "email"
  | "phone"
  | "address"
  | "tags"
  | "createdAt"
  | "hireDate"
  | "detail";

export type AdvancedFilterOperator =
  | "contains"
  | "equals"
  | "not_equals"
  | "starts_with"
  | "ends_with"
  | "is_empty"
  | "is_not_empty"
  | "on_or_after"
  | "on_or_before"
  | "between";

export interface AdvancedFilterCondition {
  id: string;
  field: AdvancedFilterField;
  operator: AdvancedFilterOperator;
  value: string;
  valueTo: string;
  target: string;
}

export interface SavedAdvancedFilterPreset {
  id: string;
  name: string;
  matchMode: AdvancedFilterMatchMode;
  conditions: AdvancedFilterCondition[];
  createdAt: number;
  updatedAt?: number;
  ownerMondayUserId?: string;
}

export type UserBoardColorTheme =
  | "neutral"
  | "sky"
  | "emerald"
  | "violet"
  | "rose"
  | "custom";
export type UserBoardFontSize = "default" | "medium" | "large";
export type UserBoardTableDensity = "expanded" | "compact";
export type UserBoardDisplayMode = "table" | "grid" | "kanban";
export type UserBoardRecordSource = "created_in_month" | "touched_in_month";
/** 0 = infinite scroll */
export type UserBoardPageSize = 20 | 40 | 100 | 0;

export interface UserBoardCustomTheme {
  colorHex: string;
  alpha: number;
}

export interface UserBoardGeneralSettings {
  ownerMondayUserId?: string;
  colorTheme: UserBoardColorTheme;
  customTheme?: UserBoardCustomTheme;
  fontSize: UserBoardFontSize;
  tableDensity: UserBoardTableDensity;
  pageSize: UserBoardPageSize;
  displayMode: UserBoardDisplayMode;
  recordSource: UserBoardRecordSource;
  createdAt?: number;
  updatedAt?: number;
}

export type MondayBoardViewMode = "all" | "userScoped";

export interface MondayBoardViewProps {
  viewMode?: MondayBoardViewMode;
  initialOwnerFilter?: string;
  forcedOwnerId?: string;
}

export interface KanbanColumn {
  index: number;
  id: string;
  title: string;
  records: MondayRecord[];
}

export interface KanbanMoveConfirmation {
  record: MondayRecord;
  fromStepIndex: number;
  toStepIndex: number;
  direction: "forward" | "backward";
}
