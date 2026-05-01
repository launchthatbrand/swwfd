/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { NextResponse } from "next/server";

import { api as apiGenerated } from "@convex-config/_generated/api";

import { getConvexHttpClient } from "~/server/convexHttp";

export const runtime = "nodejs";

const apiAny = apiGenerated as any;

export const POST = async () => {
  try {
    const convex = getConvexHttpClient();
    const result = await convex.mutation(
      apiAny.mondayTouchRangeBackfill.cancelRangeBackfill,
      {},
    );
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to cancel touch range backfill";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
};
