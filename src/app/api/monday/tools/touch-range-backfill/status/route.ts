import { NextResponse } from "next/server";

import { api as apiGenerated } from "@convex-config/_generated/api";

import { getConvexHttpClient } from "~/server/convexHttp";

export const runtime = "nodejs";

const apiAny = apiGenerated as any;

export const GET = async () => {
  try {
    const convex = getConvexHttpClient();
    const job = await convex.query(
      apiAny.mondayTouchRangeBackfill.getLatestJob,
      {},
    );
    return NextResponse.json({ ok: true, job });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get touch range backfill status";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
};
