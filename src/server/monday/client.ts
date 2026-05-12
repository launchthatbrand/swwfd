import "server-only";

import { env } from "~/env";

const MONDAY_API_URL = "https://api.monday.com/v2";
const RETENTION_REFERRED_COLUMN_ID = "dropdown_mkwqcc1w";
const RETENTION_HIRED_WITH_COLUMN_ID = "dropdown_mkwqm5fb";
const RETENTION_HIRE_DATE_COLUMN_ID = "date_mkty234p";
const RETENTION_PERIOD_COLUMN_ID = "dropdown_mkwthbh2";
const TAGS_COLUMN_ID = "dropdown_mkvw578t";
const RESUME_FILES_COLUMN_ID = "files__1";
const APPROVAL_STEP_COLUMN_IDS = [
  "color_mm1db321",
  "color_mm1dwtvd",
  "color_mm1dwr4k",
  "color_mm1dnr11",
  "color_mm1dgeqy",
  "color_mm1d80yc",
  "color_mm1djwjj",
  "color_mm1d4e3y",
] as const;

export interface MondayRecord {
  id: string;
  name: string;
  url: string | null;
  groupTitle: string | null;
  statusText: string | null;
  peopleText: string | null;
  ownerIds: string[];
  ownerProfiles: Array<{
    id: string;
    name: string | null;
    email: string | null;
    photoThumb: string | null;
  }>;
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
  contactDetails: Array<{
    label: string;
    value: string;
  }>;
  resumeFiles: Array<{
    assetId: string | null;
    name: string;
    url: string | null;
  }>;
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
}

export interface MondayApprovalStep {
  id: string;
  title: string;
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

export const MONDAY_UPDATE_TYPES = [
  "general",
  "welcome_email",
  "followup",
  "questionnaire",
  "resume",
  "resume_referral",
] as const;

export type MondayUpdateType = (typeof MONDAY_UPDATE_TYPES)[number];

const MONDAY_UPDATE_TYPE_SET = new Set<string>(MONDAY_UPDATE_TYPES);

const SUBITEM_NAME_BY_UPDATE_TYPE: Record<
  Exclude<MondayUpdateType, "general">,
  string
> = {
  welcome_email: "Welcome Email Update",
  followup: "Followup Update",
  questionnaire: "Questionaire Update",
  resume: "Resume Update",
  resume_referral: "Resume Referral Update",
};

const SUBITEM_TYPE_COLUMN_ID = "color_mm2x49t2";
const SUBITEM_DATE_COLUMN_ID = "date0";
const SUBITEM_PERSON_COLUMN_ID = "person";
const SUBITEM_METHOD_COLUMN_ID = "method_of_communication__1";
export const MONDAY_HIRE_EVENT_TYPE_LABEL = "Hire Event";
const MONDAY_HIRE_EVENT_TOKEN_PREFIX = "hk";

const SUBITEM_TYPE_LABEL_BY_UPDATE_TYPE: Record<MondayUpdateType, string> = {
  general: "General",
  welcome_email: "Welcome Email",
  followup: "Followup",
  questionnaire: "Questionnaire",
  resume: "Resume",
  resume_referral: "Resume Referral",
};

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

const APPROVAL_STEP_COLUMN_ID_BY_UPDATE_TYPE: Partial<
  Record<Exclude<MondayUpdateType, "general">, string>
> = {
  welcome_email: APPROVAL_STEP_COLUMN_IDS[0],
  followup: APPROVAL_STEP_COLUMN_IDS[1],
  questionnaire: APPROVAL_STEP_COLUMN_IDS[2],
  resume: APPROVAL_STEP_COLUMN_IDS[3],
  resume_referral: APPROVAL_STEP_COLUMN_IDS[4],
};

export const isMondayUpdateType = (value: string | null | undefined): value is MondayUpdateType => {
  if (!value) return false;
  return MONDAY_UPDATE_TYPE_SET.has(value.trim().toLowerCase());
};

const normalizeHireEventMetadataValue = (value: string) => {
  return value.trim().replace(/[;\]\r\n]/g, "");
};

export const buildMondayHireEventToken = (args: MondayHireEventMetadata) => {
  const contactItemId = normalizeHireEventMetadataValue(args.contactItemId);
  const ownerId = normalizeHireEventMetadataValue(args.ownerId);
  const hireDate = normalizeHireEventMetadataValue(args.hireDate);
  const source = normalizeHireEventMetadataValue(args.source || "unknown");
  const cg = args.segments.isCandidatesGroup ? "1" : "0";
  const re = args.segments.isReentry ? "1" : "0";
  const vet = args.segments.isVeteran ? "1" : "0";
  return `[${MONDAY_HIRE_EVENT_TOKEN_PREFIX}:contact=${contactItemId};owner=${ownerId};date=${hireDate};cg=${cg};re=${re};vet=${vet};src=${source}]`;
};

export const parseMondayHireEventToken = (
  value: string | null | undefined,
): MondayHireEventMetadata | null => {
  if (!value) return null;
  const match = value.match(/\[hk:([^\]]+)\]/i);
  if (!match?.[1]) return null;
  const params = new Map<string, string>();
  for (const part of match[1].split(";")) {
    const [keyRaw, valueRaw] = part.split("=");
    const key = keyRaw?.trim().toLowerCase();
    const entryValue = valueRaw?.trim() ?? "";
    if (!key) continue;
    params.set(key, entryValue);
  }
  const contactItemId = params.get("contact")?.trim() ?? "";
  const ownerId = params.get("owner")?.trim() ?? "";
  const hireDate = params.get("date")?.trim() ?? "";
  if (!contactItemId || !ownerId || !hireDate) return null;
  const source = params.get("src")?.trim() ?? "unknown";
  return {
    contactItemId,
    ownerId,
    hireDate,
    source,
    segments: {
      isCandidatesGroup: params.get("cg") === "1",
      isReentry: params.get("re") === "1",
      isVeteran: params.get("vet") === "1",
    },
  };
};

interface MondayGraphQLResponse<TData> {
  data?: TData;
  errors?: { message?: string }[];
}

const getMondayApiEnv = () => {
  const apiKey = env.MONDAY_API_KEY;
  if (!apiKey) {
    return { ok: false as const, apiKey: null };
  }
  return { ok: true as const, apiKey };
};

const getMondayBoardEnv = () => {
  const api = getMondayApiEnv();
  const boardId = env.MONDAY_BOARD_ID;
  if (!api.ok || !boardId) {
    return { ok: false as const, apiKey: null, boardId: null };
  }
  return { ok: true as const, apiKey: api.apiKey, boardId };
};

const getMondayTouchBoardEnv = () => {
  const api = getMondayApiEnv();
  const boardId = env.MONDAY_CONTACT_TOUCHED_BOARD_ID;
  if (!api.ok || !boardId) {
    return { ok: false as const, apiKey: null, boardId: null };
  }
  return { ok: true as const, apiKey: api.apiKey, boardId };
};

