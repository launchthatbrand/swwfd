// ---------------------------------------------------------------------------
// Generic API response wrapper — replaces 20+ individual response envelopes
// ---------------------------------------------------------------------------

export type MondayApiResponse<T = Record<string, never>> = {
  ok: boolean;
  error?: string;
} & T;

// ---------------------------------------------------------------------------
// Update type union — shared between client and server
// ---------------------------------------------------------------------------

export const MONDAY_UPDATE_TYPES = [
  "general",
  "welcome_email",
  "followup",
  "questionnaire",
  "resume",
  "resume_referral",
  "job_referral",
  "merge",
] as const;

export type MondayUpdateType = (typeof MONDAY_UPDATE_TYPES)[number];

// ---------------------------------------------------------------------------
// Core domain types (single source of truth for client + server)
// ---------------------------------------------------------------------------

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
  interviewingWithContractors: string | null;
  hiredWithContractor: string | null;
  hireDate: string | null;
  retentionPeriod: string | null;
  tags: string | null;
  batteryProgress: number | null;
  batteryRawValue: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  lastTouchpointAt?: string | null;
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

export interface MondayEmailTemplate {
  id: string;
  name: string;
  url: string | null;
  updatedAt: string | null;
  content: string;
  renderedHtml: string;
  docLink: string | null;
}

export interface MondayIdentity {
  userId: string;
  accountId: string;
  boardId?: string;
  appClientId?: string;
  expiresAt?: number;
}

export interface MondayUserProfile {
  id: string;
  email: string | null;
  name: string | null;
}

export interface MondayRecordEditOptions {
  referredToContractors: string[];
  hiredWithContractor: string[];
  retentionPeriod: string[];
  tags: string[];
  status: string[];
  questionnaireGender: string[];
  questionnaireEntryLevel: string[];
  questionnaireSkilled: string[];
  questionnaireEthnicity: string[];
  questionnaireEducationLevel: string[];
  questionnaireUsWorkEligible: string[];
  questionnaireVeteran: string[];
  questionnaireSecondChance: string[];
  questionnaireTransportation: string[];
  questionnaireWorkSchedule: string[];
  questionnaireCandidateEducation: string[];
  questionnaireDesiredHourlyWage: string[];
}

export interface MondayContactCandidate {
  id: string;
  name: string;
  url: string | null;
  email: string | null;
  owner: string | null;
  updatedAt: string | null;
}

