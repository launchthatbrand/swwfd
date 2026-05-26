/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";

import { api as apiGenerated } from "@convex-config/_generated/api";

import { getConvexHttpClient } from "~/server/convexHttp";

export const runtime = "nodejs";

const apiAny = apiGenerated as any;

const toJson = (body: unknown, status = 200) =>
  NextResponse.json(body, { status });

export const POST = async () => {
  try {
    const convex = getConvexHttpClient();
    const result = await convex.mutation(
      apiAny.mondayHireEventBackfill.cancelBackfill,
      {},
    );
    return toJson({ ok: true, result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to cancel hire event backfill";
    return toJson({ ok: false, error: message }, 500);
  }
};