export const callMondayGraphQL = async <TData>(
  query: string,
  variables: Record<string, unknown>,
) => {
  const mondayApi = getMondayApiEnv();
  if (!mondayApi.ok) {
    throw new Error("MONDAY_API_KEY is missing");
  }

  const response = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      Authorization: mondayApi.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Monday API request failed with ${response.status}`);
  }

  const json = (await response.json()) as MondayGraphQLResponse<TData>;
  if (Array.isArray(json.errors) && json.errors.length > 0) {
    const message =
      json.errors.map((error) => error.message).filter(Boolean).join(" | ") ||
      "Unknown Monday API error";
    throw new Error(message);
  }

  if (!json.data) {
    throw new Error("Monday API returned no data");
  }

  return json.data;
};

const BOARD_COLUMN_CACHE_TTL_MS = 5 * 60 * 1000;
const MONDAY_USER_CACHE_TTL_MS = 5 * 60 * 1000;
type ProgressColumnConfig = {
  columnId: string;
  selectedColumns: Array<{
    columnId: string;
    percentage: number;
    doneColors: number[];
  }>;
};

const boardColumnCache = new Map<
  string,
  {
    expiresAt: number;
    statusColumnId: string | null;
    peopleColumnId: string | null;
    emailColumnId: string | null;
    dateColumnId: string | null;
    columnTitleById: Record<string, string>;
    progressColumnConfig: ProgressColumnConfig | null;
  }
>();
const mondayUserCache = new Map<
  string,
  {
    expiresAt: number;
    value: {
      id: string;
      name: string | null;
      email: string | null;
      photoThumb: string | null;
    };
  }
>();

const resolveMondayUsersByIds = async (ids: string[]) => {
  const uniqueIds = Array.from(
    new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0)),
  );
  if (uniqueIds.length === 0) {
    return new Map<
      string,
      { id: string; name: string | null; email: string | null; photoThumb: string | null }
    >();
  }

  const now = Date.now();
  const result = new Map<
    string,
    { id: string; name: string | null; email: string | null; photoThumb: string | null }
  >();
  const idsToFetch: string[] = [];

  for (const id of uniqueIds) {
    const cached = mondayUserCache.get(id);
    if (cached && cached.expiresAt > now) {
      result.set(id, cached.value);
      continue;
    }
    idsToFetch.push(id);
  }

  if (idsToFetch.length > 0) {
    interface UsersData {
      users?: Array<{
        id?: string | number | null;
        name?: string | null;
        email?: string | null;
        photo_thumb?: string | null;
      }>;
    }
    const query = `
      query GetUsersByIds($userIds: [ID!]) {
        users(ids: $userIds) {
          id
          name
          email
          photo_thumb
        }
      }
    `;
    const data = await callMondayGraphQL<UsersData>(query, {
      userIds: idsToFetch,
    });
    const fetchedUsers = data.users ?? [];
    for (const user of fetchedUsers) {
      const idRaw = user.id;
      if (idRaw === null || idRaw === undefined) continue;
      const id = String(idRaw).trim();
      if (!id) continue;
      const value = {
        id,
        name: user.name?.trim() || null,
        email: user.email?.trim() || null,
        photoThumb: user.photo_thumb?.trim() || null,
      };
      mondayUserCache.set(id, {
        expiresAt: now + MONDAY_USER_CACHE_TTL_MS,
        value,
      });
      result.set(id, value);
    }
  }

  for (const id of uniqueIds) {
    if (!result.has(id)) {
      const fallback = { id, name: null, email: null, photoThumb: null };
      mondayUserCache.set(id, {
        expiresAt: now + MONDAY_USER_CACHE_TTL_MS,
        value: fallback,
      });
      result.set(id, fallback);
    }
  }

  return result;
};

const resolveBoardColumnIds = async (boardId: string) => {
  const now = Date.now();
  const cached = boardColumnCache.get(boardId);
  if (cached && cached.expiresAt > now) {
    return cached;
  }

  interface BoardColumnsData {
    boards?: Array<{
      columns?: Array<{
        id?: string | null;
        title?: string | null;
        type?: string | null;
        settings_str?: string | null;
      }>;
    }>;
  }

  const query = `
    query ResolveBoardColumns($boardId: ID!) {
      boards(ids: [$boardId]) {
        columns {
          id
          title
          type
          settings_str
        }
      }
    }
  `;

  const data = await callMondayGraphQL<BoardColumnsData>(query, { boardId });
  const columns = data.boards?.[0]?.columns ?? [];
  const statusColumnId =
    columns.find((column) => column?.type === "status")?.id ?? null;
  const peopleColumnId =
    columns.find((column) => column?.type === "people")?.id ?? null;
  const emailColumnId =
    columns.find((column) => column?.id === "email__1")?.id ??
    columns.find((column) => column?.type === "email")?.id ??
    null;
  const dateColumnId =
    columns.find((column) => column?.id === "date1__1")?.id ??
    columns.find((column) => column?.type === "date")?.id ??
    null;
  const columnTitleById: Record<string, string> = {};
  for (const column of columns) {
    const id = column?.id?.trim();
    const title = column?.title?.trim();
    if (!id || !title) continue;
    columnTitleById[id] = title;
  }

  // Parse the progress (battery) column config so we can compute it from
  // constituent status columns, since the API always returns value: null.
  let progressColumnConfig: ProgressColumnConfig | null = null;
  const progressColumn = columns.find(
    (c) => c?.id === "columns_battery_mm1dnmq3" || c?.type === "progress",
  );
  if (progressColumn?.settings_str) {
    try {
      const settings = JSON.parse(progressColumn.settings_str) as {
        related_columns?: {
          columns?: Record<string, { isSelected?: boolean; percentage?: number }>;
        };
      };
      const relatedCols = settings.related_columns?.columns ?? {};
      const selectedColumns = Object.entries(relatedCols)
        .filter(([, v]) => v.isSelected === true)
        .map(([colId, v]) => {
          const colMeta = columns.find((c) => c?.id === colId);
          let doneColors: number[] = [1];
          if (colMeta?.settings_str) {
            try {
              const colSettings = JSON.parse(colMeta.settings_str) as {
                done_colors?: number[];
              };
              if (Array.isArray(colSettings.done_colors)) {
                doneColors = colSettings.done_colors;
              }
            } catch {
              // Use default doneColors.
            }
          }
          return { columnId: colId, percentage: v.percentage ?? 0, doneColors };
        });
      if (selectedColumns.length > 0) {
        progressColumnConfig = {
          columnId: progressColumn.id ?? "columns_battery_mm1dnmq3",
          selectedColumns,
        };
      }
    } catch {
      // progressColumnConfig stays null; fall back to text/value parsing.
    }
  }

  const resolved = {
    expiresAt: now + BOARD_COLUMN_CACHE_TTL_MS,
    statusColumnId,
    peopleColumnId,
    emailColumnId,
    dateColumnId,
    columnTitleById,
    progressColumnConfig,
  };
  boardColumnCache.set(boardId, resolved);
  return resolved;
};

const extractPrimitiveStrings = (input: unknown): string[] => {
  if (input === null || input === undefined) return [];
  if (typeof input === "string") {
    const trimmed = input.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  }
  if (typeof input === "number" || typeof input === "boolean") {
    return [String(input)];
  }
  if (Array.isArray(input)) {
    return input.flatMap((entry) => extractPrimitiveStrings(entry));
  }
  if (typeof input === "object") {
    return Object.values(input as Record<string, unknown>).flatMap((entry) =>
      extractPrimitiveStrings(entry),
    );
  }
  return [];
};

const toColumnDisplayValue = (
  text: string | null | undefined,
  rawValue: string | null | undefined,
) => {
  const normalizedText = text?.trim();
  if (normalizedText && normalizedText.length > 0) {
    return normalizedText;
  }
  if (!rawValue || rawValue.trim().length === 0) {
    return "";
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    const values = Array.from(new Set(extractPrimitiveStrings(parsed))).filter(
      (value) => value.toLowerCase() !== "person",
    );
    return values.join(", ");
  } catch {
    return rawValue;
  }
};

const splitCsvValues = (value: string | null | undefined) => {
  if (!value) return [] as string[];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};

const parseFilesColumnValue = (
  value: string | null | undefined,
): Array<{ assetId: string | null; name: string; url: string | null }> => {
  if (!value || value.trim().length === 0) return [];
  try {
    const parsed = JSON.parse(value) as {
      files?: Array<{
        assetId?: number | string;
        name?: string;
        url?: string;
        public_url?: string;
      }>;
    };
    const files = Array.isArray(parsed.files) ? parsed.files : [];
    return files
      .map((file) => {
        const assetId =
          typeof file.assetId === "number"
            ? String(file.assetId)
            : typeof file.assetId === "string" && file.assetId.trim().length > 0
              ? file.assetId.trim()
              : null;
        const name =
          typeof file.name === "string" && file.name.trim().length > 0
            ? file.name.trim()
            : "File";
        const url =
          typeof file.public_url === "string" && file.public_url.trim().length > 0
            ? file.public_url.trim()
            : typeof file.url === "string" && file.url.trim().length > 0
              ? file.url.trim()
              : null;
        return { assetId, name, url };
      })
      .filter((file) => file.assetId !== null || file.url !== null);
  } catch {
    return [];
  }
};

const computeProgressFromColumns = (
  itemColumns: Array<{ id?: string | null; value?: string | null }>,
  config: ProgressColumnConfig | null,
): number | null => {
  if (!config || config.selectedColumns.length === 0) return null;
  let total = 0;
  let anyColumnFound = false;
  for (const { columnId, percentage, doneColors } of config.selectedColumns) {
    const col = itemColumns.find((c) => c.id === columnId);
    if (!col) continue;
    anyColumnFound = true;
    if (col.value) {
      try {
        const parsed = JSON.parse(col.value) as { index?: number | null };
        if (typeof parsed.index === "number" && doneColors.includes(parsed.index)) {
          total += percentage;
        }
      } catch {
        // Column not done.
      }
    }
  }
  return anyColumnFound ? total : null;
};

const parseBatteryProgressValue = (
  text: string | null | undefined,
  rawValue: string | null | undefined,
): number | null => {
  const parseNumber = (value: string) => {
    const match = value.match(/-?\d+(\.\d+)?/);
    if (!match) return null;
    const parsed = Number(match[0]);
    if (!Number.isFinite(parsed)) return null;
    return Math.max(0, Math.min(100, Math.round(parsed)));
  };

  if (rawValue && rawValue.trim().length > 0) {
    try {
      const parsed = JSON.parse(rawValue) as {
        battery_value?: number | string | null;
        value?: number | string | null;
        text?: string | null;
      };
      if (
        typeof parsed.battery_value === "number" ||
        typeof parsed.battery_value === "string"
      ) {
        return parseNumber(String(parsed.battery_value));
      }
      if (typeof parsed.value === "number" || typeof parsed.value === "string") {
        return parseNumber(String(parsed.value));
      }
      if (typeof parsed.text === "string") {
        return parseNumber(parsed.text);
      }
    } catch {
      // Fall back to text parsing below.
    }
  }

  const fromText = text?.trim() ? parseNumber(text) : null;
  if (fromText !== null) return fromText;
  return null;
};

export const hasMondayConfig = () => {
  return getMondayBoardEnv().ok;
};

export const hasMondayTouchConfig = () => {
  return getMondayTouchBoardEnv().ok;
};

export const listMondayBoardRecords = async (args?: {
  cursor?: string;
  limit?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  owner?: string;
  status?: string;
}) => {
  const mondayBoard = getMondayBoardEnv();
  if (!mondayBoard.ok) {
    return {
      records: [] as MondayRecord[],
      nextCursor: null as string | null,
      boardName: null as string | null,
      approvalSteps: APPROVAL_STEP_COLUMN_IDS.map((id, index) => ({
        id,
        title: `Approval Step ${index + 1}`,
      })) as MondayApprovalStep[],
    };
  }

  const searchArg = args?.search?.trim() ?? "";
  const dateFromArg = args?.dateFrom;
  const dateToArg = args?.dateTo;
  const cursorArg = args?.cursor ?? null;
  const ownerArg = args?.owner?.trim() ?? "";
  const statusArg = args?.status?.trim() ?? "";
  const shouldFilterByDateRange =
    typeof dateFromArg === "string" &&
    dateFromArg.length > 0 &&
    typeof dateToArg === "string" &&
    dateToArg.length > 0;
  const isIsoDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

  const buildListBoardItemsQuery = (args: {
    includeCursor: boolean;
    rules: string[];
  }) => `
    query ListBoardItems($boardId: ID!, $limit: Int!${
      args.includeCursor ? ", $cursor: String" : ""
    }) {
      boards(ids: [$boardId]) {
        name
        items_page(
          limit: $limit
          ${args.includeCursor ? "cursor: $cursor" : ""}
          ${
            args.rules.length > 0
              ? `query_params: { rules: [${args.rules.join("\n")}] }`
              : ""
          }
        ) {
          cursor
          items {
            id
            name
            url
            updated_at
            group {
              title
            }
            column_values {
              id
              type
              text
              value
            }
          }
        }
      }
    }
  `;

  interface BoardItem {
    id: string;
    name?: string;
    url?: string;
    updated_at?: string;
    group?: { title?: string | null } | null;
    column_values?: {
      id?: string;
      type?: string;
      text?: string | null;
      value?: string | null;
    }[];
  }

  interface BoardQueryData {
    boards?: {
      name?: string;
      items_page?: { cursor?: string | null; items?: BoardItem[] };
    }[];
  }

  const limit = Math.min(Math.max(args?.limit ?? 100, 1), 500);
  const appliedFilters = {
    date: false,
    owner: false,
    status: false,
  };
  let resolvedColumnIds:
    | Awaited<ReturnType<typeof resolveBoardColumnIds>>
    | null = null;

  let boardName: string | null = null;
  const readCreatedAtFromCreationLog = (
    value: string | null | undefined,
    text: string | null | undefined,
  ) => {
    if (typeof value === "string" && value.length > 0) {
      try {
        const parsed = JSON.parse(value) as { created_at?: unknown };
        if (typeof parsed.created_at === "string" && parsed.created_at.length > 0) {
          return parsed.created_at;
        }
      } catch {
        // Fall through to text parsing.
      }
    }

    if (typeof text === "string" && text.length > 0) {
      const fromText = Date.parse(text.replace(" UTC", "Z"));
      if (!Number.isNaN(fromText)) {
        return new Date(fromText).toISOString();
      }
    }

    return null;
  };

  const batteryDebugEntries: {
    itemId: string;
    itemName: string;
    batteryColumnId: string | null;
    batteryColumnType: string | null;
    batteryText: string | null;
    batteryRawValue: string | null;
    parsedBatteryProgress: number | null;
  }[] = [];

  const toRecord = (item: BoardItem): MondayRecord => {
    const columns = item.column_values ?? [];
    const statusColumn = columns.find((column) => column.type === "status");
    const peopleColumn = columns.find((column) => column.type === "people");
    const emailColumn = columns.find(
      (column) => column.id === "email__1" || column.type === "email",
    );
    const phoneColumn = columns.find(
      (column) => column.id === "phone____1" || column.type === "phone",
    );
    const referredToContractorsColumn = columns.find(
      (column) => column.id === "dropdown_mkwqcc1w",
    );
    const hiredWithContractorColumn = columns.find(
      (column) => column.id === "dropdown_mkwqm5fb",
    );
    const hireDateColumn = columns.find((column) => column.id === "date_mkty234p");
    const retentionPeriodColumn = columns.find(
      (column) => column.id === "dropdown_mkwthbh2",
    );
    const tagsColumn = columns.find((column) => column.id === "dropdown_mkvw578t");
    const batteryColumn = columns.find(
      (column) =>
        column.id === "columns_battery_mm1dnmq3" || (column.type ?? "").toLowerCase() === "progress",
    );
    const computedProgress = computeProgressFromColumns(
      columns,
      resolvedColumnIds?.progressColumnConfig ?? null,
    );
    const parsedBatteryProgress =
      computedProgress ??
      parseBatteryProgressValue(batteryColumn?.text, batteryColumn?.value);
    batteryDebugEntries.push({
      itemId: item.id,
      itemName: item.name ?? "",
      batteryColumnId: batteryColumn?.id ?? null,
      batteryColumnType: batteryColumn?.type ?? null,
      batteryText: batteryColumn?.text ?? null,
      batteryRawValue: batteryColumn?.value ?? null,
      parsedBatteryProgress,
    });
    const resumeFilesColumn = columns.find(
      (column) => column.id === RESUME_FILES_COLUMN_ID,
    );
    const addressLine1 = columns.find((column) => column.id === "text6__1")?.text;
    const addressLine2 = columns.find((column) => column.id === "text60__1")?.text;
    const city = columns.find((column) => column.id === "text1__1")?.text;
    const state = columns.find((column) => column.id === "text7__1")?.text;
    const zip = columns.find((column) => column.id === "text3__1")?.text;
    const dateColumn = columns.find((column) => column.id === "date1__1");
    const creationLogColumn = columns.find(
      (column) => column.type === "creation_log",
    );
    let createdAtFromDateColumn: string | null = null;
    if (dateColumn?.value) {
      try {
        const parsed = JSON.parse(dateColumn.value) as {
          date?: string;
          time?: string;
        };
        if (parsed.date && parsed.time) {
          createdAtFromDateColumn = `${parsed.date}T${parsed.time}Z`;
        } else if (parsed.date) {
          createdAtFromDateColumn = `${parsed.date}T00:00:00Z`;
        }
      } catch {
        // Ignore malformed date JSON.
      }
    }
    let hireDateFromColumn: string | null = null;
    if (hireDateColumn?.value) {
      try {
        const parsed = JSON.parse(hireDateColumn.value) as {
          date?: string;
          time?: string;
        };
        if (parsed.date && parsed.time) {
          hireDateFromColumn = `${parsed.date}T${parsed.time}Z`;
        } else if (parsed.date) {
          hireDateFromColumn = `${parsed.date}T00:00:00Z`;
        }
      } catch {
        // Ignore malformed date JSON.
      }
    }
    const createdAtFromColumn = readCreatedAtFromCreationLog(
      creationLogColumn?.value,
      creationLogColumn?.text,
    );
    const addressParts = [addressLine1, addressLine2, city, state, zip]
      .map((value) => value?.trim())
      .filter((value): value is string => !!value && value.length > 0);
    const address = addressParts.length > 0 ? addressParts.join(", ") : null;

    let ownerIds: string[] = [];
    if (peopleColumn?.value) {
      try {
        const parsed = JSON.parse(peopleColumn.value) as {
          personsAndTeams?: Array<{ id?: number | string; kind?: string }>;
        };
        ownerIds = (parsed.personsAndTeams ?? [])
          .filter((entry) => entry.kind === "person" && entry.id != null)
          .map((entry) =>
            typeof entry.id === "number" ? String(entry.id) : String(entry.id),
          )
          .filter((entry) => entry.trim().length > 0);
      } catch {
        ownerIds = [];
      }
    }

    const primaryDetails: Array<{ label: string; value: string }> = [];
    if ((item.name ?? "").trim().length > 0) {
      primaryDetails.push({ label: "Name", value: item.name ?? "" });
    }
    if ((emailColumn?.text ?? "").trim().length > 0) {
      primaryDetails.push({ label: "Email", value: emailColumn?.text ?? "" });
    }
    if ((phoneColumn?.text ?? "").trim().length > 0) {
      primaryDetails.push({ label: "Phone", value: phoneColumn?.text ?? "" });
    }
    if ((address ?? "").trim().length > 0) {
      primaryDetails.push({ label: "Address", value: address ?? "" });
    }
    if ((peopleColumn?.text ?? "").trim().length > 0) {
      primaryDetails.push({ label: "Owner", value: peopleColumn?.text ?? "" });
    }
    if ((statusColumn?.text ?? "").trim().length > 0) {
      primaryDetails.push({ label: "Status", value: statusColumn?.text ?? "" });
    }
    if ((item.group?.title ?? "").trim().length > 0) {
      primaryDetails.push({ label: "Group", value: item.group?.title ?? "" });
    }

    const allColumnDetails = columns
      .filter((column) => {
        const id = column.id ?? "";
        if (!id) return false;
        if (column.type === "creation_log") return false;
        const displayValue = toColumnDisplayValue(column.text, column.value);
        return displayValue.trim().length > 0;
      })
      .map((column) => {
        const columnId = column.id ?? "";
        const columnTitle = resolvedColumnIds?.columnTitleById[columnId]?.trim() ?? "";
        return {
          label: columnTitle.length > 0 ? columnTitle : columnId || "field",
          value: toColumnDisplayValue(column.text, column.value),
        };
      });

    const detailsByLabel = new Map<string, string>();
    for (const detail of [...primaryDetails, ...allColumnDetails]) {
      if (!detailsByLabel.has(detail.label)) {
        detailsByLabel.set(detail.label, detail.value);
      }
    }
    const contactDetails = Array.from(detailsByLabel.entries()).map(
      ([label, value]) => ({ label, value }),
    );
    const hireDateDisplayValue = toColumnDisplayValue(
      hireDateColumn?.text,
      hireDateColumn?.value,
    );

    return {
      id: item.id,
      name: item.name ?? "",
      url: item.url ?? null,
      groupTitle: item.group?.title ?? null,
      statusText: statusColumn?.text ?? null,
      peopleText: peopleColumn?.text ?? null,
      ownerIds,
      ownerProfiles: [],
      email: emailColumn?.text ?? null,
      phone: phoneColumn?.text ?? null,
      address,
      referredToContractors: toColumnDisplayValue(
        referredToContractorsColumn?.text,
        referredToContractorsColumn?.value,
      ) || null,
      hiredWithContractor:
        toColumnDisplayValue(
          hiredWithContractorColumn?.text,
          hiredWithContractorColumn?.value,
        ) || null,
      hireDate:
        hireDateFromColumn ?? (hireDateDisplayValue.trim().length > 0 ? hireDateDisplayValue : null),
      retentionPeriod:
        toColumnDisplayValue(
          retentionPeriodColumn?.text,
          retentionPeriodColumn?.value,
        ) || null,
      tags: toColumnDisplayValue(tagsColumn?.text, tagsColumn?.value) || null,
      batteryProgress: parsedBatteryProgress,
      batteryRawValue: batteryColumn?.value ?? null,
      createdAt:
        createdAtFromDateColumn ?? createdAtFromColumn ?? item.updated_at ?? null,
      updatedAt: item.updated_at ?? null,
      contactDetails,
      resumeFiles: parseFilesColumnValue(resumeFilesColumn?.value),
    };
  };

  const rules: string[] = [];
  const shouldBuildRules = !cursorArg;
  if (shouldBuildRules) {
    try {
      const columnIds = await resolveBoardColumnIds(mondayBoard.boardId);
      resolvedColumnIds = columnIds;
      const dateColumnId = columnIds.dateColumnId ?? "date1__1";
      if (
        shouldFilterByDateRange &&
        isIsoDateOnly(dateFromArg) &&
        isIsoDateOnly(dateToArg) &&
        /^[a-zA-Z0-9_]+$/.test(dateColumnId)
      ) {
        rules.push(`{
          column_id: "${dateColumnId}"
          compare_value: ["${dateFromArg}", "${dateToArg}"]
          operator: between
        }`);
        appliedFilters.date = true;
      }

      if (
        statusArg.length > 0 &&
        columnIds.statusColumnId &&
        /^[a-zA-Z0-9_]+$/.test(columnIds.statusColumnId)
      ) {
        const escapedStatus = JSON.stringify(statusArg);
        rules.push(`{
          column_id: "${columnIds.statusColumnId}"
          compare_value: [${escapedStatus}]
          operator: any_of
        }`);
        appliedFilters.status = true;
      }

      // NOTE: Monday people-column query_params matching can return false-empty
      // result sets for valid owner ids in this board setup. Keep owner filtering
      // in our route-level matcher for now to preserve expected UX.
      // We intentionally do NOT push owner rules to Monday here.
      void ownerArg;
      void columnIds.peopleColumnId;
    } catch (error) {
      console.warn("[MondayRecords] Failed to resolve board columns for rules", {
        boardId: mondayBoard.boardId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (!resolvedColumnIds) {
    try {
      resolvedColumnIds = await resolveBoardColumnIds(mondayBoard.boardId);
    } catch {
      resolvedColumnIds = null;
    }
  }

  let firstItems: BoardItem[] = [];
  let nextCursor: string | null = null;

  const isSearchFirstPage = searchArg.length >= 2 && !cursorArg;
  if (isSearchFirstPage) {
    const emailColumnId = resolvedColumnIds?.emailColumnId ?? "email__1";
    const safeEmailColumnId = /^[a-zA-Z0-9_]+$/.test(emailColumnId)
      ? emailColumnId
      : "email__1";
    const escapedSearch = JSON.stringify(searchArg);

    const nameRules = [
      ...rules,
      `{ column_id: "name", compare_value: [${escapedSearch}], operator: contains_text }`,
    ];
    const emailRules = [
      ...rules,
      `{ column_id: "${safeEmailColumnId}", compare_value: [${escapedSearch}], operator: contains_text }`,
    ];

    const nameQuery = buildListBoardItemsQuery({ includeCursor: false, rules: nameRules });
    const emailQuery = buildListBoardItemsQuery({ includeCursor: false, rules: emailRules });

    const [nameData, emailData] = await Promise.all([
      callMondayGraphQL<BoardQueryData>(nameQuery, {
        boardId: mondayBoard.boardId,
        limit,
      }),
      callMondayGraphQL<BoardQueryData>(emailQuery, {
        boardId: mondayBoard.boardId,
        limit,
      }),
    ]);

    boardName = nameData.boards?.[0]?.name ?? emailData.boards?.[0]?.name ?? null;
    const nameItems = nameData.boards?.[0]?.items_page?.items ?? [];
    const emailItems = emailData.boards?.[0]?.items_page?.items ?? [];

    const seenIds = new Set<string>();
    for (const item of [...nameItems, ...emailItems]) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        firstItems.push(item);
      }
    }
    nextCursor = nameData.boards?.[0]?.items_page?.cursor ?? null;
  } else {
    const query = buildListBoardItemsQuery({
      includeCursor: !!cursorArg,
      rules: cursorArg ? [] : rules,
    });
    const data = await callMondayGraphQL<BoardQueryData>(query, {
      boardId: mondayBoard.boardId,
      limit,
      ...(cursorArg ? { cursor: cursorArg } : {}),
    });

    boardName = data.boards?.[0]?.name ?? null;
    nextCursor = data.boards?.[0]?.items_page?.cursor ?? null;
    firstItems = data.boards?.[0]?.items_page?.items ?? [];
  }

  const records = firstItems.map(toRecord);
  console.info("[MondayClient][BatteryDebug][ContactBoardRecords]", {
    boardId: mondayBoard.boardId,
    fetchedItemCount: firstItems.length,
    entries: batteryDebugEntries,
  });
  const ownerIdList = records.flatMap((record) => record.ownerIds);
  const ownerById = await resolveMondayUsersByIds(ownerIdList);
  const recordsWithOwners = records.map((record) => ({
    ...record,
    ownerProfiles: record.ownerIds
      .map((id) => ownerById.get(id))
      .filter((owner): owner is { id: string; name: string | null; email: string | null; photoThumb: string | null } =>
        Boolean(owner),
      ),
  }));
  const approvalSteps: MondayApprovalStep[] = APPROVAL_STEP_COLUMN_IDS.map(
    (id, index) => ({
      id,
      title:
        resolvedColumnIds?.columnTitleById[id]?.trim() ||
        `Approval Step ${index + 1}`,
    }),
  );

  return {
    records: recordsWithOwners,
    nextCursor,
    boardName,
    appliedFilters,
    approvalSteps,
  };
};

export const listMondayTouchBoardRecords = async (args?: {
  cursor?: string;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  owner?: string;
}) => {
  const startedAt = Date.now();
  const touchBoard = getMondayTouchBoardEnv();
  if (!touchBoard.ok) {
    return {
      records: [] as MondayRecord[],
      nextCursor: null as string | null,
      boardName: null as string | null,
      appliedFilters: {
        date: false,
        owner: false,
      },
    };
  }

  const dateFromArg = args?.dateFrom;
  const dateToArg = args?.dateTo;
  const cursorArg = args?.cursor ?? null;
  const ownerArg = args?.owner?.trim() ?? "";
  const shouldFilterByDateRange =
    typeof dateFromArg === "string" &&
    dateFromArg.length > 0 &&
    typeof dateToArg === "string" &&
    dateToArg.length > 0;
  const isIsoDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

  interface ColumnMeta {
    id?: string | null;
    title?: string | null;
    type?: string | null;
  }
  interface ColumnsData {
    boards?: Array<{ columns?: ColumnMeta[] }>;
  }

  const columnsData = await callMondayGraphQL<ColumnsData>(
    `
      query ResolveTouchBoardColumns($boardId: ID!) {
        boards(ids: [$boardId]) {
          columns {
            id
            title
            type
          }
        }
      }
    `,
    { boardId: touchBoard.boardId },
  );
  const columns = columnsData.boards?.[0]?.columns ?? [];
  const findByTitle = (needle: string) =>
    columns.find((column) =>
      (column.title ?? "").toLowerCase().includes(needle.toLowerCase()),
    );
  const findByType = (type: string) =>
    columns.find((column) => (column.type ?? "").toLowerCase() === type);

  const touchDateColumnId =
    findByTitle("touch date")?.id ??
    findByTitle("touch_date")?.id ??
    findByType("date")?.id ??
    null;
  const ownerIdColumnId =
    findByTitle("owner_id")?.id ??
    findByTitle("owner id")?.id ??
    "text_mm0wb7qt";
  const ownerPeopleColumnId =
    findByTitle("touched by")?.id ??
    findByTitle("owner")?.id ??
    findByType("people")?.id ??
    null;
  const emailColumnId = findByTitle("email")?.id ?? findByType("email")?.id ?? null;
  const relationColumnId = "board_relation_mm0wbvrb";
  const sourceColumnId = findByTitle("source")?.id ?? null;
  console.info("[MondayTouchClient] resolved columns", {
    boardId: touchBoard.boardId,
    touchDateColumnId,
    ownerIdColumnId,
    ownerPeopleColumnId,
    emailColumnId,
    relationColumnId,
    sourceColumnId,
    hasOwnerArg: ownerArg.length > 0,
    ownerArg,
    dateFromArg,
    dateToArg,
  });

  const buildListTouchItemsQuery = (params: {
    includeCursor: boolean;
    rules: string[];
  }) => `
    query ListTouchBoardItems($boardId: ID!, $limit: Int!${
      params.includeCursor ? ", $cursor: String" : ""
    }) {
      boards(ids: [$boardId]) {
        name
        items_page(
          limit: $limit
          ${params.includeCursor ? "cursor: $cursor" : ""}
          ${
            params.rules.length > 0
              ? `query_params: { rules: [${params.rules.join("\n")}] }`
              : ""
          }
        ) {
          cursor
          items {
            id
            name
            url
            updated_at
            column_values {
              id
              type
              text
              value
            }
          }
        }
      }
    }
  `;

  interface TouchBoardItem {
    id: string;
    name?: string;
    url?: string;
    updated_at?: string;
    column_values?: {
      id?: string;
      type?: string;
      text?: string | null;
      value?: string | null;
    }[];
  }

  interface TouchBoardQueryData {
    boards?: {
      name?: string;
      items_page?: { cursor?: string | null; items?: TouchBoardItem[] };
    }[];
  }

  const limit = Math.min(Math.max(args?.limit ?? 100, 1), 500);
  const appliedFilters = {
    date: false,
    owner: false,
  };
  const rules: string[] = [];

  if (!cursorArg) {
    if (
      shouldFilterByDateRange &&
      touchDateColumnId &&
      isIsoDateOnly(dateFromArg) &&
      isIsoDateOnly(dateToArg) &&
      /^[a-zA-Z0-9_]+$/.test(touchDateColumnId)
    ) {
      rules.push(`{
        column_id: "${touchDateColumnId}"
        compare_value: ["${dateFromArg}", "${dateToArg}"]
        operator: between
      }`);
      appliedFilters.date = true;
    }
    // NOTE: Monday query_params owner matching is inconsistent for text-based owner columns
    // (e.g. text_mm0wb7qt / owner_id). Keep owner filtering in route-level matcher.
    void ownerArg;
  }

  const fetchTouchItems = async (rulesToApply: string[]) => {
    const query = buildListTouchItemsQuery({
      includeCursor: !!cursorArg,
      rules: cursorArg ? [] : rulesToApply,
    });
    const data = await callMondayGraphQL<TouchBoardQueryData>(query, {
      boardId: touchBoard.boardId,
      limit,
      ...(cursorArg ? { cursor: cursorArg } : {}),
    });
    return {
      boardName: data.boards?.[0]?.name ?? null,
      nextCursor: data.boards?.[0]?.items_page?.cursor ?? null,
      items: data.boards?.[0]?.items_page?.items ?? [],
    };
  };

  let { boardName, nextCursor, items } = await fetchTouchItems(rules);
  if (!cursorArg && appliedFilters.date && items.length === 0) {
    console.warn("[MondayTouchClient] date pushdown returned zero rows; retrying without date rule", {
      boardId: touchBoard.boardId,
      touchDateColumnId,
      dateFromArg,
      dateToArg,
      ownerArg,
    });
    const retry = await fetchTouchItems([]);
    boardName = retry.boardName;
    nextCursor = retry.nextCursor;
    items = retry.items;
    appliedFilters.date = false;
  }
  console.info("[MondayTouchClient] monday response", {
    boardId: touchBoard.boardId,
    limit,
    cursorArg,
    itemsCount: items.length,
    hasNextCursor: !!nextCursor,
    appliedFilters,
  });

  const records = items.map((item) => {
    const values = item.column_values ?? [];
    const valueById = (id: string | null) => values.find((column) => column.id === id);

    const ownerIdRaw = valueById(ownerIdColumnId)?.text?.trim() ?? "";
    const peopleColumn = valueById(ownerPeopleColumnId);
    const ownerIdsFromPeople = (() => {
      if (!peopleColumn?.value) return [] as string[];
      try {
        const parsed = JSON.parse(peopleColumn.value) as {
          personsAndTeams?: Array<{ id?: number | string; kind?: string }>;
        };
        return (parsed.personsAndTeams ?? [])
          .filter((entry) => entry.kind === "person" && entry.id != null)
          .map((entry) => String(entry.id))
          .filter((entry) => entry.trim().length > 0);
      } catch {
        return [] as string[];
      }
    })();
    const ownerIds =
      ownerIdsFromPeople.length > 0
        ? ownerIdsFromPeople
        : ownerIdRaw.length > 0
          ? [ownerIdRaw]
          : [];
    const touchDateValue = valueById(touchDateColumnId);
    const touchDateText = touchDateValue?.text?.trim() ?? null;
    let touchDateIso: string | null = null;
    if (touchDateValue?.value) {
      try {
        const parsed = JSON.parse(touchDateValue.value) as { date?: string; time?: string };
        if (parsed.date && parsed.time) {
          touchDateIso = `${parsed.date}T${parsed.time}Z`;
        } else if (parsed.date) {
          touchDateIso = `${parsed.date}T00:00:00Z`;
        }
      } catch {
        touchDateIso = null;
      }
    }
    if (!touchDateIso && touchDateText) {
      const parsed = Date.parse(touchDateText.replace(" UTC", "Z"));
      if (!Number.isNaN(parsed)) touchDateIso = new Date(parsed).toISOString();
    }

    const emailText = valueById(emailColumnId)?.text?.trim() ?? null;
    const sourceText = sourceColumnId ? valueById(sourceColumnId)?.text?.trim() ?? null : null;
    const relationValue = valueById(relationColumnId)?.value;
    let relatedContactId: string | null = null;
    if (relationValue) {
      try {
        const parsed = JSON.parse(relationValue) as {
          linkedPulseIds?: Array<{ linkedPulseId?: number | string }>;
        };
        const linked = parsed.linkedPulseIds?.[0]?.linkedPulseId;
        if (linked != null) relatedContactId = String(linked);
      } catch {
        relatedContactId = null;
      }
    }

    const detailEntries: Array<{ label: string; value: string }> = [];
    for (const column of values) {
      const id = column.id ?? "";
      if (!id) continue;
      const display = toColumnDisplayValue(column.text, column.value);
      if (!display.trim()) continue;
      detailEntries.push({ label: id, value: display });
    }
    if (relatedContactId) {
      detailEntries.push({ label: "related_contact_id", value: relatedContactId });
    }
    if (sourceText) {
      detailEntries.push({ label: "source", value: sourceText });
    }

    return {
      id: item.id,
      name: item.name ?? "",
      url: item.url ?? null,
      groupTitle: null,
      statusText: sourceText,
      peopleText:
        peopleColumn?.text?.trim() ??
        (ownerIds.length > 0 ? ownerIds.join(", ") : null),
      ownerIds,
      ownerProfiles: [],
      email: emailText,
      phone: null,
      address: null,
      referredToContractors: null,
      hiredWithContractor: null,
      hireDate: null,
      retentionPeriod: null,
      tags: null,
      batteryProgress: null,
      batteryRawValue: null,
      createdAt: touchDateIso ?? item.updated_at ?? null,
      updatedAt: item.updated_at ?? touchDateIso ?? null,
      contactDetails: detailEntries,
      resumeFiles: [],
    } satisfies MondayRecord;
  });

  console.info("[MondayTouchClient] mapped records", {
    durationMs: Date.now() - startedAt,
    boardId: touchBoard.boardId,
    recordsCount: records.length,
    sample: records.slice(0, 5).map((record) => ({
      id: record.id,
      ownerIds: record.ownerIds,
      peopleText: record.peopleText,
      createdAt: record.createdAt,
      email: record.email,
    })),
  });

  const ownerIdList = records.flatMap((record) => record.ownerIds);
  const ownerById = await resolveMondayUsersByIds(ownerIdList);
  const recordsWithOwners = records.map((record) => ({
    ...record,
    ownerProfiles: record.ownerIds
      .map((id) => ownerById.get(id))
      .filter((owner): owner is { id: string; name: string | null; email: string | null; photoThumb: string | null } =>
        Boolean(owner),
      ),
  }));

  return {
    records: recordsWithOwners,
    nextCursor,
    boardName,
    appliedFilters,
  };
};

const extractWorkdocContent = (
  value: string | null | undefined,
  text: string | null | undefined,
) => {
  if (typeof text === "string" && text.trim().length > 0) {
    return text.trim();
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    return "";
  }

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const directCandidates = [
      parsed.content,
      parsed.text,
      parsed.plain_text,
      parsed.body,
      parsed.value,
      parsed.html,
    ];
    for (const candidate of directCandidates) {
      if (typeof candidate === "string" && candidate.trim().length > 0) {
        return candidate.trim();
      }
    }
    return JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
};

const escapeHtml = (value: string) => {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
};

const extractStringValuesDeep = (value: unknown): string[] => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => extractStringValuesDeep(entry));
  }
  if (typeof value === "object" && value !== null) {
    return Object.values(value as Record<string, unknown>).flatMap((entry) =>
      extractStringValuesDeep(entry),
    );
  }
  return [];
};

const extractLikelyImageUrls = (value: unknown): string[] => {
  const strings = extractStringValuesDeep(value);
  return strings.filter((entry) =>
    /^(https?:)?\/\/.+\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(entry),
  );
};

const extractAssetIdsDeep = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => extractAssetIdsDeep(entry));
  }
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    const directAssetId = record.assetId;
    const direct = [
      typeof directAssetId === "number"
        ? String(directAssetId)
        : typeof directAssetId === "string"
          ? directAssetId
          : null,
    ].filter((entry): entry is string => !!entry && entry.trim().length > 0);
    return [
      ...direct,
      ...Object.values(record).flatMap((entry) => extractAssetIdsDeep(entry)),
    ];
  }
  return [];
};

const parseJsonIfString = (value: unknown): unknown => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

interface ParsedWorkdocMeta {
  objectId: string | null;
  linkToFile: string | null;
}

const parseWorkdocMeta = (
  value: string | null | undefined,
): ParsedWorkdocMeta => {
  if (!value || value.trim().length === 0) {
    return { objectId: null, linkToFile: null };
  }
  try {
    const parsed = JSON.parse(value) as {
      files?: Array<{
        objectId?: number | string;
        linkToFile?: string;
        fileType?: string;
      }>;
    };
    const file = parsed.files?.find(
      (entry) => entry.fileType === "MONDAY_DOC" || entry.objectId != null,
    );
    if (!file) return { objectId: null, linkToFile: null };
    const objectId =
      typeof file.objectId === "number"
        ? String(file.objectId)
        : typeof file.objectId === "string" && file.objectId.trim().length > 0
          ? file.objectId.trim()
          : null;
    const linkToFile =
      typeof file.linkToFile === "string" && file.linkToFile.trim().length > 0
        ? file.linkToFile.trim()
        : null;
    return { objectId, linkToFile };
  } catch {
    return { objectId: null, linkToFile: null };
  }
};

interface MondayDocBlock {
  id?: string;
  type?: string | null;
  content?: string | null;
}

const renderDocBlocks = (
  blocks: MondayDocBlock[],
  assetUrlById: Record<string, string>,
): { text: string; html: string } => {
  const textParts: string[] = [];
  const htmlParts: string[] = [];
  const proxyBaseOrigin = (() => {
    const configuredAppUrl = env.NEXT_PUBLIC_APP_URL?.trim();
    if (!configuredAppUrl) return null;
    try {
      const parsed = new URL(configuredAppUrl);
      const host = parsed.hostname.toLowerCase();
      if (host === "localhost" || host === "127.0.0.1") {
        return null;
      }
      return parsed.origin;
    } catch {
      return null;
    }
  })();

  for (const block of blocks) {
    const raw = block.content ?? "";
    if (raw.trim().length === 0) continue;
    const blockType = (block.type ?? "").toLowerCase();

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }

    const parsedRecord =
      typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)
        : null;

    const parsedAssetIds = extractAssetIdsDeep(parsed);
    const directAssetUrls = parsedAssetIds
      .map((assetId) => assetUrlById[assetId])
      .filter((assetUrl): assetUrl is string => typeof assetUrl === "string")
      .map((assetUrl) => assetUrl.trim())
      .filter((assetUrl) => assetUrl.length > 0);
    const proxyUrls = parsedAssetIds.map(
      (assetId) =>
        `${proxyBaseOrigin ?? ""}/api/monday/email-templates/assets/${encodeURIComponent(assetId)}`,
    );
    const extractedImageUrls = extractLikelyImageUrls(parsed);
    const imageUrls = Array.from(
      new Set(
        (directAssetUrls.length > 0
          ? directAssetUrls
          : proxyUrls.length > 0
            ? proxyUrls
            : extractedImageUrls
        ).map((imageUrl) => imageUrl.trim()),
      ),
    ).filter((imageUrl) => imageUrl.length > 0);

    if (blockType.includes("image") && imageUrls.length > 0) {
      const alignmentValue =
        typeof parsedRecord?.alignment === "string"
          ? parsedRecord.alignment.toLowerCase()
          : "left";
      const justifyStyle =
        alignmentValue === "center"
          ? "justify-content: center;"
          : alignmentValue === "right"
            ? "justify-content: flex-end;"
            : "justify-content: flex-start;";
      const widthPercentageRaw = parsedRecord?.widthPercentage;
      const widthPercentage =
        typeof widthPercentageRaw === "string" || typeof widthPercentageRaw === "number"
          ? Number(widthPercentageRaw)
          : NaN;
      const widthStyle =
        Number.isFinite(widthPercentage) && widthPercentage > 0 && widthPercentage <= 1
          ? `width: ${(widthPercentage * 100).toFixed(2)}%; `
          : "";

      for (const imageUrl of imageUrls) {
        htmlParts.push(
          `<div style="display: flex; ${justifyStyle}"><img src="${escapeHtml(imageUrl)}" alt="Email image" style="${widthStyle}max-width: 100%; height: auto; border-radius: 8px;" /></div>`,
        );
      }
      continue;
    }

    let textChunks: string[] = [];
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "deltaFormat" in (parsed as Record<string, unknown>) &&
      Array.isArray((parsed as { deltaFormat?: unknown[] }).deltaFormat)
    ) {
      const delta = (parsed as { deltaFormat: unknown[] }).deltaFormat;
      textChunks = delta
        .map((entry) => {
          if (typeof entry !== "object" || entry === null) return "";
          const insertValue = (entry as { insert?: unknown }).insert;
          return typeof insertValue === "string" ? insertValue : "";
        })
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    } else {
      textChunks = extractStringValuesDeep(parsed).filter(
        (chunk) =>
          !/^https?:\/\//i.test(chunk) &&
          !chunk.startsWith("{") &&
          !chunk.startsWith("[") &&
          !["left", "right", "center", "ltr", "rtl"].includes(chunk.toLowerCase()),
      );
    }

    if (textChunks.length > 0) {
      const paragraph = textChunks.join(" ").trim();
      if (paragraph.length > 0) {
        textParts.push(paragraph);
        htmlParts.push(`<p>${escapeHtml(paragraph)}</p>`);
      }
    }

    for (const imageUrl of imageUrls) {
      htmlParts.push(
        `<img src="${escapeHtml(imageUrl)}" alt="Email image" style="max-width: 100%; height: auto; border-radius: 8px;" />`,
      );
    }
  }

  const text = textParts.join("\n\n");
  const html = htmlParts.join("\n");
  return { text, html };
};

const fetchDocBodyByObjectId = async (objectId: string) => {
  const query = `
    query GetDocBody($objectIds: [ID!]) {
      docs(object_ids: $objectIds, limit: 1) {
        blocks {
          id
          type
          content
        }
      }
    }
  `;

  interface DocData {
    docs?: {
      blocks?: MondayDocBlock[];
    }[];
  }

  const data = await callMondayGraphQL<DocData>(query, {
    objectIds: [objectId],
  });
  const blocks = data.docs?.[0]?.blocks ?? [];
  const assetIds = Array.from(
    new Set(
      blocks.flatMap((block) =>
        extractAssetIdsDeep(parseJsonIfString(block.content ?? "")),
      ),
    ),
  );

  let assetUrlById: Record<string, string> = {};
  if (assetIds.length > 0) {
    const assetQuery = `
      query GetAssets($assetIds: [ID!]!) {
        assets(ids: $assetIds) {
          id
          public_url
          url
        }
      }
    `;
    interface AssetsData {
      assets?: Array<{ id?: string; public_url?: string | null; url?: string | null }>;
    }
    try {
      const assetsData = await callMondayGraphQL<AssetsData>(assetQuery, { assetIds });
      assetUrlById = Object.fromEntries(
        (assetsData.assets ?? [])
          .map((asset) => {
            const id = asset.id?.trim();
            if (!id) return null;
            const url = asset.public_url ?? asset.url ?? "";
            return [id, url] as const;
          })
          .filter((entry): entry is readonly [string, string] => !!entry),
      );
    } catch {
      assetUrlById = {};
    }
  }

  return renderDocBlocks(blocks, assetUrlById);
};

export const listMondayEmailTemplates = async (args?: {
  boardId?: string;
  cursor?: string;
  limit?: number;
  workdocColumnId?: string;
  statusColumnId?: string;
  readyStatusLabel?: string;
}) => {
  const fallbackBoardId = env.MONDAY_EMAIL_TEMPLATES_BOARD_ID ?? "18401299370";
  const boardId = args?.boardId?.trim() || fallbackBoardId;
  if (!boardId) {
    throw new Error("Missing email templates board id");
  }

  const workdocColumnId = args?.workdocColumnId?.trim() || "doc_mm0wq4r";
  const statusColumnId = args?.statusColumnId?.trim() || "color_mm16fvtn";
  const readyStatusLabel = (args?.readyStatusLabel?.trim() || "Done").toLowerCase();
  const limit = Math.min(Math.max(args?.limit ?? 100, 1), 500);

  const query = `
    query ListEmailTemplates($boardId: ID!, $limit: Int!, $cursor: String) {
      boards(ids: [$boardId]) {
        name
        items_page(limit: $limit, cursor: $cursor) {
          cursor
          items {
            id
            name
            url
            updated_at
            column_values {
              id
              type
              text
              value
            }
          }
        }
      }
    }
  `;

  interface BoardItem {
    id: string;
    name?: string;
    url?: string;
    updated_at?: string;
    column_values?: {
      id?: string;
      text?: string | null;
      value?: string | null;
    }[];
  }
  interface TemplatesQueryData {
    boards?: {
      name?: string;
      items_page?: { cursor?: string | null; items?: BoardItem[] };
    }[];
  }

  const data = await callMondayGraphQL<TemplatesQueryData>(query, {
    boardId,
    limit,
    cursor: args?.cursor ?? null,
  });

  const boardName = data.boards?.[0]?.name ?? null;
  const nextCursor = data.boards?.[0]?.items_page?.cursor ?? null;
  const sourceItems = data.boards?.[0]?.items_page?.items ?? [];
  const readyItems = sourceItems.filter((item) => {
    const statusColumn = item.column_values?.find((column) => column.id === statusColumnId);
    const statusText = statusColumn?.text?.trim().toLowerCase() ?? "";
    if (statusText === readyStatusLabel) return true;
    const statusValue = parseJsonIfString(statusColumn?.value);
    if (!statusValue || typeof statusValue !== "object") return false;
    const statusRecord = statusValue as {
      label?: unknown;
      labels?: unknown;
      index?: unknown;
    };
    if (
      typeof statusRecord.label === "string" &&
      statusRecord.label.trim().toLowerCase() === readyStatusLabel
    ) {
      return true;
    }
    if (Array.isArray(statusRecord.labels)) {
      return statusRecord.labels.some(
        (entry) =>
          typeof entry === "string" &&
          entry.trim().toLowerCase() === readyStatusLabel,
      );
    }
    return false;
  });

  const templates = readyItems.map((item) => {
    const workdocMeta = parseWorkdocMeta(
      item.column_values?.find((column) => column.id === workdocColumnId)?.value,
    );
    return {
      id: item.id,
      name: item.name ?? `Template ${item.id}`,
      url: item.url ?? null,
      updatedAt: item.updated_at ?? null,
      content: "",
      renderedHtml: "",
      docLink: workdocMeta.linkToFile,
    } satisfies MondayEmailTemplate;
  });

  const hydratedTemplates = await Promise.all(
    templates.map(async (template) => {
      const item = readyItems.find(
        (entry) => entry.id === template.id,
      );
      const workdocColumn = item?.column_values?.find(
        (column) => column.id === workdocColumnId,
      );
      const workdocMeta = parseWorkdocMeta(workdocColumn?.value);
      const fallbackContent = extractWorkdocContent(workdocColumn?.value, workdocColumn?.text);

      if (!workdocMeta.objectId) {
        return {
          ...template,
          content: fallbackContent,
          renderedHtml:
            fallbackContent.trim().length > 0
              ? `<div style="white-space: pre-wrap;">${escapeHtml(fallbackContent)}</div>`
              : "",
          docLink: workdocMeta.linkToFile,
        };
      }

      try {
        const rendered = await fetchDocBodyByObjectId(workdocMeta.objectId);
        const resolvedText =
          rendered.text.trim().length > 0 ? rendered.text : fallbackContent;
        const resolvedHtml =
          rendered.html.trim().length > 0
            ? rendered.html
            : `<div style="white-space: pre-wrap;">${escapeHtml(resolvedText)}</div>`;

        return {
          ...template,
          content: resolvedText,
          renderedHtml: resolvedHtml,
          docLink: workdocMeta.linkToFile,
        };
      } catch {
        return {
          ...template,
          content: fallbackContent,
          renderedHtml:
            fallbackContent.trim().length > 0
              ? `<div style="white-space: pre-wrap;">${escapeHtml(fallbackContent)}</div>`
              : "",
          docLink: workdocMeta.linkToFile,
        };
      }
    }),
  );

  return {
    boardName,
    templates: hydratedTemplates,
    nextCursor,
    boardId,
    workdocColumnId,
  };
};

export const getMondayUserProfile = async (userId: string) => {
  const trimmedUserId = userId.trim();
  if (!trimmedUserId) {
    throw new Error("Missing userId");
  }

  const query = `
    query GetMondayUser($userIds: [ID!]) {
      users(ids: $userIds) {
        id
        email
        name
      }
    }
  `;

  interface UserData {
    users?: Array<{ id?: string; email?: string | null; name?: string | null }>;
  }

  const data = await callMondayGraphQL<UserData>(query, {
    userIds: [trimmedUserId],
  });
  const user = data.users?.[0];
  if (!user?.id) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? null,
    name: user.name ?? null,
  } satisfies MondayUserProfile;
};

const parseDropdownLabelsFromSettings = (settingsStr: string | null | undefined) => {
  if (!settingsStr || settingsStr.trim().length === 0) return [];
  try {
    const parsed = JSON.parse(settingsStr) as Record<string, unknown>;
    const labels = new Set<string>();
    const pushLabel = (value: unknown) => {
      if (typeof value === "string") {
        const normalized = value.trim();
        if (normalized.length > 0) {
          labels.add(normalized);
        }
        return;
      }
      if (typeof value === "object" && value !== null) {
        const record = value as Record<string, unknown>;
        for (const key of ["name", "label", "title", "value"]) {
          if (typeof record[key] === "string") {
            const normalized = (record[key] as string).trim();
            if (normalized.length > 0) {
              labels.add(normalized);
            }
          }
        }
      }
    };

    const labelsNode = parsed.labels;
    if (typeof labelsNode === "object" && labelsNode !== null) {
      for (const value of Object.values(labelsNode as Record<string, unknown>)) {
        pushLabel(value);
      }
    }

    const labelsPositions = parsed.labels_positions_v2;
    if (Array.isArray(labelsPositions)) {
      for (const entry of labelsPositions) {
        pushLabel(entry);
      }
    }

    const labelsColors = parsed.labels_colors;
    if (typeof labelsColors === "object" && labelsColors !== null) {
      for (const value of Object.values(labelsColors as Record<string, unknown>)) {
        pushLabel(value);
      }
    }

    return Array.from(labels).sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
};

export const getMondayRecordEditOptions = async () => {
  const mondayBoard = getMondayBoardEnv();
  if (!mondayBoard.ok) {
    return {
      referredToContractors: [],
      hiredWithContractor: [],
      retentionPeriod: [],
      tags: [],
    } satisfies MondayRecordEditOptions;
  }

  interface BoardColumnsData {
    boards?: Array<{
      columns?: Array<{
        id?: string | null;
        settings_str?: string | null;
      }>;
    }>;
  }

  const query = `
    query GetRecordEditColumns($boardId: ID!) {
      boards(ids: [$boardId]) {
        columns {
          id
          settings_str
        }
      }
    }
  `;

  const data = await callMondayGraphQL<BoardColumnsData>(query, {
    boardId: mondayBoard.boardId,
  });
  const columns = data.boards?.[0]?.columns ?? [];
  const getLabelsForColumn = (columnId: string) => {
    const column = columns.find((entry) => entry.id === columnId);
    return parseDropdownLabelsFromSettings(column?.settings_str);
  };

  return {
    referredToContractors: getLabelsForColumn(RETENTION_REFERRED_COLUMN_ID),
    hiredWithContractor: getLabelsForColumn(RETENTION_HIRED_WITH_COLUMN_ID),
    retentionPeriod: getLabelsForColumn(RETENTION_PERIOD_COLUMN_ID),
    tags: getLabelsForColumn(TAGS_COLUMN_ID),
  } satisfies MondayRecordEditOptions;
};

interface UpdateMondayRecordFieldsArgs {
  itemId: string;
  referredToContractors?: string[] | string | null;
  hiredWithContractor?: string | null;
  hireDate?: string | null;
  retentionPeriod?: string | null;
  tags?: string[] | null;
  status?: string | null;
  ownerId?: string | null;
}

const normalizeDateOnlyValue = (value: string | null | undefined) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const dateOnly = trimmed.includes("T") ? trimmed.slice(0, 10) : trimmed;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return null;
  return dateOnly;
};

export const updateMondayRecordFields = async (args: UpdateMondayRecordFieldsArgs) => {
  const mondayBoard = getMondayBoardEnv();
  if (!mondayBoard.ok) {
    throw new Error("Missing Monday configuration");
  }

  const itemId = args.itemId.trim();
  if (!itemId) {
    throw new Error("Missing itemId");
  }

  const columnValues: Record<string, unknown> = {};
  const boardColumnIds = await resolveBoardColumnIds(mondayBoard.boardId);

  if ("referredToContractors" in args) {
    const valuesRaw = Array.isArray(args.referredToContractors)
      ? args.referredToContractors
      : splitCsvValues(args.referredToContractors);
    const labels = valuesRaw
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    columnValues[RETENTION_REFERRED_COLUMN_ID] = labels.length > 0
      ? { labels }
      : null;
  }
  if ("hiredWithContractor" in args) {
    const value = args.hiredWithContractor?.trim() ?? "";
    columnValues[RETENTION_HIRED_WITH_COLUMN_ID] = value
      ? { labels: [value] }
      : null;
  }
  if ("hireDate" in args) {
    const dateOnly = normalizeDateOnlyValue(args.hireDate);
    columnValues[RETENTION_HIRE_DATE_COLUMN_ID] = dateOnly
      ? { date: dateOnly }
      : null;
  }
  if ("retentionPeriod" in args) {
    const value = args.retentionPeriod?.trim() ?? "";
    columnValues[RETENTION_PERIOD_COLUMN_ID] = value
      ? { labels: [value] }
      : null;
  }
  if ("tags" in args) {
    const labels = (args.tags ?? [])
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    columnValues[TAGS_COLUMN_ID] = labels.length > 0 ? { labels } : null;
  }
  if ("status" in args) {
    const statusColumnId = boardColumnIds.statusColumnId;
    if (!statusColumnId) {
      throw new Error("Status column not found on Monday board");
    }
    const value = args.status?.trim() ?? "";
    columnValues[statusColumnId] = value ? { label: value } : null;
  }
  if ("ownerId" in args) {
    const peopleColumnId = boardColumnIds.peopleColumnId;
    if (!peopleColumnId) {
      throw new Error("Owner people column not found on Monday board");
    }
    const ownerIdRaw = args.ownerId?.trim() ?? "";
    if (!ownerIdRaw) {
      columnValues[peopleColumnId] = null;
    } else {
      const ownerAsNumber = Number(ownerIdRaw);
      columnValues[peopleColumnId] = {
        personsAndTeams: [
          {
            id: Number.isFinite(ownerAsNumber) ? ownerAsNumber : ownerIdRaw,
            kind: "person",
          },
        ],
      };
    }
  }

  if (Object.keys(columnValues).length === 0) {
    throw new Error("No update fields provided");
  }

  const mutation = `
    mutation UpdateMondayItemColumns(
      $boardId: ID!
      $itemId: ID!
      $columnValues: JSON!
    ) {
      change_multiple_column_values(
        board_id: $boardId
        item_id: $itemId
        column_values: $columnValues
        create_labels_if_missing: true
      ) {
        id
      }
    }
  `;

  interface UpdateMutationData {
    change_multiple_column_values?: { id?: string };
  }

  await callMondayGraphQL<UpdateMutationData>(mutation, {
    boardId: mondayBoard.boardId,
    itemId,
    columnValues: JSON.stringify(columnValues),
  });
};

export const uploadMondayRecordFile = async (args: {
  itemId: string;
  file: Blob;
  filename: string;
  columnId?: string;
}) => {
  const mondayBoard = getMondayBoardEnv();
  if (!mondayBoard.ok) {
    throw new Error("Missing Monday configuration");
  }

  const itemId = args.itemId.trim();
  if (!itemId) {
    throw new Error("Missing itemId");
  }
  const filename = args.filename.trim();
  if (!filename) {
    throw new Error("Missing filename");
  }

  const columnId = args.columnId?.trim() || RESUME_FILES_COLUMN_ID;
  const mondayApi = getMondayApiEnv();
  if (!mondayApi.ok) {
    throw new Error("MONDAY_API_KEY is missing");
  }

  const mutation = `
    mutation AddFileToColumn($itemId: ID!, $columnId: String!, $file: File!) {
      add_file_to_column(item_id: $itemId, column_id: $columnId, file: $file) {
        id
      }
    }
  `;

  const formData = new FormData();
  formData.append(
    "operations",
    JSON.stringify({
      query: mutation,
      variables: {
        itemId,
        columnId,
        file: null,
      },
    }),
  );
  formData.append("map", JSON.stringify({ file: ["variables.file"] }));
  formData.append("file", args.file, filename);

  const response = await fetch(`${MONDAY_API_URL}/file`, {
    method: "POST",
    headers: {
      Authorization: mondayApi.apiKey,
    },
    body: formData,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Monday file upload failed with ${response.status}`);
  }

  const json = (await response.json()) as {
    data?: {
      add_file_to_column?: {
        id?: string;
      };
    };
    errors?: { message?: string }[];
  };
  if (Array.isArray(json.errors) && json.errors.length > 0) {
    const message =
      json.errors.map((error) => error.message).filter(Boolean).join(" | ") ||
      "Unknown Monday API error";
    throw new Error(message);
  }
  if (!json.data?.add_file_to_column?.id) {
    throw new Error("Monday file upload returned no item id");
  }

  return { id: json.data.add_file_to_column.id };
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const resolveBoardCreateColumnIds = async (boardId: string) => {
  interface BoardColumnsData {
    boards?: Array<{
      columns?: Array<{
        id?: string | null;
        title?: string | null;
        type?: string | null;
      }>;
    }>;
  }

  const query = `
    query ResolveBoardCreateColumns($boardId: ID!) {
      boards(ids: [$boardId]) {
        columns {
          id
          title
          type
        }
      }
    }
  `;

  const data = await callMondayGraphQL<BoardColumnsData>(query, { boardId });
  const columns = data.boards?.[0]?.columns ?? [];
  const normalized = columns.map((column) => ({
    id: column.id ?? "",
    type: (column.type ?? "").toLowerCase(),
    title: (column.title ?? "").toLowerCase(),
  }));

  const byType = (type: string) => normalized.find((column) => column.type === type)?.id || null;
  const byTitleIncludes = (needle: string) =>
    normalized.find((column) => column.title.includes(needle))?.id || null;

  return {
    emailColumnId: byType("email") ?? "email__1",
    peopleColumnId: byType("people"),
    addressColumnId:
      byTitleIncludes("address") ??
      byTitleIncludes("street") ??
      "text6__1",
    firstNameColumnId: byTitleIncludes("first name"),
    lastNameColumnId: byTitleIncludes("last name"),
  };
};

