import { NextResponse } from "next/server";

import { env } from "~/env";
import { requireVerifiedMondaySession } from "~/server/monday/session";

export const runtime = "nodejs";

const MONDAY_API_URL = "https://api.monday.com/v2";
const ENABLE_WHOLE_MONTH_HYDRATION_BY_DEFAULT = false;
const METADATA_CACHE_TTL_MS = 60_000;
const CONTACT_CHUNK_CONCURRENCY = 4;
const CONTACT_CHUNK_RETRY_LIMIT = 2;
const CONTACT_CHUNK_RETRY_BASE_DELAY_MS = 250;
const API_BOARD_CREATED_AT_COLUMN_ID = "date1__1";
const API_BOARD_UPDATED_AT_COLUMN_ID = "pulse_updated_mm3av0c5";
const API_BOARD_LAST_TOUCHPOINT_COLUMN_ID = "date_mm3jfsd1";

type MondayColumnValue = {
  id?: string | null;
  type?: string | null;
  text?: string | null;
  value?: string | null;
};

type MondayBoardItem = {
  id: string;
  name?: string | null;
  url?: string | null;
  updated_at?: string | null;
  group?: { title?: string | null } | null;
  linked_items?: Array<{ id?: string | number | null }> | null;
  column_values?: MondayColumnValue[];
};

type MondayGraphQLResponse<TData> = {
  data?: TData;
  errors?: Array<{ message?: string }>;
};

type MergedRecord = {
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
  lastTouchpointAt: string | null;
  contactDetails: Array<{ label: string; value: string }>;
  resumeFiles: Array<{
    assetId: string | null;
    name: string;
    url: string | null;
  }>;
};

type TouchRecord = {
  touchItemId: string;
  contactId: string | null;
  touchedAt: string | null;
  touchedBy: string | null;
  touchSource: string | null;
  debugRelationCandidates?: Array<{
    columnId: string;
    text: string | null;
    value: string | null;
  }>;
  debugContactItemColumn?: {
    columnId: string | null;
    text: string | null;
    value: string | null;
  } | null;
};

const parseLimit = (value: string | null) => {
  if (!value) return 100;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 100;
  return Math.min(Math.max(parsed, 1), 500);
};

const parseIsoDateOnly = (value: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const parsed = Date.parse(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed);
};

const isIsoDateOnly = (value: string | null | undefined) => {
  if (!value) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
};

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

const getRequiredConfig = () => {
  const apiKey = env.MONDAY_API_KEY?.trim() ?? "";
  const contactBoardId = env.MONDAY_BOARD_ID?.trim() ?? "";
  if (!apiKey || !contactBoardId) {
    throw new Error(
      "Missing Monday config. Set MONDAY_API_KEY and MONDAY_BOARD_ID.",
    );
  }
  return { apiKey, contactBoardId };
};

