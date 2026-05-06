/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";

import { api as apiGenerated } from "@convex-config/_generated/api";

import { getConvexHttpClient } from "~/server/convexHttp";

export const runtime = "nodejs";

const apiAny = apiGenerated as any;

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
  if (!monthKey) return toJson({ ok: false, error: "monthKey is required (YYYY-MM)" }, 400);

  try {
    const convex = getConvexHttpClient();
    const result = await convex.mutation(
      apiAny.mondayHireEventBackfill.startBackfill,
      {
        monthKey,
        dryRun: body.dryRun ?? true,
        pageSize: body.pageSize,
      },
    );
    return toJson({ ok: true, result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start hire event backfill";
    return toJson({ ok: false, error: message }, 500);
  }
};