export const findMondayContactsByEmail = async (email: string, limit = 15) => {
  const mondayBoard = getMondayBoardEnv();
  if (!mondayBoard.ok) {
    return [] as MondayContactCandidate[];
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return [] as MondayContactCandidate[];
  }

  const columnIds = await resolveBoardCreateColumnIds(mondayBoard.boardId);
  const safeLimit = Math.min(Math.max(limit, 1), 100);

  interface BoardItem {
    id: string;
    name?: string;
    url?: string | null;
    updated_at?: string | null;
    column_values?: Array<{
      id?: string | null;
      type?: string | null;
      text?: string | null;
      value?: string | null;
    }>;
  }
  interface QueryData {
    boards?: Array<{
      items_page?: {
        items?: BoardItem[];
      };
    }>;
  }

  const query = `
    query FindContactsByEmail($boardId: ID!, $limit: Int!) {
      boards(ids: [$boardId]) {
        items_page(
          limit: $limit
          query_params: {
            rules: [{
              column_id: "${columnIds.emailColumnId}"
              compare_value: [${JSON.stringify(normalizedEmail)}]
              operator: any_of
            }]
          }
        ) {
          items {
            id
            name
            url
            updated_at
            column_values {
              id
              type
              text
              value
            }
          }
        }
      }
    }
  `;

  const data = await callMondayGraphQL<QueryData>(query, {
    boardId: mondayBoard.boardId,
    limit: safeLimit,
  });

  const rows = data.boards?.[0]?.items_page?.items ?? [];
  const mapped = rows
    .map((row) => {
      const emailValue =
        row.column_values?.find((column) => column.id === columnIds.emailColumnId)?.text ??
        null;
      const ownerValue =
        row.column_values?.find((column) => column.type === "people")?.text ?? null;
      return {
        id: row.id,
        name: row.name ?? "",
        url: row.url ?? null,
        email: emailValue,
        owner: ownerValue,
        updatedAt: row.updated_at ?? null,
      } satisfies MondayContactCandidate;
    })
    .filter((row) => normalizeEmail(row.email ?? "") === normalizedEmail);

  return mapped.slice(0, safeLimit);
};

