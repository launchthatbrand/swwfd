/* eslint-disable @typescript-eslint/array-type */
/* eslint-disable @typescript-eslint/consistent-type-definitions */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable no-restricted-properties */
"use node";

import { v } from "convex/values";

import { internalAction } from "./_generated/server";

const MONDAY_API_URL = "https://api.monday.com/v2";
const ITEM_PAGE_LIMIT_MAX = 200;
const ITEMS_BY_IDS_CHUNK_SIZE = 25;

type MondayColumn = {
  id?: string | null;
  title?: string | null;
  type?: string | null;
  settings_str?: string | null;
};

type MigrationSourceUpdate = {
  id: string;
  body: string;
  createdAt: string | null;
  updatedAt: string | null;
  creatorName: string | null;
};

type MigrationSourceColumnValue = {
  id: string;
  type: string;
  text: string | null;
  value: string | null;
};

type MigrationSourceSubitem = {
  id: string;
  name: string;
  columnValues: MigrationSourceColumnValue[];
  updates: MigrationSourceUpdate[];
};

type MigrationSourceItem = {
  id: string;
  name: string;
  email: string | null;
  mainDatabaseId: string | null;
  mirrorDatabaseId: string | null;
  relationMainId: string | null;
  ownerIds: string[];
  updates: MigrationSourceUpdate[];
  subitems: MigrationSourceSubitem[];
};

type MigrationEntryInput = {
  sourceEntityType: "parent_update" | "subitem" | "subitem_update";
  sourceEntityId: string;
  sourceItemId: string;
  targetItemId: string;
  targetEntityId: string | null;
};

const normalizeText = (value: string | null | undefined) => {
  if (!value) return "";
  return value.trim().toLowerCase();
};

const isNumericId = (value: string | null | undefined) => {
  if (!value) return false;
  return /^\d+$/.test(value.trim());
};

const escapeHtml = (value: string) => {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
};

const parseJsonSafe = <T>(value: string | null | undefined): T | null => {
  if (!value || value.trim().length === 0) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const parseSubitemBoardIdFromSubtasksColumn = (column: MondayColumn | null) => {
  if (!column?.settings_str) return null;
  const parsed = parseJsonSafe<{ boardIds?: number[] | string[] }>(column.settings_str);
  const rawBoardId = parsed?.boardIds?.[0];
  if (rawBoardId === undefined || rawBoardId === null) return null;
  const boardId = String(rawBoardId).trim();
  return boardId.length > 0 ? boardId : null;
};

const getMondayApiKey = () => {
  const apiKey = process.env.MONDAY_API_KEY?.trim() ?? "";
  if (!apiKey) {
    throw new Error("MONDAY_API_KEY is missing");
  }
  return apiKey;
};

const callMondayGraphQL = async <TData>(
  queryText: string,
  variables: Record<string, unknown>,
) => {
  const response = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      Authorization: getMondayApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: queryText, variables }),
  });
  if (!response.ok) {
    throw new Error(`Monday API request failed (${response.status})`);
  }
  const json = (await response.json()) as {
    data?: TData;
    errors?: Array<{ message?: string }>;
  };
  if (Array.isArray(json.errors) && json.errors.length > 0) {
    const message =
      json.errors.map((entry) => entry.message).filter(Boolean).join(" | ") ||
      "Unknown Monday GraphQL error";
    throw new Error(message);
  }
  if (!json.data) {
    throw new Error("Monday API returned no data");
  }
  return json.data;
};

const parseLinkedPulseId = (value: string | null | undefined) => {
  const parsed = parseJsonSafe<{
    linkedPulseIds?: Array<{ linkedPulseId?: number | string | null }>;
  }>(value);
  const linkedRaw = parsed?.linkedPulseIds?.[0]?.linkedPulseId;
  if (linkedRaw === undefined || linkedRaw === null) return null;
  const linked = String(linkedRaw).trim();
  return linked.length > 0 ? linked : null;
};

const parseDateOnly = (value: string | null | undefined) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString().slice(0, 10);
};

const parseDateFromColumnValue = (value: string | null | undefined, text: string | null) => {
  const parsed = parseJsonSafe<{ date?: string; time?: string }>(value);
  if (parsed?.date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) {
    return parsed.date;
  }
  return parseDateOnly(text);
};

const extractStringFromColumn = (
  column: MigrationSourceColumnValue | undefined,
): string | null => {
  const textValue = column?.text?.trim();
  if (textValue && textValue.length > 0) return textValue;
  return null;
};

const parsePeopleColumnValue = (value: string | null | undefined) => {
  const parsed = parseJsonSafe<{
    personsAndTeams?: Array<{ id?: number | string; kind?: string }>;
  }>(value);
  const persons = (parsed?.personsAndTeams ?? [])
    .filter((entry) => entry.kind === "person" && entry.id !== undefined && entry.id !== null)
    .map((entry) => {
      if (typeof entry.id === "number") return entry.id;
      if (/^\d+$/.test(String(entry.id))) return Number(entry.id);
      return String(entry.id);
    });
  return persons;
};

const buildMigrationHeader = (args: {
  sourceBoardName: string | null;
  sourceBoardId: string;
  monthTag: string;
  sourceItemId: string;
  sourceItemName: string;
  sourceEntity: string;
  sourceEntityId: string;
  createdAt?: string | null;
  creatorName?: string | null;
}) => {
  const boardLabel =
    args.sourceBoardName && args.sourceBoardName.trim().length > 0
      ? args.sourceBoardName.trim()
      : args.sourceBoardId;
  const createdAtLabel =
    args.createdAt && args.createdAt.trim().length > 0 ? args.createdAt : "unknown time";
  const creatorLabel =
    args.creatorName && args.creatorName.trim().length > 0 ? args.creatorName : "Unknown user";
  const line = [
    `MIGRATED`,
    `month=${args.monthTag}`,
    `source_board=${args.sourceBoardId}`,
    `source_item=${args.sourceItemId}`,
    `source_entity=${args.sourceEntity}`,
    `source_entity_id=${args.sourceEntityId}`,
  ].join(" | ");
  return `<p><strong>${escapeHtml(line)}</strong></p><p><em>${escapeHtml(
    `From ${boardLabel} / ${args.sourceItemName} · by ${creatorLabel} · ${createdAtLabel}`,
  )}</em></p><hr/>`;
};

