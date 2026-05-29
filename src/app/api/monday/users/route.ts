import { NextResponse } from "next/server";

import { getMondayUsersByIds, listMondayBoardUsers } from "~/server/monday/client";
import { requireVerifiedMondaySession } from "~/server/monday/session";

export const runtime = "nodejs";

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

export const GET = async (request: Request) => {
  try {
    await requireVerifiedMondaySession(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized Monday session";
    return toJson({ ok: false, error: message }, 401);
  }

  try {
    const url = new URL(request.url);
    const idsParam = url.searchParams.get("ids")?.trim() ?? "";
    const ids = Array.from(
      new Set(
        idsParam
          .split(",")
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0),
      ),
    ).slice(0, 250);

    if (ids.length === 0) {
      const users = await listMondayBoardUsers();
      return toJson({ ok: true, users });
    }

    const users = await getMondayUsersByIds(ids);
    return toJson({ ok: true, users });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load Monday users";
    return toJson({ ok: false, error: message }, 500);
  }
};