interface CreateMondayContactArgs {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  ownerId: string;
}

export const createMondayContact = async (args: CreateMondayContactArgs) => {
  const mondayBoard = getMondayBoardEnv();
  if (!mondayBoard.ok) {
    throw new Error("Missing Monday configuration");
  }

  const firstName = args.firstName.trim();
  const lastName = args.lastName.trim();
  const email = args.email.trim();
  const address = args.address.trim();
  const ownerId = args.ownerId.trim();

  if (!firstName || !lastName || !email || !ownerId) {
    throw new Error("Missing required contact fields");
  }

  const columnIds = await resolveBoardCreateColumnIds(mondayBoard.boardId);
  const itemName = `${firstName} ${lastName}`.trim();
  const columnValues: Record<string, unknown> = {};

  if (columnIds.emailColumnId) {
    columnValues[columnIds.emailColumnId] = { email, text: email };
  }
  if (columnIds.addressColumnId && address) {
    columnValues[columnIds.addressColumnId] = address;
  }
  if (columnIds.firstNameColumnId) {
    columnValues[columnIds.firstNameColumnId] = firstName;
  }
  if (columnIds.lastNameColumnId) {
    columnValues[columnIds.lastNameColumnId] = lastName;
  }
  if (columnIds.peopleColumnId) {
    columnValues[columnIds.peopleColumnId] = {
      personsAndTeams: [{ id: Number(ownerId), kind: "person" }],
    };
  }

  const mutation = `
    mutation CreateMondayContact(
      $boardId: ID!
      $itemName: String!
      $columnValues: JSON!
    ) {
      create_item(
        board_id: $boardId
        item_name: $itemName
        column_values: $columnValues
        create_labels_if_missing: true
      ) {
        id
      }
    }
  `;

  interface MutationData {
    create_item?: { id?: string };
  }
  const result = await callMondayGraphQL<MutationData>(mutation, {
    boardId: mondayBoard.boardId,
    itemName,
    columnValues: JSON.stringify(columnValues),
  });
  const id = result.create_item?.id;
  if (!id) {
    throw new Error("Failed to create monday contact");
  }

  return { id };
};

