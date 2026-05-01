import "server-only";

import { env } from "~/env";
import { callMondayGraphQL, upsertMondayTouchRecord } from "./client";

const MONTHLY_BOARD_RELATION_COLUMN_ID = "board_relation__1";
const DEFAULT_MONTHLY_BOARD_ID = "18406885282";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MondayColumn {
  id?: string | null;
  title?: string | null;
  type?: string | null;
  settings_str?: string | null;
}

interface SourceColumnValue {
  id: string;
  type: string;
  text: string | null;
  value: string | null;
}

interface SourceUpdate {
  id: string;
  body: string;
  createdAt: string | null;
  creatorName: string | null;
}

interface SourceSubitem {
  id: string;
  name: string;
  createdAt: string | null;
  columnValues: SourceColumnValue[];
  updates: SourceUpdate[];
}

interface SourceItem {
  id: string;
  name: string;
  boardId: string;
  boardName: string | null;
  updates: SourceUpdate[];
  subitems: SourceSubitem[];
}

export interface SyncResult {
  ok: boolean;
  linkedItemCount: number;
  createdParentUpdates: number;
  createdSubitems: number;
  createdSubitemUpdates: number;
  updatedProgressColumns: number;
  skippedSubitems: number;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Helpers ported from convex/mondayMonthlyMigrationNode.ts
// ---------------------------------------------------------------------------

const normalizeText = (value: string | null | undefined) =>
  value ? value.trim().toLowerCase() : "";

const escapeHtml = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const parseJsonSafe = <T>(value: string | null | undefined): T | null => {
  if (!value || value.trim().length === 0) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const parseLinkedPulseIds = (
  value: string | null | undefined,
): string[] => {
  const parsed = parseJsonSafe<{
    linkedPulseIds?: Array<{ linkedPulseId?: number | string | null }>;
  }>(value);
  if (!parsed?.linkedPulseIds) return [];
  return parsed.linkedPulseIds
    .map((entry) => (entry.linkedPulseId != null ? String(entry.linkedPulseId).trim() : ""))
    .filter((id) => id.length > 0);
};

const parseDateFromColumnValue = (value: string | null | undefined, text: string | null) => {
  const parsed = parseJsonSafe<{ date?: string }>(value);
  if (parsed?.date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) return parsed.date;
  if (!text) return null;
  const trimmed = text.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const d = Date.parse(trimmed);
  if (Number.isNaN(d)) return null;
  return new Date(d).toISOString().slice(0, 10);
};

const parsePeopleColumnValue = (value: string | null | undefined) => {
  const parsed = parseJsonSafe<{
    personsAndTeams?: Array<{ id?: number | string; kind?: string }>;
  }>(value);
  return (parsed?.personsAndTeams ?? [])
    .filter((e) => e.kind === "person" && e.id != null)
    .map((e) => (typeof e.id === "number" ? e.id : Number(e.id)));
};

const parseCreationLogDateTime = (
  value: string | null | undefined,
  text: string | null | undefined,
): { date: string; time: string } | null => {
  if (typeof value === "string" && value.length > 0) {
    try {
      const parsed = JSON.parse(value) as { created_at?: string };
      if (typeof parsed.created_at === "string" && parsed.created_at.length > 0) {
        const d = new Date(parsed.created_at);
        if (!Number.isNaN(d.getTime())) {
          return {
            date: d.toISOString().slice(0, 10),
            time: d.toISOString().slice(11, 19),
          };
        }
      }
    } catch { /* fall through */ }
  }
  if (typeof text === "string" && text.trim().length > 0) {
    const d = new Date(text.trim());
    if (!Number.isNaN(d.getTime())) {
      return {
        date: d.toISOString().slice(0, 10),
        time: d.toISOString().slice(11, 19),
      };
    }
  }
  return null;
};

const parseSubitemBoardIdFromSubtasksColumn = (column: MondayColumn | null) => {
  if (!column?.settings_str) return null;
  const parsed = parseJsonSafe<{ boardIds?: (number | string)[] }>(column.settings_str);
  const raw = parsed?.boardIds?.[0];
  if (raw == null) return null;
  const id = String(raw).trim();
  return id.length > 0 ? id : null;
};

// ---------------------------------------------------------------------------
// Migration body builder
// ---------------------------------------------------------------------------

const buildSyncUpdateBody = (args: {
  sourceBoardName: string | null;
  sourceBoardId: string;
  sourceItemId: string;
  sourceItemName: string;
  sourceEntity: string;
  sourceEntityId: string;
  sourceUpdateBody: string;
  createdAt?: string | null;
  creatorName?: string | null;
}) => {
  const boardLabel = args.sourceBoardName?.trim() || args.sourceBoardId;
  const createdAtLabel = args.createdAt?.trim() || "unknown time";
  const creatorLabel = args.creatorName?.trim() || "Unknown user";
  const line = [
    "SYNCED",
    `source_board=${args.sourceBoardId}`,
    `source_item=${args.sourceItemId}`,
    `source_entity=${args.sourceEntity}`,
    `source_entity_id=${args.sourceEntityId}`,
  ].join(" | ");
  const header = `<p><strong>${escapeHtml(line)}</strong></p><p><em>${escapeHtml(
    `From ${boardLabel} / ${args.sourceItemName} · by ${creatorLabel} · ${createdAtLabel}`,
  )}</em></p><hr/>`;
  const body = args.sourceUpdateBody.trim();
  return body.length === 0 ? `${header}<p><em>No message body.</em></p>` : `${header}${body}`;
};

// ---------------------------------------------------------------------------
// Subitem column mapping
// ---------------------------------------------------------------------------

const mapSourceToTargetColumnId = (args: {
  sourceColumn: SourceColumnValue;
  sourceColumnTitleById: Record<string, string>;
  targetColumns: MondayColumn[];
  targetColumnsByTitle: Map<string, MondayColumn[]>;
}) => {
  const sourceTitle = normalizeText(args.sourceColumnTitleById[args.sourceColumn.id] ?? args.sourceColumn.id);
  if (!sourceTitle) return null;
  const sameTitleCandidates = args.targetColumnsByTitle.get(sourceTitle) ?? [];
  if (sameTitleCandidates.length === 1) return sameTitleCandidates[0]?.id?.trim() || null;
  if (sameTitleCandidates.length > 1) {
    const exact = sameTitleCandidates.find((e) => normalizeText(e.id) === normalizeText(args.sourceColumn.id));
    if (exact?.id?.trim()) return exact.id.trim();
    return sameTitleCandidates[0]?.id?.trim() || null;
  }
  const sameId = args.targetColumns.find((c) => normalizeText(c.id) === normalizeText(args.sourceColumn.id));
  return sameId?.id?.trim() || null;
};

const mapColumnValueForTarget = (sourceColumn: SourceColumnValue, targetType: string) => {
  const t = normalizeText(targetType);
  if (t === "file" || t === "files") return { skip: true, value: null };
  if (t === "people") {
    const persons = parsePeopleColumnValue(sourceColumn.value);
    if (persons.length === 0) return { skip: true, value: null };
    return { skip: false, value: { personsAndTeams: persons.map((id) => ({ id, kind: "person" as const })) } };
  }
  if (t === "status" || t === "dropdown") {
    const label = sourceColumn.text?.trim() ?? "";
    return label ? { skip: false, value: { label } } : { skip: true, value: null };
  }
  if (t === "date") {
    const date = parseDateFromColumnValue(sourceColumn.value, sourceColumn.text);
    return date ? { skip: false, value: { date } } : { skip: true, value: null };
  }
  if (t === "long_text") {
    const text = sourceColumn.text?.trim() ?? "";
    return text ? { skip: false, value: { text } } : { skip: true, value: null };
  }
  const text = sourceColumn.text?.trim() ?? "";
  return text ? { skip: false, value: text } : { skip: true, value: null };
};

// ---------------------------------------------------------------------------
// Progress column classification
// ---------------------------------------------------------------------------

const ONBOARDING_STEP_COLUMN_MAP: Array<{ patterns: string[]; columnId: string }> = [
  { patterns: ["welcome email"], columnId: "color_mm1db321" },
  { patterns: ["follow-up", "followup", "follow up", "program lead", "pl contact"], columnId: "color_mm1dwtvd" },
  { patterns: ["questionnaire", "phone screen", "screening"], columnId: "color_mm1dwr4k" },
  { patterns: ["resume referral", "referred"], columnId: "color_mm1dgeqy" },
  { patterns: ["resume received", "resume"], columnId: "color_mm1dnr11" },
  { patterns: ["interview"], columnId: "color_mm1d80yc" },
  { patterns: ["hired"], columnId: "color_mm1djwjj" },
  { patterns: ["retained", "30-60-90"], columnId: "color_mm1d4e3y" },
];

const classifySubitemForProgressColumn = (name: string): string | null => {
  const normalized = normalizeText(name);
  for (const rule of ONBOARDING_STEP_COLUMN_MAP) {
    if (rule.patterns.some((p) => normalized.includes(p))) return rule.columnId;
  }
  return null;
};

// ---------------------------------------------------------------------------
// GraphQL helpers
// ---------------------------------------------------------------------------

/**
 * Search the monthly board for items whose board_relation__1 column links
 * back to the given API board item ID.
 */
const findMonthlyBoardItemsForContact = async (apiBoardItemId: string, monthlyBoardId: string) => {
  interface Data {
    boards?: Array<{
      items_page?: {
        cursor?: string | null;
        items?: Array<{
          id?: string;
          name?: string;
          column_values?: Array<{
            id?: string;
            linked_item_ids?: string[];
          }>;
        }>;
      };
    }>;
  }

  const colId = MONTHLY_BOARD_RELATION_COLUMN_ID;
  const matchedIds: string[] = [];
  let cursor: string | null = null;
  let page = 0;
  const maxPages = 10;

  const queryWithCursor = `query ($boardId: ID!, $limit: Int!, $cursor: String!) {
    boards(ids: [$boardId]) {
      items_page(limit: $limit, cursor: $cursor) {
        cursor
        items {
          id name
          column_values(ids: ["${colId}"]) {
            ... on BoardRelationValue { id linked_item_ids }
          }
        }
      }
    }
  }`;
  const queryWithoutCursor = `query ($boardId: ID!, $limit: Int!) {
    boards(ids: [$boardId]) {
      items_page(limit: $limit) {
        cursor
        items {
          id name
          column_values(ids: ["${colId}"]) {
            ... on BoardRelationValue { id linked_item_ids }
          }
        }
      }
    }
  }`;

  while (page < maxPages) {
    const vars: Record<string, unknown> = { boardId: monthlyBoardId, limit: 500 };
    if (cursor) vars.cursor = cursor;
    const data: Data = await callMondayGraphQL<Data>(
      cursor ? queryWithCursor : queryWithoutCursor,
      vars,
    );

    const items = data.boards?.[0]?.items_page?.items ?? [];
    for (const item of items) {
      const relCol = item.column_values?.find((c: { id?: string }) => c.id === colId);
      const ids: string[] = relCol?.linked_item_ids ?? [];
      if (ids.some((id: string) => id === apiBoardItemId)) {
        if (item.id) matchedIds.push(item.id);
      }
    }

    cursor = data.boards?.[0]?.items_page?.cursor ?? null;
    page++;
    if (!cursor || items.length === 0) break;
  }

  return matchedIds;
};

const fetchContactItem = async (_boardId: string, itemId: string) => {
  interface Data {
    items?: Array<{
      id?: string;
      name?: string;
      column_values?: Array<{
        id?: string;
        value?: string;
        text?: string;
        /** Only present on board_relation / connect_boards columns */
        linked_item_ids?: string[];
      }>;
      subitems?: Array<{ id?: string; name?: string }>;
    }>;
  }
  const data = await callMondayGraphQL<Data>(
    `query GetContactItem($itemIds: [ID!]!) {
      items(ids: $itemIds) {
        id
        name
        column_values {
          id
          value
          text
          ... on BoardRelationValue { linked_item_ids }
        }
        subitems { id name }
      }
    }`,
    { itemIds: [itemId] },
  );
  return data.items?.[0] ?? null;
};

const fetchLinkedItemWithDetails = async (itemId: string) => {
  interface Data {
    items?: Array<{
      id?: string;
      name?: string;
      board?: { id?: string; name?: string };
      updates?: Array<{
        id?: string;
        body?: string;
        created_at?: string;
        creator?: { name?: string };
      }>;
      subitems?: Array<{
        id?: string;
        name?: string;
        created_at?: string;
        updates?: Array<{
          id?: string;
          body?: string;
          created_at?: string;
          creator?: { name?: string };
        }>;
        column_values?: Array<{ id?: string; type?: string; text?: string; value?: string }>;
      }>;
    }>;
  }
  const data = await callMondayGraphQL<Data>(
    `query GetLinkedItemDetails($itemIds: [ID!]!) {
      items(ids: $itemIds) {
        id
        name
        board { id name }
        updates(limit: 200) {
          id body created_at
          creator { name }
        }
        subitems {
          id name created_at
          updates(limit: 200) {
            id body created_at
            creator { name }
          }
          column_values { id type text value }
        }
      }
    }`,
    { itemIds: [itemId] },
  );
  const item = data.items?.[0];
  if (!item?.id) return null;

  const mapUpdate = (u: NonNullable<typeof item.updates>[number]): SourceUpdate => ({
    id: String(u.id ?? ""),
    body: u.body ?? "",
    createdAt: u.created_at ?? null,
    creatorName: u.creator?.name ?? null,
  });

  const subitems: SourceSubitem[] = (item.subitems ?? []).map((si) => ({
    id: String(si.id ?? ""),
    name: (si.name ?? "").trim(),
    createdAt: si.created_at ?? null,
    columnValues: (si.column_values ?? []).map((cv) => ({
      id: cv.id ?? "",
      type: cv.type ?? "",
      text: cv.text ?? null,
      value: cv.value ?? null,
    })),
    updates: (si.updates ?? []).map(mapUpdate),
  }));

  return {
    id: String(item.id),
    name: (item.name ?? "").trim(),
    boardId: String(item.board?.id ?? ""),
    boardName: item.board?.name?.trim() ?? null,
    updates: (item.updates ?? []).map(mapUpdate),
    subitems,
  } satisfies SourceItem;
};

const fetchBoardColumns = async (boardId: string) => {
  interface Data {
    boards?: Array<{ columns?: MondayColumn[] }>;
  }
  const data = await callMondayGraphQL<Data>(
    `query GetBoardColumns($boardId: ID!) {
      boards(ids: [$boardId]) {
        columns { id title type settings_str }
      }
    }`,
    { boardId },
  );
  return data.boards?.[0]?.columns ?? [];
};

const createSubitem = async (parentItemId: string, itemName: string, columnValues: Record<string, unknown>) => {
  interface Data { create_subitem?: { id?: string | null } }
  const data = await callMondayGraphQL<Data>(
    `mutation CreateSubitem($parentItemId: ID!, $itemName: String!, $columnValues: JSON!) {
      create_subitem(parent_item_id: $parentItemId, item_name: $itemName, column_values: $columnValues, create_labels_if_missing: true) { id }
    }`,
    { parentItemId, itemName, columnValues: JSON.stringify(columnValues) },
  );
  return data.create_subitem?.id?.trim() ?? null;
};

const createUpdate = async (itemId: string, body: string) => {
  interface Data { create_update?: { id?: string | null } }
  const data = await callMondayGraphQL<Data>(
    `mutation CreateUpdate($itemId: ID!, $body: String!) {
      create_update(item_id: $itemId, body: $body) { id }
    }`,
    { itemId, body },
  );
  return data.create_update?.id?.trim() ?? null;
};

const updateSubitemDateColumn = async (boardId: string, subitemId: string, date: string, time: string) => {
  interface Data { change_column_value?: { id?: string | null } }
  await callMondayGraphQL<Data>(
    `mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
      change_column_value(board_id: $boardId, item_id: $itemId, column_id: $columnId, value: $value) { id }
    }`,
    { boardId, itemId: subitemId, columnId: "date0", value: JSON.stringify({ date, time }) },
  );
};

const updateProgressColumn = async (boardId: string, itemId: string, columnId: string) => {
  interface Data { change_simple_column_value?: { id?: string | null } }
  await callMondayGraphQL<Data>(
    `mutation UpdateProgressColumn($boardId: ID!, $itemId: ID!, $columnId: String!, $value: String!) {
      change_simple_column_value(board_id: $boardId, item_id: $itemId, column_id: $columnId, value: $value) { id }
    }`,
    { boardId, itemId, columnId, value: "Done" },
  );
};

// ---------------------------------------------------------------------------
// Core sync function
// ---------------------------------------------------------------------------

export const syncContactFromConnectedBoards = async (
  itemId: string,
  options?: { dryRun?: boolean; ownerId?: string; monthlyBoardId?: string },
): Promise<SyncResult> => {
  const boardId = env.MONDAY_BOARD_ID?.trim() ?? "";
  if (!boardId) throw new Error("Missing MONDAY_BOARD_ID");

  const warnings: string[] = [];
  const monthlyBoardId = options?.monthlyBoardId?.trim() || DEFAULT_MONTHLY_BOARD_ID;

  // 1. Fetch contact item from the API board
  const contactItem = await fetchContactItem(boardId, itemId);
  if (!contactItem) throw new Error(`Contact item ${itemId} not found`);

  // 2. Reverse lookup: find items on the monthly board whose board_relation__1
  //    links back to this API board item
  console.log("[Sync] Searching monthly board", monthlyBoardId, "for item", itemId, contactItem.name);
  const linkedIds = await findMonthlyBoardItemsForContact(itemId, monthlyBoardId);
  console.log("[Sync] Found", linkedIds.length, "monthly board items");

  if (linkedIds.length === 0) {
    return {
      ok: true,
      linkedItemCount: 0,
      createdParentUpdates: 0,
      createdSubitems: 0,
      createdSubitemUpdates: 0,
      updatedProgressColumns: 0,
      skippedSubitems: 0,
      warnings: ["No connected monthly board items found"],
    };
  }

  // Existing subitem names on the target for dedup, mapped to their IDs
  // so we can update columns on already-synced subitems.
  const existingSubitemNameToId = new Map(
    (contactItem.subitems ?? [])
      .filter((si) => (si.name ?? "").trim().length > 0 && si.id)
      .map((si) => [(si.name ?? "").trim().toLowerCase(), String(si.id)] as const),
  );
  const existingSubitemNames = new Set(existingSubitemNameToId.keys());

  // Fetch existing updates on the target item to dedup parent and subitem
  // updates. Synced updates contain "source_entity_id=XYZ" in the body.
  const existingSyncedEntityIds = new Set<string>();
  {
    interface UpdatesData {
      items?: Array<{
        updates?: Array<{ body?: string }>;
        subitems?: Array<{
          updates?: Array<{ body?: string }>;
        }>;
      }>;
    }
    try {
      const uData = await callMondayGraphQL<UpdatesData>(
        `query ($ids: [ID!]!) {
          items(ids: $ids) {
            updates(limit: 500) { body }
            subitems { updates(limit: 200) { body } }
          }
        }`,
        { ids: [itemId] },
      );
      const item = uData.items?.[0];
      const allBodies = [
        ...(item?.updates ?? []).map((u) => u.body ?? ""),
        ...(item?.subitems ?? []).flatMap((si) => (si.updates ?? []).map((u) => u.body ?? "")),
      ];
      for (const body of allBodies) {
        const match = body.match(/source_entity_id=([^\s<]+)/);
        if (match?.[1]) existingSyncedEntityIds.add(match[1]);
      }
    } catch {
      warnings.push("Could not fetch existing updates for dedup; may create duplicates");
    }
    console.log("[Sync] Found", existingSyncedEntityIds.size, "already-synced entity IDs");
  }

  // 3. Fetch each linked item with full details
  const sourceItems: SourceItem[] = [];
  for (const linkedId of linkedIds) {
    try {
      const item = await fetchLinkedItemWithDetails(linkedId);
      if (item) sourceItems.push(item);
    } catch (err) {
      warnings.push(`Failed to fetch linked item ${linkedId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (sourceItems.length === 0) {
    return {
      ok: true,
      linkedItemCount: linkedIds.length,
      createdParentUpdates: 0,
      createdSubitems: 0,
      createdSubitemUpdates: 0,
      updatedProgressColumns: 0,
      skippedSubitems: 0,
      warnings: [...warnings, "No linked items could be fetched"],
    };
  }

  // 3. Resolve target subitem board columns for column mapping
  const targetColumns = await fetchBoardColumns(boardId);
  const targetSubtasksCol = targetColumns.find((c) => normalizeText(c.type) === "subtasks") ?? null;
  const targetSubitemBoardId = parseSubitemBoardIdFromSubtasksColumn(targetSubtasksCol);
  let targetSubitemColumns: MondayColumn[] = [];
  if (targetSubitemBoardId) {
    targetSubitemColumns = await fetchBoardColumns(targetSubitemBoardId);
  }
  const targetSubitemByTitle = new Map<string, MondayColumn[]>();
  for (const col of targetSubitemColumns) {
    const title = normalizeText(col.title);
    if (!title) continue;
    const list = targetSubitemByTitle.get(title) ?? [];
    list.push(col);
    targetSubitemByTitle.set(title, list);
  }
  const targetSubitemById = new Map(targetSubitemColumns.map((c) => [c.id?.trim() ?? "", c]));

  let createdParentUpdates = 0;
  let createdSubitems = 0;
  let createdSubitemUpdates = 0;
  let skippedSubitems = 0;
  const progressColumnsToUpdate = new Set<string>();
  const dryRun = options?.dryRun ?? false;

  for (const source of sourceItems) {
    // Resolve source subitem board columns
    let sourceSubitemColumnTitleById: Record<string, string> = {};
    if (source.subitems.length > 0) {
      const sourceBoardColumns = await fetchBoardColumns(source.boardId);
      const sourceSubtasksCol = sourceBoardColumns.find((c) => normalizeText(c.type) === "subtasks") ?? null;
      const sourceSubitemBoardId = parseSubitemBoardIdFromSubtasksColumn(sourceSubtasksCol);
      if (sourceSubitemBoardId) {
        const sourceSubitemCols = await fetchBoardColumns(sourceSubitemBoardId);
        sourceSubitemColumnTitleById = Object.fromEntries(
          sourceSubitemCols
            .filter((c) => c.id && c.title)
            .map((c) => [c.id!.trim(), c.title!.trim()]),
        );
      }
    }

    // Replay parent updates (skip already-synced)
    for (const update of source.updates) {
      const entityId = update.id;
      if (existingSyncedEntityIds.has(entityId)) continue;

      const body = buildSyncUpdateBody({
        sourceBoardName: source.boardName,
        sourceBoardId: source.boardId,
        sourceItemId: source.id,
        sourceItemName: source.name,
        sourceEntity: "parent_update",
        sourceEntityId: entityId,
        sourceUpdateBody: update.body,
        createdAt: update.createdAt,
        creatorName: update.creatorName,
      });
      try {
        if (!dryRun) await createUpdate(itemId, body);
        createdParentUpdates++;
        existingSyncedEntityIds.add(entityId);
      } catch (err) {
        warnings.push(`Failed to create parent update ${entityId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Create subitems
    const sourceSubitemToTargetSubitem = new Map<string, string>();
    for (const subitem of source.subitems) {
      const cleanName = subitem.name.trim() || `Synced subitem ${subitem.id}`;
      const targetName = `${cleanName} [synced:${source.boardId}:${subitem.id}]`;

      // Always evaluate progress columns regardless of whether this subitem
      // was already synced — re-syncs should fix any missing progress steps.
      const progressColId = classifySubitemForProgressColumn(subitem.name);
      if (progressColId) {
        const statusCol = subitem.columnValues.find(
          (c) => c.id === "status9" || normalizeText(c.type) === "color",
        );
        const statusText = normalizeText(statusCol?.text);
        const isExplicitlyIncomplete = statusText === "not started" || statusText === "stuck";
        console.log("[Sync] Subitem", subitem.name, "→ progressCol", progressColId, "status:", statusText || "(empty)", isExplicitlyIncomplete ? "SKIP" : "MARK");
        if (!isExplicitlyIncomplete) {
          progressColumnsToUpdate.add(progressColId);
        }
      } else {
        console.log("[Sync] Subitem", subitem.name, "→ no matching progress column");
      }

      // Extract creation datetime for date0.
      // Try creation_log column first, fall back to subitem.created_at.
      const creationLogCol = subitem.columnValues.find(
        (c) => c.type === "creation_log",
      );
      let creationLogDateTime = parseCreationLogDateTime(
        creationLogCol?.value,
        creationLogCol?.text,
      );
      if (!creationLogDateTime && subitem.createdAt) {
        creationLogDateTime = parseCreationLogDateTime(undefined, subitem.createdAt);
      }
      console.log("[Sync] Subitem", subitem.name,
        "creation_log col:", creationLogCol ? "found" : "NOT FOUND",
        "subitem.createdAt:", subitem.createdAt,
        "→ dateTime:", creationLogDateTime);

      // Dedup: skip subitem creation if target already has it, but update
      // date0 with full date+time from the source creation_log.
      if (existingSubitemNames.has(targetName.toLowerCase())) {
        skippedSubitems++;
        console.log("[Sync] Skipped (dedup), creationLogDateTime:", creationLogDateTime, "existingId:", existingSubitemNameToId.get(targetName.toLowerCase()));
        if (!dryRun && creationLogDateTime) {
          const existingId = existingSubitemNameToId.get(targetName.toLowerCase());
          if (existingId && targetSubitemBoardId) {
            try {
              console.log("[Sync] Updating date0 on subitem", existingId, "board", targetSubitemBoardId, "→", creationLogDateTime);
              await updateSubitemDateColumn(targetSubitemBoardId, existingId, creationLogDateTime.date, creationLogDateTime.time);
              console.log("[Sync] Updated date0 on existing subitem", existingId);
            } catch (err) {
              const errMsg = err instanceof Error ? err.message : String(err);
              console.log("[Sync] FAILED to update date0 on subitem", existingId, errMsg);
              warnings.push(`Failed to update date0 on subitem ${existingId}: ${errMsg}`);
            }
          }
        }
        continue;
      }

      // Map column values
      const columnValues: Record<string, unknown> = {};
      for (const col of subitem.columnValues) {
        if (col.type === "creation_log") continue;
        const mappedId = mapSourceToTargetColumnId({
          sourceColumn: col,
          sourceColumnTitleById: sourceSubitemColumnTitleById,
          targetColumns: targetSubitemColumns,
          targetColumnsByTitle: targetSubitemByTitle,
        });
        if (!mappedId) continue;
        const targetCol = targetSubitemById.get(mappedId);
        if (!targetCol?.type) continue;
        const mapped = mapColumnValueForTarget(col, targetCol.type);
        if (mapped.skip) continue;
        columnValues[mappedId] = mapped.value;
      }

      if (creationLogDateTime) {
        columnValues["date0"] = { date: creationLogDateTime.date, time: creationLogDateTime.time };
      }

      try {
        let targetSubitemId: string | null = null;
        if (!dryRun) {
          targetSubitemId = await createSubitem(itemId, targetName, columnValues);
        }
        createdSubitems++;
        existingSubitemNames.add(targetName.toLowerCase());
        if (targetSubitemId) {
          sourceSubitemToTargetSubitem.set(subitem.id, targetSubitemId);
        }
      } catch (err) {
        warnings.push(`Failed to create subitem ${subitem.id}: ${err instanceof Error ? err.message : String(err)}`);
        continue;
      }
    }

    // Replay subitem updates (only for newly created subitems, skip already-synced)
    for (const subitem of source.subitems) {
      const targetSubitemId = sourceSubitemToTargetSubitem.get(subitem.id);
      if (!targetSubitemId) continue;
      for (const update of subitem.updates) {
        const entityId = `${subitem.id}:${update.id}`;
        if (existingSyncedEntityIds.has(entityId)) continue;

        const body = buildSyncUpdateBody({
          sourceBoardName: source.boardName,
          sourceBoardId: source.boardId,
          sourceItemId: source.id,
          sourceItemName: source.name,
          sourceEntity: "subitem_update",
          sourceEntityId: entityId,
          sourceUpdateBody: update.body,
          createdAt: update.createdAt,
          creatorName: update.creatorName,
        });
        try {
          if (!dryRun) await createUpdate(targetSubitemId, body);
          createdSubitemUpdates++;
          existingSyncedEntityIds.add(entityId);
        } catch (err) {
          warnings.push(`Failed to create subitem update ${update.id}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  }

  // 4. Set progress columns
  let updatedProgressColumns = 0;
  if (!dryRun && progressColumnsToUpdate.size > 0) {
    for (const colId of progressColumnsToUpdate) {
      try {
        await updateProgressColumn(boardId, itemId, colId);
        updatedProgressColumns++;
      } catch (err) {
        warnings.push(`Failed to update progress column ${colId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  // 5. Upsert touch record
  if (!dryRun && options?.ownerId) {
    try {
      await upsertMondayTouchRecord({
        contactItemId: itemId,
        contactName: contactItem.name ?? "",
        ownerId: options.ownerId,
        source: "sync",
      });
    } catch {
      warnings.push("Failed to upsert touch record");
    }
  }

  console.log("[Sync] Complete for", itemId, { linkedItems: sourceItems.length, createdParentUpdates, createdSubitems, createdSubitemUpdates, updatedProgressColumns, skippedSubitems, warnings: warnings.length });

  return {
    ok: true,
    linkedItemCount: sourceItems.length,
    createdParentUpdates,
    createdSubitems,
    createdSubitemUpdates,
    updatedProgressColumns,
    skippedSubitems,
    warnings,
  };
};
