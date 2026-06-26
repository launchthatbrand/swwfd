import { callMondayGraphQL } from "./mondayGraphQL";

export const MONDAY_HIRE_EVENT_TYPE_LABEL = "Hire Event";

export interface MondayHireEventMetadata {
  contactItemId: string;
  ownerId: string;
  hireDate: string;
  source: string;
  segments: {
    isCandidatesGroup: boolean;
    isReentry: boolean;
    isVeteran: boolean;
  };
}

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

const MAX_SCAN_PAGES = 120;

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

const createZeroCommunicationTotals = (): MondayMetricsCommunicationTotals => ({
  emailCommunications: 0,
  textCommunications: 0,
  phoneCallCommunications: 0,
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

const splitCommaValues = (value: string | null | undefined) => {
  if (!value) return [] as string[];
  return value
    .split(",")
    .map((entry) => entry.trim())
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
  referredToContractors: string[];
}

interface HireEventMetricsRecord {
  ownerIds: string[];
  ownerId: string | null;
  ownerLabel: string | null;
  contactItemId: string | null;
  parentContactOwnerIds: string[];
  parentContactOwnerId: string | null;
  parentContactOwnerLabel: string | null;
  parentContactName: string | null;
  parentContactEmail: string | null;
  parentContactUrl: string | null;
  eventDate: string | null;
  isCandidatesGroup: boolean;
  isReentry: boolean;
  isVeteran: boolean;
}

type CommunicationMethod = "email" | "text" | "phone_call";

interface CommunicationMetricsRecord {
  method: CommunicationMethod;
  eventDate: string;
  parentContactOwnerIds: string[];
  parentContactOwnerId: string | null;
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

const applyCommunicationTotals = (
  totals: MondayMetricsCommunicationTotals,
  method: CommunicationMethod,
) => {
  if (method === "email") {
    totals.emailCommunications += 1;
    return;
  }
  if (method === "text") {
    totals.textCommunications += 1;
    return;
  }
  totals.phoneCallCommunications += 1;
};

const normalizeCommunicationMethod = (value: string | null | undefined): CommunicationMethod | null => {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (!normalized) return null;
  if (normalized === "email" || normalized === "e-mail") return "email";
  if (normalized === "text" || normalized === "sms" || normalized === "text message") {
    return "text";
  }
  if (
    normalized === "phone" ||
    normalized === "phone call" ||
    normalized === "call" ||
    normalized === "phonecall"
  ) {
    return "phone_call";
  }
  return null;
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
      ...createZeroCommunicationTotals(),
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
  const boardId = process.env.MONDAY_BOARD_ID?.trim() ?? "";
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
    referredToContractorsColumnId:
      byId("dropdown_mkwqcc1w")?.id ??
      byTitle("referred to contractor")?.id ??
      byTitle("referred")?.id ??
      null,
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
    methodColumnId:
      byId("method_of_communication__1")?.id ??
      byTitle("method of communication")?.id ??
      byTitle("method")?.id ??
      null,
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
  parentEmailColumnId: string | null;
  parentPeopleColumnId: string | null;
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
  const safeParentEmailColumnId = args.parentEmailColumnId
    ? sanitizeColumnId(args.parentEmailColumnId)
    : "";
  const safeParentPeopleColumnId = args.parentPeopleColumnId
    ? sanitizeColumnId(args.parentPeopleColumnId)
    : "";
  const safeParentColumnIds = Array.from(
    new Set(
      [safeParentEmailColumnId, safeParentPeopleColumnId].filter(
        (value) => value.length > 0,
      ),
    ),
  );
  const parentColumnsFragment =
    safeParentColumnIds.length > 0
      ? `column_values(ids: [${safeParentColumnIds.map((id) => `"${id}"`).join(", ")}]) {
                id
                text
                value
              }`
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
            created_at
            parent_item {
              id
              name
              url
              ${parentColumnsFragment}
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

  const columnMeta = await resolveMetricsColumnIds(boardId);
  const metricColumnIds = Array.from(
    new Set(
      [
        columnMeta.dateColumnId,
        columnMeta.tagsColumnId,
        columnMeta.referredToContractorsColumnId,
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
      throw new Error(
        `[MondayMetrics] failed to scan contacts page ${scannedPages + 1}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
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
      const referredToContractorsColumn = byId(columnMeta.referredToContractorsColumnId);
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
        referredToContractors: splitCommaValues(
          toColumnDisplayValue(
            referredToContractorsColumn?.text,
            referredToContractorsColumn?.value,
          ) || null,
        ),
      });
    }
    cursor = page.nextCursor ?? null;
    if (!cursor) break;
  }

  const contactRecords = ownerIdFilter
    ? allContactRecords.filter((record) =>
      record.ownerIds.some(
        (ownerId) => ownerId.trim().toLowerCase() === ownerIdFilter.toLowerCase(),
      ),
    )
    : allContactRecords;

  const contractorReferralMap = new Map<string, number>();
  for (const record of contactRecords) {
    const uniqueContractors = Array.from(
      new Set(
        record.referredToContractors
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
      ),
    );
    for (const contractorName of uniqueContractors) {
      contractorReferralMap.set(
        contractorName,
        (contractorReferralMap.get(contractorName) ?? 0) + 1,
      );
    }
  }
  const contractorReferrals: MondayMetricsContractorReferralBreakdown[] = Array.from(
    contractorReferralMap.entries(),
  )
    .map(([contractorName, referredCount]) => ({
      contractorName,
      referredCount,
    }))
    .sort(
      (a, b) =>
        b.referredCount - a.referredCount ||
        a.contractorName.localeCompare(b.contractorName),
    );

  const { subitemBoardId } = await resolveSubitemBoardAndColumns(boardId);
  const allHireEvents: HireEventMetricsRecord[] = [];
  const allCommunicationEvents: CommunicationMetricsRecord[] = [];
  if (subitemBoardId) {
    const hireColumnMeta = await resolveHireEventColumnIds(subitemBoardId);
    const hireEventColumnIds = Array.from(
      new Set(
        [
          hireColumnMeta.typeColumnId,
          hireColumnMeta.dateColumnId,
          hireColumnMeta.peopleColumnId,
          hireColumnMeta.methodColumnId,
        ].filter((value): value is string => !!value && value.trim().length > 0),
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
          parentEmailColumnId: columnMeta.emailColumnId,
          parentPeopleColumnId: columnMeta.peopleColumnId,
          dateColumnId: hireColumnMeta.dateColumnId,
          dateFrom: range.start,
          dateTo: range.end,
          ownerRule:
            useHireOwnerRule && hireColumnMeta.peopleColumnId
              ? { peopleColumnId: hireColumnMeta.peopleColumnId, ownerId: ownerIdFilter }
              : null,
        });
      } catch (error) {
        throw new Error(
          `[MondayMetrics] failed to scan hire-event page ${hireScannedPages + 1}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
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
        allCommunicationEvents.length = 0;
        continue;
      }
      for (const item of page.items) {
        const metadata = parseMondayHireEventToken(item.name);
        const columns = item.column_values ?? [];
        const byId = (id: string | null) => columns.find((column) => column.id === id);
        const typeColumn = byId(hireColumnMeta.typeColumnId);
        const peopleColumn = byId(hireColumnMeta.peopleColumnId);
        const dateColumn = byId(hireColumnMeta.dateColumnId);
        const methodColumn = byId(hireColumnMeta.methodColumnId);
        const methodValue = toColumnDisplayValue(methodColumn?.text, methodColumn?.value) || null;
        const communicationMethod = normalizeCommunicationMethod(methodValue);
        const eventDate =
          parseDateValue(dateColumn?.value, dateColumn?.text) ??
          (metadata?.hireDate ? `${metadata.hireDate}T00:00:00Z` : null) ??
          item.created_at ??
          null;
        const parentColumns = item.parent_item?.column_values ?? [];
        const parentById = (id: string | null) =>
          id ? parentColumns.find((column) => column.id === id) : null;
        const parentEmailColumn = parentById(columnMeta.emailColumnId);
        const parentPeopleColumn = parentById(columnMeta.peopleColumnId);
        const parentContactEmail =
          toColumnDisplayValue(parentEmailColumn?.text, parentEmailColumn?.value) || null;
        const parentContactOwnerIds = parsePeopleIds(parentPeopleColumn?.value);
        const parentContactOwnerId = parentContactOwnerIds[0]?.trim() ?? null;
        const parentContactOwnerLabel = parentPeopleColumn?.text?.trim() ?? null;
        const parentContactName = item.parent_item?.name?.trim() || null;
        const parentContactUrl = item.parent_item?.url?.trim() || null;

        if (communicationMethod && eventDate) {
          allCommunicationEvents.push({
            method: communicationMethod,
            eventDate,
            parentContactOwnerIds,
            parentContactOwnerId,
          });
        }

        const typeText = typeColumn?.text?.trim().toLowerCase() ?? "";
        const isHireEventFromType = typeText === MONDAY_HIRE_EVENT_TYPE_LABEL.toLowerCase();
        if (!isHireEventFromType && !metadata) continue;
        const ownerIds = parsePeopleIds(peopleColumn?.value);
        const ownerId = metadata?.ownerId?.trim() || ownerIds[0]?.trim() || null;
        // Prefer the concrete parent link from Monday over token metadata.
        // Older tokens can point at stale contact ids after board migrations.
        const contactItemId =
          item.parent_item?.id?.trim() || metadata?.contactItemId?.trim() || null;
        if (!eventDate || !ownerId) continue;
        allHireEvents.push({
          ownerIds,
          ownerId,
          ownerLabel: peopleColumn?.text?.trim() || ownerId,
          contactItemId,
          parentContactOwnerIds,
          parentContactOwnerId,
          parentContactOwnerLabel,
          parentContactName,
          parentContactEmail,
          parentContactUrl,
          eventDate,
          isCandidatesGroup: metadata?.segments.isCandidatesGroup ?? false,
          isReentry: metadata?.segments.isReentry ?? false,
          isVeteran: metadata?.segments.isVeteran ?? false,
        });
      }
      hireCursor = page.nextCursor ?? null;
      if (!hireCursor) break;
    }
  }

  const hireEvents = ownerIdFilter
    ? allHireEvents.filter(
      (event) =>
        event.parentContactOwnerId?.trim().toLowerCase() === ownerIdFilter.toLowerCase() ||
        event.parentContactOwnerIds.some(
          (ownerId) => ownerId.trim().toLowerCase() === ownerIdFilter.toLowerCase(),
        ),
    )
    : allHireEvents;

  const communicationEvents = ownerIdFilter
    ? allCommunicationEvents.filter(
      (event) =>
        event.parentContactOwnerId?.trim().toLowerCase() === ownerIdFilter.toLowerCase() ||
        event.parentContactOwnerIds.some(
          (ownerId) => ownerId.trim().toLowerCase() === ownerIdFilter.toLowerCase(),
        ),
    )
    : allCommunicationEvents;

  const hiredContactSummaryById = new Map<
    string,
    {
      contactId: string;
      hireCount: number;
      latestHireDate: string | null;
      fallbackName: string | null;
      fallbackEmail: string | null;
      fallbackUrl: string | null;
    }
  >();
  for (const event of hireEvents) {
    const contactItemId = event.contactItemId?.trim() ?? "";
    if (!contactItemId) continue;
    const existing = hiredContactSummaryById.get(contactItemId) ?? {
      contactId: contactItemId,
      hireCount: 0,
      latestHireDate: null,
      fallbackName: null,
      fallbackEmail: null,
      fallbackUrl: null,
    };
    existing.hireCount += 1;
    if (!existing.fallbackName && event.parentContactName) {
      existing.fallbackName = event.parentContactName;
    }
    if (!existing.fallbackEmail && event.parentContactEmail) {
      existing.fallbackEmail = event.parentContactEmail;
    }
    if (!existing.fallbackUrl && event.parentContactUrl) {
      existing.fallbackUrl = event.parentContactUrl;
    }
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
        name: contact?.name || entry.fallbackName || entry.contactId,
        email: contact?.email ?? entry.fallbackEmail ?? null,
        url: contact?.url ?? entry.fallbackUrl ?? null,
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
  const communicationTotals = createZeroCommunicationTotals();
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

    const ownerKey = event.parentContactOwnerId?.trim() ?? "";
    if (!ownerKey) continue;
    const ownerRow = ownerMap.get(ownerKey) ?? {
      ownerId: ownerKey,
      ownerLabel: event.parentContactOwnerLabel?.trim() || ownerKey,
      ...createZeroTotals(),
    };
    applyHireEventTotals(ownerRow, event);
    ownerMap.set(ownerKey, ownerRow);
  }

  for (const event of communicationEvents) {
    applyCommunicationTotals(communicationTotals, event.method);
    const eventMonthKey = normalizeMonthKey(event.eventDate);
    const eventMonth = eventMonthKey ? monthMap.get(eventMonthKey) : null;
    if (!eventMonth) continue;
    applyCommunicationTotals(eventMonth, event.method);
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
    communicationTotals,
    monthly: monthlyPoints,
    ownerBreakdown,
    hiredContacts,
    contractorReferrals,
    generatedAt: new Date().toISOString(),
  };
  return summary;
};
