import { callMondayGraphQL } from "./client";

import type {
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
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed.slice(0, 7);
  }
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString().slice(0, 7);
};

const includesTag = (tags: string[], needle: string) => {
  return tags.some((entry) => entry.includes(needle));
};

interface MetricsRecord {
  ownerIds: string[];
  ownerLabel: string | null;
  statusText: string | null;
  tags: string | null;
  createdAt: string | null;
  hireDate: string | null;
}

const detectSegments = (record: MetricsRecord) => {
  const tags = splitTags(record.tags);
  const isVeteran = includesTag(tags, "veteran");
  const isReentry = includesTag(tags, "reentry");
  const isCandidatesGroup =
    includesTag(tags, "candidate") &&
    (includesTag(tags, "group") || includesTag(tags, "train"));
  const statusText = record.statusText?.trim().toLowerCase() ?? "";
  const hasHiredStatus = statusText.includes("hired");
  const hasHireDate = !!normalizeMonthKey(record.hireDate);
  const hasHiredTag = includesTag(tags, "hired");
  const isHired = hasHiredStatus || hasHireDate || hasHiredTag;
  return {
    isVeteran,
    isReentry,
    isCandidatesGroup,
    isHired,
    createdMonthKey: normalizeMonthKey(record.createdAt),
    hiredMonthKey: normalizeMonthKey(record.hireDate) ?? normalizeMonthKey(record.createdAt),
  };
};

