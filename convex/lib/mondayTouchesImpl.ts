import { callMondayGraphQL } from "./mondayGraphQL";

const TOUCH_RELATION_COLUMN_ID = "board_relation_mm0wbvrb";

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

export const hasMondayTouchConfig = () => {
  const boardId = process.env.MONDAY_CONTACT_TOUCHED_BOARD_ID?.trim() ?? "";
  return boardId.length > 0;
};

const getMondayTouchBoardId = () => {
  const boardId = process.env.MONDAY_CONTACT_TOUCHED_BOARD_ID?.trim() ?? "";
  if (!boardId) {
    throw new Error(
      "Missing Monday touch configuration. Set MONDAY_API_KEY and MONDAY_CONTACT_TOUCHED_BOARD_ID.",
    );
  }
  return boardId;
};

const toColumnDisplayValue = (
  text: string | null | undefined,
  rawValue: string | null | undefined,
) => {
  const normalizedText = text?.trim();
  if (normalizedText && normalizedText.length > 0) return normalizedText;
  if (!rawValue || rawValue.trim().length === 0) return "";
  try {
    const parsed = JSON.parse(rawValue) as Record<string, unknown>;
    if (typeof parsed.text === "string" && parsed.text.trim().length > 0) {
      return parsed.text.trim();
    }
    if (Array.isArray(parsed.labels)) {
      return parsed.labels
        .filter((entry): entry is string => typeof entry === "string")
        .join(", ");
    }
    if (typeof parsed.label === "string") return parsed.label;
  } catch {
    // ignore
  }
  return rawValue.trim();
};

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
    `query ResolveTouchBoardColumns($boardId: ID!) {
      boards(ids: [$boardId]) { columns { id title type } }
    }`,
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

  interface UsersData {
    users?: Array<{
      id?: string | number | null;
      name?: string | null;
      email?: string | null;
      photo_thumb?: string | null;
    }>;
  }
  const data = await callMondayGraphQL<UsersData>(
    `query GetUsersByIds($userIds: [ID!]) {
      users(ids: $userIds) { id name email photo_thumb }
    }`,
    { userIds: uniqueIds },
  );

  const result = new Map<
    string,
    { id: string; name: string | null; email: string | null; photoThumb: string | null }
  >();
  for (const user of data.users ?? []) {
    const id = user.id != null ? String(user.id).trim() : "";
    if (!id) continue;
    result.set(id, {
      id,
      name: user.name?.trim() || null,
      email: user.email?.trim() || null,
      photoThumb: user.photo_thumb?.trim() || null,
    });
  }
  return result;
};

export type MondayTouchRecord = {
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
  interviewingWithContractors: string | null;
  hiredWithContractor: string | null;
  hireDate: string | null;
  retentionPeriod: string | null;
  tags: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  lastTouchpointAt: string | null;
  contactDetails: Array<{ label: string; value: string }>;
  resumeFiles: [];
};