const buildMigrationUpdateBody = (args: {
  sourceBoardName: string | null;
  sourceBoardId: string;
  monthTag: string;
  sourceItemId: string;
  sourceItemName: string;
  sourceEntity: string;
  sourceEntityId: string;
  sourceUpdateBody: string;
  createdAt?: string | null;
  creatorName?: string | null;
}) => {
  const header = buildMigrationHeader(args);
  const body = args.sourceUpdateBody.trim();
  if (body.length === 0) {
    return `${header}<p><em>No message body.</em></p>`;
  }
  return `${header}${body}`;
};

const makeSubitemUpdateEntityId = (sourceSubitemId: string, sourceUpdateId: string) => {
  return `${sourceSubitemId}:${sourceUpdateId}`;
};

const chunk = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const fetchBoardColumns = async (boardId: string) => {
  interface Data {
    boards?: Array<{ id?: string; name?: string | null; columns?: MondayColumn[] }>;
  }
  const data = await callMondayGraphQL<Data>(
    `
      query GetBoardColumns($boardId: ID!) {
        boards(ids: [$boardId]) {
          id
          name
          columns {
            id
            title
            type
            settings_str
          }
        }
      }
    `,
    { boardId },
  );
  const board = data.boards?.[0];
  return {
    boardName: board?.name?.trim() || null,
    columns: board?.columns ?? [],
  };
};

