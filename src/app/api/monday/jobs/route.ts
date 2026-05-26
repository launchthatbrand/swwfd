import { NextResponse } from "next/server";

import { listMondayJobs } from "~/server/monday/jobs";
import { requireVerifiedMondaySession } from "~/server/monday/session";

export const runtime = "nodejs";

const toJson = (body: unknown, status = 200) =>
  NextResponse.json(body, { status });

const parseLimit = (value: string | null) => {
  if (!value) return 200;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 200;
  return Math.min(Math.max(parsed, 1), 500);
};

const parseBoolean = (value: string | null, fallback: boolean) => {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return fallback;
};

export const GET = async (request: Request) => {
  try {
    await requireVerifiedMondaySession(request);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unauthorized Monday session";
    return toJson({ ok: false, error: message }, 401);
  }

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get("limit"));
  const boardId = url.searchParams.get("boardId")?.trim() || undefined;
  const search = url.searchParams.get("search")?.trim() || undefined;
  const district = url.searchParams.get("district")?.trim() || undefined;
  const onlyAvailable = parseBoolean(url.searchParams.get("onlyAvailable"), true);

  try {
    const result = await listMondayJobs({
      boardId,
      limit,
      search,
      district,
      onlyAvailable,
    });
    return toJson({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load jobs board data";
    return toJson({ ok: false, error: message }, 500);
  }
};
