import { NextResponse } from "next/server";

import { backfillMondayLastInteractionDateByMonth } from "~/server/monday/client";

export const runtime = "nodejs";

const toJson = (body: unknown, status = 200) =>
  NextResponse.json(body, { status });

interface Body {
  monthKey?: string;
  dryRun?: boolean;
  pageSize?: number;
}

export const POST = async (request: Request) => {
  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  const monthKey = body.monthKey?.trim();
  if (!monthKey) {
    return toJson({ ok: false, error: "monthKey is required (YYYY-MM)" }, 400);
  }

  try {
    const result = await backfillMondayLastInteractionDateByMonth({
      monthKey,
      dryRun: body.dryRun ?? true,
      pageSize: body.pageSize,
    });
    return toJson({ ok: true, result });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to backfill last interaction dates";
    return toJson({ ok: false, error: message }, 500);
  }
};
