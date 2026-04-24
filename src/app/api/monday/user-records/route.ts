import { NextResponse } from "next/server";

import { env } from "~/env";
import { requireVerifiedMondaySession } from "~/server/monday/session";

export const runtime = "nodejs";

const MONDAY_API_URL = "https://api.monday.com/v2";

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
  email: string | null;
  phone: string | null;
  address: string | null;
  referredToContractors: string | null;
  hiredWithContractor: string | null;
  hireDate: string | null;
  retentionPeriod: string | null;
  tags: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  contactDetails: Array<{ label: string; value: string }>;
};

type TouchRecord = {
  touchItemId: string;
  contactId: string | null;
  touchedAt: string | null;
  touchedBy: string | null;
  touchSource: string | null;
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
  const touchBoardId = env.MONDAY_CONTACT_TOUCHED_BOARD_ID?.trim() ?? "";
  if (!apiKey || !contactBoardId || !touchBoardId) {
    throw new Error(
      "Missing Monday config. Set MONDAY_API_KEY, MONDAY_BOARD_ID, MONDAY_CONTACT_TOUCHED_BOARD_ID.",
    );
  }
  return { apiKey, contactBoardId, touchBoardId };
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
      const parsed = JSON.parse(column.value) as { date?: string; time?: string };
      if (parsed.date && parsed.time) return `${parsed.date}T${parsed.time}Z`;
      if (parsed.date) return `${parsed.date}T00:00:00Z`;
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

const resolveTouchColumns = async (touchBoardId: string) => {
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
    relationColumnId: "board_relation_mm0wbvrb",
    contactItemIdColumnId:
      findByTitle("contact item")?.id ??
      findByTitle("contact id")?.id ??
      findByTitle("item id")?.id ??
      null,
    sourceColumnId: findByTitle("source")?.id ?? null,
  };
};

