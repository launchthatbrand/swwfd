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
            column_values(ids: ["main_database_id", "mirror_og_id", "board_relation__1", "email_mkwk8x9h"]) {
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
  const data = await callMondayGraphQL<Data>(
    `
      query FindTargetByEmail($boardId: ID!, $email: String!) {
        boards(ids: [$boardId]) {
          items_page(
            limit: 10
            query_params: {
              rules: [
                {
                  column_id: "email__1"
                  compare_value: [$email]
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
    {
      boardId: args.targetBoardId,
      email,
    },
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

const getSourceItemValidator = () =>
  v.object({
    id: v.string(),
    name: v.string(),
    email: v.union(v.string(), v.null()),
    mainDatabaseId: v.union(v.string(), v.null()),
    mirrorDatabaseId: v.union(v.string(), v.null()),
    relationMainId: v.union(v.string(), v.null()),
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

export const fetchSourcePageAction = internalAction({
  args: {
    sourceBoardId: v.string(),
    cursor: v.optional(v.union(v.string(), v.null())),
    pageSize: v.number(),
  },
  returns: v.object({
    sourceBoardName: v.union(v.string(), v.null()),
    sourceSubitemBoardId: v.union(v.string(), v.null()),
    nextCursor: v.union(v.string(), v.null()),
    items: v.array(getSourceItemValidator()),
  }),
  handler: async (_ctx, args) => {
    const page = await fetchSourcePage({
      sourceBoardId: args.sourceBoardId,
      cursor: args.cursor ?? null,
      pageSize: args.pageSize,
    });
    const sourceBoardColumns = await fetchBoardColumns(args.sourceBoardId);
    const sourceSubitemsColumn = getSubtasksColumn(sourceBoardColumns.columns);
    const sourceSubitemBoardId = parseSubitemBoardIdFromSubtasksColumn(sourceSubitemsColumn);
    return {
      sourceBoardName: page.sourceBoardName,
      sourceSubitemBoardId,
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
    sourceSubitemBoardId: v.optional(v.union(v.string(), v.null())),
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
    let errors = 0;

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
      const targetBoardColumns = await fetchBoardColumns(args.targetBoardId);
      const targetSubitemsColumn = getSubtasksColumn(targetBoardColumns.columns);
      const targetSubitemBoardId = parseSubitemBoardIdFromSubtasksColumn(targetSubitemsColumn);
      const sourceSubitemBoardId = args.sourceSubitemBoardId ?? null;

      if (!targetSubitemBoardId || !sourceSubitemBoardId) {
        warnings.push(
          `Subitem board mapping missing for source item ${args.sourceItem.id}; skipping subitem migration.`,
        );
      } else {
        const sourceSubitemBoardColumns = await fetchBoardColumns(sourceSubitemBoardId);
        const targetSubitemBoardColumns = await fetchBoardColumns(targetSubitemBoardId);
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

    return {
      processedContacts: 1,
      mappedContacts: 1,
      skippedContacts: 0,
      createdParentUpdates,
      createdSubitems,
      createdSubitemUpdates,
      errors,
      createdEntries,
      warnings,
    };
  },
});
