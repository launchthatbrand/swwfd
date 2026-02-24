"use node";

import { v } from "convex/values";

import { internalAction } from "./_generated/server";

type BoardColumn = {
  id?: string | null;
  title?: string | null;
  type?: string | null;
};

type ContactRow = {
  id: string;
  name: string;
  email: string | null;
  ownerIds: string[];
  createdAtDate: string | null;
};

const toBaselineTouchKey = (args: {
  sourceTag: string;
  baselineDate: string;
  contactItemId: string;
  ownerId: string | null;
}) => {
  return `baseline:${args.sourceTag}:${args.baselineDate}:${args.contactItemId}:${args.ownerId ?? "unassigned"}`;
};

const touchKeySuffix = (key: string) => ` [bk:${key}]`;
const extractTouchKeyFromItemName = (itemName: string | null | undefined) => {
  if (!itemName) return null;
  const match = itemName.match(/\[bk:([^\]]+)\]\s*$/);
  return match?.[1]?.trim() || null;
};

const normalizeDateOnlyFromIsoLike = (value: string | null | undefined) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString().slice(0, 10);
};

const MONDAY_API_URL = "https://api.monday.com/v2";
const TOUCH_CREATE_BATCH_SIZE = 25;
const TOUCH_CONTACT_RELATION_COLUMN_ID = "board_relation_mm0wbvrb";

const getMondayBackfillEnv = () => {
  const apiKey = process.env.MONDAY_API_KEY?.trim() ?? "";
  const touchBoardId = process.env.MONDAY_CONTACT_TOUCHED_BOARD_ID?.trim() ?? "";
  if (!apiKey) throw new Error("MONDAY_API_KEY is missing for backfill job");
  if (!touchBoardId) {
    throw new Error("MONDAY_CONTACT_TOUCHED_BOARD_ID is missing for backfill job");
  }
  return { apiKey, touchBoardId };
};

const callMondayGraphQL = async <TData>(
  queryText: string,
  variables: Record<string, unknown>,
) => {
  const { apiKey } = getMondayBackfillEnv();
  const response = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      Authorization: apiKey,
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
    const message = json.errors.map((e) => e.message).filter(Boolean).join(" | ");
    throw new Error(message || "Unknown Monday GraphQL error");
  }
  if (!json.data) {
    throw new Error("Monday GraphQL returned no data");
  }
  return json.data;
};

const columnMatches = (column: BoardColumn, titleIncludes: string) =>
  (column.title ?? "").toLowerCase().includes(titleIncludes.toLowerCase());

