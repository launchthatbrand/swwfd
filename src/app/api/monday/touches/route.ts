import { NextResponse } from "next/server";

import {
  hasMondayTouchConfig,
  listMondayTouchBoardRecords,
} from "~/server/monday/client";
import { requireVerifiedMondaySession } from "~/server/monday/session";

export const runtime = "nodejs";

const parseLimit = (value: string | null) => {
  if (!value) return 100;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 100;
  return Math.min(Math.max(parsed, 1), 500);
};

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

const parseIsoDateOnly = (value: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const parsed = Date.parse(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed);
};

export const GET = async (request: Request) => {
  try {
    await requireVerifiedMondaySession(request);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unauthorized Monday session";
    return toJson({ ok: false, error: message }, 401);
  }

  if (!hasMondayTouchConfig()) {
    return toJson(
      {
        ok: false,
        error:
          "Missing Monday touch configuration. Set MONDAY_API_KEY and MONDAY_CONTACT_TOUCHED_BOARD_ID.",
      },
      400,
    );
  }

  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const limit = parseLimit(url.searchParams.get("limit"));
  const search = url.searchParams.get("search")?.trim().toLowerCase() ?? "";
  const owner = url.searchParams.get("owner")?.trim().toLowerCase() ?? "";
  const dateFrom = parseIsoDateOnly(url.searchParams.get("dateFrom"));
  const dateTo = parseIsoDateOnly(url.searchParams.get("dateTo"));
  const startedAt = Date.now();

  try {
    console.info("[MondayTouchesRoute] GET start", {
      limit,
      hasCursor: !!cursor,
      owner,
      dateFrom: dateFrom ? dateFrom.toISOString().slice(0, 10) : null,
      dateTo: dateTo ? dateTo.toISOString().slice(0, 10) : null,
      searchLength: search.length,
    });
    const { records, nextCursor, boardName, appliedFilters } =
      await listMondayTouchBoardRecords({
        cursor,
        limit,
        dateFrom: dateFrom ? dateFrom.toISOString().slice(0, 10) : undefined,
        dateTo: dateTo ? dateTo.toISOString().slice(0, 10) : undefined,
        owner: owner || undefined,
      });

    let droppedBySearch = 0;
    let droppedByOwner = 0;
    let droppedByDate = 0;
    const filtered = records.filter((record) => {
      if (search.length > 0) {
        const haystack = [
          record.name,
          record.id,
          record.peopleText ?? "",
          record.email ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search)) {
          droppedBySearch += 1;
          return false;
        }
      }

      if (owner.length > 0 && !appliedFilters?.owner) {
        const peopleTextValue = (record.peopleText ?? "").toLowerCase();
        const ownerIdValues = (record as { ownerIds?: unknown }).ownerIds;
        const ownerIds = Array.isArray(ownerIdValues)
          ? ownerIdValues
              .filter(
                (entry): entry is string | number =>
                  typeof entry === "string" || typeof entry === "number",
              )
              .map((entry) => String(entry).toLowerCase())
          : [];
        let hasOwnerMatch = false;
        if (ownerIds.includes(owner)) {
          hasOwnerMatch = true;
        } else if (peopleTextValue === owner) {
          hasOwnerMatch = true;
        }
        if (!hasOwnerMatch) {
          droppedByOwner += 1;
          return false;
        }
      }

      if ((dateFrom || dateTo) && !appliedFilters?.date) {
        const createdAt = record.createdAt ? new Date(record.createdAt) : null;
        if (!createdAt || Number.isNaN(createdAt.getTime())) {
          droppedByDate += 1;
          return false;
        }
        if (dateFrom && createdAt < dateFrom) {
          droppedByDate += 1;
          return false;
        }
        if (dateTo) {
          const end = new Date(dateTo);
          end.setUTCHours(23, 59, 59, 999);
          if (createdAt > end) {
            droppedByDate += 1;
            return false;
          }
        }
      }

      return true;
    });

    console.info("[MondayTouchesRoute] GET completed", {
      durationMs: Date.now() - startedAt,
      requestedLimit: limit,
      returnedRows: filtered.length,
      rawRows: records.length,
      hasNextCursor: !!nextCursor,
      appliedFilters,
      hasSearch: search.length > 0,
      hasOwner: owner.length > 0,
      droppedBySearch,
      droppedByOwner,
      droppedByDate,
      sampleRecordOwners: records.slice(0, 5).map((record) => ({
        id: record.id,
        peopleText: record.peopleText,
        ownerIds: (record.ownerIds ?? []).slice(0, 3),
        createdAt: record.createdAt,
      })),
    });

    return toJson({
      ok: true,
      boardName,
      records: filtered,
      nextCursor,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load Monday touch records";
    console.error("[MondayTouchesRoute] GET failed", {
      durationMs: Date.now() - startedAt,
      error: message,
      requestedLimit: limit,
      hasCursor: !!cursor,
      hasSearch: search.length > 0,
      hasOwner: owner.length > 0,
    });
    return toJson({ ok: false, error: message }, 500);
  }
};

