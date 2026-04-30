"use node";

import { v } from "convex/values";

import { internalAction } from "./_generated/server";

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const MONDAY_API_URL = "https://api.monday.com/v2";
// "Registration date" column on the main API board — same value as creation_log.
// Using a proper date column lets us push the between filter down to Monday's API.
const REGISTRATION_DATE_COLUMN_ID = "date1__1";
const TOUCH_RELATION_COLUMN_ID = "board_relation_mm0wbvrb";

const getEnv = () => {
  const apiKey = process.env.MONDAY_API_KEY?.trim() ?? "";
  if (!apiKey) throw new Error("MONDAY_API_KEY is missing");
  return { apiKey };
};

const callMondayGraphQL = async <TData>(
  queryText: string,
  variables: Record<string, unknown>,
): Promise<TData> => {
  const { apiKey } = getEnv();
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
    const msg = json.errors.map((e) => e.message).filter(Boolean).join(" | ");
    throw new Error(msg || "Unknown Monday GraphQL error");
  }
  if (!json.data) throw new Error("Monday API returned no data");
  return json.data;
};

// ---------------------------------------------------------------------------
// Touch board column resolution (cached per action invocation)
// ---------------------------------------------------------------------------

type TouchColumnMap = {
  touchDateColumnId: string | null;
  ownerIdColumnId: string;
  ownerPeopleColumnId: string | null;
  sourceColumnId: string | null;
  /** text_mm0w17d — stores the linked contact's item ID as plain text */
  contactItemIdColumnId: string;
  /** email_mm0wr4y1 — stores the contact's email address */
  contactEmailColumnId: string;
};

const resolveTouchColumns = async (touchBoardId: string): Promise<TouchColumnMap> => {
  interface Data {
    boards?: Array<{ columns?: Array<{ id?: string | null; title?: string | null; type?: string | null }> }>;
  }
  const data = await callMondayGraphQL<Data>(
    `query ResolveTouchCols($b: ID!) { boards(ids: [$b]) { columns { id title type } } }`,
    { b: touchBoardId },
  );
  const cols = data.boards?.[0]?.columns ?? [];
  const byTitle = (needle: string) =>
    cols.find((c) => (c.title ?? "").toLowerCase().includes(needle.toLowerCase()))?.id ?? null;
  const byType = (type: string) =>
    cols.find((c) => (c.type ?? "").toLowerCase() === type)?.id ?? null;

  return {
    touchDateColumnId: byTitle("touch date") ?? byTitle("touch_date") ?? byType("date"),
    ownerIdColumnId: byTitle("owner_id") ?? byTitle("owner id") ?? "text_mm0wb7qt",
    ownerPeopleColumnId: byTitle("touched by") ?? byTitle("owner") ?? byType("people"),
    sourceColumnId: byTitle("source"),
    contactItemIdColumnId: "text_mm0w17d",
    contactEmailColumnId: "email_mm0wr4y1",
  };
};

// ---------------------------------------------------------------------------
// Single contact touch upsert using [tk:...] key pattern
// ---------------------------------------------------------------------------

