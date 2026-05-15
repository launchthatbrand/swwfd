import {
  MONDAY_HIRE_EVENT_TYPE_LABEL,
  callMondayGraphQL,
  parseMondayHireEventToken,
} from "./client";

import type {
  MondayMetricsHiredContact,
  MondayMetricsMonthlyPoint,
  MondayMetricsOwnerBreakdown,
  MondayMetricsSummary,
  MondayMetricsSummaryTotals,
} from "~/app/monday/types";
import { env } from "~/env";

const MAX_SCAN_PAGES = 120;
const MAX_SCAN_DURATION_MS = 45_000;
const METRICS_CACHE_TTL_MS = 2 * 60 * 1000;
const metricsSummaryCache = new Map<
  string,
  { expiresAt: number; summary: MondayMetricsSummary }
>();

const createZeroTotals = (): MondayMetricsSummaryTotals => ({
  allContacts: 0,
  candidatesGroup: 0,
  reentry: 0,
  veterans: 0,
  hiredTotal: 0,
  hiredCandidatesGroup: 0,
  hiredReentry: 0,
  hiredVeterans: 0,
});

const createMonthLabel = (date: Date) =>
  date.toLocaleDateString(undefined, { month: "short", year: "numeric", timeZone: "UTC" });

const splitTags = (value: string | null | undefined) => {
  if (!value) return [] as string[];
  return value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
};

const normalizeMonthKey = (value: string | null | undefined) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed.slice(0, 7);
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString().slice(0, 7);
};

const includesTag = (tags: string[], needle: string) => {
  return tags.some((entry) => entry.includes(needle));
};

const toTimestamp = (value: string | null | undefined) => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

interface ContactMetricsRecord {
  ownerIds: string[];
  ownerLabel: string | null;
  tags: string | null;
  createdAt: string | null;
}

interface HireEventMetricsRecord {
  ownerIds: string[];
  ownerId: string | null;
  ownerLabel: string | null;
  contactItemId: string | null;
  eventDate: string | null;
  isCandidatesGroup: boolean;
  isReentry: boolean;
  isVeteran: boolean;
}

const detectContactSegments = (record: ContactMetricsRecord) => {
  const tags = splitTags(record.tags);
  return {
    isVeteran: includesTag(tags, "veteran"),
    isReentry: includesTag(tags, "reentry"),
    isCandidatesGroup:
      includesTag(tags, "candidate") &&
      (includesTag(tags, "group") || includesTag(tags, "train")),
    createdMonthKey: normalizeMonthKey(record.createdAt),
  };
};

const applyContactTotals = (
  totals: MondayMetricsSummaryTotals,
  segments: ReturnType<typeof detectContactSegments>,
) => {
  totals.allContacts += 1;
  if (segments.isCandidatesGroup) totals.candidatesGroup += 1;
  if (segments.isReentry) totals.reentry += 1;
  if (segments.isVeteran) totals.veterans += 1;
};

const applyHireEventTotals = (
  totals: MondayMetricsSummaryTotals,
  event: HireEventMetricsRecord,
) => {
  totals.hiredTotal += 1;
  if (event.isCandidatesGroup) totals.hiredCandidatesGroup += 1;
  if (event.isReentry) totals.hiredReentry += 1;
  if (event.isVeteran) totals.hiredVeterans += 1;
};

const parseFiscalYearEnd = (fiscalYear: string | null | undefined): number | null => {
  if (!fiscalYear) return null;
  const normalized = fiscalYear.trim().toUpperCase();
  if (!normalized) return null;
  const fy2 = /^FY(\d{2})$/.exec(normalized);
  if (fy2?.[1]) return 2000 + Number(fy2[1]);
  const fy4 = /^FY(\d{4})$/.exec(normalized);
  if (fy4?.[1]) return Number(fy4[1]);
  if (/^\d{4}$/.test(normalized)) return Number(normalized);
  return null;
};

const getCurrentFiscalYearEnd = () => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  return month >= 6 ? year + 1 : year;
};

const formatFiscalYear = (endYear: number) => `FY${String(endYear).slice(-2)}`;

const getFiscalYearRange = (endYear: number) => ({
  start: `${String(endYear - 1)}-07-15`,
  end: `${String(endYear)}-06-30`,
});