const getTouchBoardColumnMap = async (touchBoardId: string) => {
  interface Data {
    boards?: Array<{ columns?: BoardColumn[] }>;
  }
  const data = await callMondayGraphQL<Data>(
    `
      query TouchBoardColumns($boardId: ID!) {
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
  const firstByType = (type: string) =>
    columns.find((column) => (column.type ?? "").toLowerCase() === type)?.id ?? null;
  const firstByTitle = (needle: string) =>
    columns.find((column) => columnMatches(column, needle))?.id ?? null;
  const firstColumnByType = (type: string) =>
    columns.find((column) => (column.type ?? "").toLowerCase() === type) ?? null;
  const firstColumnByTitle = (needle: string) =>
    columns.find((column) => columnMatches(column, needle)) ?? null;

  const emailColumn = firstColumnByType("email") ?? firstColumnByTitle("email");
  const relationColumn =
    columns.find((column) => column.id === TOUCH_CONTACT_RELATION_COLUMN_ID) ??
    firstColumnByType("board_relation") ??
    firstColumnByTitle("relation");

  return {
    emailColumnId: emailColumn?.id ?? null,
    emailColumnType: (emailColumn?.type ?? "").toLowerCase() || null,
    ownerColumnId: firstByType("people") ?? firstByTitle("owner"),
    touchDateColumnId: firstByTitle("touch date") ?? firstByType("date"),
    touchTypeColumnId:
      firstByTitle("touch type") ??
      firstByTitle("type") ??
      firstByType("status") ??
      firstByType("dropdown"),
    sourceColumnId: firstByTitle("source"),
    contactRelationColumnId: relationColumn?.id ?? null,
    contactItemIdColumnId:
      firstByTitle("contact item") ?? firstByTitle("contact id") ?? firstByTitle("item id"),
  };
};

const buildTouchColumnValues = (args: {
  columnMap: Awaited<ReturnType<typeof getTouchBoardColumnMap>>;
  email: string | null;
  ownerId: string | null;
  touchDate: string;
  sourceTag: string;
  contactItemId: string;
}) => {
  const values: Record<string, unknown> = {};
  if (args.columnMap.emailColumnId && args.email) {
    values[args.columnMap.emailColumnId] =
      args.columnMap.emailColumnType === "email"
        ? {
            email: args.email,
            text: args.email,
          }
        : args.email;
  }
  if (args.columnMap.ownerColumnId && args.ownerId && /^\d+$/.test(args.ownerId)) {
    values[args.columnMap.ownerColumnId] = {
      personsAndTeams: [{ id: Number(args.ownerId), kind: "person" }],
    };
  }
  if (args.columnMap.touchDateColumnId) {
    values[args.columnMap.touchDateColumnId] = { date: args.touchDate };
  }
  if (args.columnMap.touchTypeColumnId) {
    values[args.columnMap.touchTypeColumnId] = { labels: ["baseline_import"] };
  }
  if (args.columnMap.sourceColumnId) {
    values[args.columnMap.sourceColumnId] = args.sourceTag;
  }
  if (
    args.columnMap.contactRelationColumnId &&
    /^\d+$/.test(args.contactItemId)
  ) {
    values[args.columnMap.contactRelationColumnId] = {
      linkedPulseIds: [{ linkedPulseId: Number(args.contactItemId) }],
    };
  }
  if (args.columnMap.contactItemIdColumnId) {
    values[args.columnMap.contactItemIdColumnId] = args.contactItemId;
  }
  return values;
};

const createTouchRow = async (args: {
  touchBoardId: string;
  contact: ContactRow;
  ownerId: string | null;
  touchDate: string;
  sourceTag: string;
  touchKey: string;
  columnMap: Awaited<ReturnType<typeof getTouchBoardColumnMap>>;
}) => {
  const ownerLabel = args.ownerId ? `owner:${args.ownerId}` : "owner:unassigned";
  const identityLabel =
    args.contact.name.trim().length > 0
      ? args.contact.name
      : args.contact.email && args.contact.email.trim().length > 0
        ? args.contact.email
        : args.contact.id;
  const emailLabel = args.contact.email ? ` · ${args.contact.email}` : "";
  const itemName = `${identityLabel}${emailLabel} · baseline (${ownerLabel})${touchKeySuffix(args.touchKey)}`;
  const columnValues = buildTouchColumnValues({
    columnMap: args.columnMap,
    email: args.contact.email,
    ownerId: args.ownerId,
    touchDate: args.touchDate,
    sourceTag: args.sourceTag,
    contactItemId: args.contact.id,
  });

  await callMondayGraphQL(
    `
      mutation CreateTouchRow(
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
    `,
    {
      boardId: args.touchBoardId,
      itemName,
      columnValues: JSON.stringify(columnValues),
    },
  );
};

type PendingTouchCreate = {
  contact: ContactRow;
  ownerId: string | null;
  touchDate: string;
  touchKey: string;
};

const chunkArray = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const createTouchRowsBatch = async (args: {
  touchBoardId: string;
  sourceTag: string;
  columnMap: Awaited<ReturnType<typeof getTouchBoardColumnMap>>;
  rows: PendingTouchCreate[];
}) => {
  if (args.rows.length === 0) return;

  const variableDefinitions: string[] = ["$boardId: ID!"];
  const mutationFields: string[] = [];
  const variables: Record<string, unknown> = {
    boardId: args.touchBoardId,
  };

  for (const [index, row] of args.rows.entries()) {
    const itemVar = `itemName_${index}`;
    const columnVar = `columnValues_${index}`;
    variableDefinitions.push(`$${itemVar}: String!`, `$${columnVar}: JSON!`);
    mutationFields.push(
      `m_${index}: create_item(board_id: $boardId, item_name: $${itemVar}, column_values: $${columnVar}, create_labels_if_missing: true) { id }`,
    );

    const ownerLabel = row.ownerId ? `owner:${row.ownerId}` : "owner:unassigned";
    const identityLabel =
      row.contact.name.trim().length > 0
        ? row.contact.name
        : row.contact.email && row.contact.email.trim().length > 0
          ? row.contact.email
          : row.contact.id;
    const emailLabel = row.contact.email ? ` · ${row.contact.email}` : "";
    const itemName = `${identityLabel}${emailLabel} · baseline (${ownerLabel})${touchKeySuffix(row.touchKey)}`;
    const columnValues = buildTouchColumnValues({
      columnMap: args.columnMap,
      email: row.contact.email,
      ownerId: row.ownerId,
      touchDate: row.touchDate,
      sourceTag: args.sourceTag,
      contactItemId: row.contact.id,
    });

    variables[itemVar] = itemName;
    variables[columnVar] = JSON.stringify(columnValues);
  }

  const mutationText = `
    mutation BatchCreateTouchRows(${variableDefinitions.join(", ")}) {
      ${mutationFields.join("\n")}
    }
  `;

  await callMondayGraphQL(mutationText, variables);
};

export const fetchExistingBaselineKeysAction = internalAction({
  args: {
    touchBoardId: v.string(),
    sourceTag: v.string(),
    baselineDate: v.string(),
  },
  returns: v.object({
    keys: v.array(v.string()),
  }),
  handler: async (_ctx, args) => {
    interface Data {
      boards?: Array<{
        items_page?: {
          cursor?: string | null;
          items?: Array<{ id: string; name?: string | null }>;
        };
      }>;
    }
    type ExistingKeysItemsPage = {
      cursor?: string | null;
      items?: Array<{ id: string; name?: string | null }>;
    };

    const keys = new Set<string>();
    let cursor: string | null = null;
    while (true) {
      const queryText: string = `
        query ExistingBackfillKeys($boardId: ID!, $limit: Int!${
          cursor ? ", $cursor: String" : ""
        }) {
          boards(ids: [$boardId]) {
            items_page(
              limit: $limit
              ${cursor ? "cursor: $cursor" : ""}
            ) {
              cursor
              items {
                id
                name
              }
            }
          }
        }
      `;
      const data: Data = await callMondayGraphQL<Data>(queryText, {
        boardId: args.touchBoardId,
        limit: 250,
        ...(cursor ? { cursor } : {}),
      });
      const page: ExistingKeysItemsPage | undefined = data.boards?.[0]?.items_page;
      const items = page?.items ?? [];
      for (const item of items) {
        const parsed = extractTouchKeyFromItemName(item.name);
        if (!parsed) continue;
        if (
          parsed.startsWith(`baseline:${args.sourceTag}:${args.baselineDate}:`)
        ) {
          keys.add(parsed);
        }
      }
      cursor = page?.cursor ?? null;
      if (!cursor) break;
    }
    return { keys: Array.from(keys) };
  },
});

export const fetchContactsPageAction = internalAction({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
    pageSize: v.number(),
    boardId: v.string(),
  },
  returns: v.object({
    nextCursor: v.union(v.string(), v.null()),
    contacts: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        email: v.union(v.string(), v.null()),
        ownerIds: v.array(v.string()),
        createdAtDate: v.union(v.string(), v.null()),
      }),
    ),
  }),
  handler: async (_ctx, args) => {
    interface Data {
      boards?: Array<{
        items_page?: {
          cursor?: string | null;
          items?: Array<{
            id: string;
            name?: string | null;
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

    const queryText = `
      query BackfillContactsPage($boardId: ID!, $limit: Int!${
        args.cursor ? ", $cursor: String" : ""
      }) {
        boards(ids: [$boardId]) {
          items_page(
            limit: $limit
            ${args.cursor ? "cursor: $cursor" : ""}
          ) {
            cursor
            items {
              id
              name
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
      boardId: args.boardId,
      limit: args.pageSize,
      ...(args.cursor ? { cursor: args.cursor } : {}),
    });
    const page = data.boards?.[0]?.items_page;
    const items = page?.items ?? [];
    const contacts = items.map((item) => {
      const emailColumn = item.column_values?.find(
        (column) => column.type === "email" || column.id === "email__1",
      );
      const peopleColumn = item.column_values?.find((column) => column.type === "people");
      const creationLogColumn = item.column_values?.find(
        (column) => column.type === "creation_log" || column.id === "creation_log__1",
      );
      let ownerIds: string[] = [];
      if (peopleColumn?.value) {
        try {
          const parsed = JSON.parse(peopleColumn.value) as {
            personsAndTeams?: Array<{ id?: number | string; kind?: string }>;
          };
          ownerIds = (parsed.personsAndTeams ?? [])
            .filter((entry) => entry.kind === "person" && entry.id != null)
            .map((entry) => String(entry.id))
            .filter((id) => id.trim().length > 0);
        } catch {
          ownerIds = [];
        }
      }
      let createdAtDate: string | null = null;
      if (creationLogColumn?.value) {
        try {
          const parsed = JSON.parse(creationLogColumn.value) as { created_at?: unknown };
          if (typeof parsed.created_at === "string") {
            createdAtDate = normalizeDateOnlyFromIsoLike(parsed.created_at);
          }
        } catch {
          createdAtDate = null;
        }
      }
      if (!createdAtDate && creationLogColumn?.text) {
        createdAtDate = normalizeDateOnlyFromIsoLike(creationLogColumn.text);
      }
      const emailText = emailColumn?.text?.trim();
      return {
        id: item.id,
        name: (item.name ?? "").trim(),
        email: emailText && emailText.length > 0 ? emailText : null,
        ownerIds,
        createdAtDate,
      };
    });
    return {
      nextCursor: page?.cursor ?? null,
      contacts,
    };
  },
});

export const writeTouchRowsAction = internalAction({
  args: {
    jobId: v.id("mondayTouchBackfillJobs"),
    touchBoardId: v.string(),
    baselineDate: v.string(),
    sourceTag: v.string(),
    dedupeKeys: v.array(v.string()),
    contacts: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        email: v.union(v.string(), v.null()),
        ownerIds: v.array(v.string()),
        createdAtDate: v.union(v.string(), v.null()),
      }),
    ),
  },
  returns: v.object({
    created: v.number(),
    deduped: v.number(),
    skipped: v.number(),
    errors: v.number(),
    createdKeys: v.array(v.string()),
  }),
  handler: async (_ctx, args) => {
    const columnMap = await getTouchBoardColumnMap(args.touchBoardId);
    const existingKeys = new Set(args.dedupeKeys);
    let created = 0;
    let deduped = 0;
    let skipped = 0;
    let errors = 0;
    const createdKeys: string[] = [];
    const pendingCreates: PendingTouchCreate[] = [];

    for (const contact of args.contacts) {
      const ownerIds = contact.ownerIds.length > 0 ? contact.ownerIds : [null];
      for (const ownerId of ownerIds) {
        const touchKey = toBaselineTouchKey({
          sourceTag: args.sourceTag,
          baselineDate: args.baselineDate,
          contactItemId: contact.id,
          ownerId,
        });
        if (existingKeys.has(touchKey)) {
          deduped += 1;
          continue;
        }
        pendingCreates.push({
          contact,
          ownerId,
          touchDate: contact.createdAtDate ?? args.baselineDate,
          touchKey,
        });
      }
      if (ownerIds.length === 0) skipped += 1;
    }

    const createBatches = chunkArray(pendingCreates, TOUCH_CREATE_BATCH_SIZE);
    console.log(
      `[mondayTouchBackfill] writeTouchRowsAction pendingCreates=${pendingCreates.length} batches=${createBatches.length} batchSize=${TOUCH_CREATE_BATCH_SIZE}`,
    );
    for (const batch of createBatches) {
      try {
        console.log(
          `[mondayTouchBackfill] attempting batch create rows=${batch.length}`,
        );
        await createTouchRowsBatch({
          touchBoardId: args.touchBoardId,
          sourceTag: args.sourceTag,
          columnMap,
          rows: batch,
        });
        for (const row of batch) {
          created += 1;
          existingKeys.add(row.touchKey);
          createdKeys.push(row.touchKey);
        }
      } catch {
        console.warn(
          `[mondayTouchBackfill] batch create failed for rows=${batch.length}; falling back to single creates`,
        );
        // Fallback to single-row writes so one bad row doesn't drop a whole batch.
        for (const row of batch) {
          try {
            await createTouchRow({
              touchBoardId: args.touchBoardId,
              contact: row.contact,
              ownerId: row.ownerId,
              touchDate: row.touchDate,
              sourceTag: args.sourceTag,
              touchKey: row.touchKey,
              columnMap,
            });
            created += 1;
            existingKeys.add(row.touchKey);
            createdKeys.push(row.touchKey);
          } catch {
            errors += 1;
          }
        }
      }
    }

    return { created, deduped, skipped, errors, createdKeys };
  },
});