export const listMondayRecordUpdates = async (args: {
  itemId: string;
  limit?: number;
}) => {
  const mondayBoard = getMondayBoardEnv();
  if (!mondayBoard.ok) {
    throw new Error("Missing Monday configuration");
  }

  const itemId = args.itemId.trim();
  if (!itemId) {
    throw new Error("Missing monday item id");
  }

  const limit = Math.min(Math.max(args.limit ?? 100, 1), 200);
  const typeColId = SUBITEM_TYPE_COLUMN_ID;
  const methodColId = SUBITEM_METHOD_COLUMN_ID;
  const dateColId = "date0";
  const personColId = "person";
  const query = `
    query GetMondayItemUpdates($itemIds: [ID!], $limit: Int!) {
      items(ids: $itemIds) {
        id
        name
        updates(limit: $limit) {
          id
          body
          created_at
          updated_at
          creator {
            id
            name
          }
        }
        subitems {
          id
          name
          created_at
          column_values(ids: ["${typeColId}", "${methodColId}", "${dateColId}", "${personColId}"]) {
            id
            text
            value
          }
          updates(limit: $limit) {
            id
            body
            created_at
            updated_at
            creator {
              id
              name
            }
          }
        }
      }
    }
  `;

  interface MondayItemUpdatesData {
    items?: Array<{
      id?: string | null;
      name?: string | null;
      updates?: Array<{
        id?: string | null;
        body?: string | null;
        created_at?: string | null;
        updated_at?: string | null;
        creator?: {
          id?: string | null;
          name?: string | null;
        } | null;
      }>;
      subitems?: Array<{
        id?: string | null;
        name?: string | null;
        created_at?: string | null;
        column_values?: Array<{
          id?: string | null;
          text?: string | null;
          value?: string | null;
        }>;
        updates?: Array<{
          id?: string | null;
          body?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          creator?: {
            id?: string | null;
            name?: string | null;
          } | null;
        }>;
      }>;
    }>;
  }

  const normalizeForSubitemTypeMatch = (value: string) => {
    return value.trim().toLowerCase().replaceAll(/\s+/g, " ");
  };

  const deriveUpdateTypeFromSubitemName = (
    subitemName: string | null | undefined,
  ): MondayUpdateType => {
    const normalized = normalizeForSubitemTypeMatch(subitemName ?? "");
    if (normalized.includes("resume referral")) return "resume_referral";
    if (normalized.includes("question")) return "questionnaire";
    if (normalized.includes("welcome")) return "welcome_email";
    if (
      normalized.includes("follow-up") ||
      normalized.includes("follow up") ||
      normalized.includes("followup")
    ) {
      return "followup";
    }
    if (normalized.includes("resume")) return "resume";
    return "general";
  };

  const toSortableTime = (value: string | null | undefined) => {
    if (!value) return 0;
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return 0;
    return parsed;
  };

  const data = await callMondayGraphQL<MondayItemUpdatesData>(query, {
    itemIds: [itemId],
    limit,
  });

  const item = data.items?.[0];
  const parentUpdates: MondayRecordUpdate[] = [];
  for (const update of item?.updates ?? []) {
    const updateId = update.id?.trim() ?? "";
    if (!updateId) continue;
    parentUpdates.push({
      id: updateId,
      body: update.body ?? "",
      updateType: "general",
      source: "item",
      subitemId: null,
      subitemName: null,
      createdAt: update.created_at ?? null,
      updatedAt: update.updated_at ?? null,
      creatorId: update.creator?.id ?? null,
      creatorName: update.creator?.name ?? null,
    });
  }

  const deriveUpdateTypeFromColumnValue = (
    columnText: string | null | undefined,
  ): MondayUpdateType | null => {
    const normalized = (columnText ?? "").trim().toLowerCase();
    if (!normalized) return null;
    for (const [type, label] of Object.entries(SUBITEM_TYPE_LABEL_BY_UPDATE_TYPE)) {
      if (normalized === label.toLowerCase()) return type as MondayUpdateType;
    }
    return null;
  };

  const subitemUpdates: MondayRecordUpdate[] = [];
  interface SubitemCreatorProfile {
    id: string;
    name: string | null;
    photoThumb: string | null;
  }
  interface SubitemEntry {
    id: string;
    name: string;
    typeLabel: string | null;
    updateType: MondayUpdateType;
    methodOfCommunication: string | null;
    createdAt: string | null;
    creatorProfile: SubitemCreatorProfile | null;
    updates: {
      id: string;
      body: string;
      createdAt: string | null;
      updatedAt: string | null;
      creatorId: string | null;
      creatorName: string | null;
    }[];
  }

  // First pass: collect person IDs from all subitems
  const personIdsBySubitemId = new Map<string, string[]>();
  for (const subitem of item?.subitems ?? []) {
    const sid = subitem.id?.trim() ?? "";
    if (!sid) continue;
    const personCol = subitem.column_values?.find((c) => c.id === personColId);
    const personIds: string[] = [];
    if (personCol?.value) {
      try {
        const parsed = JSON.parse(personCol.value) as {
          personsAndTeams?: Array<{ id?: number | string; kind?: string }>;
        };
        for (const entry of parsed.personsAndTeams ?? []) {
          if (entry.kind === "person" && entry.id != null) {
            personIds.push(String(entry.id));
          }
        }
      } catch { /* ignore parse errors */ }
    }
    personIdsBySubitemId.set(sid, personIds);
  }

  // Resolve all unique person IDs in one batch
  const allPersonIds = Array.from(
    new Set(Array.from(personIdsBySubitemId.values()).flat()),
  );
  const userProfiles = allPersonIds.length > 0
    ? await resolveMondayUsersByIds(allPersonIds)
    : new Map<string, { id: string; name: string | null; email: string | null; photoThumb: string | null }>();

  const subitems: SubitemEntry[] = [];

  for (const subitem of item?.subitems ?? []) {
    const subitemId = subitem.id?.trim() ?? "";
    const subitemName = subitem.name?.trim() ?? null;
    const typeColText = subitem.column_values?.find((c) => c.id === typeColId)?.text ?? null;
    const methodText = subitem.column_values?.find((c) => c.id === methodColId)?.text?.trim() ?? null;
    const dateCol = subitem.column_values?.find((c) => c.id === dateColId);
    let subitemCreatedAt: string | null = null;
    if (dateCol?.value) {
      try {
        const parsed = JSON.parse(dateCol.value) as { date?: string; time?: string };
        if (parsed.date && parsed.time) {
          subitemCreatedAt = `${parsed.date}T${parsed.time}Z`;
        } else if (parsed.date) {
          subitemCreatedAt = `${parsed.date}T00:00:00Z`;
        }
      } catch { /* fall through */ }
    }
    if (!subitemCreatedAt && dateCol?.text?.trim()) {
      subitemCreatedAt = dateCol.text.trim();
    }
    if (!subitemCreatedAt) {
      subitemCreatedAt = subitem.created_at ?? null;
    }
    const updateType = deriveUpdateTypeFromColumnValue(typeColText)
      ?? deriveUpdateTypeFromColumnValue(methodText)
      ?? deriveUpdateTypeFromSubitemName(subitemName);

    // Resolve creator profile from person column
    const personIds = personIdsBySubitemId.get(subitemId) ?? [];
    const firstPersonId = personIds[0];
    const profile = firstPersonId ? userProfiles.get(firstPersonId) : undefined;
    const creatorProfile: SubitemCreatorProfile | null = profile
      ? { id: profile.id, name: profile.name, photoThumb: profile.photoThumb }
      : null;

    const subitemUpdateList: SubitemEntry["updates"] = [];

    for (const update of subitem.updates ?? []) {
      const updateId = update.id?.trim() ?? "";
      if (!updateId) continue;
      const createdAt = update.created_at ?? null;
      const updatedAt = update.updated_at ?? null;

      subitemUpdates.push({
        id: updateId,
        body: update.body ?? "",
        updateType,
        source: "subitem",
        subitemId: subitemId.length > 0 ? subitemId : null,
        subitemName,
        createdAt,
        updatedAt,
        creatorId: update.creator?.id ?? null,
        creatorName: update.creator?.name ?? null,
      });

      subitemUpdateList.push({
        id: updateId,
        body: update.body ?? "",
        createdAt,
        updatedAt,
        creatorId: update.creator?.id ?? null,
        creatorName: update.creator?.name ?? null,
      });
    }

    if (subitemId) {
      subitems.push({
        id: subitemId,
        name: subitemName ?? `Subitem ${subitemId}`,
        typeLabel: typeColText ?? methodText,
        updateType,
        methodOfCommunication: methodText,
        createdAt: subitemCreatedAt,
        creatorProfile,
        updates: subitemUpdateList.sort((a, b) =>
          toSortableTime(b.createdAt) - toSortableTime(a.createdAt),
        ),
      });
    }
  }

  const updates = [...parentUpdates, ...subitemUpdates]
    .sort((a, b) => {
      const aTime = Math.max(toSortableTime(a.createdAt), toSortableTime(a.updatedAt));
      const bTime = Math.max(toSortableTime(b.createdAt), toSortableTime(b.updatedAt));
      return bTime - aTime;
    })
    .slice(0, limit);

  subitems.sort((a, b) => toSortableTime(b.createdAt) - toSortableTime(a.createdAt));

  return {
    itemId: item?.id ?? itemId,
    itemName: item?.name ?? null,
    updates,
    subitems,
  };
};

