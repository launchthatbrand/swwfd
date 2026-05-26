import { NextResponse } from "next/server";

import { getMondayUserProfile } from "~/server/monday/client";
import { requireVerifiedMondaySession } from "~/server/monday/session";

export const runtime = "nodejs";

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

export const GET = async (request: Request) => {
  try {
    const identity = await requireVerifiedMondaySession(request);
    const user = await getMondayUserProfile(identity.userId);

    return toJson({
      ok: true,
      user: user
        ? {
            id: user.id,
            email: user.email,
            name: user.name,
          }
        : null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load Monday user profile";
    const isUnauthorized =
      message === "Missing Monday session token" ||
      message === "signature verification failed" ||
      message === "Invalid Monday session token payload";
    return toJson(
      { ok: false, error: isUnauthorized ? "Unauthorized Monday session" : message },
      isUnauthorized ? 401 : 500,
    );
  }
};
