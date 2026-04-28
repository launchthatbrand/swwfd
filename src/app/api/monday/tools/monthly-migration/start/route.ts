/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { NextResponse } from "next/server";

import { api as apiGenerated } from "@convex-config/_generated/api";

import { getConvexHttpClient } from "~/server/convexHttp";

export const runtime = "nodejs";

const apiAny = apiGenerated as any;

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

interface Body {
  sourceBoardId?: string;
  targetBoardId?: string;
  monthTag?: string;
  dryRun?: boolean;
  includeParentUpdates?: boolean;
  includeSubitems?: boolean;
  includeSubitemUpdates?: boolean;
  updateProgressColumns?: boolean;
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
    const sourceBoardId = body.sourceBoardId?.trim();
    if (!sourceBoardId) {
      return toJson({ ok: false, error: "sourceBoardId is required" }, 400);
    }
    const convex = getConvexHttpClient();
    const result = await convex.mutation(apiAny.mondayMonthlyMigration.startMigration, {
      sourceBoardId,
      targetBoardId: body.targetBoardId,
      monthTag: body.monthTag,
      dryRun: body.dryRun,
      includeParentUpdates: body.includeParentUpdates,
      includeSubitems: body.includeSubitems,
      includeSubitemUpdates: body.includeSubitemUpdates,
      updateProgressColumns: body.updateProgressColumns,
      pageSize: body.pageSize,
    });
    return toJson({ ok: true, result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start monthly migration";
    return toJson({ ok: false, error: message }, 500);
  }
};