// ---------------------------------------------------------------------------
// Fetch all column values for an item
// ---------------------------------------------------------------------------

export const fetchMondayItemColumns = async (args: { itemId: string }) => {
  const itemId = args.itemId.trim();
  if (!itemId) throw new Error("Missing item id");

  interface ItemData {
    items?: Array<{
      id?: string | null;
      name?: string | null;
      board?: { id?: string | null } | null;
      column_values?: Array<{
        id?: string | null;
        type?: string | null;
        text?: string | null;
        value?: string | null;
      }>;
    }>;
  }
  const data = await callMondayGraphQL<ItemData>(
    `query GetItemColumns($itemIds: [ID!]) {
      items(ids: $itemIds) {
        id
        name
        board { id }
        column_values {
          id
          type
          text
          value
        }
      }
    }`,
    { itemIds: [itemId] },
  );

  const item = data.items?.[0];
  const boardId = item?.board?.id;

  let columnTitles = new Map<string, string>();
  if (boardId) {
    interface BoardData {
      boards?: Array<{
        columns?: Array<{ id?: string | null; title?: string | null }>;
      }>;
    }
    const boardData = await callMondayGraphQL<BoardData>(
      `query GetBoardColumns($boardId: ID!) {
        boards(ids: [$boardId]) {
          columns { id title }
        }
      }`,
      { boardId },
    );
    columnTitles = new Map(
      (boardData.boards?.[0]?.columns ?? [])
        .filter((c) => c.id && c.title)
        .map((c) => [c.id!, c.title!]),
    );
  }

  const columns = (item?.column_values ?? [])
    .filter((col) => col.id)
    .map((col) => ({
      id: col.id!,
      title: columnTitles.get(col.id!) ?? col.id!,
      type: col.type ?? "unknown",
      text: col.text?.trim() || null,
      value: col.value ?? null,
    }));

  return {
    itemId: item?.id ?? itemId,
    itemName: item?.name ?? null,
    columns,
  };
};

