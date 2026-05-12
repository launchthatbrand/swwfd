import { NextResponse } from "next/server";
import { api as apiGenerated } from "@convex-config/_generated/api";

import { getConvexHttpClient } from "~/server/convexHttp";
import { callMondayGraphQL } from "~/server/monday/client";
import { syncContactFromConnectedBoards } from "~/server/monday/sync";

export const runtime = "nodejs";

const MONTHLY_BOARD_RELATION_COLUMN_ID = "board_relation__1";

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

const normalizeValue = (value: unknown) => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
};

const toRecord = (value: unknown) => {
  if (typeof value !== "object" || value === null) return null;
  return value as Record<string, unknown>;
};

const extractWebhookPayload = (body: unknown) => {
  const payload = toRecord(body);
  if (!payload) {
    return { challenge: "", boardId: "", itemId: "", parentItemId: "" };
  }

  const challenge = normalizeValue(payload.challenge);
  const event = toRecord(payload.event) ?? payload;
  const boardId =
    normalizeValue(event.boardId) ||
    normalizeValue(event.board_id) ||
    normalizeValue(payload.boardId) ||
    normalizeValue(payload.board_id);
  const itemId =
    normalizeValue(event.pulseId) ||
    normalizeValue(event.pulse_id) ||
    normalizeValue(event.itemId) ||
    normalizeValue(event.item_id) ||
    normalizeValue(payload.pulseId) ||
    normalizeValue(payload.itemId);
  const parentItemId =
    normalizeValue(event.parentItemId) ||
    normalizeValue(event.parent_item_id) ||
    normalizeValue(event.parentPulseId) ||
    normalizeValue(event.parent_pulse_id) ||
    normalizeValue(payload.parentItemId);

  return { challenge, boardId, itemId, parentItemId };
};

const resolveLinkedApiContactId = async (args: {
  monthlyItemId: string;
  monthlyBoardId: string;
}) => {
  interface RelationData {
    items?: Array<{
      id?: string;
      board?: { id?: string };
      column_values?: Array<{
        id?: string;
        linked_item_ids?: string[];
      }>;
    }>;
  }

  const data = await callMondayGraphQL<RelationData>(
    `query ResolveMonthlyItemRelation($itemIds: [ID!]) {
      items(ids: $itemIds) {
        id
        board { id }
        column_values(ids: ["${MONTHLY_BOARD_RELATION_COLUMN_ID}"]) {
          ... on BoardRelationValue { id linked_item_ids }
        }
      }
    }`,
    { itemIds: [args.monthlyItemId] },
  );

  const item = data.items?.[0];
  if (!item) return null;
  const sourceBoardId = normalizeValue(item.board?.id);
  if (sourceBoardId !== args.monthlyBoardId) return null;

  const relationColumn = item.column_values?.find(
    (column) => column.id === MONTHLY_BOARD_RELATION_COLUMN_ID,
  );
  const linkedIds = relationColumn?.linked_item_ids ?? [];
  const linkedContactId = linkedIds[0]?.trim() ?? "";
  return linkedContactId.length > 0 ? linkedContactId : null;
};

export const POST = async (request: Request) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return toJson({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const { challenge, boardId, itemId, parentItemId } = extractWebhookPayload(body);
  if (challenge) {
    return toJson({ challenge });
  }

  if (!boardId) {
    return toJson({ ok: false, error: "Webhook payload missing board id" }, 400);
  }

  const convex = getConvexHttpClient();
  const platformSettings = await convex.query(
    apiGenerated.mondaySettings.getPlatformSettings,
    {},
  );
  const monthlyBoardMappings = Array.isArray(platformSettings.monthlyBoardMappings)
    ? platformSettings.monthlyBoardMappings
    : [];
  const mappedBoardIds = new Set(
    monthlyBoardMappings
      .map((entry) => entry.boardId.trim())
      .filter((entry) => entry.length > 0),
  );
  if (!mappedBoardIds.has(boardId)) {
    return toJson({
      ok: true,
      ignored: true,
      reason: `Board ${boardId} is not configured in monthly board mappings`,
    });
  }

  const candidateMonthlyItemIds = Array.from(
    new Set(
      [parentItemId, itemId]
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    ),
  );
  if (candidateMonthlyItemIds.length === 0) {
    return toJson({ ok: false, error: "Webhook payload missing item id" }, 400);
  }

  let linkedContactId: string | null = null;
  let sourceMonthlyItemId: string | null = null;
  for (const monthlyItemId of candidateMonthlyItemIds) {
    linkedContactId = await resolveLinkedApiContactId({
      monthlyItemId,
      monthlyBoardId: boardId,
    });
    if (!linkedContactId) continue;
    sourceMonthlyItemId = monthlyItemId;
    break;
  }

  if (!linkedContactId) {
    return toJson({
      ok: true,
      ignored: true,
      reason: "No linked API contact found from monthly board relation",
    });
  }

  const syncResult = await syncContactFromConnectedBoards(linkedContactId, {
    monthlyBoardId: boardId,
  });

  return toJson({
    ok: syncResult.ok,
    contactItemId: linkedContactId,
    sourceMonthlyItemId,
    boardId,
    result: syncResult,
  });
};
