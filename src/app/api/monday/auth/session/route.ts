import { NextResponse } from "next/server";

import {
  getMondaySessionTokenFromRequest,
  verifyMondaySessionToken,
} from "~/server/monday/session";

export const runtime = "nodejs";

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

type SessionBody = {
  sessionToken?: string;
};

export const POST = async (request: Request) => {
  let body: SessionBody = {};
  try {
    body = (await request.json()) as SessionBody;
  } catch {
    // Allow header-only auth checks.
  }

  const token =
    body.sessionToken && body.sessionToken.length > 0
      ? body.sessionToken
      : getMondaySessionTokenFromRequest(request);

  if (!token) {
    return toJson({ ok: false, error: "Missing sessionToken" }, 400);
  }

  try {
    const identity = await verifyMondaySessionToken(token);
    return toJson({ ok: true, identity });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to verify Monday session token";
    return toJson({ ok: false, error: message }, 401);
  }
};