const fetchTouchPage = async (args: {
  touchBoardId: string;
  cursor: string | null;
  limit: number;
  dateRule?:
  | {
    touchDateColumnId: string;
    dateFrom: string;
    dateTo: string;
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
  const query = `
    query ListTouchItems($boardId: ID!, $limit: Int!${args.cursor ? ", $cursor: String" : ""}) {
      boards(ids: [$boardId]) {
        name
        items_page(
          limit: $limit
          ${args.cursor ? "cursor: $cursor" : ""}
          ${canPushDateRule
      ? `query_params: {
            rules: [{
              column_id: "${args.dateRule.touchDateColumnId}"
              compare_value: ["${args.dateRule.dateFrom}", "${args.dateRule.dateTo}"]
              operator: between
            }]
          }`
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
  const data = await callMondayGraphQL<Data>(query, {
    boardId: args.touchBoardId,
    limit: args.limit,
    ...(args.cursor ? { cursor: args.cursor } : {}),
  });
  return {
    boardName: data.boards?.[0]?.name ?? null,
    nextCursor: data.boards?.[0]?.items_page?.cursor ?? null,
    items: data.boards?.[0]?.items_page?.items ?? [],
  };
};

const extractContactIdFromTouch = (
  item: MondayBoardItem,
  columnIds: Awaited<ReturnType<typeof resolveTouchColumns>>,
) => {
  const values = item.column_values ?? [];
  const byId = (id: string | null) => values.find((column) => column.id === id);
  const relationValue = byId(columnIds.relationColumnId)?.value;
  if (relationValue) {
    try {
      const parsed = JSON.parse(relationValue) as {
        linkedPulseIds?: Array<{ linkedPulseId?: number | string }>;
      };
      const linkedId = parsed.linkedPulseIds?.[0]?.linkedPulseId;
      if (linkedId != null) return String(linkedId);
    } catch {
      // ignore
    }
  }
  const fallbackContactId = byId(columnIds.contactItemIdColumnId)?.text?.trim();
  return fallbackContactId && fallbackContactId.length > 0 ? fallbackContactId : null;
};

const touchMatchesFilters = (args: {
  touch: TouchRecord;
  ownerFilter: string;
  dateFrom: Date | null;
  dateTo: Date | null;
}) => {
  if (args.ownerFilter.length > 0) {
    const ownerNormalized = args.touch.touchedBy?.toLowerCase() ?? "";
    if (ownerNormalized !== args.ownerFilter) return false;
  }
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

const fetchContactRecordsByIds = async (args: {
  boardId: string;
  itemIds: string[];
}) => {
  // Monday's `items(ids: ...)` resolver effectively caps results to 25 per call,
  // even when passing larger ID arrays. Keep chunk size at 25 to avoid silent drops.
  const MONDAY_ITEMS_BY_IDS_CHUNK_SIZE = 25;
  const chunks: string[][] = [];
  const ids = args.itemIds;
  for (let index = 0; index < ids.length; index += MONDAY_ITEMS_BY_IDS_CHUNK_SIZE) {
    chunks.push(ids.slice(index, index + MONDAY_ITEMS_BY_IDS_CHUNK_SIZE));
  }

  const items: MondayBoardItem[] = [];
  for (const chunk of chunks) {
    interface Data {
      items?: MondayBoardItem[];
    }
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
    items.push(...(data.items ?? []));
  }

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
    const dateColumn = byId("date1__1");
    const creationLogColumn = byType("creation_log");

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

    let createdAt: string | null = parseDateValue(dateColumn);
    if (!createdAt && creationLogColumn?.value) {
      try {
        const parsed = JSON.parse(creationLogColumn.value) as { created_at?: unknown };
        if (typeof parsed.created_at === "string") createdAt = parsed.created_at;
      } catch {
        // ignore
      }
    }

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
      email: emailColumn?.text ?? null,
      phone: phoneColumn?.text ?? null,
      address,
      referredToContractors: toColumnDisplayValue(referredColumn?.text, referredColumn?.value) || null,
      hiredWithContractor: toColumnDisplayValue(hiredColumn?.text, hiredColumn?.value) || null,
      hireDate: hireDate,
      retentionPeriod: toColumnDisplayValue(retentionColumn?.text, retentionColumn?.value) || null,
      tags: toColumnDisplayValue(tagsColumn?.text, tagsColumn?.value) || null,
      createdAt: createdAt ?? item.updated_at ?? null,
      updatedAt: item.updated_at ?? null,
      contactDetails: details,
    };
  };

  const map = new Map<string, MergedRecord>();
  for (const item of items) {
    map.set(item.id, toContactRecord(item));
  }
  return map;
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
  const ownerFilter = url.searchParams.get("owner")?.trim().toLowerCase() ?? "";
  const statusFilter = url.searchParams.get("status")?.trim().toLowerCase() ?? "";
  const dateFrom = parseIsoDateOnly(url.searchParams.get("dateFrom"));
  const dateTo = parseIsoDateOnly(url.searchParams.get("dateTo"));
  const dateFromText = url.searchParams.get("dateFrom")?.trim() ?? "";
  const dateToText = url.searchParams.get("dateTo")?.trim() ?? "";

  const startedAt = Date.now();

  try {
    const touchColumns = await resolveTouchColumns(config.touchBoardId);
    const canApplyDateRule =
      !!touchColumns.touchDateColumnId &&
      isIsoDateOnly(dateFromText) &&
      isIsoDateOnly(dateToText);
    const shouldHydrateWholeMonth =
      !cursorStart &&
      canApplyDateRule &&
      search.length === 0 &&
      statusFilter.length === 0;

    const matchedTouches: TouchRecord[] = [];
    let cursor: string | null = cursorStart;
    let boardName: string | null = null;
    let scanPages = 0;
    const maxScanPages = shouldHydrateWholeMonth ? 200 : canApplyDateRule ? 10 : 25;
    const maxScanDurationMs = shouldHydrateWholeMonth ? 45_000 : 12_000;
    const maxMatchedTouches = shouldHydrateWholeMonth ? 10_000 : limit;
    while (matchedTouches.length < maxMatchedTouches && scanPages < maxScanPages) {
      const page = await fetchTouchPage({
        touchBoardId: config.touchBoardId,
        cursor,
        limit: 100,
        dateRule:
          scanPages === 0 && canApplyDateRule && touchColumns.touchDateColumnId
            ? {
              touchDateColumnId: touchColumns.touchDateColumnId,
              dateFrom: dateFromText,
              dateTo: dateToText,
            }
            : null,
      });
      boardName = boardName ?? page.boardName;
      cursor = page.nextCursor;
      scanPages += 1;

      for (const item of page.items) {
        const values = item.column_values ?? [];
        const byId = (id: string | null) => values.find((column) => column.id === id);
        const ownerIdText = byId(touchColumns.ownerIdColumnId)?.text?.trim() ?? null;
        const peopleIds = parsePeopleIds(byId(touchColumns.peopleColumnId)?.value);
        const touchedBy = peopleIds[0] ?? ownerIdText;
        const touchedAt = parseDateValue(byId(touchColumns.touchDateColumnId));
        const touchSource = byId(touchColumns.sourceColumnId)?.text?.trim() ?? null;
        const touch: TouchRecord = {
          touchItemId: item.id,
          contactId: extractContactIdFromTouch(item, touchColumns),
          touchedAt,
          touchedBy,
          touchSource,
        };
        if (!touchMatchesFilters({ touch, ownerFilter, dateFrom, dateTo })) {
          continue;
        }
        matchedTouches.push(touch);
        if (matchedTouches.length >= maxMatchedTouches) break;
      }

      if (!cursor) break;
      if (!shouldHydrateWholeMonth && matchedTouches.length >= limit) break;
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
    const selectedTouches = shouldHydrateWholeMonth
      ? matchedTouches
      : matchedTouches.slice(0, limit);

    const contactIds = Array.from(
      new Set(
        selectedTouches
          .map((touch) => touch.contactId)
          .filter((entry): entry is string => !!entry && entry.trim().length > 0),
      ),
    );
    const contactMap = await fetchContactRecordsByIds({
      boardId: config.contactBoardId,
      itemIds: contactIds,
    });

    const merged: MergedRecord[] = [];
    for (const touch of selectedTouches) {
      const contact = touch.contactId ? contactMap.get(touch.contactId) : undefined;
      if (!contact) continue;
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
        createdAt: touch.touchedAt ?? contact.createdAt,
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
      hydratedWholeMonth: shouldHydrateWholeMonth,
      hasOwner: ownerFilter.length > 0,
      hasSearch: search.length > 0,
      hasStatus: statusFilter.length > 0,
    });

    return toJson({
      ok: true,
      boardName: boardName ?? "Monday Board",
      records: merged,
      nextCursor: cursor,
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