const buildFiscalYearMonths = (endYear: number): MondayMetricsMonthlyPoint[] => {
  const points: MondayMetricsMonthlyPoint[] = [];
  for (let offset = 0; offset < 12; offset += 1) {
    const cursor = new Date(Date.UTC(endYear - 1, 6 + offset, 1));
    points.push({
      monthKey: cursor.toISOString().slice(0, 7),
      monthLabel: createMonthLabel(cursor),
      ...createZeroTotals(),
    });
  }
  return points;
};

const parsePeopleIds = (columnValue: string | null | undefined) => {
  if (!columnValue) return [] as string[];
  try {
    const parsed = JSON.parse(columnValue) as {
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
  if (normalizedText && normalizedText.length > 0) return normalizedText;
  if (!rawValue || rawValue.trim().length === 0) return "";
  try {
    const parsed = JSON.parse(rawValue) as unknown;
    const values = Array.from(new Set(extractPrimitiveStrings(parsed))).filter(
      (value) => value.toLowerCase() !== "person",
    );
    return values.join(", ");
  } catch {
    return rawValue.trim();
  }
};

const parseDateValue = (
  value: string | null | undefined,
  text: string | null | undefined,
): string | null => {
  if (value) {
    try {
      const parsed = JSON.parse(value) as { date?: string; time?: string; created_at?: string };
      if (typeof parsed.created_at === "string" && parsed.created_at.trim().length > 0) {
        return parsed.created_at;
      }
      if (parsed.date && parsed.time) return `${parsed.date}T${parsed.time}Z`;
      if (parsed.date) return `${parsed.date}T00:00:00Z`;
    } catch {
      // ignore parse errors
    }
  }
  const normalizedText = text?.trim();
  if (!normalizedText) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedText)) {
    return `${normalizedText}T00:00:00Z`;
  }
  const parsed = Date.parse(normalizedText.replace(" UTC", "Z"));
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString();
};

const getMetricsBoardConfig = () => {
  const boardId = env.MONDAY_BOARD_ID?.trim() ?? "";
  if (!boardId) throw new Error("MONDAY_BOARD_ID is missing");
  return { boardId };
};

const sanitizeColumnId = (value: string) => value.replace(/[^a-zA-Z0-9_]/g, "");