const upsertTouchRecord = async (args: {
  touchBoardId: string;
  colMap: TouchColumnMap;
  contactItemId: string;
  contactName: string;
  contactEmail: string | null;
  ownerId: string;
  monthKey: string;
  touchDate: string;
}): Promise<"created" | "updated"> => {
  const touchKey = `tk:${args.contactItemId}:${args.ownerId}:${args.monthKey}`;

  // Find existing rows linked to this contact via board_relation.
  // compare_value must be inlined — Monday's GraphQL schema types it as
  // `CompareValue` (not String), so passing it as a variable causes a type error.
  const safeRelId = TOUCH_RELATION_COLUMN_ID.replace(/[^a-zA-Z0-9_]/g, "");
  const safeCid = args.contactItemId.replace(/[^0-9]/g, "");
  interface TouchItem { id: string; name?: string | null; }
  interface FindData { boards?: Array<{ items_page?: { items?: TouchItem[] } }>; }
  const findData = await callMondayGraphQL<FindData>(
    `
      query FindTouchRows($b: ID!) {
        boards(ids: [$b]) {
          items_page(
            limit: 50
            query_params: {
              rules: [{ column_id: "${safeRelId}", compare_value: ["${safeCid}"], operator: any_of }]
            }
          ) { items { id name } }
        }
      }
    `,
    { b: args.touchBoardId },
  );
  const existing = findData.boards?.[0]?.items_page?.items ?? [];
  const existingRow = existing.find((item) => (item.name ?? "").includes(`[${touchKey}]`));

  if (existingRow) {
    if (args.colMap.touchDateColumnId) {
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
          col: args.colMap.touchDateColumnId,
          val: JSON.stringify({ date: args.touchDate }),
        },
      );
    }
    return "updated";
  }

  // Create new row.
  const itemName = `${args.contactName} [${touchKey}]`;
  const columnValues: Record<string, unknown> = {};
  if (args.colMap.touchDateColumnId) {
    columnValues[args.colMap.touchDateColumnId] = { date: args.touchDate };
  }
  if (args.colMap.ownerPeopleColumnId && /^\d+$/.test(args.ownerId)) {
    columnValues[args.colMap.ownerPeopleColumnId] = {
      personsAndTeams: [{ id: Number(args.ownerId), kind: "person" }],
    };
  }
  columnValues[args.colMap.ownerIdColumnId] = args.ownerId;
  columnValues[args.colMap.contactItemIdColumnId] = args.contactItemId;
  if (args.contactEmail) {
    columnValues[args.colMap.contactEmailColumnId] = { email: args.contactEmail, text: args.contactEmail };
  }
  columnValues[TOUCH_RELATION_COLUMN_ID] = { item_ids: [Number(args.contactItemId)] };
  if (args.colMap.sourceColumnId) columnValues[args.colMap.sourceColumnId] = "range_backfill";

  interface CreateData { create_item?: { id?: string | null } | null; }
  await callMondayGraphQL<CreateData>(
    `
      mutation CreateTouchRow($b: ID!, $name: String!, $vals: JSON!) {
        create_item(board_id: $b, item_name: $name, column_values: $vals, create_labels_if_missing: true) { id }
      }
    `,
    { b: args.touchBoardId, name: itemName, vals: JSON.stringify(columnValues) },
  );
  return "created";
};

// ---------------------------------------------------------------------------
// Main action: fetch one page of contacts (server-side date filter via
// "Registration date" column date1__1), then upsert touch records for each.
// ---------------------------------------------------------------------------

