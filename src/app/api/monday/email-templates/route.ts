import { NextResponse } from "next/server";

import { listMondayEmailTemplates } from "~/server/monday/client";
import { requireVerifiedMondaySession } from "~/server/monday/session";

export const runtime = "nodejs";

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

const parseLimit = (value: string | null) => {
  if (!value) return 100;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 100;
  return Math.min(Math.max(parsed, 1), 500);
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
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const limit = parseLimit(url.searchParams.get("limit"));
  const boardId = url.searchParams.get("boardId") ?? undefined;
  const workdocColumnId = url.searchParams.get("workdocColumnId") ?? undefined;

  try {
    const result = await listMondayEmailTemplates({
      cursor,
      limit,
      boardId,
      workdocColumnId,
    });
    return toJson({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load Monday email templates";
    return toJson({ ok: false, error: message }, 500);
  }
};
