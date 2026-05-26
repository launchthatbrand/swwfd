"use node";

import { v } from "convex/values";

import { internalAction } from "./_generated/server";

const MONDAY_API_URL = "https://api.monday.com/v2";
const DEFAULT_HIRE_DATE_COLUMN_ID = "date_mkty234p";
const DEFAULT_TAGS_COLUMN_ID = "dropdown_mkvw578t";
const SUBITEM_TYPE_COLUMN_ID = "color_mm2x49t2";
const SUBITEM_DATE_COLUMN_ID = "date0";
const SUBITEM_PERSON_COLUMN_ID = "person";
const HIRE_EVENT_TYPE_LABEL = "Hire Event";
const HIRE_EVENT_TOKEN_PREFIX = "hk";

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
    const message = json.errors.map((entry) => entry.message).filter(Boolean).join(" | ");
    throw new Error(message || "Unknown Monday GraphQL error");
  }
  if (!json.data) throw new Error("Monday API returned no data");
  return json.data;
};

const parsePeopleIds = (value: string | null | undefined) => {
  if (!value) return [] as string[];
  try {
    const parsed = JSON.parse(value) as {
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

const parseDateOnly = (value: string | null | undefined, text: string | null | undefined) => {
  if (value) {
    try {
      const parsed = JSON.parse(value) as { date?: string; time?: string; created_at?: string };
      if (parsed.date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) return parsed.date;
      if (parsed.created_at && /^\d{4}-\d{2}-\d{2}/.test(parsed.created_at)) {
        return parsed.created_at.slice(0, 10);
      }
    } catch {
      // ignore parse issues
    }
  }
  const normalized = text?.trim() ?? "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
  return null;
};

const splitTags = (value: string | null | undefined) =>
  (value ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);

const includesTag = (tags: string[], needle: string) =>
  tags.some((entry) => entry.includes(needle));

const buildHireEventToken = (args: {
  contactItemId: string;
  ownerId: string;
  hireDate: string;
  isCandidatesGroup: boolean;
  isReentry: boolean;
  isVeteran: boolean;
  source: string;
}) => {
  return [
    `[${HIRE_EVENT_TOKEN_PREFIX}:`,
    `contact=${args.contactItemId};`,
    `owner=${args.ownerId};`,
    `date=${args.hireDate};`,
    `cg=${args.isCandidatesGroup ? "1" : "0"};`,
    `re=${args.isReentry ? "1" : "0"};`,
    `vet=${args.isVeteran ? "1" : "0"};`,
    `src=${args.source}]`,
  ].join("");
};

const parseHireEventToken = (name: string | null | undefined) => {
  if (!name) return null;
  const match = name.match(/\[hk:([^\]]+)\]/i);
  if (!match?.[1]) return null;
  const entries = new Map<string, string>();
  for (const part of match[1].split(";")) {
    const [keyRaw, valueRaw] = part.split("=");
    const key = keyRaw?.trim().toLowerCase();
    if (!key) continue;
    entries.set(key, valueRaw?.trim() ?? "");
  }
  const contactItemId = entries.get("contact") ?? "";
  const ownerId = entries.get("owner") ?? "";
  const hireDate = entries.get("date") ?? "";
  if (!contactItemId || !ownerId || !hireDate) return null;
  return { contactItemId, ownerId, hireDate };
};

const resolveSubitemBoardId = async (boardId: string) => {
  interface Data {
    boards?: Array<{
      columns?: Array<{ type?: string | null; settings_str?: string | null }>;
    }>;
  }
  const data = await callMondayGraphQL<Data>(
    `
      query ResolveSubitemBoardId($boardId: ID!) {
        boards(ids: [$boardId]) {
          columns { type settings_str }
        }
      }
    `,
    { boardId },
  );
  const subtasksColumn = (data.boards?.[0]?.columns ?? []).find(
    (column) => (column.type ?? "").toLowerCase() === "subtasks",
  );
  if (!subtasksColumn?.settings_str) return null;
  try {
    const parsed = JSON.parse(subtasksColumn.settings_str) as {
      boardIds?: Array<number | string>;
    };
    const raw = parsed.boardIds?.[0];
    if (raw == null) return null;
    const subitemBoardId = String(raw).trim();
    return subitemBoardId.length > 0 ? subitemBoardId : null;
  } catch {
    return null;
  }
};

const resolveContactBoardColumnIds = async (boardId: string) => {
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
      query ResolveContactMetricColumns($boardId: ID!) {
        boards(ids: [$boardId]) {
          columns { id title type }
        }
      }
    `,
    { boardId },
  );
  const columns = data.boards?.[0]?.columns ?? [];
  const byType = (type: string) =>
    columns.find((column) => (column.type ?? "").toLowerCase() === type)?.id ?? null;
  const byId = (id: string) =>
    columns.find((column) => (column.id ?? "") === id)?.id ?? null;
  const byTitle = (needle: string) =>
    columns.find((column) =>
      (column.title ?? "").toLowerCase().includes(needle.toLowerCase()),
    )?.id ?? null;
  return {
    hireDateColumnId:
      byId(DEFAULT_HIRE_DATE_COLUMN_ID) ??
      byTitle("hire date") ??
      byType("date") ??
      DEFAULT_HIRE_DATE_COLUMN_ID,
    tagsColumnId: byId(DEFAULT_TAGS_COLUMN_ID) ?? byTitle("tag") ?? DEFAULT_TAGS_COLUMN_ID,
    peopleColumnId: byType("people") ?? "people3",
  };
};

export const fetchAndUpsertHireEventPageAction = internalAction({
  args: {
    boardId: v.string(),
    cursor: v.optional(v.union(v.string(), v.null())),
    pageSize: v.number(),
    dateFrom: v.string(),
    dateTo: v.string(),
    dryRun: v.optional(v.boolean()),
  },
  returns: v.object({
    nextCursor: v.union(v.string(), v.null()),
    subitemBoardId: v.union(v.string(), v.null()),
    processedContacts: v.number(),
    inRangeContacts: v.number(),
    createdEvents: v.number(),
    skippedEvents: v.number(),
    errors: v.number(),
  }),
  handler: async (_ctx, args) => {
    const cursor = args.cursor ?? null;
    const limit = Math.max(25, Math.min(200, args.pageSize));
    const dryRun = args.dryRun ?? false;

    const subitemBoardId = await resolveSubitemBoardId(args.boardId);
    const contactColumnIds = await resolveContactBoardColumnIds(args.boardId);

    const dateRule = `{
      column_id: "${contactColumnIds.hireDateColumnId}"
      compare_value: ["${args.dateFrom}", "${args.dateTo}"]
      operator: between
    }`;
    const queryText = `
      query HireEventBackfillPage($boardId: ID!, $limit: Int!${cursor ? ", $cursor: String" : ""}) {
        boards(ids: [$boardId]) {
          items_page(
            limit: $limit
            ${cursor ? "cursor: $cursor" : `query_params: { rules: [${dateRule}] }`}
          ) {
            cursor
            items {
              id
              name
              column_values(ids: ["${contactColumnIds.hireDateColumnId}", "${contactColumnIds.tagsColumnId}", "${contactColumnIds.peopleColumnId}"]) {
                id
                text
                value
              }
              subitems {
                id
                name
                column_values(ids: ["${SUBITEM_TYPE_COLUMN_ID}", "${SUBITEM_DATE_COLUMN_ID}", "${SUBITEM_PERSON_COLUMN_ID}"]) {
                  id
                  text
                  value
                }
              }
            }
          }
        }
      }
    `;

    interface ItemColumn {
      id?: string | null;
      text?: string | null;
      value?: string | null;
    }
    interface Item {
      id: string;
      name?: string | null;
      column_values?: ItemColumn[];
      subitems?: Array<{
        id?: string | null;
        name?: string | null;
        column_values?: ItemColumn[];
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

    let processedContacts = 0;
    let inRangeContacts = 0;
    let createdEvents = 0;
    let skippedEvents = 0;
    let errors = 0;

    for (const item of items) {
      processedContacts += 1;
      const columns = item.column_values ?? [];
      const byId = (id: string) => columns.find((column) => column.id === id);

      const hireDate = parseDateOnly(
        byId(contactColumnIds.hireDateColumnId)?.value ?? null,
        byId(contactColumnIds.hireDateColumnId)?.text ?? null,
      );
      if (!hireDate) {
        skippedEvents += 1;
        continue;
      }
      inRangeContacts += 1;
      const ownerIds = parsePeopleIds(byId(contactColumnIds.peopleColumnId)?.value ?? null);
      if (ownerIds.length === 0) {
        skippedEvents += 1;
        continue;
      }
      const tagsText = byId(contactColumnIds.tagsColumnId)?.text ?? null;
      const tags = splitTags(tagsText);
      const isCandidatesGroup =
        includesTag(tags, "candidate") &&
        (includesTag(tags, "group") || includesTag(tags, "train"));
      const isReentry = includesTag(tags, "reentry");
      const isVeteran = includesTag(tags, "veteran");

      const existingSubitems = item.subitems ?? [];
      const hasMatchingEvent = (ownerId: string) =>
        existingSubitems.some((subitem) => {
          const parsedFromName = parseHireEventToken(subitem.name);
          if (
            parsedFromName &&
            parsedFromName.contactItemId === item.id &&
            parsedFromName.ownerId === ownerId &&
            parsedFromName.hireDate === hireDate
          ) {
            return true;
          }
          const subColumns = subitem.column_values ?? [];
          const bySubId = (id: string) => subColumns.find((column) => column.id === id);
          const typeText =
            bySubId(SUBITEM_TYPE_COLUMN_ID)?.text?.trim().toLowerCase() ?? "";
          const eventDate = parseDateOnly(
            bySubId(SUBITEM_DATE_COLUMN_ID)?.value ?? null,
            bySubId(SUBITEM_DATE_COLUMN_ID)?.text ?? null,
          );
          const subOwners = parsePeopleIds(bySubId(SUBITEM_PERSON_COLUMN_ID)?.value ?? null);
          return (
            typeText === HIRE_EVENT_TYPE_LABEL.toLowerCase() &&
            eventDate === hireDate &&
            subOwners.includes(ownerId)
          );
        });

      for (const ownerId of ownerIds) {
        if (hasMatchingEvent(ownerId)) {
          skippedEvents += 1;
          continue;
        }
        if (dryRun) {
          createdEvents += 1;
          continue;
        }
        try {
          const token = buildHireEventToken({
            contactItemId: item.id,
            ownerId,
            hireDate,
            isCandidatesGroup,
            isReentry,
            isVeteran,
            source: "tools_backfill",
          });
          const eventName = `Hire Event - ${hireDate} ${token}`;
          const columnValues: Record<string, unknown> = {
            [SUBITEM_TYPE_COLUMN_ID]: { label: HIRE_EVENT_TYPE_LABEL },
            [SUBITEM_DATE_COLUMN_ID]: { date: hireDate },
          };
          if (/^\d+$/.test(ownerId)) {
            columnValues[SUBITEM_PERSON_COLUMN_ID] = {
              personsAndTeams: [{ id: Number(ownerId), kind: "person" }],
            };
          }

          interface CreateData {
            create_subitem?: { id?: string | null } | null;
          }
          await callMondayGraphQL<CreateData>(
            `
              mutation CreateHireEventBackfillSubitem($parentItemId: ID!, $itemName: String!, $columnValues: JSON!) {
                create_subitem(
                  parent_item_id: $parentItemId
                  item_name: $itemName
                  column_values: $columnValues
                  create_labels_if_missing: true
                ) { id }
              }
            `,
            {
              parentItemId: item.id,
              itemName: eventName,
              columnValues: JSON.stringify(columnValues),
            },
          );
          createdEvents += 1;
        } catch (error) {
          errors += 1;
          console.warn("[HireEventBackfill] failed to create event subitem", {
            contactId: item.id,
            ownerId,
            hireDate,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    return {
      nextCursor,
      subitemBoardId,
      processedContacts,
      inRangeContacts,
      createdEvents,
      skippedEvents,
      errors,
    };
  },
});
