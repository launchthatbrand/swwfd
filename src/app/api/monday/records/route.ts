import { NextResponse } from "next/server";

import { hasMondayConfig, listMondayBoardRecords } from "~/server/monday/client";
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

  if (!hasMondayConfig()) {
    return toJson(
      {
        ok: false,
        error:
          "Missing Monday configuration. Set MONDAY_API_KEY and MONDAY_BOARD_ID.",
      },
      400,
    );
  }

  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const limit = parseLimit(url.searchParams.get("limit"));
  const search = url.searchParams.get("search")?.trim().toLowerCase() ?? "";
  const group = url.searchParams.get("group")?.trim().toLowerCase() ?? "";
  const status = url.searchParams.get("status")?.trim().toLowerCase() ?? "";
  const owner = url.searchParams.get("owner")?.trim().toLowerCase() ?? "";
  const dateFrom = parseIsoDateOnly(url.searchParams.get("dateFrom"));
  const dateTo = parseIsoDateOnly(url.searchParams.get("dateTo"));
  const startedAt = Date.now();

  try {
    const { records, nextCursor, boardName, appliedFilters, approvalSteps } =
      await listMondayBoardRecords({
        cursor,
        limit,
        dateFrom: dateFrom ? dateFrom.toISOString().slice(0, 10) : undefined,
        dateTo: dateTo ? dateTo.toISOString().slice(0, 10) : undefined,
        owner: owner || undefined,
        status: status || undefined,
      });

    const filtered = records.filter((record) => {
      if (search.length > 0) {
        const haystack = [
          record.name,
          record.id,
          record.groupTitle ?? "",
          record.statusText ?? "",
          record.peopleText ?? "",
          record.email ?? "",
          record.address ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }

      if (group.length > 0) {
        const groupValue = (record.groupTitle ?? "").toLowerCase();
        if (groupValue !== group) return false;
      }

      if (status.length > 0 && !appliedFilters?.status) {
        const statusValue = (record.statusText ?? "").toLowerCase();
        if (statusValue !== status) return false;
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
        if (!hasOwnerMatch) return false;
      }

      if ((dateFrom || dateTo) && !appliedFilters?.date) {
        const createdAt = record.createdAt ? new Date(record.createdAt) : null;
        if (!createdAt || Number.isNaN(createdAt.getTime())) return false;
        if (dateFrom && createdAt < dateFrom) return false;
        if (dateTo) {
          const end = new Date(dateTo);
          end.setUTCHours(23, 59, 59, 999);
          if (createdAt > end) return false;
        }
      }

      return true;
    });

    console.info("[MondayRecordsRoute] GET completed", {
      durationMs: Date.now() - startedAt,
      requestedLimit: limit,
      returnedRows: filtered.length,
      rawRows: records.length,
      hasNextCursor: !!nextCursor,
      appliedFilters,
      hasSearch: search.length > 0,
      hasGroup: group.length > 0,
    });

    return toJson({
      ok: true,
      boardName,
      records: filtered,
      nextCursor,
      approvalSteps,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load Monday records";
    console.error("[MondayRecordsRoute] GET failed", {
      durationMs: Date.now() - startedAt,
      error: message,
      requestedLimit: limit,
      hasCursor: !!cursor,
      hasSearch: search.length > 0,
      hasGroup: group.length > 0,
      hasStatus: status.length > 0,
      hasOwner: owner.length > 0,
    });
    return toJson({ ok: false, error: message }, 500);
  }
};

export const POST = async (request: Request) => {
  try {
    await requireVerifiedMondaySession(request);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unauthorized Monday session";
    return toJson({ ok: false, error: message }, 401);
  }

  return toJson(
    {
      ok: false,
      error:
        "Archive and delete actions are disabled for this view. Use monday.com directly for write operations.",
    },
    405,
  );
};