const applyToTotals = (
  totals: MondayMetricsSummaryTotals,
  segments: ReturnType<typeof detectSegments>,
) => {
  totals.allContacts += 1;
  if (segments.isCandidatesGroup) totals.candidatesGroup += 1;
  if (segments.isReentry) totals.reentry += 1;
  if (segments.isVeteran) totals.veterans += 1;
  if (segments.isHired) {
    totals.hiredTotal += 1;
    if (segments.isCandidatesGroup) totals.hiredCandidatesGroup += 1;
    if (segments.isReentry) totals.hiredReentry += 1;
    if (segments.isVeteran) totals.hiredVeterans += 1;
  }
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

const formatFiscalYear = (endYear: number) => {
  const suffix = String(endYear).slice(-2);
  return `FY${suffix}`;
};

const getFiscalYearRange = (endYear: number) => {
  const start = `${String(endYear - 1)}-07-01`;
  const end = `${String(endYear)}-06-30`;
  return { start, end };
};

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

const toOwnerLabel = (record: MetricsRecord, ownerId: string) => {
  return record.ownerLabel?.trim() || ownerId;
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
      // ignore
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

const sanitizeColumnId = (value: string) => {
  return value.replace(/[^a-zA-Z0-9_]/g, "");
};

const resolveMetricsColumnIds = async (boardId: string) => {
  interface Data {
    boards?: Array<{
      columns?: Array<{ id?: string | null; title?: string | null; type?: string | null }>;
    }>;
  }
  const data = await callMondayGraphQL<Data>(
    `
      query ResolveMetricsColumns($boardId: ID!) {
        boards(ids: [$boardId]) {
          columns {
            id
            title
            type
          }
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
    hireDateColumnId:
      byId("date_mkty234p")?.id ??
      byTitle("hire date")?.id ??
      null,
    statusColumnId: byType("status")?.id ?? null,
    tagsColumnId:
      byId("dropdown_mkvw578t")?.id ??
      byTitle("tag")?.id ??
      null,
    peopleColumnId: byType("people")?.id ?? null,
    creationLogColumnId: byType("creation_log")?.id ?? null,
  };
};

const fetchMetricsPage = async (args: {
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
    name?: string | null;
    updated_at?: string | null;
    column_values?: Array<{
      id?: string | null;
      type?: string | null;
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
          ${
            includeCursor
              ? ""
              : `query_params: {
                  rules: [${rulesForFirstPage.join("\n")}]
                }`
          }
        ) {
          cursor
          items {
            id
            updated_at
            column_values(ids: [${safeColumnIds}]) {
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
        columnMeta.hireDateColumnId,
        columnMeta.statusColumnId,
        columnMeta.tagsColumnId,
        columnMeta.peopleColumnId,
        columnMeta.creationLogColumnId,
      ].filter((value): value is string => !!value && value.trim().length > 0),
    ),
  );

  const allRecords: MetricsRecord[] = [];
  let cursor: string | null = null;
  let boardName: string | null = null;
  let scannedPages = 0;
  const canTryServerSideOwnerRule =
    ownerIdFilter.length > 0 && !!columnMeta.peopleColumnId?.trim();
  let useServerSideOwnerRule = canTryServerSideOwnerRule;
  let attemptedOwnerRuleFallback = false;

  while (scannedPages < MAX_SCAN_PAGES) {
    let page: Awaited<ReturnType<typeof fetchMetricsPage>>;
    try {
      page = await fetchMetricsPage({
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
      if (allRecords.length === 0) throw error;
      console.warn("[MondayMetrics] continuing with partial result after page error", {
        scannedPages,
        collectedRecords: allRecords.length,
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
      // Owner filtering at Monday level is sometimes inconsistent in this board setup.
      // Fall back to a full date-scoped scan when it returns an empty first page.
      attemptedOwnerRuleFallback = true;
      useServerSideOwnerRule = false;
      scannedPages = 0;
      cursor = null;
      allRecords.length = 0;
      boardName = null;
      continue;
    }
    boardName = boardName ?? page.boardName ?? null;
    for (const item of page.items) {
      const columns = item.column_values ?? [];
      const byId = (id: string | null) => columns.find((column) => column.id === id);
      const peopleColumn = byId(columnMeta.peopleColumnId);
      const tagsColumn = byId(columnMeta.tagsColumnId);
      const statusColumn = byId(columnMeta.statusColumnId);
      const createdColumn = byId(columnMeta.dateColumnId);
      const hireDateColumn = byId(columnMeta.hireDateColumnId);
      const creationLogColumn = byId(columnMeta.creationLogColumnId);
      const ownerIds = parsePeopleIds(peopleColumn?.value);
      const createdAt =
        parseDateValue(createdColumn?.value, createdColumn?.text) ??
        parseDateValue(creationLogColumn?.value, creationLogColumn?.text) ??
        item.updated_at ??
        null;
      const record: MetricsRecord = {
        ownerIds,
        ownerLabel: peopleColumn?.text?.trim() ?? null,
        statusText: statusColumn?.text?.trim() ?? null,
        tags: toColumnDisplayValue(tagsColumn?.text, tagsColumn?.value) || null,
        createdAt,
        hireDate: parseDateValue(hireDateColumn?.value, hireDateColumn?.text),
      };
      allRecords.push(record);
    }
    cursor = page.nextCursor ?? null;
    if (!cursor) break;
    if (Date.now() - startedAt > MAX_SCAN_DURATION_MS) {
      console.warn("[MondayMetrics] record scan timed out", {
        scannedPages,
        collectedRecords: allRecords.length,
        hasMore: !!cursor,
      });
      break;
    }
  }

  const records = ownerIdFilter
    ? allRecords.filter((record) =>
        record.ownerIds.some(
          (ownerId) => ownerId.trim().toLowerCase() === ownerIdFilter.toLowerCase(),
        ),
      )
    : allRecords;

  const totals = createZeroTotals();
  const monthlyPoints = buildFiscalYearMonths(fiscalYearEnd);
  const monthMap = new Map(monthlyPoints.map((point) => [point.monthKey, point]));
  const ownerMap = new Map<string, MondayMetricsOwnerBreakdown>();

  for (const record of records) {
    const segments = detectSegments(record);
    applyToTotals(totals, segments);

    const createdMonth = segments.createdMonthKey ? monthMap.get(segments.createdMonthKey) : null;
    if (createdMonth) {
      createdMonth.allContacts += 1;
      if (segments.isCandidatesGroup) createdMonth.candidatesGroup += 1;
      if (segments.isReentry) createdMonth.reentry += 1;
      if (segments.isVeteran) createdMonth.veterans += 1;
    }

    const hiredMonth = segments.hiredMonthKey ? monthMap.get(segments.hiredMonthKey) : null;
    if (segments.isHired && hiredMonth) {
      hiredMonth.hiredTotal += 1;
      if (segments.isCandidatesGroup) hiredMonth.hiredCandidatesGroup += 1;
      if (segments.isReentry) hiredMonth.hiredReentry += 1;
      if (segments.isVeteran) hiredMonth.hiredVeterans += 1;
    }

    const primaryOwnerId = record.ownerIds[0]?.trim() ?? "";
    if (!primaryOwnerId) continue;
    const ownerRow = ownerMap.get(primaryOwnerId) ?? {
      ownerId: primaryOwnerId,
      ownerLabel: toOwnerLabel(record, primaryOwnerId),
      ...createZeroTotals(),
    };
    applyToTotals(ownerRow, segments);
    ownerMap.set(primaryOwnerId, ownerRow);
  }

  const ownerBreakdown = Array.from(ownerMap.values()).sort(
    (a, b) => b.allContacts - a.allContacts || a.ownerLabel.localeCompare(b.ownerLabel),
  );

  const summary: MondayMetricsSummary = {
    fiscalYear,
    ownerId: ownerIdFilter || null,
    boardName,
    totals,
    monthly: monthlyPoints,
    ownerBreakdown,
    generatedAt: new Date().toISOString(),
  };
  metricsSummaryCache.set(cacheKey, {
    expiresAt: Date.now() + METRICS_CACHE_TTL_MS,
    summary,
  });
  return summary;
};
