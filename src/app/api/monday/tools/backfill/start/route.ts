import { NextResponse } from "next/server";

import { api as apiGenerated } from "@convex-config/_generated/api";

import { getConvexHttpClient } from "~/server/convexHttp";

export const runtime = "nodejs";

const apiAny = apiGenerated as any;

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

interface Body {
  baselineDate?: string;
  sourceTag?: string;
  pageSize?: number;
}

export const POST = async (request: Request) => {
  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  try {
    const convex = getConvexHttpClient();
    const result = await convex.mutation(apiAny.mondayTouchBackfill.startBackfill, {
      baselineDate: body.baselineDate,
      sourceTag: body.sourceTag,
      pageSize: body.pageSize,
    });
    return toJson({ ok: true, result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start backfill";
    return toJson({ ok: false, error: message }, 500);
  }
};