export const listMondayTouchBoardRecordsImpl = async (args?: {
  cursor?: string;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  owner?: string;
}) => {
  const boardId = getMondayTouchBoardId();
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
    `query ResolveTouchBoardColumns($boardId: ID!) {
      boards(ids: [$boardId]) { columns { id title type } }
    }`,
    { boardId },
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
    findByTitle("owner_id")?.id ?? findByTitle("owner id")?.id ?? "text_mm0wb7qt";
  const ownerPeopleColumnId =
    findByTitle("touched by")?.id ??
    findByTitle("owner")?.id ??
    findByType("people")?.id ??
    null;
  const emailColumnId = findByTitle("email")?.id ?? findByType("email")?.id ?? null;
  const relationColumnId = TOUCH_RELATION_COLUMN_ID;
  const sourceColumnId = findByTitle("source")?.id ?? null;

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
            column_values { id type text value }
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
    column_values?: Array<{
      id?: string;
      type?: string;
      text?: string | null;
      value?: string | null;
    }>;
  }

  interface TouchBoardQueryData {
    boards?: Array<{
      name?: string;
      items_page?: { cursor?: string | null; items?: TouchBoardItem[] };
    }>;
  }

  const limit = Math.min(Math.max(args?.limit ?? 100, 1), 500);
  const appliedFilters = { date: false, owner: false };
  const rules: string[] = [];

  if (!cursorArg) {
    if (
      shouldFilterByDateRange &&
      touchDateColumnId &&
      isIsoDateOnly(dateFromArg!) &&
      isIsoDateOnly(dateToArg!) &&
      /^[a-zA-Z0-9_]+$/.test(touchDateColumnId)
    ) {
      rules.push(`{
        column_id: "${touchDateColumnId}"
        compare_value: ["${dateFromArg}", "${dateToArg}"]
        operator: between
      }`);
      appliedFilters.date = true;
    }
    void ownerArg;
  }

  const fetchTouchItems = async (rulesToApply: string[]) => {
    const query = buildListTouchItemsQuery({
      includeCursor: !!cursorArg,
      rules: cursorArg ? [] : rulesToApply,
    });
    const data = await callMondayGraphQL<TouchBoardQueryData>(query, {
      boardId,
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
    const retry = await fetchTouchItems([]);
    boardName = retry.boardName;
    nextCursor = retry.nextCursor;
    items = retry.items;
    appliedFilters.date = false;
  }

  const records: MondayTouchRecord[] = items.map((item) => {
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
      interviewingWithContractors: null,
      hiredWithContractor: null,
      hireDate: null,
      retentionPeriod: null,
      tags: null,
      createdAt: touchDateIso ?? item.updated_at ?? null,
      updatedAt: item.updated_at ?? touchDateIso ?? null,
      lastTouchpointAt: touchDateIso ?? item.updated_at ?? null,
      contactDetails: detailEntries,
      resumeFiles: [],
    };
  });

  const ownerById = await resolveMondayUsersByIds(records.flatMap((record) => record.ownerIds));
  const recordsWithOwners = records.map((record) => ({
    ...record,
    ownerProfiles: record.ownerIds
      .map((id) => ownerById.get(id))
      .filter(
        (
          owner,
        ): owner is {
          id: string;
          name: string | null;
          email: string | null;
          photoThumb: string | null;
        } => Boolean(owner),
      ),
  }));

  return {
    records: recordsWithOwners,
    nextCursor,
    boardName,
    appliedFilters,
  };
};

export const upsertMondayTouchRecordImpl = async (args: {
  contactItemId: string;
  contactName: string;
  ownerId: string;
  monthKey?: string;
  source?: string;
}): Promise<{ id: string | null; upserted: "created" | "updated" | "skipped" }> => {
  const boardId = getMondayTouchBoardId();
  const monthKey = args.monthKey ?? new Date().toISOString().slice(0, 7);
  const touchKey = `tk:${args.contactItemId}:${args.ownerId}:${monthKey}`;
  const touchKeySuffix = ` [${touchKey}]`;
  const cols = await resolveTouchBoardColumns(boardId);

  interface TouchItem {
    id: string;
    name?: string | null;
  }
  interface TouchQueryData {
    boards?: Array<{
      items_page?: { items?: TouchItem[] };
    }>;
  }

  const safeRelationId = cols.relationColumnId.replace(/[^a-zA-Z0-9_]/g, "");
  const safeContactId = args.contactItemId.replace(/[^0-9]/g, "");
  const queryData = await callMondayGraphQL<TouchQueryData>(
    `query FindTouchRowsByContact($boardId: ID!, $limit: Int!) {
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
    }`,
    { boardId, limit: 50 },
  );

  const existingItems = queryData.boards?.[0]?.items_page?.items ?? [];
  const existingRow = existingItems.find((item) =>
    (item.name ?? "").includes(`[${touchKey}]`),
  );

  const today = new Date().toISOString().slice(0, 10);

  if (existingRow) {
    if (cols.touchDateColumnId) {
      await callMondayGraphQL<{ change_simple_column_value?: { id?: string | null } }>(
        `mutation UpdateTouchDate($boardId: ID!, $itemId: ID!, $columnId: String!, $value: String!) {
          change_simple_column_value(
            board_id: $boardId
            item_id: $itemId
            column_id: $columnId
            value: $value
          ) { id }
        }`,
        {
          boardId,
          itemId: existingRow.id,
          columnId: cols.touchDateColumnId,
          value: JSON.stringify({ date: today }),
        },
      );
    }
    return { id: existingRow.id, upserted: "updated" };
  }

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

  const result = await callMondayGraphQL<{ create_item?: { id?: string | null } }>(
    `mutation CreateTouchRecord($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
      create_item(
        board_id: $boardId
        item_name: $itemName
        column_values: $columnValues
        create_labels_if_missing: true
      ) { id }
    }`,
    {
      boardId,
      itemName,
      columnValues: JSON.stringify(columnValues),
    },
  );

  return { id: result.create_item?.id?.trim() ?? null, upserted: "created" };
};
