import { NextResponse } from "next/server";
import { isAuthenticatedNextjs } from "@convex-dev/auth/nextjs/server";

import { env } from "~/env";
import {
  getMondayApiKeyServiceIdentity,
  requireVerifiedMondaySession,
} from "~/server/monday/session";
import { removeZohoConnection } from "~/server/zoho/store";

export const runtime = "nodejs";

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

const resolveZohoOAuthIdentity = async (request: Request) => {
  try {
    return await requireVerifiedMondaySession(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    if (
      env.MONDAY_ALLOW_OUTSIDE_IFRAME_OAUTH_TOOLS === "true" &&
      (message.includes("Missing Monday session token") ||
        message.includes("signature verification failed"))
    ) {
      const isAuthed = await isAuthenticatedNextjs();
      if (!isAuthed) {
        throw new Error("Unauthorized");
      }
      return await getMondayApiKeyServiceIdentity();
    }
    throw error;
  }
};

export const POST = async (request: Request) => {
  try {
    const identity = await resolveZohoOAuthIdentity(request);
    await removeZohoConnection({
      mondayAccountId: identity.accountId,
      mondayAppClientId: identity.appClientId,
    });
    return toJson({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return toJson({ ok: false, error: message }, 401);
  }
};
