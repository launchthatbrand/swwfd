import { NextResponse } from "next/server";

import { listMondayBoardColumns } from "~/server/monday/client";
import { requireVerifiedMondaySession } from "~/server/monday/session";

export const runtime = "nodejs";

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

export const GET = async (request: Request) => {
  try {
    await requireVerifiedMondaySession(request);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unauthorized Monday session";
    return toJson({ ok: false, error: message }, 401);
  }

  try {
    const columns = await listMondayBoardColumns();
    return toJson({ ok: true, columns });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load Monday board columns";
    return toJson({ ok: false, error: message }, 500);
  }
};