const resolveMetricsColumnIds = async (boardId: string) => {
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
      query ResolveMetricsColumns($boardId: ID!) {
        boards(ids: [$boardId]) {
          columns { id title type }
        }
      }
    `,
    { boardId },
  );
  const columns = data.boards?.[0]?.columns ?? [];
  const byType = (type: string) =>
    columns.find((column) => (column.type ?? "").toLowerCase() === type);
  const byId = (id: string) => columns.find((column) => (column.id ?? "") === id);
  const byTitle = (needle: string) =>
    columns.find((column) =>
      (column.title ?? "").toLowerCase().includes(needle.toLowerCase()),
    );

  return {
    dateColumnId:
      byId("date1__1")?.id ??
      byTitle("registration")?.id ??
      byType("date")?.id ??
      "date1__1",
    tagsColumnId: byId("dropdown_mkvw578t")?.id ?? byTitle("tag")?.id ?? null,
    peopleColumnId: byType("people")?.id ?? null,
    emailColumnId: byType("email")?.id ?? byTitle("email")?.id ?? null,
    creationLogColumnId: byType("creation_log")?.id ?? null,
  };
};

const resolveSubitemBoardAndColumns = async (boardId: string) => {
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
  const data = await callMondayGraphQL<Data>(
    `
      query ResolveSubitemBoard($boardId: ID!) {
        boards(ids: [$boardId]) {
          columns { id title type settings_str }
        }
      }
    `,
    { boardId },
  );
  const columns = data.boards?.[0]?.columns ?? [];
  const subtasksColumn = columns.find((column) => (column.type ?? "").toLowerCase() === "subtasks");
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
  return { subitemBoardId };
};

const resolveHireEventColumnIds = async (subitemBoardId: string) => {
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
      query ResolveHireEventColumns($boardId: ID!) {
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
  const byId = (id: string) => columns.find((column) => (column.id ?? "") === id);
  const byTitle = (needle: string) =>
    columns.find((column) =>
      (column.title ?? "").toLowerCase().includes(needle.toLowerCase()),
    );
  return {
    typeColumnId: byId("color_mm2x49t2")?.id ?? byTitle("type")?.id ?? byType("status")?.id ?? null,
    dateColumnId: byId("date0")?.id ?? byTitle("date")?.id ?? byType("date")?.id ?? "date0",
    peopleColumnId: byId("person")?.id ?? byTitle("person")?.id ?? byType("people")?.id ?? null,
  };
};

const fetchContactMetricsPage = async (args: {
  boardId: string;
  cursor: string | null;
  limit: number;
  columnIds: string[];
  dateColumnId: string;
  dateFrom: string;
  dateTo: string;
  ownerRule?: {
    peopleColumnId: string;
    ownerId: string;
  } | null;
}) => {
  interface BoardItem {
    id: string;
    updated_at?: string | null;
    column_values?: Array<{
      id?: string | null;
      text?: string | null;
      value?: string | null;
    }>;
  }
  interface Data {
    boards?: Array<{
      name?: string | null;
      items_page?: { cursor?: string | null; items?: BoardItem[] };
    }>;
  }

  const safeColumnIds = args.columnIds.map((value) => `"${sanitizeColumnId(value)}"`).join(", ");
  const safeDateColumnId = sanitizeColumnId(args.dateColumnId);
  const safePeopleColumnId = args.ownerRule?.peopleColumnId
    ? sanitizeColumnId(args.ownerRule.peopleColumnId)
    : "";
  const safeOwnerId = args.ownerRule?.ownerId
    ? args.ownerRule.ownerId.replace(/[^0-9]/g, "")
    : "";
  const safeOwnerPeopleToken = safeOwnerId ? `person-${safeOwnerId}` : "";
  const includeCursor = !!args.cursor;
  const rulesForFirstPage: string[] = [
    `{
      column_id: "${safeDateColumnId}"
      compare_value: ["${args.dateFrom}", "${args.dateTo}"]
      operator: between
    }`,
  ];
  if (!includeCursor && safePeopleColumnId && safeOwnerId) {
    rulesForFirstPage.push(`{
      column_id: "${safePeopleColumnId}"
      compare_value: ["${safeOwnerPeopleToken}"]
      operator: any_of
    }`);
  }
  const query = `
    query ListMetricsItems($boardId: ID!, $limit: Int!${includeCursor ? ", $cursor: String" : ""}) {
      boards(ids: [$boardId]) {
        name
        items_page(
          limit: $limit
          ${includeCursor ? "cursor: $cursor" : ""}
          ${includeCursor ? "" : `query_params: { rules: [${rulesForFirstPage.join("\n")}] }`}
        ) {
          cursor
          items {
            id
            updated_at
            column_values(ids: [${safeColumnIds}]) {
              id
              text
              value
            }
          }
        }
      }
    }
  `;
  const data = await callMondayGraphQL<Data>(query, {
    boardId: args.boardId,
    limit: args.limit,
    ...(args.cursor ? { cursor: args.cursor } : {}),
  });
  return {
    boardName: data.boards?.[0]?.name ?? null,
    nextCursor: data.boards?.[0]?.items_page?.cursor ?? null,
    items: data.boards?.[0]?.items_page?.items ?? [],
  };
};

const fetchHireEventsPage = async (args: {
  boardId: string;
  cursor: string | null;
  limit: number;
  columnIds: string[];
  dateColumnId: string;
  dateFrom: string;
  dateTo: string;
  ownerRule?: {
    peopleColumnId: string;
    ownerId: string;
  } | null;
}) => {
  interface Subitem {
    id: string;
    name?: string | null;
    parent_item?: { id?: string | null } | null;
    column_values?: Array<{
      id?: string | null;
      text?: string | null;
      value?: string | null;
    }>;
  }
  interface Data {
    boards?: Array<{
      items_page?: { cursor?: string | null; items?: Subitem[] };
    }>;
  }
  const safeColumnIds = args.columnIds.map((value) => `"${sanitizeColumnId(value)}"`).join(", ");
  const safeDateColumnId = sanitizeColumnId(args.dateColumnId);
  const safePeopleColumnId = args.ownerRule?.peopleColumnId
    ? sanitizeColumnId(args.ownerRule.peopleColumnId)
    : "";
  const safeOwnerId = args.ownerRule?.ownerId
    ? args.ownerRule.ownerId.replace(/[^0-9]/g, "")
    : "";
  const safeOwnerPeopleToken = safeOwnerId ? `person-${safeOwnerId}` : "";
  const includeCursor = !!args.cursor;
  const rulesForFirstPage: string[] = [
    `{
      column_id: "${safeDateColumnId}"
      compare_value: ["${args.dateFrom}", "${args.dateTo}"]
      operator: between
    }`,
  ];
  if (!includeCursor && safePeopleColumnId && safeOwnerId) {
    rulesForFirstPage.push(`{
      column_id: "${safePeopleColumnId}"
      compare_value: ["${safeOwnerPeopleToken}"]
      operator: any_of
    }`);
  }
  const query = `
    query ListHireEventItems($boardId: ID!, $limit: Int!${includeCursor ? ", $cursor: String" : ""}) {
      boards(ids: [$boardId]) {
        items_page(
          limit: $limit
          ${includeCursor ? "cursor: $cursor" : ""}
          ${includeCursor ? "" : `query_params: { rules: [${rulesForFirstPage.join("\n")}] }`}
        ) {
          cursor
          items {
            id
            name
            parent_item {
              id
            }
            column_values(ids: [${safeColumnIds}]) {
              id
              text
              value
            }
          }
        }
      }
    }
  `;
  const data = await callMondayGraphQL<Data>(query, {
    boardId: args.boardId,
    limit: args.limit,
    ...(args.cursor ? { cursor: args.cursor } : {}),
  });
  return {
    nextCursor: data.boards?.[0]?.items_page?.cursor ?? null,
    items: data.boards?.[0]?.items_page?.items ?? [],
  };
};

const chunkStrings = (values: string[], size: number) => {
  const chunks: string[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
};

const fetchHiredContactsByIds = async (args: {
  itemIds: string[];
  emailColumnId: string | null;
}) => {
  interface Data {
    items?: Array<{
      id?: string | null;
      name?: string | null;
      url?: string | null;
      column_values?: Array<{
        id?: string | null;
        text?: string | null;
        value?: string | null;
      }>;
    }>;
  }

  const uniqueItemIds = Array.from(
    new Set(args.itemIds.map((value) => value.trim()).filter((value) => value.length > 0)),
  );
  if (uniqueItemIds.length === 0) {
    return new Map<
      string,
      { id: string; name: string | null; email: string | null; url: string | null }
    >();
  }

  const safeEmailColumnId = args.emailColumnId ? sanitizeColumnId(args.emailColumnId) : null;
  const emailColumnFragment = safeEmailColumnId
    ? `column_values(ids: ["${safeEmailColumnId}"]) { id text value }`
    : "";

  const byId = new Map<string, { id: string; name: string | null; email: string | null; url: string | null }>();

  for (const itemIdsChunk of chunkStrings(uniqueItemIds, 100)) {
    const data = await callMondayGraphQL<Data>(
      `
        query GetHiredContacts($itemIds: [ID!]) {
          items(ids: $itemIds) {
            id
            name
            url
            ${emailColumnFragment}
          }
        }
      `,
      { itemIds: itemIdsChunk },
    );
    for (const item of data.items ?? []) {
      const normalizedId = item.id?.trim() ?? "";
      if (!normalizedId) continue;
      const emailColumn = item.column_values?.[0];
      const email = toColumnDisplayValue(emailColumn?.text, emailColumn?.value) || null;
      byId.set(normalizedId, {
        id: normalizedId,
        name: item.name?.trim() || null,
        email,
        url: item.url?.trim() || null,
      });
    }
  }

  return byId;
};

export const buildMondayMetricsSummary = async (args?: {
  fiscalYear?: string | null;
  ownerId?: string | null;
}): Promise<MondayMetricsSummary> => {
  const { boardId } = getMetricsBoardConfig();
  const fiscalYearEnd = parseFiscalYearEnd(args?.fiscalYear) ?? getCurrentFiscalYearEnd();
  const fiscalYear = formatFiscalYear(fiscalYearEnd);
  const range = getFiscalYearRange(fiscalYearEnd);
  const ownerIdFilter = args?.ownerId?.trim() ?? "";
  const cacheKey = `${boardId}::${fiscalYear}::${ownerIdFilter || "all"}`;
  const cached = metricsSummaryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.summary;
  }
  const startedAt = Date.now();

  const columnMeta = await resolveMetricsColumnIds(boardId);
  const metricColumnIds = Array.from(
    new Set(
      [
        columnMeta.dateColumnId,
        columnMeta.tagsColumnId,
        columnMeta.peopleColumnId,
        columnMeta.creationLogColumnId,
      ].filter((value): value is string => !!value && value.trim().length > 0),
    ),
  );

  const allContactRecords: ContactMetricsRecord[] = [];
  let cursor: string | null = null;
  let boardName: string | null = null;
  let scannedPages = 0;
  const canTryServerSideOwnerRule =
    ownerIdFilter.length > 0 && !!columnMeta.peopleColumnId?.trim();
  let useServerSideOwnerRule = canTryServerSideOwnerRule;
  let attemptedOwnerRuleFallback = false;

  while (scannedPages < MAX_SCAN_PAGES) {
    let page: Awaited<ReturnType<typeof fetchContactMetricsPage>>;
    try {
      page = await fetchContactMetricsPage({
        boardId,
        cursor,
        limit: 500,
        columnIds: metricColumnIds,
        dateColumnId: columnMeta.dateColumnId,
        dateFrom: range.start,
        dateTo: range.end,
        ownerRule:
          useServerSideOwnerRule && columnMeta.peopleColumnId
            ? { peopleColumnId: columnMeta.peopleColumnId, ownerId: ownerIdFilter }
            : null,
      });
    } catch (error) {
      if (allContactRecords.length === 0) throw error;
      console.warn("[MondayMetrics] continuing with partial contact result after page error", {
        scannedPages,
        collectedRecords: allContactRecords.length,
        error: error instanceof Error ? error.message : String(error),
      });
      break;
    }
    scannedPages += 1;
    if (
      scannedPages === 1 &&
      useServerSideOwnerRule &&
      page.items.length === 0 &&
      !attemptedOwnerRuleFallback
    ) {
      attemptedOwnerRuleFallback = true;
      useServerSideOwnerRule = false;
      scannedPages = 0;
      cursor = null;
      allContactRecords.length = 0;
      boardName = null;
      continue;
    }
    boardName = boardName ?? page.boardName ?? null;
    for (const item of page.items) {
      const columns = item.column_values ?? [];
      const byId = (id: string | null) => columns.find((column) => column.id === id);
      const peopleColumn = byId(columnMeta.peopleColumnId);
      const tagsColumn = byId(columnMeta.tagsColumnId);
      const createdColumn = byId(columnMeta.dateColumnId);
      const creationLogColumn = byId(columnMeta.creationLogColumnId);
      const ownerIds = parsePeopleIds(peopleColumn?.value);
      const createdAt =
        parseDateValue(createdColumn?.value, createdColumn?.text) ??
        parseDateValue(creationLogColumn?.value, creationLogColumn?.text) ??
        item.updated_at ??
        null;
      allContactRecords.push({
        ownerIds,
        ownerLabel: peopleColumn?.text?.trim() ?? null,
        tags: toColumnDisplayValue(tagsColumn?.text, tagsColumn?.value) || null,
        createdAt,
      });
    }
    cursor = page.nextCursor ?? null;
    if (!cursor) break;
    if (Date.now() - startedAt > MAX_SCAN_DURATION_MS) {
      console.warn("[MondayMetrics] contact scan timed out", {
        scannedPages,
        collectedRecords: allContactRecords.length,
        hasMore: !!cursor,
      });
      break;
    }
  }

  const contactRecords = ownerIdFilter
    ? allContactRecords.filter((record) =>
      record.ownerIds.some(
        (ownerId) => ownerId.trim().toLowerCase() === ownerIdFilter.toLowerCase(),
      ),
    )
    : allContactRecords;

  const { subitemBoardId } = await resolveSubitemBoardAndColumns(boardId);
  const allHireEvents: HireEventMetricsRecord[] = [];
  if (subitemBoardId) {
    const hireColumnMeta = await resolveHireEventColumnIds(subitemBoardId);
    const hireEventColumnIds = Array.from(
      new Set(
        [hireColumnMeta.typeColumnId, hireColumnMeta.dateColumnId, hireColumnMeta.peopleColumnId].filter(
          (value): value is string => !!value && value.trim().length > 0,
        ),
      ),
    );
    let hireCursor: string | null = null;
    let hireScannedPages = 0;
    const canTryHireOwnerRule =
      ownerIdFilter.length > 0 && !!hireColumnMeta.peopleColumnId?.trim();
    let useHireOwnerRule = canTryHireOwnerRule;
    let attemptedHireOwnerRuleFallback = false;
    while (hireScannedPages < MAX_SCAN_PAGES) {
      let page: Awaited<ReturnType<typeof fetchHireEventsPage>>;
      try {
        page = await fetchHireEventsPage({
          boardId: subitemBoardId,
          cursor: hireCursor,
          limit: 500,
          columnIds: hireEventColumnIds,
          dateColumnId: hireColumnMeta.dateColumnId,
          dateFrom: range.start,
          dateTo: range.end,
          ownerRule:
            useHireOwnerRule && hireColumnMeta.peopleColumnId
              ? { peopleColumnId: hireColumnMeta.peopleColumnId, ownerId: ownerIdFilter }
              : null,
        });
      } catch (error) {
        if (allHireEvents.length === 0) throw error;
        console.warn("[MondayMetrics] continuing with partial hire-event result after page error", {
          scannedPages: hireScannedPages,
          collectedRecords: allHireEvents.length,
          error: error instanceof Error ? error.message : String(error),
        });
        break;
      }
      hireScannedPages += 1;
      if (
        hireScannedPages === 1 &&
        useHireOwnerRule &&
        page.items.length === 0 &&
        !attemptedHireOwnerRuleFallback
      ) {
        attemptedHireOwnerRuleFallback = true;
        useHireOwnerRule = false;
        hireScannedPages = 0;
        hireCursor = null;
        allHireEvents.length = 0;
        continue;
      }
      for (const item of page.items) {
        const metadata = parseMondayHireEventToken(item.name);
        const columns = item.column_values ?? [];
        const byId = (id: string | null) => columns.find((column) => column.id === id);
        const typeColumn = byId(hireColumnMeta.typeColumnId);
        const peopleColumn = byId(hireColumnMeta.peopleColumnId);
        const dateColumn = byId(hireColumnMeta.dateColumnId);
        const typeText = typeColumn?.text?.trim().toLowerCase() ?? "";
        const isHireEventFromType = typeText === MONDAY_HIRE_EVENT_TYPE_LABEL.toLowerCase();
        if (!isHireEventFromType && !metadata) continue;
        const eventDate =
          parseDateValue(dateColumn?.value, dateColumn?.text) ??
          (metadata?.hireDate ? `${metadata.hireDate}T00:00:00Z` : null);
        const ownerIds = parsePeopleIds(peopleColumn?.value);
        const ownerId = metadata?.ownerId?.trim() || ownerIds[0]?.trim() || null;
        const contactItemId =
          metadata?.contactItemId?.trim() || item.parent_item?.id?.trim() || null;
        if (!eventDate || !ownerId) continue;
        allHireEvents.push({
          ownerIds,
          ownerId,
          ownerLabel: peopleColumn?.text?.trim() || ownerId,
          contactItemId,
          eventDate,
          isCandidatesGroup: metadata?.segments.isCandidatesGroup ?? false,
          isReentry: metadata?.segments.isReentry ?? false,
          isVeteran: metadata?.segments.isVeteran ?? false,
        });
      }
      hireCursor = page.nextCursor ?? null;
      if (!hireCursor) break;
      if (Date.now() - startedAt > MAX_SCAN_DURATION_MS) {
        console.warn("[MondayMetrics] hire-event scan timed out", {
          scannedPages: hireScannedPages,
          collectedRecords: allHireEvents.length,
          hasMore: !!hireCursor,
        });
        break;
      }
    }
  }

  const hireEvents = ownerIdFilter
    ? allHireEvents.filter(
      (event) =>
        event.ownerId?.trim().toLowerCase() === ownerIdFilter.toLowerCase() ||
        event.ownerIds.some(
          (ownerId) => ownerId.trim().toLowerCase() === ownerIdFilter.toLowerCase(),
        ),
    )
    : allHireEvents;

  const hiredContactSummaryById = new Map<
    string,
    { contactId: string; hireCount: number; latestHireDate: string | null }
  >();
  for (const event of hireEvents) {
    const contactItemId = event.contactItemId?.trim() ?? "";
    if (!contactItemId) continue;
    const existing = hiredContactSummaryById.get(contactItemId) ?? {
      contactId: contactItemId,
      hireCount: 0,
      latestHireDate: null,
    };
    existing.hireCount += 1;
    if (
      event.eventDate &&
      (!existing.latestHireDate ||
        Date.parse(event.eventDate) > Date.parse(existing.latestHireDate))
    ) {
      existing.latestHireDate = event.eventDate;
    }
    hiredContactSummaryById.set(contactItemId, existing);
  }
  const hiredContactDetailsById = await fetchHiredContactsByIds({
    itemIds: Array.from(hiredContactSummaryById.keys()),
    emailColumnId: columnMeta.emailColumnId,
  });
  const hiredContacts: MondayMetricsHiredContact[] = Array.from(
    hiredContactSummaryById.values(),
  )
    .map((entry) => {
      const contact = hiredContactDetailsById.get(entry.contactId);
      return {
        contactId: entry.contactId,
        name: contact?.name || entry.contactId,
        email: contact?.email ?? null,
        url: contact?.url ?? null,
        hireCount: entry.hireCount,
        latestHireDate: entry.latestHireDate,
      };
    })
    .sort(
      (a, b) =>
        toTimestamp(b.latestHireDate) - toTimestamp(a.latestHireDate) ||
        a.name.localeCompare(b.name),
    );

  const totals = createZeroTotals();
  const monthlyPoints = buildFiscalYearMonths(fiscalYearEnd);
  const monthMap = new Map(monthlyPoints.map((point) => [point.monthKey, point]));
  const ownerMap = new Map<string, MondayMetricsOwnerBreakdown>();

  for (const record of contactRecords) {
    const segments = detectContactSegments(record);
    applyContactTotals(totals, segments);

    const createdMonth = segments.createdMonthKey ? monthMap.get(segments.createdMonthKey) : null;
    if (createdMonth) {
      createdMonth.allContacts += 1;
      if (segments.isCandidatesGroup) createdMonth.candidatesGroup += 1;
      if (segments.isReentry) createdMonth.reentry += 1;
      if (segments.isVeteran) createdMonth.veterans += 1;
    }

    const primaryOwnerId = record.ownerIds[0]?.trim() ?? "";
    if (!primaryOwnerId) continue;
    const ownerRow = ownerMap.get(primaryOwnerId) ?? {
      ownerId: primaryOwnerId,
      ownerLabel: record.ownerLabel?.trim() || primaryOwnerId,
      ...createZeroTotals(),
    };
    applyContactTotals(ownerRow, segments);
    ownerMap.set(primaryOwnerId, ownerRow);
  }

  for (const event of hireEvents) {
    applyHireEventTotals(totals, event);
    const eventMonthKey = normalizeMonthKey(event.eventDate);
    const eventMonth = eventMonthKey ? monthMap.get(eventMonthKey) : null;
    if (eventMonth) {
      eventMonth.hiredTotal += 1;
      if (event.isCandidatesGroup) eventMonth.hiredCandidatesGroup += 1;
      if (event.isReentry) eventMonth.hiredReentry += 1;
      if (event.isVeteran) eventMonth.hiredVeterans += 1;
    }

    const ownerKey = event.ownerId?.trim() ?? "";
    if (!ownerKey) continue;
    const ownerRow = ownerMap.get(ownerKey) ?? {
      ownerId: ownerKey,
      ownerLabel: event.ownerLabel?.trim() || ownerKey,
      ...createZeroTotals(),
    };
    applyHireEventTotals(ownerRow, event);
    ownerMap.set(ownerKey, ownerRow);
  }

  const ownerBreakdown = Array.from(ownerMap.values()).sort(
    (a, b) =>
      b.allContacts - a.allContacts ||
      b.hiredTotal - a.hiredTotal ||
      a.ownerLabel.localeCompare(b.ownerLabel),
  );

  const summary: MondayMetricsSummary = {
    fiscalYear,
    ownerId: ownerIdFilter || null,
    boardName,
    totals,
    monthly: monthlyPoints,
    ownerBreakdown,
    hiredContacts,
    generatedAt: new Date().toISOString(),
  };
  metricsSummaryCache.set(cacheKey, {
    expiresAt: Date.now() + METRICS_CACHE_TTL_MS,
    summary,
  });
  return summary;
};
