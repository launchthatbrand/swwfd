import { NextResponse } from "next/server";

import {
  getMondayRecordEditOptions,
  hasMondayConfig,
} from "~/server/monday/client";
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
    const options = await getMondayRecordEditOptions();
    return toJson({
      ok: true,
      options,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load monday edit options";
    return toJson({ ok: false, error: message }, 500);
  }
};