export const resolveMondayContactOwnerId = async (args: { itemId: string }) => {
  const payload = await fetchMondayItemColumns({ itemId: args.itemId });
  const peopleColumn = payload.columns.find(
    (column) => column.type.toLowerCase() === "people",
  );
  if (!peopleColumn?.value) return null;
  try {
    const parsed = JSON.parse(peopleColumn.value) as {
      personsAndTeams?: Array<{ id?: number | string; kind?: string }>;
    };
    const firstOwnerId = (parsed.personsAndTeams ?? [])
      .find((entry) => entry.kind === "person" && entry.id != null)
      ?.id;
    if (firstOwnerId == null) return null;
    const normalized = String(firstOwnerId).trim();
    return normalized.length > 0 ? normalized : null;
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Delete a subitem
// ---------------------------------------------------------------------------

export const deleteMondaySubitem = async (args: { subitemId: string }) => {
  const subitemId = args.subitemId.trim();
  if (!subitemId) throw new Error("Missing subitem id");

  interface DeleteData {
    delete_item?: { id?: string | number | null } | null;
  }
  const data = await callMondayGraphQL<DeleteData>(
    `mutation DeleteSubitem($itemId: ID!) { delete_item(item_id: $itemId) { id } }`,
    { itemId: subitemId },
  );
  return { deletedId: String(data.delete_item?.id ?? subitemId) };
};

// ---------------------------------------------------------------------------
// Update date0 column on a subitem
// ---------------------------------------------------------------------------

export const updateMondaySubitemDate = async (args: {
  subitemId: string;
  date: string;
}) => {
  const subitemId = args.subitemId.trim();
  const date = args.date.trim();
  if (!subitemId) throw new Error("Missing subitem id");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Date must be in YYYY-MM-DD format");
  }

  interface UpdateData {
    change_column_value?: { id?: string | number | null } | null;
  }
  const data = await callMondayGraphQL<UpdateData>(
    `mutation UpdateSubitemDate($itemId: ID!, $columnId: String!, $value: JSON!) {
      change_column_value(item_id: $itemId, column_id: $columnId, value: $value) { id }
    }`,
    {
      itemId: subitemId,
      columnId: "date0",
      value: JSON.stringify({ date }),
    },
  );
  return { updatedId: String(data.change_column_value?.id ?? subitemId), date };
};

export const upsertMondayHireEventSubitem = async (args: {
  contactItemId: string;
  contactName?: string | null;
  ownerId: string;
  hireDate: string;
  source?: string;
  segments: MondayHireEventSegments;
}): Promise<{ id: string | null; upserted: "created" | "skipped" }> => {
  const mondayBoard = getMondayBoardEnv();
  if (!mondayBoard.ok) {
    throw new Error("Missing Monday configuration");
  }
  const contactItemId = args.contactItemId.trim();
  if (!contactItemId) throw new Error("Missing contactItemId");
  const ownerId = args.ownerId.trim();
  if (!ownerId) throw new Error("Missing ownerId");
  const hireDate = normalizeDateOnlyValue(args.hireDate);
  if (!hireDate) {
    throw new Error("hireDate must be in YYYY-MM-DD format");
  }

  const token = buildMondayHireEventToken({
    contactItemId,
    ownerId,
    hireDate,
    source: args.source?.trim() || "record_patch",
    segments: args.segments,
  });
  const subitemName = `Hire Event - ${hireDate} ${token}`;
  const fallbackContactName = args.contactName?.trim() || contactItemId;
  const subitemLabel = `${fallbackContactName} · Hire Event`;

  interface SubitemColumnValue {
    id?: string | null;
    text?: string | null;
    value?: string | null;
  }
  interface ExistingSubitem {
    id?: string | null;
    name?: string | null;
    column_values?: SubitemColumnValue[];
  }
  interface ExistingData {
    items?: Array<{
      id?: string | null;
      subitems?: ExistingSubitem[];
    }>;
  }
  const existingData = await callMondayGraphQL<ExistingData>(
    `
      query GetHireEventSubitems($itemIds: [ID!]) {
        items(ids: $itemIds) {
          id
          subitems {
            id
            name
            column_values(ids: ["${SUBITEM_TYPE_COLUMN_ID}", "${SUBITEM_DATE_COLUMN_ID}", "${SUBITEM_PERSON_COLUMN_ID}"]) {
              id
              text
              value
            }
          }
        }
      }
    `,
    { itemIds: [contactItemId] },
  );

  const parsePeopleIds = (value: string | null | undefined) => {
    if (!value) return [] as string[];
    try {
      const parsed = JSON.parse(value) as {
        personsAndTeams?: Array<{ id?: number | string; kind?: string }>;
      };
      return (parsed.personsAndTeams ?? [])
        .filter((entry) => entry.kind === "person" && entry.id != null)
        .map((entry) => String(entry.id).trim())
        .filter((entry) => entry.length > 0);
    } catch {
      return [] as string[];
    }
  };
  const parseDateOnly = (value: string | null | undefined, text: string | null | undefined) => {
    if (value) {
      try {
        const parsed = JSON.parse(value) as { date?: string; time?: string };
        if (parsed.date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) return parsed.date;
      } catch {
        // ignore parse errors
      }
    }
    const trimmedText = text?.trim() ?? "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedText)) return trimmedText;
    return null;
  };

  const existingSubitems = existingData.items?.[0]?.subitems ?? [];
  const existing = existingSubitems.find((subitem) => {
    const parsedFromName = parseMondayHireEventToken(subitem.name);
    if (
      parsedFromName &&
      parsedFromName.contactItemId === contactItemId &&
      parsedFromName.ownerId === ownerId &&
      parsedFromName.hireDate === hireDate
    ) {
      return true;
    }
    const columns = subitem.column_values ?? [];
    const byId = (id: string) => columns.find((column) => column.id === id);
    const typeText = byId(SUBITEM_TYPE_COLUMN_ID)?.text?.trim().toLowerCase() ?? "";
    const dateOnly = parseDateOnly(
      byId(SUBITEM_DATE_COLUMN_ID)?.value,
      byId(SUBITEM_DATE_COLUMN_ID)?.text,
    );
    const ownerIds = parsePeopleIds(byId(SUBITEM_PERSON_COLUMN_ID)?.value);
    return (
      typeText === MONDAY_HIRE_EVENT_TYPE_LABEL.toLowerCase() &&
      dateOnly === hireDate &&
      ownerIds.includes(ownerId)
    );
  });
  if (existing?.id?.trim()) {
    return { id: existing.id.trim(), upserted: "skipped" };
  }

  const columnValues: Record<string, unknown> = {
    [SUBITEM_TYPE_COLUMN_ID]: { label: MONDAY_HIRE_EVENT_TYPE_LABEL },
    [SUBITEM_DATE_COLUMN_ID]: { date: hireDate },
  };
  if (/^\d+$/.test(ownerId)) {
    columnValues[SUBITEM_PERSON_COLUMN_ID] = {
      personsAndTeams: [{ id: Number(ownerId), kind: "person" }],
    };
  }

  interface CreateSubitemData {
    create_subitem?: { id?: string | null } | null;
  }
  const createdSubitemData = await callMondayGraphQL<CreateSubitemData>(
    `
      mutation CreateHireEventSubitem($parentItemId: ID!, $itemName: String!, $columnValues: JSON!) {
        create_subitem(
          parent_item_id: $parentItemId
          item_name: $itemName
          column_values: $columnValues
          create_labels_if_missing: true
        ) { id }
      }
    `,
    {
      parentItemId: contactItemId,
      itemName: subitemName,
      columnValues: JSON.stringify(columnValues),
    },
  );
  const subitemId = createdSubitemData.create_subitem?.id?.trim() ?? null;
  if (!subitemId) {
    throw new Error("Failed to create hire event subitem");
  }

  interface CreateUpdateData {
    create_update?: { id?: string | null } | null;
  }
  await callMondayGraphQL<CreateUpdateData>(
    `
      mutation CreateHireEventSubitemUpdate($itemId: ID!, $body: String!) {
        create_update(item_id: $itemId, body: $body) { id }
      }
    `,
    {
      itemId: subitemId,
      body: [
        `<p><strong>Hire event captured</strong> (${hireDate})</p>`,
        `<p>Source: ${args.source?.trim() || "record_patch"}</p>`,
        `<p>Contact: ${subitemLabel}</p>`,
      ].join(""),
    },
  );
  return { id: subitemId, upserted: "created" };
};

// ---------------------------------------------------------------------------
// Touch board column cache & helper
// ---------------------------------------------------------------------------

const touchBoardColumnCache = new Map<
  string,
  {
    expiresAt: number;
    touchDateColumnId: string | null;
    ownerIdColumnId: string;
    ownerPeopleColumnId: string | null;
    sourceColumnId: string | null;
    relationColumnId: string;
  }
>();

const TOUCH_RELATION_COLUMN_ID = "board_relation_mm0wbvrb";

const resolveTouchBoardColumns = async (boardId: string) => {
  const cached = touchBoardColumnCache.get(boardId);
  if (cached && cached.expiresAt > Date.now()) return cached;

  interface ColumnMeta {
    id?: string | null;
    title?: string | null;
    type?: string | null;
  }
  interface ColumnsData {
    boards?: Array<{ columns?: ColumnMeta[] }>;
  }
  const data = await callMondayGraphQL<ColumnsData>(
    `
      query ResolveTouchBoardColumns($boardId: ID!) {
        boards(ids: [$boardId]) { columns { id title type } }
      }
    `,
    { boardId },
  );
  const cols = data.boards?.[0]?.columns ?? [];
  const byTitle = (needle: string) =>
    cols.find((c) => (c.title ?? "").toLowerCase().includes(needle.toLowerCase()));
  const byType = (type: string) =>
    cols.find((c) => (c.type ?? "").toLowerCase() === type);

  const resolved = {
    expiresAt: Date.now() + 5 * 60 * 1000,
    touchDateColumnId:
      byTitle("touch date")?.id ?? byTitle("touch_date")?.id ?? byType("date")?.id ?? null,
    ownerIdColumnId: byTitle("owner_id")?.id ?? byTitle("owner id")?.id ?? "text_mm0wb7qt",
    ownerPeopleColumnId:
      byTitle("touched by")?.id ?? byTitle("owner")?.id ?? byType("people")?.id ?? null,
    sourceColumnId: byTitle("source")?.id ?? null,
    relationColumnId: TOUCH_RELATION_COLUMN_ID,
  };
  touchBoardColumnCache.set(boardId, resolved);
  return resolved;
};

// ---------------------------------------------------------------------------
// upsertMondayTouchRecord — one row per (contact, employee, month)
// ---------------------------------------------------------------------------

export const upsertMondayTouchRecord = async (args: {
  contactItemId: string;
  contactName: string;
  ownerId: string;
  /** "YYYY-MM" — defaults to current calendar month */
  monthKey?: string;
  source?: string;
}): Promise<{ id: string | null; upserted: "created" | "updated" | "skipped" }> => {
  const touchBoard = getMondayTouchBoardEnv();
  if (!touchBoard.ok) {
    throw new Error("Missing Monday touch board configuration (MONDAY_CONTACT_TOUCHED_BOARD_ID)");
  }

  const monthKey = args.monthKey ?? new Date().toISOString().slice(0, 7);
  const touchKey = `tk:${args.contactItemId}:${args.ownerId}:${monthKey}`;
  const touchKeySuffix = ` [${touchKey}]`;

  const cols = await resolveTouchBoardColumns(touchBoard.boardId);

  // Query touch board — filter server-side by the board_relation column so we
  // only scan rows linked to this specific contact (typically 0-10 rows).
  interface TouchItem {
    id: string;
    name?: string | null;
  }
  interface TouchQueryData {
    boards?: Array<{
      items_page?: { items?: TouchItem[] };
    }>;
  }

  // compare_value must be inlined — Monday's GraphQL schema types it as
  // `CompareValue` (not String), so passing it as a variable causes a type error.
  const safeRelationId = cols.relationColumnId.replace(/[^a-zA-Z0-9_]/g, "");
  const safeContactId = args.contactItemId.replace(/[^0-9]/g, "");
  const queryData = await callMondayGraphQL<TouchQueryData>(
    `
      query FindTouchRowsByContact($boardId: ID!, $limit: Int!) {
        boards(ids: [$boardId]) {
          items_page(
            limit: $limit
            query_params: {
              rules: [{
                column_id: "${safeRelationId}"
                compare_value: ["${safeContactId}"]
                operator: any_of
              }]
            }
          ) {
            items { id name }
          }
        }
      }
    `,
    { boardId: touchBoard.boardId, limit: 50 },
  );

  const existingItems = queryData.boards?.[0]?.items_page?.items ?? [];
  const existingRow = existingItems.find((item) =>
    (item.name ?? "").includes(`[${touchKey}]`),
  );

  const today = new Date().toISOString().slice(0, 10);

  if (existingRow) {
    // Row already exists — just bump the touch date.
    if (cols.touchDateColumnId) {
      interface UpdateDateData {
        change_simple_column_value?: { id?: string | null } | null;
      }
      await callMondayGraphQL<UpdateDateData>(
        `
          mutation UpdateTouchDate($boardId: ID!, $itemId: ID!, $columnId: String!, $value: String!) {
            change_simple_column_value(
              board_id: $boardId
              item_id: $itemId
              column_id: $columnId
              value: $value
            ) { id }
          }
        `,
        {
          boardId: touchBoard.boardId,
          itemId: existingRow.id,
          columnId: cols.touchDateColumnId,
          value: JSON.stringify({ date: today }),
        },
      );
    }
    return { id: existingRow.id, upserted: "updated" };
  }

  // No existing row — create a new one.
  const itemName = `${args.contactName}${touchKeySuffix}`;
  const columnValues: Record<string, unknown> = {};

  if (cols.touchDateColumnId) {
    columnValues[cols.touchDateColumnId] = { date: today };
  }
  if (cols.ownerPeopleColumnId && /^\d+$/.test(args.ownerId)) {
    columnValues[cols.ownerPeopleColumnId] = {
      personsAndTeams: [{ id: Number(args.ownerId), kind: "person" }],
    };
  }
  columnValues[cols.ownerIdColumnId] = args.ownerId;
  columnValues[cols.relationColumnId] = { item_ids: [Number(args.contactItemId)] };
  if (cols.sourceColumnId && args.source) {
    columnValues[cols.sourceColumnId] = args.source;
  }

  interface CreateData {
    create_item?: { id?: string | null } | null;
  }
  const result = await callMondayGraphQL<CreateData>(
    `
      mutation CreateTouchRecord($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
        create_item(
          board_id: $boardId
          item_name: $itemName
          column_values: $columnValues
          create_labels_if_missing: true
        ) { id }
      }
    `,
    {
      boardId: touchBoard.boardId,
      itemName,
      columnValues: JSON.stringify(columnValues),
    },
  );

  return { id: result.create_item?.id?.trim() ?? null, upserted: "created" };
};

export const createMondayRecordUpdate = async (args: {
  itemId: string;
  body: string;
  updateType?: MondayUpdateType;
  date?: string;
  dateTime?: string;
  methodOfCommunication?: string;
  subitemNameOverride?: string;
}) => {
  const mondayBoard = getMondayBoardEnv();
  if (!mondayBoard.ok) {
    throw new Error("Missing Monday configuration");
  }

  const itemId = args.itemId.trim();
  if (!itemId) {
    throw new Error("Missing monday item id");
  }
  const body = args.body.trim();
  if (!body) {
    throw new Error("Update body cannot be empty");
  }
  const requestedUpdateType = args.updateType ?? "general";
  const updateType: MondayUpdateType = isMondayUpdateType(requestedUpdateType)
    ? requestedUpdateType
    : "general";
  const markApprovalStepCompleteForUpdateType = async () => {
    if (updateType === "general") {
      return {
        stepColumnId: null as string | null,
        stepMarked: false,
        warning: null as string | null,
      };
    }
    const stepColumnId = APPROVAL_STEP_COLUMN_ID_BY_UPDATE_TYPE[updateType];
    if (!stepColumnId) {
      return {
        stepColumnId: null as string | null,
        stepMarked: false,
        warning: null as string | null,
      };
    }
    try {
      interface MarkStepData {
        change_multiple_column_values?: { id?: string } | null;
      }
      await callMondayGraphQL<MarkStepData>(
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
            ) {
              id
            }
          }
        `,
        {
          boardId: mondayBoard.boardId,
          itemId,
          columnValues: JSON.stringify({
            [stepColumnId]: { label: "Done" },
          }),
        },
      );
      return {
        stepColumnId,
        stepMarked: true,
        warning: null as string | null,
      };
    } catch (error) {
      const warning =
        error instanceof Error ? error.message : "Failed to mark onboarding step done";
      return {
        stepColumnId,
        stepMarked: false,
        warning,
      };
    }
  };

  const subitemTypeLabel = SUBITEM_TYPE_LABEL_BY_UPDATE_TYPE[updateType];
  const subitemNameOverride = args.subitemNameOverride?.trim();
  const subitemName = subitemNameOverride && subitemNameOverride.length > 0
    ? subitemNameOverride
    : updateType === "general"
      ? "General Update"
      : SUBITEM_NAME_BY_UPDATE_TYPE[updateType];
  const methodOfCommunication = args.methodOfCommunication?.trim();
  const normalizedDateTime = args.dateTime?.trim();
  const parsedDateTime = normalizedDateTime
    ? new Date(normalizedDateTime)
    : null;
  const hasValidDateTime = !!parsedDateTime && !Number.isNaN(parsedDateTime.getTime());
  const normalizedDate = args.date?.trim();
  const columnValues: Record<string, unknown> = {
    [SUBITEM_TYPE_COLUMN_ID]: { label: subitemTypeLabel },
    ...(hasValidDateTime
      ? {
          [SUBITEM_DATE_COLUMN_ID]: {
            date: parsedDateTime.toISOString().slice(0, 10),
            time: parsedDateTime.toISOString().slice(11, 19),
          },
        }
      : normalizedDate
        ? { [SUBITEM_DATE_COLUMN_ID]: { date: normalizedDate } }
        : {}),
    ...(methodOfCommunication
      ? { [SUBITEM_METHOD_COLUMN_ID]: { label: methodOfCommunication } }
      : {}),
  };

  // Always create a subitem to store the update
  interface CreateSubitemData {
    create_subitem?: { id?: string | null } | null;
  }
  const createdSubitemData = await callMondayGraphQL<CreateSubitemData>(
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
      itemName: subitemName,
      columnValues: JSON.stringify(columnValues),
    },
  );
  const targetSubitemId = createdSubitemData.create_subitem?.id?.trim() ?? "";
  if (!targetSubitemId) {
    throw new Error("Failed to create subitem for update");
  }

  // Post the body as an update on the subitem
  interface CreateUpdateData {
    create_update?: { id?: string | null; body?: string | null } | null;
  }
  const data = await callMondayGraphQL<CreateUpdateData>(
    `
      mutation CreateMondayItemUpdate($itemId: ID!, $body: String!) {
        create_update(item_id: $itemId, body: $body) { id body }
      }
    `,
    { itemId: targetSubitemId, body },
  );
  const updateId = data.create_update?.id?.trim() ?? "";
  if (!updateId) {
    throw new Error("Monday did not return a new update id");
  }

  const approvalStepResult = await markApprovalStepCompleteForUpdateType();

  return {
    id: updateId,
    body: data.create_update?.body ?? body,
    updateType,
    source: "subitem" as const,
    targetItemId: targetSubitemId,
    subitemName,
    approvalStepColumnId: approvalStepResult.stepColumnId,
    approvalStepMarked: approvalStepResult.stepMarked,
    warning: approvalStepResult.warning,
  };
};

// ---------------------------------------------------------------------------
// Helpdesk
// ---------------------------------------------------------------------------

const HELPDESK_COL = {
  priority: "color_mm2yp484",
  category: "color_mm2ygxja",
  description: "long_text_mm2y9acp",
  linkedContact: "text_mm2y39n9",
  person: "person",
  status: "status",
  date: "date4",
} as const;

const HELPDESK_CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  contact_issue: "Contact Issue",
  technical: "Technical",
  data_sync: "Data / Sync",
  other: "Other",
};

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

export const createHelpdeskTicket = async (args: {
  subject: string;
  description: string;
  priority: string;
  category: string;
  linkedContactId?: string;
  linkedContactName?: string;
  submitterId?: string;
}) => {
  const boardId = env.MONDAY_HELPDESK_BOARD_ID?.trim();
  if (!boardId) throw new Error("MONDAY_HELPDESK_BOARD_ID is not configured");

  const priorityLabel = args.priority.charAt(0).toUpperCase() + args.priority.slice(1);
  const categoryLabel = HELPDESK_CATEGORY_LABELS[args.category] ?? "General";
  const today = new Date().toISOString().slice(0, 10);

  const columnValues: Record<string, unknown> = {
    [HELPDESK_COL.description]: { text: args.description },
    [HELPDESK_COL.priority]: { label: priorityLabel },
    [HELPDESK_COL.category]: { label: categoryLabel },
    [HELPDESK_COL.status]: { label: "Working on it" },
    [HELPDESK_COL.date]: { date: today },
  };

  if (args.linkedContactId) {
    columnValues[HELPDESK_COL.linkedContact] = args.linkedContactName
      ? `${args.linkedContactName} (${args.linkedContactId})`
      : args.linkedContactId;
  }

  if (args.submitterId) {
    columnValues[HELPDESK_COL.person] = {
      personsAndTeams: [{ id: Number(args.submitterId), kind: "person" }],
    };
  }

  interface Data {
    create_item?: { id?: string | null };
  }
  const data = await callMondayGraphQL<Data>(
    `mutation CreateHelpdeskTicket($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
      create_item(board_id: $boardId, item_name: $itemName, column_values: $columnValues, create_labels_if_missing: true) { id }
    }`,
    {
      boardId,
      itemName: args.subject,
      columnValues: JSON.stringify(columnValues),
    },
  );

  return { ok: true, itemId: data.create_item?.id ?? null };
};

export const listHelpdeskTickets = async (args?: {
  submitterId?: string;
}) => {
  const boardId = env.MONDAY_HELPDESK_BOARD_ID?.trim();
  if (!boardId) throw new Error("MONDAY_HELPDESK_BOARD_ID is not configured");

  const colIds = [
    HELPDESK_COL.status,
    HELPDESK_COL.priority,
    HELPDESK_COL.category,
    HELPDESK_COL.description,
    HELPDESK_COL.linkedContact,
    HELPDESK_COL.date,
    HELPDESK_COL.person,
  ];

  interface Data {
    boards?: Array<{
      items_page?: {
        items?: Array<{
          id?: string;
          name?: string;
          created_at?: string;
          column_values?: Array<{ id?: string; text?: string | null }>;
        }>;
      };
    }>;
  }

  const data = await callMondayGraphQL<Data>(
    `query ($boardId: ID!, $colIds: [String!]) {
      boards(ids: [$boardId]) {
        items_page(limit: 200) {
          items {
            id name created_at
            column_values(ids: $colIds) { id text }
          }
        }
      }
    }`,
    { boardId, colIds },
  );

  const items = data.boards?.[0]?.items_page?.items ?? [];

  const tickets: HelpdeskTicket[] = items.map((item) => {
    const colText = (colId: string) =>
      item.column_values?.find((c) => c.id === colId)?.text?.trim() || null;

    return {
      id: String(item.id ?? ""),
      name: item.name ?? "",
      status: colText(HELPDESK_COL.status),
      priority: colText(HELPDESK_COL.priority),
      category: colText(HELPDESK_COL.category),
      description: colText(HELPDESK_COL.description),
      linkedContact: colText(HELPDESK_COL.linkedContact),
      date: colText(HELPDESK_COL.date),
      createdAt: item.created_at ?? null,
    };
  });

  if (args?.submitterId) {
    const personColId = HELPDESK_COL.person;
    return tickets.filter((t) => {
      const raw = items.find((i) => String(i.id) === t.id);
      const personText = raw?.column_values?.find((c) => c.id === personColId)?.text ?? "";
      return personText.includes(args.submitterId!);
    });
  }

  return tickets;
};