export interface MondayRecordUpdate {
  id: string;
  body: string;
  updateType: MondayUpdateType;
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
  updateType: MondayUpdateType;
  intent: MondayUpdateIntent;
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

export interface ApprovalStepConfig {
  id: string;
  title: string;
}

export interface MondayJobListing {
  id: string;
  title: string;
  status: string | null;
  district: string | null;
  location: string | null;
  locationSecondary: string | null;
  description: string | null;
  categories: string[];
  contractor: string | null;
  contractorEmail: string | null;
  applyEmail: string | null;
  applyPhone: string | null;
  salaryAmount: string | null;
  salaryType: string | null;
  websiteUrl: string | null;
  postedDate: string | null;
  updatedAt: string | null;
  isAvailable: boolean;
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

export interface OutlookTeamMailbox {
  mondayUserId: string;
  name: string | null;
  userEmail: string | null;
  connected: boolean;
  mailboxEmail: string | null;
  mailboxDisplayName: string | null;
  accessTokenExpiresAt: number | null;
  updatedAt: number | null;
  isCurrentUser: boolean;
  isContactOwner: boolean;
}

export interface MondayEmailSystemTag {
  tag: string;
  columnId: string;
  columnTitle: string;
}

export interface MondayPlatformSettings {
  masterAdminUserId: string;
  adminUserIds: string[];
  employeeUserIds: string[];
  replyToEmails: string[];
  zohoSenderEmail: string | null;
  zohoReplyToFallbackEmail: string | null;
  emailSystemTags: MondayEmailSystemTag[];
  monthlyBoardMappings: Array<{
    monthKey: string;
    boardId: string;
  }>;
}

export interface MondayFeatureFlags {
  emailMarketingEnabled: boolean;
}

export type MondayBulkSyncJobStatus = "running" | "done" | "failed" | "cancelled";

export interface MondayBulkSyncJob {
  jobId: string;
  status: MondayBulkSyncJobStatus;
  mondayAccountId: string;
  requestedByMondayUserId: string;
  requestedByMondayAppClientId: string | null;
  ownerId: string;
  totalContacts: number;
  nextIndex: number;
  processedContacts: number;
  succeededContacts: number;
  failedContacts: number;
  warningsCount: number;
  startedAt: number;
  updatedAt: number;
  finishedAt: number | null;
  lastError: string | null;
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

export interface MondayHireEventSegments {
  isCandidatesGroup: boolean;
  isReentry: boolean;
  isVeteran: boolean;
}

export interface MondayHireEventMetadata {
  contactItemId: string;
  ownerId: string;
  hireDate: string;
  source: string;
  segments: MondayHireEventSegments;
}

export interface HelpdeskTicket {
  id: string;
  name: string;
  status: string | null;
  priority: string | null;
  category: string | null;
  description: string | null;
  linkedContact: string | null;
  date: string | null;
  createdAt: string | null;
}

export type MondaySupportConversationStatus = "open" | "snoozed" | "closed";
export type MondaySupportConversationMode = "agent" | "manual";
export type MondaySupportMessageRole = "user" | "assistant";
export type MondaySupportMessageChannel = "chat" | "email" | "sms";
export type MondaySupportMessageType =
  | "chat"
  | "email_inbound"
  | "email_outbound"
  | "sms_inbound"
  | "sms_outbound";

export type MondayUpdateIntent = "internal_note" | "conversation" | "campaign";

export interface MondaySupportConversationSummary {
  id: string;
  sessionId: string;
  contactItemId: string | null;
  contactName: string;
  contactEmail: string | null;
  status: MondaySupportConversationStatus;
  mode: MondaySupportConversationMode;
  assignedAgentId: string | null;
  assignedAgentName: string | null;
  lastMessagePreview: string | null;
  lastMessageRole: MondaySupportMessageRole | null;
  lastMessageAt: number | null;
  unreadCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface MondaySupportMessage {
  id: string;
  conversationId: string;
  updateType: MondayUpdateType;
  role: MondaySupportMessageRole;
  source: "admin" | "visitor" | "system";
  channel: MondaySupportMessageChannel;
  messageType: MondaySupportMessageType;
  body: string;
  senderName: string | null;
  senderEmail: string | null;
  createdAt: number;
}

export interface MondaySupportNote {
  id: string;
  conversationId: string;
  authorMondayUserId: string;
  authorName: string | null;
  body: string;
  createdAt: number;
}

export interface MondaySupportEvent {
  id: string;
  conversationId: string;
  type: string;
  actorMondayUserId: string | null;
  actorName: string | null;
  payload: string | null;
  createdAt: number;
}

export interface MondaySupportPresenceEntry {
  id: string;
  conversationId: string;
  userId: string;
  userName: string | null;
  userType: "agent" | "visitor";
  status: "online" | "typing" | "idle";
  lastSeenAt: number;
}

// ---------------------------------------------------------------------------
// Metrics types
// ---------------------------------------------------------------------------

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

export interface MondayMetricsCommunicationTotals {
  emailCommunications: number;
  textCommunications: number;
  phoneCallCommunications: number;
}

export interface MondayMetricsMonthlyPoint extends MondayMetricsSummaryTotals {
  monthKey: string;
  monthLabel: string;
  emailCommunications: number;
  textCommunications: number;
  phoneCallCommunications: number;
}

export interface MondayMetricsOwnerBreakdown extends MondayMetricsSummaryTotals {
  ownerId: string;
  ownerLabel: string;
}

export interface MondayMetricsHiredContact {
  contactId: string;
  name: string;
  email: string | null;
  url: string | null;
  hireCount: number;
  latestHireDate: string | null;
}

export interface MondayMetricsContractorReferralBreakdown {
  contractorName: string;
  referredCount: number;
}

export interface MondayMetricsSummary {
  fiscalYear: string;
  ownerId: string | null;
  boardName: string | null;
  totals: MondayMetricsSummaryTotals;
  communicationTotals: MondayMetricsCommunicationTotals;
  monthly: MondayMetricsMonthlyPoint[];
  ownerBreakdown: MondayMetricsOwnerBreakdown[];
  hiredContacts: MondayMetricsHiredContact[];
  contractorReferrals: MondayMetricsContractorReferralBreakdown[];
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// API response types — use MondayApiResponse<T> for typed envelopes
// ---------------------------------------------------------------------------

export type MondayResponse = MondayApiResponse<{
  boardName?: string | null;
  records?: MondayRecord[];
  nextCursor?: string | null;
  approvalSteps?: ApprovalStepConfig[];
}>;

export type MondayEmailTemplatesResponse = MondayApiResponse<{
  boardName?: string | null;
  boardId?: string;
  workdocColumnId?: string;
  templates?: MondayEmailTemplate[];
}>;

export type MondayUserProfileResponse = MondayApiResponse<{
  user?: MondayUserProfile | null;
}>;

export type OutlookConnectionStatusResponse = MondayApiResponse<{
  connected?: boolean;
  callbackPath?: string;
  connection?: {
    email: string | null;
    displayName: string | null;
    accessTokenExpiresAt: number;
    scopes: string[];
    updatedAt: number;
  } | null;
}>;

export type OutlookTeamMailboxesResponse = MondayApiResponse<{
  mailboxes?: OutlookTeamMailbox[];
  defaultSenderUserId?: string | null;
}>;

export type MondayRecordEditOptionsResponse = MondayApiResponse<{
  options?: MondayRecordEditOptions;
}>;

export type MondayContactsLookupResponse = MondayApiResponse<{
  identity?: { userId: string };
  existing?: MondayContactCandidate[];
}>;

export type MondayCreateContactResponse = MondayApiResponse<{
  created?: { id: string };
}>;

export type MondayRecordUpdatesResponse = MondayApiResponse<{
  itemId?: string;
  itemName?: string | null;
  updates?: MondayRecordUpdate[];
  subitems?: MondaySubitemEntry[];
}>;

export type MondayCreateRecordUpdateResponse = MondayApiResponse<{
  update?: {
    id: string;
    body: string;
    updateType: MondayUpdateType;
    source: "item" | "subitem";
    subitemName?: string | null;
    approvalStepColumnId?: string | null;
    approvalStepMarked?: boolean;
    warning?: string | null;
  };
}>;

export type MondayResumeUploadResponse = MondayApiResponse;

export type MondayJobsResponse = MondayApiResponse<{
  boardId?: string;
  boardName?: string | null;
  jobs?: MondayJobListing[];
}>;

export type MondaySendEmailResponse = MondayApiResponse;
export type MondaySendEmailBatchResponse = MondayApiResponse<{
  provider?: "outlook" | "zoho";
  reason?:
    | "single_outlook"
    | "single_fallback_zoho"
    | "multi_zoho";
  sentCount?: number;
  failedCount?: number;
  results?: Array<{
    contactItemId: string;
    to: string;
    provider: "outlook" | "zoho";
    ok: boolean;
    error?: string;
  }>;
}>;

export type MondayFeatureFlagsResponse = MondayApiResponse<{
  featureFlags?: MondayFeatureFlags;
}>;

export type MondayPlatformSettingsResponse = MondayApiResponse<{
  platformSettings?: MondayPlatformSettings;
}>;

export type MondayBulkSyncStatusResponse = MondayApiResponse<{
  job?: MondayBulkSyncJob | null;
  processed?: number;
  succeeded?: number;
  failed?: number;
  retriedContacts?: number;
}>;

export type MondayUserFilterPresetsResponse = MondayApiResponse<{
  presets?: unknown[];
}>;

export type MondayUserFilterPresetUpsertResponse = MondayApiResponse<{
  preset?: unknown;
}>;

export type MondayUserBoardSettingsResponse = MondayApiResponse<{
  settings?: unknown;
}>;

export type MondayRoutingStatusResponse = MondayApiResponse<{
  status?: MondayRoutingStatus;
}>;

export type MondayRoutingAssignResponse = MondayApiResponse<{
  result?: MondayRoutingAssignResult;
}>;

export type MondayMetricsResponse = MondayApiResponse<{
  summary?: MondayMetricsSummary;
}>;


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
export type UserBoardDisplayMode = "table" | "grid" | "kanban" | "chat";
export type GridSortField = "name" | "resume" | "tags" | "createdAt" | "updatedAt";
export type GridSortDirection = "asc" | "desc";
export interface GridSortState {
  field: GridSortField;
  direction: GridSortDirection;
}
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
  hoverPopoversEnabled: boolean;
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
