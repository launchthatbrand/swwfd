/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";

import { api as apiGenerated } from "@convex-config/_generated/api";

import { getConvexHttpClient } from "~/server/convexHttp";

export const runtime = "nodejs";

const apiAny = apiGenerated as any;

const toJson = (body: unknown, status = 200) =>
  NextResponse.json(body, { status });

export const GET = async () => {
  try {
    const convex = getConvexHttpClient();
    const job = await convex.query(
      apiAny.mondayHireEventBackfill.getLatestJob,
      {},
    );
    return toJson({ ok: true, job });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get hire event backfill status";
    return toJson({ ok: false, error: message }, 500);
  }
};