const fetchSourcePage = async (args: {
  sourceBoardId: string;
  cursor?: string | null;
  pageSize: number;
}) => {
  interface Data {
    boards?: Array<{
      name?: string | null;
      items_page?: {
        cursor?: string | null;
        items?: Array<{
          id: string;
          name?: string | null;
          updates?: Array<{
            id?: string | null;
            body?: string | null;
            created_at?: string | null;
            updated_at?: string | null;
            creator?: { name?: string | null } | null;
          }>;
          subitems?: Array<{
            id?: string | null;
            name?: string | null;
            updates?: Array<{
              id?: string | null;
              body?: string | null;
              created_at?: string | null;
              updated_at?: string | null;
              creator?: { name?: string | null } | null;
            }>;
            column_values?: Array<{
              id?: string | null;
              type?: string | null;
              text?: string | null;
              value?: string | null;
            }>;
          }>;
          column_values?: Array<{
            id?: string | null;
            type?: string | null;
            text?: string | null;
            value?: string | null;
          }>;
        }>;
      };
    }>;
  }

  const limit = Math.min(Math.max(args.pageSize, 1), ITEM_PAGE_LIMIT_MAX);
  const queryText = `
    query FetchSourceMigrationPage($boardId: ID!, $limit: Int!${
      args.cursor ? ", $cursor: String" : ""
    }) {
      boards(ids: [$boardId]) {
        name
        items_page(limit: $limit ${args.cursor ? "cursor: $cursor" : ""}) {
          cursor
          items {
            id
            name
            updates(limit: 200) {
              id
              body
              created_at
              updated_at
              creator {
                name
              }
            }
            subitems {
              id
              name
              updates(limit: 200) {
                id
                body
                created_at
                updated_at
                creator {
                  name
                }
              }
              column_values {
                id
                type
                text
                value
              }
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

  const data = await callMondayGraphQL<Data>(queryText, {
    boardId: args.sourceBoardId,
    limit,
    ...(args.cursor ? { cursor: args.cursor } : {}),
  });

  const board = data.boards?.[0];
  const page = board?.items_page;
  const itemsRaw = page?.items ?? [];
  const items: MigrationSourceItem[] = itemsRaw.map((item) => {
    const sourceColumns = item.column_values ?? [];
    const byId = Object.fromEntries(
      sourceColumns
        .filter((column) => column.id)
        .map((column) => [String(column.id), column]),
    ) as Record<
      string,
      {
        id?: string | null;
        type?: string | null;
        text?: string | null;
        value?: string | null;
      }
    >;

    const parentUpdates: MigrationSourceUpdate[] = (item.updates ?? [])
      .map((update) => {
        const updateId = update.id?.trim();
        if (!updateId) return null;
        return {
          id: updateId,
          body: update.body ?? "",
          createdAt: update.created_at ?? null,
          updatedAt: update.updated_at ?? null,
          creatorName: update.creator?.name ?? null,
        } satisfies MigrationSourceUpdate;
      })
      .filter((entry): entry is MigrationSourceUpdate => Boolean(entry));

    const subitems: MigrationSourceSubitem[] = (item.subitems ?? [])
      .map((subitem) => {
        const subitemId = subitem.id?.trim();
        if (!subitemId) return null;
        const subitemUpdates: MigrationSourceUpdate[] = (subitem.updates ?? [])
          .map((update) => {
            const updateId = update.id?.trim();
            if (!updateId) return null;
            return {
              id: updateId,
              body: update.body ?? "",
              createdAt: update.created_at ?? null,
              updatedAt: update.updated_at ?? null,
              creatorName: update.creator?.name ?? null,
            } satisfies MigrationSourceUpdate;
          })
          .filter((entry): entry is MigrationSourceUpdate => Boolean(entry));
        const columnValues: MigrationSourceColumnValue[] = (subitem.column_values ?? [])
          .map((column) => {
            const id = column.id?.trim();
            const type = column.type?.trim();
            if (!id || !type) return null;
            return {
              id,
              type,
              text: column.text ?? null,
              value: column.value ?? null,
            } satisfies MigrationSourceColumnValue;
          })
          .filter((entry): entry is MigrationSourceColumnValue => Boolean(entry));
        return {
          id: subitemId,
          name: (subitem.name ?? "").trim(),
          updates: subitemUpdates,
          columnValues,
        } satisfies MigrationSourceSubitem;
      })
      .filter((entry): entry is MigrationSourceSubitem => Boolean(entry));

    // Extract owner IDs from the first people-type column.
    const ownerIds = (() => {
      const peopleCol = sourceColumns.find(
        (col) =>
          col.type === "multiple-person" ||
          col.type === "people" ||
          col.id === "people__1" ||
          col.id === "person",
      );
      if (!peopleCol?.value) return [] as string[];
      try {
        const parsed = JSON.parse(peopleCol.value) as {
          personsAndTeams?: Array<{ id?: number | string; kind?: string }>;
        };
        return (parsed.personsAndTeams ?? [])
          .filter((entry) => entry.kind === "person" && entry.id != null)
          .map((entry) => String(entry.id))
          .filter((id) => id.trim().length > 0);
      } catch {
        return [] as string[];
      }
    })();

    return {
      id: String(item.id),
      name: (item.name ?? "").trim(),
      email: extractStringFromColumn(
        byId.email_mkwk8x9h
          ? {
              id: "email_mkwk8x9h",
              type: byId.email_mkwk8x9h.type ?? "email",
              text: byId.email_mkwk8x9h.text ?? null,
              value: byId.email_mkwk8x9h.value ?? null,
            }
          : undefined,
      ),
      mainDatabaseId: byId.main_database_id?.text?.trim() || null,
      mirrorDatabaseId: byId.mirror_og_id?.text?.trim() || null,
      relationMainId: parseLinkedPulseId(byId.board_relation__1?.value),
      ownerIds,
      updates: parentUpdates,
      subitems,
    } satisfies MigrationSourceItem;
  });

  return {
    sourceBoardName: board?.name?.trim() || null,
    nextCursor: page?.cursor ?? null,
    items,
  };
};

const fetchTargetItemsByIds = async (args: {
  targetBoardId: string;
  ids: string[];
}) => {
  interface Data {
    items?: Array<{
      id?: string | null;
      name?: string | null;
      state?: string | null;
      board?: { id?: string | null } | null;
    }>;
  }
  const uniqueIds = Array.from(
    new Set(args.ids.map((entry) => entry.trim()).filter((entry) => entry.length > 0)),
  );
  const found = new Map<string, { id: string; name: string | null }>();
  for (const idsChunk of chunk(uniqueIds, ITEMS_BY_IDS_CHUNK_SIZE)) {
    const data = await callMondayGraphQL<Data>(
      `
        query GetItemsByIds($ids: [ID!]) {
          items(ids: $ids) {
            id
            name
            state
            board {
              id
            }
          }
        }
      `,
      { ids: idsChunk },
    );
    for (const item of data.items ?? []) {
      const itemId = item.id?.trim();
      if (!itemId) continue;
      const boardId = item.board?.id?.trim() ?? "";
      const state = (item.state ?? "").toLowerCase();
      if (boardId !== args.targetBoardId) continue;
      if (state === "deleted") continue;
      found.set(itemId, {
        id: itemId,
        name: item.name?.trim() || null,
      });
    }
  }
  return found;
};

const findTargetItemByEmail = async (args: {
  targetBoardId: string;
  email: string;
}) => {
  interface Data {
    boards?: Array<{
      items_page?: {
        items?: Array<{
          id?: string | null;
          name?: string | null;
          board?: { id?: string | null } | null;
          column_values?: Array<{ id?: string | null; text?: string | null }>;
        }>;
      };
    }>;
  }
  const email = args.email.trim().toLowerCase();
  if (!email) return null;
  // compare_value must be inlined — Monday types it as `CompareValue`, not String.
  const safeEmail = email.replace(/[^a-zA-Z0-9@._+\-]/g, "");
  const data = await callMondayGraphQL<Data>(
    `
      query FindTargetByEmail($boardId: ID!) {
        boards(ids: [$boardId]) {
          items_page(
            limit: 10
            query_params: {
              rules: [
                {
                  column_id: "email__1"
                  compare_value: ["${safeEmail}"]
                  operator: any_of
                }
              ]
            }
          ) {
            items {
              id
              name
              board {
                id
              }
              column_values(ids: ["email__1"]) {
                id
                text
              }
            }
          }
        }
      }
    `,
    { boardId: args.targetBoardId },
  );
  const candidates = data.boards?.[0]?.items_page?.items ?? [];
  const exact = candidates.find((candidate) => {
    const boardId = candidate.board?.id?.trim() ?? "";
    if (boardId !== args.targetBoardId) return false;
    const candidateEmail = candidate.column_values?.[0]?.text?.trim().toLowerCase() ?? "";
    return candidateEmail === email;
  });
  const id = exact?.id?.trim();
  if (!id) return null;
  return {
    id,
    name: exact?.name?.trim() || null,
  };
};

const getSubtasksColumn = (columns: MondayColumn[]) => {
  return columns.find((column) => normalizeText(column.type) === "subtasks") ?? null;
};

const buildTitleToColumnMap = (columns: MondayColumn[]) => {
  const map = new Map<string, MondayColumn[]>();
  for (const column of columns) {
    const title = normalizeText(column.title);
    if (!title) continue;
    const list = map.get(title) ?? [];
    list.push(column);
    map.set(title, list);
  }
  return map;
};

const mapSourceToTargetSubitemColumnId = (args: {
  sourceColumn: MigrationSourceColumnValue;
  sourceColumnTitleById: Record<string, string>;
  targetColumns: MondayColumn[];
  targetColumnsByTitle: Map<string, MondayColumn[]>;
}) => {
  const sourceId = args.sourceColumn.id;
  const sourceTitle = normalizeText(args.sourceColumnTitleById[sourceId] ?? sourceId);
  if (!sourceTitle) return null;
  const sameTitleCandidates = args.targetColumnsByTitle.get(sourceTitle) ?? [];
  if (sameTitleCandidates.length === 1) {
    return sameTitleCandidates[0]?.id?.trim() || null;
  }
  if (sameTitleCandidates.length > 1) {
    const exactIdMatch = sameTitleCandidates.find(
      (entry) => normalizeText(entry.id) === normalizeText(sourceId),
    );
    if (exactIdMatch?.id?.trim()) return exactIdMatch.id.trim();
    const first = sameTitleCandidates[0]?.id?.trim();
    if (first) return first;
  }
  const sameId = args.targetColumns.find(
    (targetColumn) => normalizeText(targetColumn.id) === normalizeText(sourceId),
  );
  if (sameId?.id?.trim()) return sameId.id.trim();
  return null;
};

const mapSubitemColumnValueForTarget = (args: {
  sourceColumn: MigrationSourceColumnValue;
  targetColumnType: string;
}) => {
  const targetType = normalizeText(args.targetColumnType);
  if (targetType === "file" || targetType === "files") {
    return { shouldSkip: true as const, value: null };
  }
  if (targetType === "people") {
    const persons = parsePeopleColumnValue(args.sourceColumn.value);
    if (persons.length === 0) {
      return { shouldSkip: true as const, value: null };
    }
    return {
      shouldSkip: false as const,
      value: {
        personsAndTeams: persons.map((id) => ({ id, kind: "person" as const })),
      },
    };
  }
  if (targetType === "status" || targetType === "dropdown") {
    const label = args.sourceColumn.text?.trim() ?? "";
    if (!label) {
      return { shouldSkip: true as const, value: null };
    }
    return { shouldSkip: false as const, value: { label } };
  }
  if (targetType === "date") {
    const date = parseDateFromColumnValue(args.sourceColumn.value, args.sourceColumn.text);
    if (!date) {
      return { shouldSkip: true as const, value: null };
    }
    return { shouldSkip: false as const, value: { date } };
  }
  if (targetType === "long_text") {
    const text = args.sourceColumn.text?.trim() ?? "";
    if (!text) return { shouldSkip: true as const, value: null };
    return { shouldSkip: false as const, value: { text } };
  }
  const text = args.sourceColumn.text?.trim() ?? "";
  if (!text) {
    return { shouldSkip: true as const, value: null };
  }
  return { shouldSkip: false as const, value: text };
};

const createSubitemOnTarget = async (args: {
  parentItemId: string;
  itemName: string;
  columnValues: Record<string, unknown>;
}) => {
  interface Data {
    create_subitem?: { id?: string | null };
  }
  const data = await callMondayGraphQL<Data>(
    `
      mutation CreateSubitem(
        $parentItemId: ID!
        $itemName: String!
        $columnValues: JSON!
      ) {
        create_subitem(
          parent_item_id: $parentItemId
          item_name: $itemName
          column_values: $columnValues
          create_labels_if_missing: true
        ) {
          id
        }
      }
    `,
    {
      parentItemId: args.parentItemId,
      itemName: args.itemName,
      columnValues: JSON.stringify(args.columnValues),
    },
  );
  const createdId = data.create_subitem?.id?.trim() ?? "";
  if (!createdId) {
    throw new Error("Monday did not return subitem id");
  }
  return createdId;
};

const createUpdateOnTarget = async (args: { itemId: string; body: string }) => {
  interface Data {
    create_update?: { id?: string | null };
  }
  const data = await callMondayGraphQL<Data>(
    `
      mutation CreateUpdate($itemId: ID!, $body: String!) {
        create_update(item_id: $itemId, body: $body) {
          id
        }
      }
    `,
    {
      itemId: args.itemId,
      body: args.body,
    },
  );
  const updateId = data.create_update?.id?.trim() ?? "";
  if (!updateId) {
    throw new Error("Monday did not return update id");
  }
  return updateId;
};

const ONBOARDING_STEP_COLUMN_MAP: Array<{
  patterns: string[];
  columnId: string;
}> = [
  { patterns: ["welcome email"], columnId: "color_mm1db321" },
  { patterns: ["phone screen"], columnId: "color_mm1dwr4k" },
  { patterns: ["program lead", "pl contact"], columnId: "color_mm1dwtvd" },
  { patterns: ["referred", "resume referral"], columnId: "color_mm1dnr11" },
  { patterns: ["interview"], columnId: "color_mm1dgeqy" },
  { patterns: ["hired"], columnId: "color_mm1d80yc" },
  { patterns: ["retained", "30-60-90"], columnId: "color_mm1djwjj" },
];

const classifySubitemForProgressColumn = (name: string): string | null => {
  const normalized = normalizeText(name);
  for (const rule of ONBOARDING_STEP_COLUMN_MAP) {
    if (rule.patterns.some((p) => normalized.includes(p))) return rule.columnId;
  }
  return null;
};

const updateProgressColumnOnTarget = async (args: {
  boardId: string;
  itemId: string;
  columnId: string;
}) => {
  interface Data {
    change_simple_column_value?: { id?: string | null };
  }
  await callMondayGraphQL<Data>(
    `
      mutation UpdateProgressColumn($boardId: ID!, $itemId: ID!, $columnId: String!, $value: String!) {
        change_simple_column_value(board_id: $boardId, item_id: $itemId, column_id: $columnId, value: $value) {
          id
        }
      }
    `,
    {
      boardId: args.boardId,
      itemId: args.itemId,
      columnId: args.columnId,
      value: "Done",
    },
  );
};

// ---------------------------------------------------------------------------
// Touch upsert helper — one row per (contact, employee, month) on touch board
// ---------------------------------------------------------------------------

const TOUCH_RELATION_COLUMN_ID_NODE = "board_relation_mm0wbvrb";

const upsertTouchRecordForMigration = async (args: {
  touchBoardId: string;
  contactItemId: string;
  contactName: string;
  ownerId: string;
  monthKey: string;
  touchDate: string;
}) => {
  const touchKey = `tk:${args.contactItemId}:${args.ownerId}:${args.monthKey}`;

  // Resolve touch board columns.
  interface ColumnMeta { id?: string | null; title?: string | null; type?: string | null; }
  interface ColumnsData { boards?: Array<{ columns?: ColumnMeta[] }>; }
  const colsData = await callMondayGraphQL<ColumnsData>(
    `query ResolveTouchCols($b: ID!) { boards(ids: [$b]) { columns { id title type } } }`,
    { b: args.touchBoardId },
  );
  const cols = colsData.boards?.[0]?.columns ?? [];
  const byTitle = (needle: string) =>
    cols.find((c) => (c.title ?? "").toLowerCase().includes(needle.toLowerCase()));
  const byType = (type: string) => cols.find((c) => (c.type ?? "").toLowerCase() === type);

  const touchDateColumnId =
    byTitle("touch date")?.id ?? byTitle("touch_date")?.id ?? byType("date")?.id ?? null;
  const ownerIdColumnId = byTitle("owner_id")?.id ?? byTitle("owner id")?.id ?? "text_mm0wb7qt";
  const ownerPeopleColumnId =
    byTitle("touched by")?.id ?? byTitle("owner")?.id ?? byType("people")?.id ?? null;
  const sourceColumnId = byTitle("source")?.id ?? null;

  // Find an existing row for this contact linked via board_relation.
  interface TouchItem { id: string; name?: string | null; }
  interface TouchQueryData { boards?: Array<{ items_page?: { items?: TouchItem[] } }>; }
  // compare_value must be inlined — Monday's GraphQL schema types it as
  // `CompareValue` (not String), so passing it as a variable causes a type error.
  const safeRelId = TOUCH_RELATION_COLUMN_ID_NODE.replace(/[^a-zA-Z0-9_]/g, "");
  const safeCid = args.contactItemId.replace(/[^0-9]/g, "");
  const queryData = await callMondayGraphQL<TouchQueryData>(
    `
      query FindTouchRows($b: ID!) {
        boards(ids: [$b]) {
          items_page(
            limit: 50
            query_params: { rules: [{ column_id: "${safeRelId}", compare_value: ["${safeCid}"], operator: any_of }] }
          ) { items { id name } }
        }
      }
    `,
    { b: args.touchBoardId },
  );
  const existingItems = queryData.boards?.[0]?.items_page?.items ?? [];
  const existingRow = existingItems.find((item) => (item.name ?? "").includes(`[${touchKey}]`));

  if (existingRow) {
    if (touchDateColumnId) {
      interface UpdateData { change_simple_column_value?: { id?: string | null } | null; }
      await callMondayGraphQL<UpdateData>(
        `
          mutation UpdateTouchDate($b: ID!, $i: ID!, $col: String!, $val: String!) {
            change_simple_column_value(board_id: $b, item_id: $i, column_id: $col, value: $val) { id }
          }
        `,
        {
          b: args.touchBoardId,
          i: existingRow.id,
          col: touchDateColumnId,
          val: JSON.stringify({ date: args.touchDate }),
        },
      );
    }
    return { upserted: "updated" as const };
  }

  // Create a new touchpoint row.
  const itemName = `${args.contactName} [${touchKey}]`;
  const columnValues: Record<string, unknown> = {};
  if (touchDateColumnId) columnValues[touchDateColumnId] = { date: args.touchDate };
  if (ownerPeopleColumnId && /^\d+$/.test(args.ownerId)) {
    columnValues[ownerPeopleColumnId] = {
      personsAndTeams: [{ id: Number(args.ownerId), kind: "person" }],
    };
  }
  columnValues[ownerIdColumnId] = args.ownerId;
  columnValues[TOUCH_RELATION_COLUMN_ID_NODE] = { item_ids: [Number(args.contactItemId)] };
  if (sourceColumnId) columnValues[sourceColumnId] = "migration";

  interface CreateData { create_item?: { id?: string | null } | null; }
  await callMondayGraphQL<CreateData>(
    `
      mutation CreateTouchRow($b: ID!, $name: String!, $vals: JSON!) {
        create_item(board_id: $b, item_name: $name, column_values: $vals, create_labels_if_missing: true) { id }
      }
    `,
    { b: args.touchBoardId, name: itemName, vals: JSON.stringify(columnValues) },
  );
  return { upserted: "created" as const };
};

const getSourceItemValidator = () =>
  v.object({
    id: v.string(),
    name: v.string(),
    email: v.union(v.string(), v.null()),
    mainDatabaseId: v.union(v.string(), v.null()),
    mirrorDatabaseId: v.union(v.string(), v.null()),
    relationMainId: v.union(v.string(), v.null()),
    ownerIds: v.array(v.string()),
    updates: v.array(
      v.object({
        id: v.string(),
        body: v.string(),
        createdAt: v.union(v.string(), v.null()),
        updatedAt: v.union(v.string(), v.null()),
        creatorName: v.union(v.string(), v.null()),
      }),
    ),
    subitems: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        columnValues: v.array(
          v.object({
            id: v.string(),
            type: v.string(),
            text: v.union(v.string(), v.null()),
            value: v.union(v.string(), v.null()),
          }),
        ),
        updates: v.array(
          v.object({
            id: v.string(),
            body: v.string(),
            createdAt: v.union(v.string(), v.null()),
            updatedAt: v.union(v.string(), v.null()),
            creatorName: v.union(v.string(), v.null()),
          }),
        ),
      }),
    ),
  });

const existingEntriesValidator = v.object({
  parentUpdateEntityIds: v.array(v.string()),
  subitemEntityIds: v.array(v.string()),
  subitemUpdateEntityIds: v.array(v.string()),
  sourceSubitemToTargetSubitem: v.array(
    v.object({
      sourceSubitemId: v.string(),
      targetSubitemId: v.string(),
    }),
  ),
});

const createdEntryValidator = v.object({
  sourceEntityType: v.union(
    v.literal("parent_update"),
    v.literal("subitem"),
    v.literal("subitem_update"),
  ),
  sourceEntityId: v.string(),
  sourceItemId: v.string(),
  targetItemId: v.string(),
  targetEntityId: v.union(v.string(), v.null()),
});

const mondayColumnValidator = v.object({
  id: v.optional(v.union(v.string(), v.null())),
  title: v.optional(v.union(v.string(), v.null())),
  type: v.optional(v.union(v.string(), v.null())),
  settings_str: v.optional(v.union(v.string(), v.null())),
});

export const fetchSourcePageAction = internalAction({
  args: {
    sourceBoardId: v.string(),
    targetBoardId: v.string(),
    cursor: v.optional(v.union(v.string(), v.null())),
    pageSize: v.number(),
  },
  returns: v.object({
    sourceBoardName: v.union(v.string(), v.null()),
    sourceSubitemBoardId: v.union(v.string(), v.null()),
    targetSubitemBoardId: v.union(v.string(), v.null()),
    sourceSubitemBoardColumns: v.array(mondayColumnValidator),
    targetSubitemBoardColumns: v.array(mondayColumnValidator),
    nextCursor: v.union(v.string(), v.null()),
    items: v.array(getSourceItemValidator()),
  }),
  handler: async (_ctx, args) => {
    // Fetch source page and both main-board columns in parallel.
    const [page, sourceBoardColumns, targetBoardColumns] = await Promise.all([
      fetchSourcePage({
        sourceBoardId: args.sourceBoardId,
        cursor: args.cursor ?? null,
        pageSize: args.pageSize,
      }),
      fetchBoardColumns(args.sourceBoardId),
      fetchBoardColumns(args.targetBoardId),
    ]);

    const sourceSubitemBoardId = parseSubitemBoardIdFromSubtasksColumn(
      getSubtasksColumn(sourceBoardColumns.columns),
    );
    const targetSubitemBoardId = parseSubitemBoardIdFromSubtasksColumn(
      getSubtasksColumn(targetBoardColumns.columns),
    );

    // Fetch both subitem boards in parallel (skip if board ID is unknown).
    const empty = { columns: [] as MondayColumn[] };
    const [sourceSubitemBoardResult, targetSubitemBoardResult] = await Promise.all([
      sourceSubitemBoardId ? fetchBoardColumns(sourceSubitemBoardId) : Promise.resolve(empty),
      targetSubitemBoardId ? fetchBoardColumns(targetSubitemBoardId) : Promise.resolve(empty),
    ]);

    return {
      sourceBoardName: page.sourceBoardName,
      sourceSubitemBoardId,
      targetSubitemBoardId,
      sourceSubitemBoardColumns: sourceSubitemBoardResult.columns,
      targetSubitemBoardColumns: targetSubitemBoardResult.columns,
      nextCursor: page.nextCursor,
      items: page.items,
    };
  },
});

export const migrateSourceItemAction = internalAction({
  args: {
    sourceBoardId: v.string(),
    sourceBoardName: v.union(v.string(), v.null()),
    targetBoardId: v.string(),
    monthTag: v.string(),
    dryRun: v.boolean(),
    includeParentUpdates: v.boolean(),
    includeSubitems: v.boolean(),
    includeSubitemUpdates: v.boolean(),
    updateProgressColumns: v.boolean(),
    monthKey: v.optional(v.union(v.string(), v.null())),
    sourceSubitemBoardId: v.optional(v.union(v.string(), v.null())),
    cachedTargetSubitemBoardId: v.optional(v.union(v.string(), v.null())),
    cachedSourceSubitemBoardColumns: v.optional(v.array(mondayColumnValidator)),
    cachedTargetSubitemBoardColumns: v.optional(v.array(mondayColumnValidator)),
    sourceItem: getSourceItemValidator(),
    existingEntries: existingEntriesValidator,
  },
  returns: v.object({
    processedContacts: v.number(),
    mappedContacts: v.number(),
    skippedContacts: v.number(),
    createdParentUpdates: v.number(),
    createdSubitems: v.number(),
    createdSubitemUpdates: v.number(),
    updatedProgressColumns: v.number(),
    createdTouchRecords: v.number(),
    errors: v.number(),
    createdEntries: v.array(createdEntryValidator),
    warnings: v.array(v.string()),
  }),
  handler: async (_ctx, args) => {
    const warnings: string[] = [];
    const createdEntries: MigrationEntryInput[] = [];

    const parentUpdateDone = new Set(args.existingEntries.parentUpdateEntityIds);
    const subitemDone = new Set(args.existingEntries.subitemEntityIds);
    const subitemUpdateDone = new Set(args.existingEntries.subitemUpdateEntityIds);
    const sourceSubitemToTargetSubitem = new Map(
      args.existingEntries.sourceSubitemToTargetSubitem.map((entry) => [
        entry.sourceSubitemId,
        entry.targetSubitemId,
      ]),
    );

    const candidateMainIds = [
      args.sourceItem.mainDatabaseId,
      args.sourceItem.mirrorDatabaseId,
      args.sourceItem.relationMainId,
    ]
      .map((entry) => (entry ? entry.trim() : ""))
      .filter((entry) => entry.length > 0);
    const numericCandidates = candidateMainIds.filter((entry) => isNumericId(entry));

    let targetItemId: string | null = null;
    if (numericCandidates.length > 0) {
      const targetMatches = await fetchTargetItemsByIds({
        targetBoardId: args.targetBoardId,
        ids: numericCandidates,
      });
      for (const candidate of numericCandidates) {
        if (targetMatches.has(candidate)) {
          targetItemId = candidate;
          break;
        }
      }
    }
    if (!targetItemId && args.sourceItem.email && args.sourceItem.email.trim().length > 0) {
      const foundByEmail = await findTargetItemByEmail({
        targetBoardId: args.targetBoardId,
        email: args.sourceItem.email,
      });
      if (foundByEmail?.id) {
        targetItemId = foundByEmail.id;
        warnings.push(
          `Resolved target item by email for source item ${args.sourceItem.id} (${args.sourceItem.name}).`,
        );
      }
    }

    if (!targetItemId) {
      return {
        processedContacts: 1,
        mappedContacts: 0,
        skippedContacts: 1,
        createdParentUpdates: 0,
        createdSubitems: 0,
        createdSubitemUpdates: 0,
        updatedProgressColumns: 0,
        createdTouchRecords: 0,
        errors: 0,
        createdEntries: [],
        warnings: [
          ...warnings,
          `No target item found for source item ${args.sourceItem.id} (${args.sourceItem.name}).`,
        ],
      };
    }

    let createdParentUpdates = 0;
    let createdSubitems = 0;
    let createdSubitemUpdates = 0;
    let updatedProgressColumns = 0;
    let createdTouchRecords = 0;
    let errors = 0;
    const progressColumnsToUpdate = new Set<string>();

    if (args.includeParentUpdates) {
      for (const update of args.sourceItem.updates) {
        if (parentUpdateDone.has(update.id)) continue;
        const body = buildMigrationUpdateBody({
          sourceBoardName: args.sourceBoardName,
          sourceBoardId: args.sourceBoardId,
          monthTag: args.monthTag,
          sourceItemId: args.sourceItem.id,
          sourceItemName: args.sourceItem.name,
          sourceEntity: "parent_update",
          sourceEntityId: update.id,
          sourceUpdateBody: update.body,
          createdAt: update.createdAt,
          creatorName: update.creatorName,
        });
        try {
          let createdUpdateId: string | null = null;
          if (!args.dryRun) {
            createdUpdateId = await createUpdateOnTarget({
              itemId: targetItemId,
              body,
            });
          }
          createdParentUpdates += 1;
          parentUpdateDone.add(update.id);
          createdEntries.push({
            sourceEntityType: "parent_update",
            sourceEntityId: update.id,
            sourceItemId: args.sourceItem.id,
            targetItemId,
            targetEntityId: createdUpdateId,
          });
        } catch (error) {
          errors += 1;
          warnings.push(
            `Failed to migrate parent update ${update.id} for source item ${args.sourceItem.id}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
    }

    if (args.includeSubitems && args.sourceItem.subitems.length > 0) {
      let targetSubitemBoardId: string | null;
      if (args.cachedTargetSubitemBoardId !== undefined) {
        targetSubitemBoardId = args.cachedTargetSubitemBoardId;
      } else {
        const targetBoardColumns = await fetchBoardColumns(args.targetBoardId);
        targetSubitemBoardId = parseSubitemBoardIdFromSubtasksColumn(
          getSubtasksColumn(targetBoardColumns.columns),
        );
      }
      const sourceSubitemBoardId = args.sourceSubitemBoardId ?? null;

      if (!targetSubitemBoardId || !sourceSubitemBoardId) {
        warnings.push(
          `Subitem board mapping missing for source item ${args.sourceItem.id}; skipping subitem migration.`,
        );
      } else {
        const sourceSubitemBoardColumns =
          args.cachedSourceSubitemBoardColumns
            ? { columns: args.cachedSourceSubitemBoardColumns as MondayColumn[] }
            : await fetchBoardColumns(sourceSubitemBoardId);
        const targetSubitemBoardColumns =
          args.cachedTargetSubitemBoardColumns
            ? { columns: args.cachedTargetSubitemBoardColumns as MondayColumn[] }
            : await fetchBoardColumns(targetSubitemBoardId);
        const sourceColumnTitleById = Object.fromEntries(
          sourceSubitemBoardColumns.columns
            .map((column) => {
              const id = column.id?.trim();
              if (!id) return null;
              return [id, column.title?.trim() || id] as const;
            })
            .filter((entry): entry is readonly [string, string] => Boolean(entry)),
        );
        const targetColumnsByTitle = buildTitleToColumnMap(targetSubitemBoardColumns.columns);
        const targetColumnById = new Map(
          targetSubitemBoardColumns.columns
            .map((column) => {
              const id = column.id?.trim();
              if (!id) return null;
              return [id, column] as const;
            })
            .filter((entry): entry is readonly [string, MondayColumn] => Boolean(entry)),
        );

        for (const sourceSubitem of args.sourceItem.subitems) {
          if (!subitemDone.has(sourceSubitem.id)) {
            const columnValues: Record<string, unknown> = {};
            for (const sourceColumn of sourceSubitem.columnValues) {
              const mappedColumnId = mapSourceToTargetSubitemColumnId({
                sourceColumn,
                sourceColumnTitleById,
                targetColumns: targetSubitemBoardColumns.columns,
                targetColumnsByTitle,
              });
              if (!mappedColumnId) continue;
              const targetColumn = targetColumnById.get(mappedColumnId);
              if (!targetColumn?.type) continue;
              const mappedValue = mapSubitemColumnValueForTarget({
                sourceColumn,
                targetColumnType: targetColumn.type,
              });
              if (mappedValue.shouldSkip) continue;
              columnValues[mappedColumnId] = mappedValue.value;
            }

            const cleanSubitemName = sourceSubitem.name.trim() || `Migrated subitem ${sourceSubitem.id}`;
            const targetSubitemName = `${cleanSubitemName} [migrated:${args.sourceBoardId}:${sourceSubitem.id}]`;
            try {
              let targetSubitemId: string | null = null;
              if (!args.dryRun) {
                targetSubitemId = await createSubitemOnTarget({
                  parentItemId: targetItemId,
                  itemName: targetSubitemName,
                  columnValues,
                });
              }
              createdSubitems += 1;
              subitemDone.add(sourceSubitem.id);
              if (targetSubitemId) {
                sourceSubitemToTargetSubitem.set(sourceSubitem.id, targetSubitemId);
              }
              createdEntries.push({
                sourceEntityType: "subitem",
                sourceEntityId: sourceSubitem.id,
                sourceItemId: args.sourceItem.id,
                targetItemId,
                targetEntityId: targetSubitemId,
              });
            } catch (error) {
              errors += 1;
              warnings.push(
                `Failed to create subitem ${sourceSubitem.id} for source item ${args.sourceItem.id}: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              );
            }
          }

          if (args.updateProgressColumns) {
            const progressColumnId = classifySubitemForProgressColumn(sourceSubitem.name);
            if (progressColumnId) {
              const statusCol = sourceSubitem.columnValues.find(
                (col) => col.id === "status9" || col.type === "color",
              );
              const isDone = normalizeText(statusCol?.text) === "done";
              if (isDone) {
                progressColumnsToUpdate.add(progressColumnId);
              }
            }
          }

          if (!args.includeSubitemUpdates) continue;
          const targetSubitemId = sourceSubitemToTargetSubitem.get(sourceSubitem.id) ?? null;
          if (!targetSubitemId) {
            if (!args.dryRun && sourceSubitem.updates.length > 0) {
              warnings.push(
                `Skipping subitem updates for ${sourceSubitem.id}; target subitem id unavailable.`,
              );
            }
            continue;
          }
          for (const update of sourceSubitem.updates) {
            const entityId = makeSubitemUpdateEntityId(sourceSubitem.id, update.id);
            if (subitemUpdateDone.has(entityId)) continue;
            const body = buildMigrationUpdateBody({
              sourceBoardName: args.sourceBoardName,
              sourceBoardId: args.sourceBoardId,
              monthTag: args.monthTag,
              sourceItemId: args.sourceItem.id,
              sourceItemName: args.sourceItem.name,
              sourceEntity: "subitem_update",
              sourceEntityId: entityId,
              sourceUpdateBody: update.body,
              createdAt: update.createdAt,
              creatorName: update.creatorName,
            });
            try {
              let createdUpdateId: string | null = null;
              if (!args.dryRun) {
                createdUpdateId = await createUpdateOnTarget({
                  itemId: targetSubitemId,
                  body,
                });
              }
              createdSubitemUpdates += 1;
              subitemUpdateDone.add(entityId);
              createdEntries.push({
                sourceEntityType: "subitem_update",
                sourceEntityId: entityId,
                sourceItemId: args.sourceItem.id,
                targetItemId,
                targetEntityId: createdUpdateId,
              });
            } catch (error) {
              errors += 1;
              warnings.push(
                `Failed to migrate subitem update ${entityId} for source item ${args.sourceItem.id}: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              );
            }
          }
        }
      }
    }

    if (args.updateProgressColumns && !args.dryRun && progressColumnsToUpdate.size > 0) {
      for (const columnId of progressColumnsToUpdate) {
        try {
          await updateProgressColumnOnTarget({
            boardId: args.targetBoardId,
            itemId: targetItemId,
            columnId,
          });
          updatedProgressColumns += 1;
        } catch (error) {
          warnings.push(
            `Failed to update progress column ${columnId} for target item ${targetItemId}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
    }

    // Upsert a touchpoint record on the touch board (one per contact-employee-month).
    // Only fires on a real run (not dryRun) when a monthKey and ownerId are available.
    const touchBoardId = process.env.MONDAY_CONTACT_TOUCHED_BOARD_ID?.trim() ?? "";
    const monthKey = args.monthKey?.trim() ?? "";
    const primaryOwnerId = args.sourceItem.ownerIds[0] ?? "";
    if (!args.dryRun && touchBoardId && monthKey && primaryOwnerId) {
      const touchDate = new Date().toISOString().slice(0, 10);
      try {
        const result = await upsertTouchRecordForMigration({
          touchBoardId,
          contactItemId: targetItemId,
          contactName: args.sourceItem.name,
          ownerId: primaryOwnerId,
          monthKey,
          touchDate,
        });
        createdTouchRecords += 1;
      } catch (touchErr) {
        warnings.push(
          `Touch upsert failed for item ${targetItemId} (non-fatal): ${
            touchErr instanceof Error ? touchErr.message : String(touchErr)
          }`,
        );
      }
    }

    return {
      processedContacts: 1,
      mappedContacts: 1,
      skippedContacts: 0,
      createdParentUpdates,
      createdSubitems,
      createdSubitemUpdates,
      updatedProgressColumns,
      createdTouchRecords,
      errors,
      createdEntries,
      warnings,
    };
  },
});