const callMondayGraphQL = async <TData>(
  query: string,
  variables: Record<string, unknown>,
) => {
  const { apiKey } = getRequiredConfig();
  const response = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Monday API request failed (${response.status})`);
  }
  const json = (await response.json()) as MondayGraphQLResponse<TData>;
  if (Array.isArray(json.errors) && json.errors.length > 0) {
    const message = json.errors.map((entry) => entry.message).filter(Boolean).join(" | ");
    throw new Error(message || "Unknown Monday API error");
  }
  if (!json.data) {
    throw new Error("Monday API returned no data");
  }
  return json.data;
};

const parsePeopleIds = (columnValue: string | null | undefined) => {
  if (!columnValue) return [] as string[];
  try {
    const parsed = JSON.parse(columnValue) as {
      personsAndTeams?: Array<{ id?: number | string; kind?: string }>;
    };
    return (parsed.personsAndTeams ?? [])
      .filter((entry) => entry.kind === "person" && entry.id != null)
      .map((entry) => String(entry.id))
      .filter((entry) => entry.trim().length > 0);
  } catch {
    return [] as string[];
  }
};

const parseDateValue = (column: MondayColumnValue | undefined) => {
  if (!column) return null;
  if (column.value) {
    try {
      const parsed = JSON.parse(column.value) as {
        date?: string;
        time?: string;
        created_at?: string;
        updated_at?: string;
        changed_at?: string;
      };
      if (parsed.date && parsed.time) return `${parsed.date}T${parsed.time}Z`;
      if (parsed.date) return `${parsed.date}T00:00:00Z`;
      const rawTimestamp =
        parsed.updated_at ?? parsed.changed_at ?? parsed.created_at ?? null;
      if (typeof rawTimestamp === "string" && rawTimestamp.trim().length > 0) {
        return rawTimestamp.trim();
      }
    } catch {
      // ignore
    }
  }
  const text = column.text?.trim();
  if (!text) return null;
  const parsed = Date.parse(text.replace(" UTC", "Z"));
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString();
};

const extractPrimitiveStrings = (input: unknown): string[] => {
  if (input == null) return [];
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
  if (!rawValue || rawValue.trim().length === 0) return "";
  try {
    const parsed = JSON.parse(rawValue) as unknown;
    const values = Array.from(new Set(extractPrimitiveStrings(parsed))).filter(
      (value) => value.toLowerCase() !== "person",
    );
    return values.join(", ");
  } catch {
    return rawValue;
  }
  return rawValue;
};

const APPROVAL_STEP_COLUMN_IDS = [
  "color_mm1db321",
  "color_mm3ggf4t",
  "color_mm1dwr4k",
  "color_mm1dnr11",
  "color_mm1dgeqy",
  "color_mm1d80yc",
  "color_mm1djwjj",
] as const;

interface ProgressColumnConfig {
  columnId: string;
  selectedColumns: Array<{
    columnId: string;
    percentage: number;
    doneColors: number[];
  }>;
}

interface ContactBoardMeta {
  approvalSteps: Array<{ id: string; title: string }>;
  progressColumnConfig: ProgressColumnConfig | null;
  contactOwnerColumnId: string | null;
  subitemBoardId: string | null;
}

interface TouchColumns {
  touchDateColumnId: string | null;
  ownerIdColumnId: string;
  peopleColumnId: string | null;
  relationColumnIds: string[];
  lookupColumnIds: string[];
  contactItemIdColumnId: string | null;
  sourceColumnId: string | null;
}

interface SubitemTouchColumns {
  dateColumnId: string;
  typeColumnId: string | null;
}

type CacheEntry<TValue> = {
  value: TValue;
  expiresAt: number;
};

const touchColumnsCache = new Map<string, CacheEntry<TouchColumns>>();
const contactBoardMetaCache = new Map<string, CacheEntry<ContactBoardMeta>>();
const subitemTouchColumnsCache = new Map<string, CacheEntry<SubitemTouchColumns>>();

const readCachedValue = <TValue>(
  cache: Map<string, CacheEntry<TValue>>,
  key: string,
): TValue | null => {
  const now = Date.now();
  const existing = cache.get(key);
  if (!existing) return null;
  if (existing.expiresAt <= now) {
    cache.delete(key);
    return null;
  }
  return existing.value;
};

const writeCachedValue = <TValue>(
  cache: Map<string, CacheEntry<TValue>>,
  key: string,
  value: TValue,
) => {
  cache.set(key, {
    value,
    expiresAt: Date.now() + METADATA_CACHE_TTL_MS,
  });
  return value;
};

const sanitizeColumnId = (value: string) => value.replace(/[^a-zA-Z0-9_]/g, "");

const resolveContactBoardMeta = async (
  contactBoardId: string,
): Promise<ContactBoardMeta> => {
  interface Data {
    boards?: Array<{
      columns?: Array<{
        id?: string | null;
        title?: string | null;
        type?: string | null;
        settings_str?: string | null;
      }>;
    }>;
  }
  try {
    const data = await callMondayGraphQL<Data>(
      `
        query ResolveContactColumns($boardId: ID!) {
          boards(ids: [$boardId]) {
            columns { id title type settings_str }
          }
        }
      `,
      { boardId: contactBoardId },
    );
    const columns = data.boards?.[0]?.columns ?? [];
    const byType = (type: string) =>
      columns.find((column) => (column.type ?? "").toLowerCase() === type);
    const byTitle = (needle: string) =>
      columns.find((column) =>
        (column.title ?? "").toLowerCase().includes(needle.toLowerCase()),
      );
    const titleById: Record<string, string> = {};
    for (const col of columns) {
      const id = col?.id?.trim();
      const title = col?.title?.trim();
      if (id && title) titleById[id] = title;
    }

    let progressColumnConfig: ProgressColumnConfig | null = null;
    const progressColumn = columns.find(
      (c) =>
        c?.id === "columns_battery_mm1dnmq3" || c?.type === "progress",
    );
    if (progressColumn?.settings_str) {
      try {
        const settings = JSON.parse(progressColumn.settings_str) as {
          related_columns?: {
            columns?: Record<
              string,
              { isSelected?: boolean; percentage?: number }
            >;
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
                // default
              }
            }
            return {
              columnId: colId,
              percentage: v.percentage ?? 0,
              doneColors,
            };
          });
        if (selectedColumns.length > 0) {
          progressColumnConfig = {
            columnId: progressColumn.id ?? "columns_battery_mm1dnmq3",
            selectedColumns,
          };
        }
      } catch {
        // stays null
      }
    }

    const ownerColumnId =
      byTitle("owner")?.id?.trim() ??
      byType("people")?.id?.trim() ??
      null;
    const subtasksColumn = byType("subtasks");
    let subitemBoardId: string | null = null;
    if (subtasksColumn?.settings_str) {
      try {
        const parsed = JSON.parse(subtasksColumn.settings_str) as {
          boardIds?: Array<number | string>;
        };
        const raw = parsed.boardIds?.[0];
        if (raw != null) {
          const normalized = String(raw).trim();
          if (normalized.length > 0) subitemBoardId = normalized;
        }
      } catch {
        subitemBoardId = null;
      }
    }

    return {
      approvalSteps: APPROVAL_STEP_COLUMN_IDS.map((id, index) => ({
        id,
        title: titleById[id] ?? `Approval Step ${index + 1}`,
      })),
      progressColumnConfig,
      contactOwnerColumnId: ownerColumnId,
      subitemBoardId,
    };
  } catch {
    return {
      approvalSteps: APPROVAL_STEP_COLUMN_IDS.map((id, index) => ({
        id,
        title: `Approval Step ${index + 1}`,
      })),
      progressColumnConfig: null,
      contactOwnerColumnId: null,
      subitemBoardId: null,
    };
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
        if (
          typeof parsed.index === "number" &&
          doneColors.includes(parsed.index)
        ) {
          total += percentage;
        }
      } catch {
        // not done
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
      )
        return parseNumber(String(parsed.battery_value));
      if (typeof parsed.value === "number" || typeof parsed.value === "string")
        return parseNumber(String(parsed.value));
      if (typeof parsed.text === "string") return parseNumber(parsed.text);
    } catch {
      // fall through
    }
  }
  return text?.trim() ? parseNumber(text) : null;
};

const resolveTouchColumns = async (touchBoardId: string): Promise<TouchColumns> => {
  interface Data {
    boards?: Array<{
      columns?: Array<{ id?: string | null; title?: string | null; type?: string | null }>;
    }>;
  }
  const data = await callMondayGraphQL<Data>(
    `
      query ResolveTouchColumns($boardId: ID!) {
        boards(ids: [$boardId]) {
          columns {
            id
            title
            type
          }
        }
      }
    `,
    { boardId: touchBoardId },
  );
  const columns = data.boards?.[0]?.columns ?? [];
  const findByTitle = (needle: string) =>
    columns.find((column) =>
      (column.title ?? "").toLowerCase().includes(needle.toLowerCase()),
    );
  const findByType = (type: string) =>
    columns.find((column) => (column.type ?? "").toLowerCase() === type);
  const relationColumnIds = Array.from(
    new Set(
      [
        findByType("board_relation")?.id,
        findByType("connect_boards")?.id,
        findByTitle("related contact")?.id,
        findByTitle("contact relation")?.id,
        findByTitle("contact")?.id,
        "board_relation_mm0wbvrb",
      ]
        .map((value) => value?.trim())
        .filter((value): value is string => !!value && value.length > 0),
    ),
  );
  const lookupColumnIds = Array.from(
    new Set(
      columns
        .filter((column) => {
          const type = (column.type ?? "").toLowerCase();
          const id = (column.id ?? "").toLowerCase();
          const title = (column.title ?? "").toLowerCase();
          return (
            type === "lookup" ||
            id.startsWith("lookup_") ||
            title.includes("contact id") ||
            title.includes("database")
          );
        })
        .map((column) => column.id?.trim())
        .filter((value): value is string => !!value && value.length > 0),
    ),
  );
  return {
    touchDateColumnId:
      findByTitle("touch date")?.id ??
      findByTitle("touch_date")?.id ??
      findByType("date")?.id ??
      null,
    ownerIdColumnId:
      findByTitle("owner_id")?.id ??
      findByTitle("owner id")?.id ??
      "text_mm0wb7qt",
    peopleColumnId:
      findByTitle("touched by")?.id ??
      findByTitle("owner")?.id ??
      findByType("people")?.id ??
      null,
    relationColumnIds,
    lookupColumnIds,
    contactItemIdColumnId:
      findByTitle("contact item")?.id ??
      findByTitle("contact id")?.id ??
      findByTitle("item id")?.id ??
      null,
    sourceColumnId: findByTitle("source")?.id ?? null,
  };
};

const _getCachedTouchColumns = async (touchBoardId: string): Promise<TouchColumns> => {
  const cached = readCachedValue(touchColumnsCache, touchBoardId);
  if (cached) return cached;
  const resolved = await resolveTouchColumns(touchBoardId);
  return writeCachedValue(touchColumnsCache, touchBoardId, resolved);
};

const getCachedContactBoardMeta = async (
  contactBoardId: string,
): Promise<ContactBoardMeta> => {
  const cached = readCachedValue(contactBoardMetaCache, contactBoardId);
  if (cached) return cached;
  const resolved = await resolveContactBoardMeta(contactBoardId);
  return writeCachedValue(contactBoardMetaCache, contactBoardId, resolved);
};

const resolveSubitemTouchColumns = async (
  subitemBoardId: string,
): Promise<SubitemTouchColumns> => {
  interface Data {
    boards?: Array<{
      columns?: Array<{
        id?: string | null;
        title?: string | null;
        type?: string | null;
      }>;
    }>;
  }
  const data = await callMondayGraphQL<Data>(
    `
      query ResolveSubitemTouchColumns($boardId: ID!) {
        boards(ids: [$boardId]) {
          columns { id title type }
        }
      }
    `,
    { boardId: subitemBoardId },
  );
  const columns = data.boards?.[0]?.columns ?? [];
  const byType = (type: string) =>
    columns.find((column) => (column.type ?? "").toLowerCase() === type);
  const byId = (id: string) =>
    columns.find((column) => (column.id ?? "").trim() === id);
  const byTitle = (needle: string) =>
    columns.find((column) =>
      (column.title ?? "").toLowerCase().includes(needle.toLowerCase()),
    );
  return {
    dateColumnId:
      byId("date0")?.id?.trim() ??
      byTitle("date")?.id?.trim() ??
      byType("date")?.id?.trim() ??
      "date0",
    typeColumnId:
      byId("color_mm2x49t2")?.id?.trim() ??
      byTitle("type")?.id?.trim() ??
      byType("status")?.id?.trim() ??
      null,
  };
};

const getCachedSubitemTouchColumns = async (
  subitemBoardId: string,
): Promise<SubitemTouchColumns> => {
  const cached = readCachedValue(subitemTouchColumnsCache, subitemBoardId);
  if (cached) return cached;
  const resolved = await resolveSubitemTouchColumns(subitemBoardId);
  return writeCachedValue(subitemTouchColumnsCache, subitemBoardId, resolved);
};

const fetchSubitemTouchPage = async (args: {
  subitemBoardId: string;
  cursor: string | null;
  limit: number;
  dateColumnId: string;
  dateFrom: string;
  dateTo: string;
  parentOwnerColumnId: string | null;
  typeColumnId: string | null;
}) => {
  interface SubitemItem {
    id: string;
    name?: string | null;
    created_at?: string | null;
    parent_item?: {
      id?: string | null;
      name?: string | null;
      url?: string | null;
      column_values?: Array<{
        id?: string | null;
        text?: string | null;
        value?: string | null;
      }>;
    } | null;
    column_values?: Array<{
      id?: string | null;
      text?: string | null;
      value?: string | null;
    }>;
  }
  interface Data {
    boards?: Array<{
      name?: string | null;
      items_page?: { cursor?: string | null; items?: SubitemItem[] };
    }>;
  }

  const safeDateColumnId = sanitizeColumnId(args.dateColumnId);
  const safeParentOwnerColumnId = args.parentOwnerColumnId
    ? sanitizeColumnId(args.parentOwnerColumnId)
    : "";
  const safeTypeColumnId = args.typeColumnId ? sanitizeColumnId(args.typeColumnId) : "";
  const safeColumnIds = Array.from(
    new Set(
      [safeDateColumnId, safeTypeColumnId].filter((value) => value.length > 0),
    ),
  );
  const canLimitColumnValues = safeColumnIds.length > 0;
  const parentColumnsFragment = safeParentOwnerColumnId
    ? `column_values(ids: ["${safeParentOwnerColumnId}"]) {
                id
                text
                value
              }`
    : "";
  const includeCursor = !!args.cursor;
  const canPushDateRule =
    !includeCursor &&
    safeDateColumnId.length > 0 &&
    isIsoDateOnly(args.dateFrom) &&
    isIsoDateOnly(args.dateTo);
  const queryParams = canPushDateRule
    ? `query_params: { rules: [{
          column_id: "${safeDateColumnId}"
          compare_value: ["${args.dateFrom}", "${args.dateTo}"]
          operator: between
        }] }`
    : "";

  const query = `
    query ListSubitemTouches($boardId: ID!, $limit: Int!${includeCursor ? ", $cursor: String" : ""}) {
      boards(ids: [$boardId]) {
        name
        items_page(
          limit: $limit
          ${includeCursor ? "cursor: $cursor" : ""}
          ${includeCursor ? "" : queryParams}
        ) {
          cursor
          items {
            id
            name
            created_at
            parent_item {
              id
              name
              url
              ${parentColumnsFragment}
            }
            ${
              canLimitColumnValues
                ? `column_values(ids: [${safeColumnIds.map((id) => `"${id}"`).join(", ")}]) {
                    id
                    text
                    value
                  }`
                : `column_values {
                    id
                    text
                    value
                  }`
            }
          }
        }
      }
    }
  `;
  const data = await callMondayGraphQL<Data>(query, {
    boardId: args.subitemBoardId,
    limit: args.limit,
    ...(args.cursor ? { cursor: args.cursor } : {}),
  });
  return {
    boardName: data.boards?.[0]?.name ?? null,
    nextCursor: data.boards?.[0]?.items_page?.cursor ?? null,
    items: data.boards?.[0]?.items_page?.items ?? [],
  };
};

const _fetchTouchPage = async (args: {
  touchBoardId: string;
  cursor: string | null;
  limit: number;
  linkedBoardId?: string | null;
  relationColumnId?: string | null;
  columnValueIds?: string[];
  dateRule?:
    | {
        touchDateColumnId: string;
        dateFrom: string;
        dateTo: string;
      }
    | null;
  ownerRule?:
    | {
        ownerColumnId: string;
        ownerId: string;
      }
    | null;
}) => {
  interface Data {
    boards?: Array<{
      name?: string | null;
      items_page?: { cursor?: string | null; items?: MondayBoardItem[] };
    }>;
  }
  const canPushDateRule =
    !args.cursor &&
    !!args.dateRule &&
    /^[a-zA-Z0-9_]+$/.test(args.dateRule.touchDateColumnId) &&
    isIsoDateOnly(args.dateRule.dateFrom) &&
    isIsoDateOnly(args.dateRule.dateTo);
  const canPushOwnerRule =
    !args.cursor &&
    !!args.ownerRule &&
    /^[a-zA-Z0-9_]+$/.test(args.ownerRule.ownerColumnId) &&
    /^\d+$/.test(args.ownerRule.ownerId);
  const canFetchLinkedItems =
    !!args.linkedBoardId &&
    !!args.relationColumnId &&
    /^[a-zA-Z0-9_]+$/.test(args.relationColumnId);
  const sanitizedColumnValueIds = (args.columnValueIds ?? [])
    .map((value) => value.trim())
    .filter((value) => /^[a-zA-Z0-9_]+$/.test(value));
  const canLimitColumnValues = sanitizedColumnValueIds.length > 0;

  const queryRules: string[] = [];
  if (canPushDateRule && args.dateRule) {
    queryRules.push(`{
      column_id: "${args.dateRule.touchDateColumnId}"
      compare_value: ["${args.dateRule.dateFrom}", "${args.dateRule.dateTo}"]
      operator: between
    }`);
  }
  if (canPushOwnerRule && args.ownerRule) {
    queryRules.push(`{
      column_id: "${args.ownerRule.ownerColumnId}"
      compare_value: ["${args.ownerRule.ownerId}"]
      operator: any_of
    }`);
  }
  const queryParams = queryRules.length
    ? `query_params: { rules: [${queryRules.join(", ")}] }`
    : "";

  const query = `
    query ListTouchItems(
      $boardId: ID!
      $limit: Int!
      ${args.cursor ? ", $cursor: String" : ""}
      ${canFetchLinkedItems ? ", $linkedBoardId: ID!, $relationColumnId: String!" : ""}
      ${canLimitColumnValues ? ", $columnValueIds: [String!]!" : ""}
    ) {
      boards(ids: [$boardId]) {
        name
        items_page(
          limit: $limit
          ${args.cursor ? "cursor: $cursor" : ""}
          ${queryParams}
        ) {
          cursor
          items {
            id
            name
            url
            updated_at
            ${
              canFetchLinkedItems
                ? `linked_items(
                    linked_board_id: $linkedBoardId
                    link_to_item_column_id: $relationColumnId
                  ) {
                    id
                  }`
                : ""
            }
            ${
              canLimitColumnValues
                ? `column_values(ids: $columnValueIds) {
                    id
                    text
                    value
                  }`
                : `column_values {
                    id
                    text
                    value
                  }`
            }
          }
        }
      }
    }
  `;
  const data = await callMondayGraphQL<Data>(query, {
    boardId: args.touchBoardId,
    limit: args.limit,
    ...(args.cursor ? { cursor: args.cursor } : {}),
    ...(canFetchLinkedItems
      ? {
          linkedBoardId: args.linkedBoardId,
          relationColumnId: args.relationColumnId,
        }
      : {}),
    ...(canLimitColumnValues ? { columnValueIds: sanitizedColumnValueIds } : {}),
  });
  return {
    boardName: data.boards?.[0]?.name ?? null,
    nextCursor: data.boards?.[0]?.items_page?.cursor ?? null,
    items: data.boards?.[0]?.items_page?.items ?? [],
  };
};

const _extractContactIdFromTouch = (
  item: MondayBoardItem,
  columnIds: TouchColumns,
) => {
  const values = item.column_values ?? [];
  const byId = (id: string | null) => values.find((column) => column.id === id);
  const parseLikelyItemId = (value: unknown): string | null => {
    if (value == null) return null;
    const normalized =
      typeof value === "number"
        ? String(value)
        : typeof value === "string"
          ? value.trim()
          : "";
    if (!normalized) return null;
    if (/^\d{9,}$/.test(normalized)) return normalized;
    const embeddedMatch = normalized.match(/\b\d{9,}\b/);
    return embeddedMatch?.[0] ?? null;
  };
  const linkedItemId = (item.linked_items ?? [])
    .map((linkedItem) => parseLikelyItemId(linkedItem.id))
    .find((value): value is string => !!value);
  if (linkedItemId) return linkedItemId;
  const tryExtractLinkedId = (rawValue: string | null | undefined): string | null => {
    if (!rawValue || rawValue.trim().length === 0) return null;
    try {
      const parsed = JSON.parse(rawValue) as unknown;
      const queue: unknown[] = [parsed];
      while (queue.length > 0) {
        const current = queue.shift();
        if (!current || typeof current !== "object") continue;
        if (Array.isArray(current)) {
          queue.push(...current);
          continue;
        }
        const record = current as Record<string, unknown>;
        const directId =
          record.linkedPulseId ??
          record.linkedItemId ??
          record.pulseId ??
          record.itemId;
        const directItemId = parseLikelyItemId(directId);
        if (directItemId) return directItemId;
        const linkedPulseIds = record.linkedPulseIds;
        if (Array.isArray(linkedPulseIds)) {
          for (const entry of linkedPulseIds) {
            if (!entry || typeof entry !== "object") continue;
            const linked = (entry as { linkedPulseId?: number | string }).linkedPulseId;
            const linkedItemId = parseLikelyItemId(linked);
            if (linkedItemId) return linkedItemId;
          }
        }
        queue.push(...Object.values(record));
      }
    } catch {
      // ignore parse issues and continue to other candidates
    }
    return null;
  };

  for (const relationColumnId of columnIds.relationColumnIds) {
    const linkedId = tryExtractLinkedId(byId(relationColumnId)?.value);
    if (linkedId) return linkedId;
  }
  for (const lookupColumnId of columnIds.lookupColumnIds) {
    const lookupFromValue = tryExtractLinkedId(byId(lookupColumnId)?.value);
    if (lookupFromValue) return lookupFromValue;
    const lookupFromText = parseLikelyItemId(byId(lookupColumnId)?.text);
    if (lookupFromText) return lookupFromText;
  }

  const fallbackColumn = byId(columnIds.contactItemIdColumnId);
  const fallbackFromText = parseLikelyItemId(fallbackColumn?.text);
  if (fallbackFromText) return fallbackFromText;
  const fallbackFromValue = tryExtractLinkedId(fallbackColumn?.value);
  if (fallbackFromValue) return fallbackFromValue;
  return null;
};

const touchMatchesFilters = (args: {
  touch: TouchRecord;
  dateFrom: Date | null;
  dateTo: Date | null;
}) => {
  if (args.dateFrom || args.dateTo) {
    const touchDate = args.touch.touchedAt ? new Date(args.touch.touchedAt) : null;
    if (!touchDate || Number.isNaN(touchDate.getTime())) return false;
    if (args.dateFrom && touchDate < args.dateFrom) return false;
    if (args.dateTo) {
      const end = new Date(args.dateTo);
      end.setUTCHours(23, 59, 59, 999);
      if (touchDate > end) return false;
    }
  }
  return true;
};

const fetchOwnerProfiles = async (
  ownerIds: string[],
): Promise<
  Map<
    string,
    { id: string; name: string | null; email: string | null; photoThumb: string | null }
  >
> => {
  if (ownerIds.length === 0) return new Map();
  interface Data {
    users?: Array<{
      id?: string | number | null;
      name?: string | null;
      email?: string | null;
      photo_thumb?: string | null;
    }>;
  }
  try {
    const data = await callMondayGraphQL<Data>(
      `query GetUsers($ids: [ID!]) { users(ids: $ids) { id name email photo_thumb } }`,
      { ids: ownerIds },
    );
    const map = new Map<
      string,
      { id: string; name: string | null; email: string | null; photoThumb: string | null }
    >();
    for (const user of data.users ?? []) {
      const id = user.id != null ? String(user.id).trim() : "";
      if (!id) continue;
      map.set(id, {
        id,
        name: user.name?.trim() ?? null,
        email: user.email?.trim() ?? null,
        photoThumb: user.photo_thumb?.trim() ?? null,
      });
    }
    return map;
  } catch {
    return new Map();
  }
};

const parseResumeFiles = (
  columns: MondayColumnValue[],
): Array<{ assetId: string | null; name: string; url: string | null }> => {
  const filesColumn = columns.find((c) => c.id === "files__1");
  if (!filesColumn?.value) return [];
  try {
    const parsed = JSON.parse(filesColumn.value) as {
      files?: Array<{
        assetId?: number | string | null;
        name?: string | null;
        fileType?: string | null;
        url?: string | null;
        public_url?: string | null;
      }>;
    };
    return (parsed.files ?? [])
      .filter((f) => {
        const name = (f.name ?? "").toLowerCase();
        return (
          name.includes("resume") ||
          name.includes("cv") ||
          name.endsWith(".pdf") ||
          name.endsWith(".doc") ||
          name.endsWith(".docx")
        );
      })
      .map((f) => ({
        assetId: f.assetId != null ? String(f.assetId) : null,
        name: f.name ?? "Resume",
        url:
          typeof f.public_url === "string" && f.public_url.trim().length > 0
            ? f.public_url.trim()
            : typeof f.url === "string" && f.url.trim().length > 0
              ? f.url.trim()
              : null,
      }));
  } catch {
    return [];
  }
};

const sleep = async (durationMs: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, durationMs);
  });

const isRateLimitError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("(429)") || message.toLowerCase().includes("rate limit");
};

const mapWithConcurrency = async <TValue, TResult>(
  items: TValue[],
  concurrency: number,
  worker: (item: TValue, index: number) => Promise<TResult>,
) => {
  if (items.length === 0) return [] as TResult[];
  const safeConcurrency = Math.max(1, Math.min(concurrency, items.length));
  const results = new Array<TResult>(items.length);
  let currentIndex = 0;

  await Promise.all(
    Array.from({ length: safeConcurrency }, async () => {
      while (true) {
        const nextIndex = currentIndex;
        currentIndex += 1;
        if (nextIndex >= items.length) break;
        const item = items[nextIndex] as TValue;
        results[nextIndex] = await worker(item, nextIndex);
      }
    }),
  );

  return results;
};

const fetchContactRecordsByIds = async (args: {
  boardId: string;
  itemIds: string[];
  progressColumnConfig: ProgressColumnConfig | null;
}) => {
  // Monday's `items(ids: ...)` resolver effectively caps results to 25 per call,
  // even when passing larger ID arrays. Keep chunk size at 25 to avoid silent drops.
  const MONDAY_ITEMS_BY_IDS_CHUNK_SIZE = 25;
  const chunks: string[][] = [];
  const ids = args.itemIds;
  for (let index = 0; index < ids.length; index += MONDAY_ITEMS_BY_IDS_CHUNK_SIZE) {
    chunks.push(ids.slice(index, index + MONDAY_ITEMS_BY_IDS_CHUNK_SIZE));
  }

  interface Data {
    items?: MondayBoardItem[];
  }

  let rateLimitRetries = 0;
  const fetchContactChunk = async (chunk: string[]) => {
    let attempt = 0;
    while (true) {
      try {
        const data = await callMondayGraphQL<Data>(
          `
            query ContactsByIds($itemIds: [ID!]) {
              items(ids: $itemIds) {
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
          `,
          { itemIds: chunk },
        );
        return data.items ?? [];
      } catch (error) {
        if (!isRateLimitError(error) || attempt >= CONTACT_CHUNK_RETRY_LIMIT) {
          throw error;
        }
        rateLimitRetries += 1;
        const retryDelay = CONTACT_CHUNK_RETRY_BASE_DELAY_MS * 2 ** attempt;
        attempt += 1;
        await sleep(retryDelay);
      }
    }
  };

  const chunkResults = await mapWithConcurrency(chunks, CONTACT_CHUNK_CONCURRENCY, (chunk) =>
    fetchContactChunk(chunk),
  );
  const items = chunkResults.flatMap((chunkItems) => chunkItems);

  const toContactRecord = (item: MondayBoardItem): MergedRecord => {
    const columns = item.column_values ?? [];
    const byId = (id: string) => columns.find((column) => column.id === id);
    const byType = (type: string) =>
      columns.find((column) => (column.type ?? "").toLowerCase() === type);

    const statusColumn = byType("status");
    const peopleColumn = byType("people");
    const emailColumn = byId("email__1") ?? byType("email");
    const phoneColumn = byId("phone____1") ?? byType("phone");
    const referredColumn = byId("dropdown_mkwqcc1w");
    const hiredColumn = byId("dropdown_mkwqm5fb");
    const hireDateColumn = byId("date_mkty234p");
    const retentionColumn = byId("dropdown_mkwthbh2");
    const tagsColumn = byId("dropdown_mkvw578t");
    const dateColumn = byId(API_BOARD_CREATED_AT_COLUMN_ID);
    const pulseUpdatedColumn = byId(API_BOARD_UPDATED_AT_COLUMN_ID);
    const lastTouchpointColumn = byId(API_BOARD_LAST_TOUCHPOINT_COLUMN_ID);

    const addressParts = [
      byId("text6__1")?.text,
      byId("text60__1")?.text,
      byId("text1__1")?.text,
      byId("text7__1")?.text,
      byId("text3__1")?.text,
    ]
      .map((value) => value?.trim())
      .filter((value): value is string => !!value && value.length > 0);
    const address = addressParts.length > 0 ? addressParts.join(", ") : null;

    const ownerIds = parsePeopleIds(peopleColumn?.value);
    const hireDate = parseDateValue(hireDateColumn);

    const batteryColumn = columns.find(
      (c) => c.id === "columns_battery_mm1dnmq3" || (c.type ?? "").toLowerCase() === "progress",
    );
    const computedProgress = computeProgressFromColumns(columns, args.progressColumnConfig);
    const batteryProgress =
      computedProgress ?? parseBatteryProgressValue(batteryColumn?.text, batteryColumn?.value);

    const createdAt = parseDateValue(dateColumn);
    const updatedAt = parseDateValue(pulseUpdatedColumn);
    const lastTouchpointAt = parseDateValue(lastTouchpointColumn);

    const details: Array<{ label: string; value: string }> = [];
    if ((item.name ?? "").trim()) details.push({ label: "Name", value: item.name ?? "" });
    if ((emailColumn?.text ?? "").trim()) {
      details.push({ label: "Email", value: emailColumn?.text ?? "" });
    }
    if ((phoneColumn?.text ?? "").trim()) {
      details.push({ label: "Phone", value: phoneColumn?.text ?? "" });
    }
    if (address) details.push({ label: "Address", value: address });

    return {
      id: item.id,
      contactId: item.id,
      name: item.name ?? "",
      url: item.url ?? null,
      groupTitle: item.group?.title ?? null,
      statusText: statusColumn?.text ?? null,
      peopleText: peopleColumn?.text ?? null,
      ownerIds,
      ownerProfiles: [] as MergedRecord["ownerProfiles"],
      email: emailColumn?.text ?? null,
      phone: phoneColumn?.text ?? null,
      address,
      referredToContractors: toColumnDisplayValue(referredColumn?.text, referredColumn?.value) || null,
      hiredWithContractor: toColumnDisplayValue(hiredColumn?.text, hiredColumn?.value) || null,
      hireDate: hireDate,
      retentionPeriod: toColumnDisplayValue(retentionColumn?.text, retentionColumn?.value) || null,
      tags: toColumnDisplayValue(tagsColumn?.text, tagsColumn?.value) || null,
      batteryProgress,
      batteryRawValue: batteryColumn?.value ?? null,
      createdAt: createdAt ?? null,
      updatedAt: updatedAt ?? null,
      lastTouchpointAt: lastTouchpointAt ?? null,
      contactDetails: details,
      resumeFiles: parseResumeFiles(columns),
    };
  };

  const map = new Map<string, MergedRecord>();
  for (const item of items) {
    map.set(item.id, toContactRecord(item));
  }

  const allOwnerIds = Array.from(
    new Set(
      Array.from(map.values()).flatMap((r) => r.ownerIds),
    ),
  );
  const ownerProfileMap = await fetchOwnerProfiles(allOwnerIds);
  for (const record of map.values()) {
    record.ownerProfiles = record.ownerIds
      .map((id) => ownerProfileMap.get(id))
      .filter(
        (p): p is NonNullable<typeof p> => p !== undefined,
      );
  }

  return {
    recordsById: map,
    chunkCount: chunks.length,
    chunkConcurrency:
      chunks.length === 0 ? 0 : Math.min(CONTACT_CHUNK_CONCURRENCY, chunks.length),
    rateLimitRetries,
  };
};

export const GET = async (request: Request) => {
  try {
    await requireVerifiedMondaySession(request);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unauthorized Monday session";
    return toJson({ ok: false, error: message }, 401);
  }

  let config: ReturnType<typeof getRequiredConfig>;
  try {
    config = getRequiredConfig();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Missing configuration";
    return toJson({ ok: false, error: message }, 400);
  }

  const url = new URL(request.url);
  const cursorParam = url.searchParams.get("cursor");
  const cursorStart = cursorParam && cursorParam.trim().length > 0 ? cursorParam : null;
  const limit = parseLimit(url.searchParams.get("limit"));
  const search = url.searchParams.get("search")?.trim().toLowerCase() ?? "";
  const ownerFilterRaw = url.searchParams.get("owner")?.trim() ?? "";
  const ownerFilter = ownerFilterRaw.toLowerCase();
  const statusFilter = url.searchParams.get("status")?.trim().toLowerCase() ?? "";
  const dateFrom = parseIsoDateOnly(url.searchParams.get("dateFrom"));
  const dateTo = parseIsoDateOnly(url.searchParams.get("dateTo"));
  const dateFromText = url.searchParams.get("dateFrom")?.trim() ?? "";
  const dateToText = url.searchParams.get("dateTo")?.trim() ?? "";
  const hydrateWholeMonthParam =
    url.searchParams.get("hydrateWholeMonth")?.trim().toLowerCase() ?? "";
  const shouldHydrateWholeMonthRequested =
    hydrateWholeMonthParam === "1" || hydrateWholeMonthParam === "true";

  const startedAt = Date.now();

  try {
    const contactBoardMeta = await getCachedContactBoardMeta(config.contactBoardId);
    const {
      approvalSteps,
      progressColumnConfig,
      contactOwnerColumnId,
      subitemBoardId,
    } = contactBoardMeta;
    if (!subitemBoardId) {
      throw new Error(
        "Unable to resolve subitem board for touches mode from MONDAY_BOARD_ID.",
      );
    }
    const subitemTouchColumns = await getCachedSubitemTouchColumns(subitemBoardId);
    const canApplyDateRule =
      !!subitemTouchColumns.dateColumnId &&
      isIsoDateOnly(dateFromText) &&
      isIsoDateOnly(dateToText);
    const shouldHydrateWholeMonth =
      (ENABLE_WHOLE_MONTH_HYDRATION_BY_DEFAULT || shouldHydrateWholeMonthRequested) &&
      !cursorStart &&
      canApplyDateRule &&
      search.length === 0 &&
      statusFilter.length === 0;
    const canEarlyStopByUniqueContacts =
      !shouldHydrateWholeMonth &&
      ownerFilter.length === 0 &&
      search.length === 0 &&
      statusFilter.length === 0;
    const uniqueContactTarget = Math.max(limit + 10, Math.ceil(limit * 1.5));
    const matchedTouches: TouchRecord[] = [];
    const uniqueContactIdsScanned = new Set<string>();
    let cursor: string | null = cursorStart;
    let boardName: string | null = null;
    let scanPages = 0;
    let stoppedAfterUniqueContactTarget = false;
    const maxScanPages = shouldHydrateWholeMonth
      ? 200
      : canApplyDateRule
        ? 12
        : ownerFilter.length > 0
          ? 80
          : 25;
    const maxScanDurationMs = shouldHydrateWholeMonth
      ? 45_000
      : ownerFilter.length > 0
        ? 20_000
        : 12_000;
    const maxMatchedTouches = shouldHydrateWholeMonth
      ? 10_000
      : ownerFilter.length > 0
        ? Math.max(limit * 12, 600)
        : Math.max(limit * 3, limit + 20);
    while (matchedTouches.length < maxMatchedTouches && scanPages < maxScanPages) {
      const fetchPageArgs = {
        subitemBoardId,
        cursor,
        limit: 500,
        dateColumnId: subitemTouchColumns.dateColumnId,
        dateFrom: dateFromText,
        dateTo: dateToText,
        parentOwnerColumnId: contactOwnerColumnId,
        typeColumnId: subitemTouchColumns.typeColumnId,
      };
      let page;
      try {
        page = await fetchSubitemTouchPage(fetchPageArgs);
      } catch (error) {
        throw error;
      }
      boardName = boardName ?? page.boardName;
      cursor = page.nextCursor;
      scanPages += 1;

      for (const item of page.items) {
        const contactId = item.parent_item?.id?.trim() ?? null;
        if (!contactId) continue;
        const parentColumns = item.parent_item?.column_values ?? [];
        const parentOwnerColumn = contactOwnerColumnId
          ? parentColumns.find((column) => column.id === contactOwnerColumnId)
          : null;
        const parentOwnerIds = parsePeopleIds(parentOwnerColumn?.value);
        const parentOwnerText = parentOwnerColumn?.text?.trim().toLowerCase() ?? "";
        if (ownerFilter.length > 0 && contactOwnerColumnId) {
          const ownerIdMatch = parentOwnerIds.some(
            (ownerId) => ownerId.trim().toLowerCase() === ownerFilter,
          );
          const ownerTextMatch = parentOwnerText === ownerFilter;
          if (!ownerIdMatch && !ownerTextMatch) continue;
        }

        const values = item.column_values ?? [];
        const byId = (id: string | null) => values.find((column) => column.id === id);
        const touchedAt =
          parseDateValue(byId(subitemTouchColumns.dateColumnId)) ??
          item.created_at?.trim() ??
          null;
        const touchSource = subitemTouchColumns.typeColumnId
          ? byId(subitemTouchColumns.typeColumnId)?.text?.trim() ?? null
          : null;
        const touch: TouchRecord = {
          touchItemId: item.id,
          contactId,
          touchedAt,
          touchedBy: null,
          touchSource,
        };
        if (!touchMatchesFilters({ touch, dateFrom, dateTo })) {
          continue;
        }
        matchedTouches.push(touch);
        if (touch.contactId) {
          uniqueContactIdsScanned.add(touch.contactId);
        }
        if (canEarlyStopByUniqueContacts && uniqueContactIdsScanned.size >= uniqueContactTarget) {
          stoppedAfterUniqueContactTarget = true;
          break;
        }
        if (matchedTouches.length >= maxMatchedTouches) break;
      }

      if (!cursor) break;
      if (stoppedAfterUniqueContactTarget) break;
      if (!shouldHydrateWholeMonth && ownerFilter.length === 0 && matchedTouches.length >= limit) {
        break;
      }
      if (Date.now() - startedAt >= maxScanDurationMs) break;
    }

    matchedTouches.sort((a, b) => {
      const aTime = a.touchedAt ? Date.parse(a.touchedAt) : Number.NEGATIVE_INFINITY;
      const bTime = b.touchedAt ? Date.parse(b.touchedAt) : Number.NEGATIVE_INFINITY;
      if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && aTime !== bTime) {
        return bTime - aTime;
      }
      return b.touchItemId.localeCompare(a.touchItemId);
    });
    const selectedTouches = shouldHydrateWholeMonth || ownerFilter.length > 0
      ? matchedTouches
      : matchedTouches.slice(0, limit);

    const contactIds = Array.from(
      new Set(
        selectedTouches
          .map((touch) => touch.contactId)
          .filter((entry): entry is string => !!entry && entry.trim().length > 0),
      ),
    );
    const contactFetchResult = await fetchContactRecordsByIds({
      boardId: config.contactBoardId,
      itemIds: contactIds,
      progressColumnConfig,
    });
    const contactMap = contactFetchResult.recordsById;
    if (matchedTouches.length > 0 && (contactIds.length === 0 || contactMap.size === 0)) {
      const sampleTouches = selectedTouches.slice(0, 5).map((touch) => ({
        touchItemId: touch.touchItemId,
        contactId: touch.contactId,
        touchedBy: touch.touchedBy,
        touchedAt: touch.touchedAt,
        source: touch.touchSource,
      }));
      console.warn("[MondayUserRecordsRoute] touch hydration mismatch", {
        subitemBoardId,
        contactBoardId: config.contactBoardId,
        matchedTouches: matchedTouches.length,
        selectedTouches: selectedTouches.length,
        uniqueContactIds: contactIds.length,
        loadedContacts: contactMap.size,
        sampleTouches,
        sampleTouchesJson: JSON.stringify(sampleTouches),
      });
    }

    const merged: MergedRecord[] = [];
    const seenContactKeys = new Set<string>();
    for (const touch of selectedTouches) {
      const contact = touch.contactId ? contactMap.get(touch.contactId) : undefined;
      if (!contact) continue;
      const dedupeKey = touch.contactId?.trim() || contact.contactId?.trim() || contact.id.trim();
      if (!dedupeKey) continue;
      if (seenContactKeys.has(dedupeKey)) {
        continue;
      }
      if (
        ownerFilter.length > 0 &&
        !contact.ownerIds.some((ownerId) => ownerId.trim().toLowerCase() === ownerFilter)
      ) {
        continue;
      }
      const detailPrefix: Array<{ label: string; value: string }> = [];
      if (touch.touchedAt) detailPrefix.push({ label: "touched_at", value: touch.touchedAt });
      if (touch.touchedBy) detailPrefix.push({ label: "touched_by", value: touch.touchedBy });
      if (touch.touchSource) {
        detailPrefix.push({ label: "touch_source", value: touch.touchSource });
      }
      const mergedRecord: MergedRecord = {
        ...contact,
        id: touch.touchItemId,
        touchItemId: touch.touchItemId,
        contactId: touch.contactId,
        touchedAt: touch.touchedAt,
        touchedBy: touch.touchedBy,
        touchSource: touch.touchSource,
        createdAt: contact.createdAt,
        contactDetails: [...detailPrefix, ...contact.contactDetails],
      };
      if (statusFilter.length > 0) {
        const statusValue = (mergedRecord.statusText ?? "").toLowerCase();
        if (statusValue !== statusFilter) continue;
      }
      if (search.length > 0) {
        const haystack = [
          mergedRecord.name,
          mergedRecord.id,
          mergedRecord.contactId ?? "",
          mergedRecord.email ?? "",
          mergedRecord.phone ?? "",
          mergedRecord.address ?? "",
          mergedRecord.peopleText ?? "",
          mergedRecord.statusText ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search)) continue;
      }
      merged.push(mergedRecord);
      seenContactKeys.add(dedupeKey);
    }
    merged.sort((a, b) => {
      const aTime = a.createdAt ? Date.parse(a.createdAt) : Number.NEGATIVE_INFINITY;
      const bTime = b.createdAt ? Date.parse(b.createdAt) : Number.NEGATIVE_INFINITY;
      if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && aTime !== bTime) {
        return bTime - aTime;
      }
      return b.id.localeCompare(a.id);
    });

    console.info("[MondayUserRecordsRoute] GET completed", {
      durationMs: Date.now() - startedAt,
      requestedLimit: limit,
      returnedRows: merged.length,
      matchedTouches: matchedTouches.length,
      loadedContacts: contactMap.size,
      hasNextCursor: !!cursor,
      scanPages,
      scannedUniqueContacts: uniqueContactIdsScanned.size,
      stoppedAfterUniqueContactTarget,
      hydratedWholeMonth: shouldHydrateWholeMonth,
      contactChunkCount: contactFetchResult.chunkCount,
      contactChunkConcurrency: contactFetchResult.chunkConcurrency,
      contactChunkRateLimitRetries: contactFetchResult.rateLimitRetries,
      hasOwner: ownerFilter.length > 0,
      hasSearch: search.length > 0,
      hasStatus: statusFilter.length > 0,
    });

    return toJson({
      ok: true,
      boardName: boardName ?? "Monday Board",
      records: merged,
      nextCursor: cursor,
      approvalSteps,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load Monday user records";
    console.error("[MondayUserRecordsRoute] GET failed", {
      durationMs: Date.now() - startedAt,
      error: message,
      hasOwner: ownerFilter.length > 0,
      hasSearch: search.length > 0,
      hasStatus: statusFilter.length > 0,
      hasDateFrom: !!dateFrom,
      hasDateTo: !!dateTo,
    });
    return toJson({ ok: false, error: message }, 500);
  }
};

