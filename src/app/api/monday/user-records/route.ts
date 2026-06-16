import { NextResponse } from "next/server";

import { hasMondayConfig, listMondayUserRecords } from "~/server/monday/client";
import { requireVerifiedMondaySession } from "~/server/monday/session";

export const runtime = "nodejs";

const parseLimit = (value: string | null) => {
  if (!value) return 100;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 100;
  return Math.min(Math.max(parsed, 1), 500);
};

const parseIsoDateOnly = (value: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const parsed = Date.parse(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed);
};

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
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
          "Missing Monday config. Set MONDAY_API_KEY and MONDAY_BOARD_ID.",
      },
      400,
    );
  }

  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const limit = parseLimit(url.searchParams.get("limit"));
  const search = url.searchParams.get("search")?.trim() ?? "";
  const owner = url.searchParams.get("owner")?.trim() ?? "";
  const status = url.searchParams.get("status")?.trim() ?? "";
  const dateFrom = parseIsoDateOnly(url.searchParams.get("dateFrom"));
  const dateTo = parseIsoDateOnly(url.searchParams.get("dateTo"));
  const hydrateWholeMonthParam =
    url.searchParams.get("hydrateWholeMonth")?.trim().toLowerCase() ?? "";
  const hydrateWholeMonth =
    hydrateWholeMonthParam === "1" || hydrateWholeMonthParam === "true";

  const startedAt = Date.now();

  try {
    const result = await listMondayUserRecords({
      cursor,
      limit,
      search: search || undefined,
      owner: owner || undefined,
      status: status || undefined,
      dateFrom: dateFrom ? dateFrom.toISOString().slice(0, 10) : undefined,
      dateTo: dateTo ? dateTo.toISOString().slice(0, 10) : undefined,
      hydrateWholeMonth,
    });
    const recordsWithResumes = result.records.filter(
      (record) => record.resumeFiles.length > 0,
    );

    console.info("[MondayUserRecordsRoute] GET completed", {
      durationMs: Date.now() - startedAt,
      requestedLimit: limit,
      returnedRows: result.records.length,
      returnedRowsWithResumes: recordsWithResumes.length,
      sampleResumeRecords: recordsWithResumes.slice(0, 5).map((record) => ({
        id: record.id,
        contactId: record.contactId ?? null,
        name: record.name,
        resumeFilesCount: record.resumeFiles.length,
        resumeFileNames: record.resumeFiles.map((file) => file.name),
      })),
      matchedTouches: result.stats.matchedTouches,
      loadedContacts: result.stats.loadedContacts,
      hasNextCursor: !!result.nextCursor,
      scanPages: result.stats.scanPages,
      scannedUniqueContacts: result.stats.scannedUniqueContacts,
      stoppedAfterUniqueContactTarget: result.stats.stoppedAfterUniqueContactTarget,
      hydratedWholeMonth: result.stats.hydratedWholeMonth,
      contactChunkCount: result.stats.contactChunkCount,
      contactChunkConcurrency: result.stats.contactChunkConcurrency,
      contactChunkRateLimitRetries: result.stats.contactChunkRateLimitRetries,
      hasOwner: owner.length > 0,
      hasSearch: search.length > 0,
      hasStatus: status.length > 0,
    });

    return toJson({
      ok: true,
      boardName: result.boardName,
      records: result.records,
      nextCursor: result.nextCursor,
      approvalSteps: result.approvalSteps,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load Monday user records";
    console.error("[MondayUserRecordsRoute] GET failed", {
      durationMs: Date.now() - startedAt,
      error: message,
      hasOwner: owner.length > 0,
      hasSearch: search.length > 0,
      hasStatus: status.length > 0,
      hasDateFrom: !!dateFrom,
      hasDateTo: !!dateTo,
    });
    return toJson({ ok: false, error: message }, 500);
  }
};
