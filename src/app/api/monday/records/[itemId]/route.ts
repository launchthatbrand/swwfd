import { NextResponse } from "next/server";

import {
  fetchMondayItemColumns,
  upsertMondayHireEventSubitem,
  updateMondayRecordFields,
} from "~/server/monday/client";
import { requireVerifiedMondaySession } from "~/server/monday/session";

export const runtime = "nodejs";

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

export const GET = async (
  request: Request,
  context: { params: Promise<{ itemId: string }> },
) => {
  try {
    await requireVerifiedMondaySession(request);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unauthorized Monday session";
    return toJson({ ok: false, error: message }, 401);
  }

  const { itemId } = await context.params;
  if (!itemId?.trim()) {
    return toJson({ ok: false, error: "Missing monday item id" }, 400);
  }

  try {
    const result = await fetchMondayItemColumns({ itemId: itemId.trim() });
    return toJson({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch item columns";
    return toJson({ ok: false, error: message }, 500);
  }
};

interface UpdateRecordBody {
  referredToContractors?: string[] | string | null;
  hiredWithContractor?: string | null;
  hireDate?: string | null;
  retentionPeriod?: string | null;
  tags?: string[] | null;
  status?: string | null;
  ownerId?: string | null;
}

interface HireSnapshot {
  itemName: string | null;
  statusText: string;
  hireDate: string | null;
  ownerId: string;
  tags: string;
}

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
      const parsed = JSON.parse(value) as { date?: string; time?: string; created_at?: string };
      if (parsed.date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) return parsed.date;
      if (parsed.created_at) return normalizeDateOnly(parsed.created_at);
    } catch {
      // ignore parse failures
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

const parseHireSnapshot = (payload: Awaited<ReturnType<typeof fetchMondayItemColumns>>): HireSnapshot => {
  const columns = payload.columns ?? [];
  const byType = (type: string) =>
    columns.find((column) => (column.type ?? "").toLowerCase() === type);
  const byId = (id: string) => columns.find((column) => column.id === id);
  const peopleColumn = byType("people");
  const statusColumn = byType("status");
  const tagsColumn = byId("dropdown_mkvw578t");
  const hireDateColumn = byId("date_mkty234p");
  const ownerId = parsePeopleIds(peopleColumn?.value ?? null)[0] ?? "";
  const hireDate = parseDateOnlyColumn(hireDateColumn?.value ?? null, hireDateColumn?.text ?? null);
  return {
    itemName: payload.itemName ?? null,
    statusText: statusColumn?.text?.trim() ?? "",
    hireDate,
    ownerId,
    tags: tagsColumn?.text?.trim() ?? "",
  };
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
    includesTag(tags, "candidate") && (includesTag(tags, "group") || includesTag(tags, "train"));
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

export const PATCH = async (
  request: Request,
  context: { params: Promise<{ itemId: string }> },
) => {
  try {
    await requireVerifiedMondaySession(request);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unauthorized Monday session";
    return toJson({ ok: false, error: message }, 401);
  }

  const { itemId } = await context.params;
  if (!itemId?.trim()) {
    return toJson({ ok: false, error: "Missing monday item id" }, 400);
  }

  let body: UpdateRecordBody;
  try {
    body = (await request.json()) as UpdateRecordBody;
  } catch {
    return toJson({ ok: false, error: "Invalid JSON body" }, 400);
  }

  let beforeSnapshot: HireSnapshot | null = null;
  try {
    const beforeColumns = await fetchMondayItemColumns({ itemId });
    beforeSnapshot = parseHireSnapshot(beforeColumns);
  } catch {
    beforeSnapshot = null;
  }

  try {
    await updateMondayRecordFields({
      itemId,
      referredToContractors: body.referredToContractors,
      hiredWithContractor: body.hiredWithContractor,
      hireDate: body.hireDate,
      retentionPeriod: body.retentionPeriod,
      tags: body.tags,
      status: body.status,
      ownerId: body.ownerId,
    });
    const previous = beforeSnapshot ?? {
      itemName: null,
      statusText: "",
      hireDate: null,
      ownerId: "",
      tags: "",
    };
    const nextStatus = Object.prototype.hasOwnProperty.call(body, "status")
      ? body.status?.trim() ?? ""
      : previous.statusText;
    const nextHireDate = Object.prototype.hasOwnProperty.call(body, "hireDate")
      ? normalizeDateOnly(body.hireDate)
      : previous.hireDate;
    const nextOwnerId = Object.prototype.hasOwnProperty.call(body, "ownerId")
      ? body.ownerId?.trim() ?? ""
      : previous.ownerId;
    const nextTags = Object.prototype.hasOwnProperty.call(body, "tags")
      ? Array.isArray(body.tags)
        ? body.tags.map((entry) => entry.trim()).filter((entry) => entry.length > 0).join(", ")
        : ""
      : previous.tags;

    const previousSegments = detectHireSegments(
      previous.statusText,
      previous.hireDate,
      previous.tags,
    );
    const nextSegments = detectHireSegments(nextStatus, nextHireDate, nextTags);
    const didBecomeHired = nextSegments.isHired && !previousSegments.isHired;
    const didHireDateChange = !!nextHireDate && nextHireDate !== previous.hireDate;
    const shouldCaptureHireEvent = nextSegments.isHired && (didBecomeHired || didHireDateChange);

    let hireEventWarning: string | null = null;
    let hireEvent:
      | { id: string | null; upserted: "created" | "skipped" }
      | null = null;

    if (shouldCaptureHireEvent) {
      const eventOwnerId = nextOwnerId || previous.ownerId;
      const eventHireDate = nextHireDate ?? new Date().toISOString().slice(0, 10);
      if (!eventOwnerId) {
        hireEventWarning =
          "Hire event was not created because no owner is assigned on the record.";
      } else {
        try {
          hireEvent = await upsertMondayHireEventSubitem({
            contactItemId: itemId,
            contactName: previous.itemName,
            ownerId: eventOwnerId,
            hireDate: eventHireDate,
            source: "record_patch",
            segments: {
              isCandidatesGroup: nextSegments.isCandidatesGroup,
              isReentry: nextSegments.isReentry,
              isVeteran: nextSegments.isVeteran,
            },
          });
        } catch (error) {
          hireEventWarning =
            error instanceof Error
              ? error.message
              : "Failed to create hire event subitem";
        }
      }
    }

    return toJson({ ok: true, hireEvent, warning: hireEventWarning });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update monday item";
    return toJson({ ok: false, error: message }, 500);
  }
};