export const fetchAndUpsertPageAction = internalAction({
  args: {
    boardId: v.string(),
    touchBoardId: v.string(),
    cursor: v.optional(v.union(v.string(), v.null())),
    pageSize: v.number(),
    dateFrom: v.string(),
    dateTo: v.string(),
    dryRun: v.optional(v.boolean()),
  },
  returns: v.object({
    nextCursor: v.union(v.string(), v.null()),
    processedContacts: v.number(),
    inRangeContacts: v.number(),
    createdTouches: v.number(),
    updatedTouches: v.number(),
    skippedTouches: v.number(),
    errors: v.number(),
  }),
  handler: async (_ctx, args) => {
    const cursor = args.cursor ?? null;
    const limit = Math.max(25, Math.min(200, args.pageSize));

    // Build the query — on the first page use the date range rule; on subsequent
    // pages use cursor only (Monday does not allow combining rules + cursor).
    const dateRule = `{
      column_id: "${REGISTRATION_DATE_COLUMN_ID}"
      compare_value: ["${args.dateFrom}", "${args.dateTo}"]
      operator: between
    }`;

    const queryText = `
      query RangeBackfillPage($boardId: ID!, $limit: Int!${cursor ? ", $cursor: String" : ""}) {
        boards(ids: [$boardId]) {
          items_page(
            limit: $limit
            ${cursor ? "cursor: $cursor" : `query_params: { rules: [${dateRule}] }`}
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

    interface Item {
      id: string;
      name?: string | null;
      column_values?: Array<{
        id?: string | null;
        type?: string | null;
        text?: string | null;
        value?: string | null;
      }>;
    }
    interface Data {
      boards?: Array<{ items_page?: { cursor?: string | null; items?: Item[] } }>;
    }

    const data = await callMondayGraphQL<Data>(queryText, {
      boardId: args.boardId,
      limit,
      ...(cursor ? { cursor } : {}),
    });
    const page = data.boards?.[0]?.items_page;
    const items = page?.items ?? [];
    const nextCursor = page?.cursor ?? null;

    const dryRun = args.dryRun ?? false;

    // Resolve touch board columns once per page invocation (skip on dry run).
    const colMap = dryRun ? null : await resolveTouchColumns(args.touchBoardId);

    let processedContacts = 0;
    let inRangeContacts = 0;
    let createdTouches = 0;
    let updatedTouches = 0;
    let skippedTouches = 0;
    let errors = 0;

    for (const item of items) {
      processedContacts += 1;

      // Extract email from the contact's email column.
      const emailCol = (item.column_values ?? []).find(
        (col) => col.id === "email__1" || col.type === "email",
      );
      const contactEmail = emailCol?.text?.trim() || null;

      // Extract owner IDs from the people column.
      const peopleCol = (item.column_values ?? []).find(
        (col) => col.type === "multiple-person" || col.type === "people",
      );
      let ownerIds: string[] = [];
      if (peopleCol?.value) {
        try {
          const parsed = JSON.parse(peopleCol.value) as {
            personsAndTeams?: Array<{ id?: number | string; kind?: string }>;
          };
          ownerIds = (parsed.personsAndTeams ?? [])
            .filter((e) => e.kind === "person" && e.id != null)
            .map((e) => String(e.id))
            .filter((id) => id.trim().length > 0);
        } catch {
          ownerIds = [];
        }
      }

      // Extract the registration date to derive monthKey and use as touchDate.
      const regDateCol = (item.column_values ?? []).find(
        (col) => col.id === REGISTRATION_DATE_COLUMN_ID,
      );
      let registrationDate: string | null = null;
      let monthKey: string | null = null;
      if (regDateCol?.value) {
        try {
          const parsed = JSON.parse(regDateCol.value) as { date?: string };
          if (parsed.date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) {
            registrationDate = parsed.date;
            monthKey = parsed.date.slice(0, 7);
          }
        } catch {
          // fall through
        }
      }
      if (!registrationDate && regDateCol?.text) {
        const dateOnly = regDateCol.text.trim().slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
          registrationDate = dateOnly;
          monthKey = dateOnly.slice(0, 7);
        }
      }

      if (!monthKey || !registrationDate) {
        skippedTouches += Math.max(ownerIds.length, 1);
        continue;
      }

      inRangeContacts += 1;

      if (ownerIds.length === 0) {
        skippedTouches += 1;
        continue;
      }

      // Upsert one touch record per owner for this contact+month.
      for (const ownerId of ownerIds) {
        if (dryRun) {
          // Dry run: count potential actions without writing to Monday.
          createdTouches += 1;
          console.log("[TouchRangeBackfill][DryRun] would upsert touch", {
            contactId: item.id,
            contactName: (item.name ?? "").trim() || item.id,
            ownerId,
            monthKey,
          });
          continue;
        }
        try {
          const result = await upsertTouchRecord({
            touchBoardId: args.touchBoardId,
            colMap: colMap!,
            contactItemId: item.id,
            contactName: (item.name ?? "").trim() || item.id,
            contactEmail,
            ownerId,
            monthKey,
            touchDate: registrationDate,
          });
          if (result === "created") createdTouches += 1;
          else updatedTouches += 1;
        } catch (e) {
          errors += 1;
          console.warn("[TouchRangeBackfill] upsert failed (non-fatal)", {
            contactId: item.id,
            ownerId,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
    }

    return {
      nextCursor,
      processedContacts,
      inRangeContacts,
      createdTouches,
      updatedTouches,
      skippedTouches,
      errors,
    };
  },
});
