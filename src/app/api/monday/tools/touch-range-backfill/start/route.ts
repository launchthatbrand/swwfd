/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";

import { api as apiGenerated } from "@convex-config/_generated/api";

import { getConvexHttpClient } from "~/server/convexHttp";

export const runtime = "nodejs";

const apiAny = apiGenerated as any;

const toJson = (body: unknown, status = 200) =>
  NextResponse.json(body, { status });

export const POST = async (request: Request) => {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const dateFrom = (body.dateFrom as string | undefined)?.trim();
  const dateTo = (body.dateTo as string | undefined)?.trim();
  if (!dateFrom) return toJson({ ok: false, error: "dateFrom is required (YYYY-MM-DD)" }, 400);
  if (!dateTo) return toJson({ ok: false, error: "dateTo is required (YYYY-MM-DD)" }, 400);

  try {
    const convex = getConvexHttpClient();
    const result = await convex.mutation(
      apiAny.mondayTouchRangeBackfill.startRangeBackfill,
      { dateFrom, dateTo, dryRun: (body.dryRun as boolean | undefined) ?? true, pageSize: body.pageSize },
    );
    return toJson({ ok: true, result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start touch range backfill";
    return toJson({ ok: false, error: message }, 500);
  }
};
