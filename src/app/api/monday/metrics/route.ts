import { NextResponse } from "next/server";

import { hasMondayConfig } from "~/server/monday/client";
import { buildMondayMetricsSummary } from "~/server/monday/metrics";
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

  if (!hasMondayConfig()) {
    return toJson(
      {
        ok: false,
        error:
          "Missing Monday configuration. Set MONDAY_API_KEY and MONDAY_BOARD_ID.",
      },
      400,
    );
  }

  try {
    const url = new URL(request.url);
    const fiscalYear = url.searchParams.get("fiscalYear");
    const ownerId = url.searchParams.get("ownerId");
    const summary = await buildMondayMetricsSummary({
      fiscalYear,
      ownerId,
    });
    return toJson({ ok: true, summary });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load Monday metrics";
    return toJson({ ok: false, error: message }, 500);
  }
};
