import { NextResponse } from "next/server";

import { env } from "~/env";
import {
  fetchMondayItemColumns,
  upsertMondayHireEventSubitem,
} from "~/server/monday/client";

export const runtime = "nodejs";

const HIRE_DATE_COLUMN_ID = "date_mkty234p";
const TAGS_COLUMN_ID = "dropdown_mkvw578t";

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
  if (!payload) return { challenge: "", boardId: "", itemId: "", columnId: "" };

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
  const columnId =
    normalizeValue(event.columnId) ||
    normalizeValue(event.column_id) ||
    normalizeValue(payload.columnId) ||
    normalizeValue(payload.column_id);

  return { challenge, boardId, itemId, columnId };
};

const normalizeDateOnly = (value: string | null | undefined) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const dateOnly = trimmed.includes("T") ? trimmed.slice(0, 10) : trimmed;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return null;
  return dateOnly;
};

const parseDateOnlyColumn = (value: string | null, text: string | null) => {
  if (value) {
    try {
      const parsed = JSON.parse(value) as {
        date?: string;
        time?: string;
        created_at?: string;
      };
      if (parsed.date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) return parsed.date;
      if (parsed.created_at) return normalizeDateOnly(parsed.created_at);
    } catch {
      // ignore malformed date value payloads
    }
  }
  return normalizeDateOnly(text);
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

const splitTags = (value: string) =>
  value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);

const includesTag = (tags: string[], needle: string) =>
  tags.some((entry) => entry.includes(needle));

const detectHireSegments = (statusText: string, hireDate: string | null, tagsText: string) => {
  const tags = splitTags(tagsText);
  const normalizedStatus = statusText.trim().toLowerCase();
  const isCandidatesGroup =
    includesTag(tags, "candidate") &&
    (includesTag(tags, "group") || includesTag(tags, "train"));
  const isReentry = includesTag(tags, "reentry");
  const isVeteran = includesTag(tags, "veteran");
  const isHired =
    normalizedStatus.includes("hired") || !!hireDate || includesTag(tags, "hired");
  return {
    isCandidatesGroup,
    isReentry,
    isVeteran,
    isHired,
  };
};

export const POST = async (request: Request) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return toJson({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const { challenge, boardId, itemId, columnId } = extractWebhookPayload(body);
  if (challenge) {
    return toJson({ challenge });
  }

  const contactBoardId = normalizeValue(env.MONDAY_BOARD_ID);
  if (contactBoardId && boardId && boardId !== contactBoardId) {
    return toJson({
      ok: true,
      ignored: true,
      reason: `Ignoring board ${boardId}; expected ${contactBoardId}`,
    });
  }

  if (!itemId) {
    return toJson({ ok: false, error: "Webhook payload missing item id" }, 400);
  }

  try {
    const payload = await fetchMondayItemColumns({ itemId });
    const columns = payload.columns ?? [];
    const byType = (type: string) =>
      columns.find((column) => column.type.toLowerCase() === type);
    const byId = (id: string) => columns.find((column) => column.id === id);

    const peopleColumn = byType("people");
    const statusColumn = byType("status");
    const tagsColumn = byId(TAGS_COLUMN_ID);
    const hireDateColumn = byId(HIRE_DATE_COLUMN_ID);
    const ownerId = parsePeopleIds(peopleColumn?.value ?? null)[0] ?? "";
    const statusText = statusColumn?.text?.trim() ?? "";
    const hireDate = parseDateOnlyColumn(
      hireDateColumn?.value ?? null,
      hireDateColumn?.text ?? null,
    );
    const tagsText = tagsColumn?.text?.trim() ?? "";

    const segments = detectHireSegments(statusText, hireDate, tagsText);
    if (!segments.isHired) {
      return toJson({
        ok: true,
        ignored: true,
        reason: "Contact does not currently meet hired criteria",
      });
    }
    if (!ownerId) {
      return toJson({
        ok: true,
        ignored: true,
        reason: "Contact is hired but has no owner; skipping hire event ingest",
      });
    }

    const eventHireDate = hireDate ?? new Date().toISOString().slice(0, 10);
    const hireEvent = await upsertMondayHireEventSubitem({
      contactItemId: payload.itemId,
      contactName: payload.itemName,
      ownerId,
      hireDate: eventHireDate,
      source: "webhook",
      segments: {
        isCandidatesGroup: segments.isCandidatesGroup,
        isReentry: segments.isReentry,
        isVeteran: segments.isVeteran,
      },
    });

    return toJson({
      ok: true,
      itemId: payload.itemId,
      boardId: boardId || contactBoardId || null,
      columnId: columnId || null,
      hireEvent,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to ingest hire-event webhook";
    return toJson({ ok: false, error: message }, 500);
  }
};
