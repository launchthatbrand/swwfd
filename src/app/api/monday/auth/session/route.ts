import { NextResponse } from "next/server";
import { api as apiGenerated } from "@convex-config/_generated/api";

import {
  MONDAY_DEV_BYPASS_TOKEN,
  canUseMondayDevBypass,
  getMondayDevBypassIdentity,
  type MondaySessionIdentity,
  getMondaySessionTokenFromRequest,
  verifyMondaySessionToken,
} from "~/server/monday/session";
import { getConvexHttpClient } from "~/server/convexHttp";
import { getMondayUserProfile } from "~/server/monday/client";

export const runtime = "nodejs";

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

type SessionBody = {
  sessionToken?: string;
};

const provisionMondayUserRecord = async (args: {
  identity: MondaySessionIdentity;
  lastSeenSource: "iframe_session" | "dev_bypass";
}) => {
  const convex = getConvexHttpClient();
  let mondayProfile: Awaited<ReturnType<typeof getMondayUserProfile>> | null = null;
  try {
    mondayProfile = await getMondayUserProfile(args.identity.userId);
  } catch (profileError) {
    console.warn("[monday-auth-session] failed to fetch monday profile for provisioning", {
      mondayUserId: args.identity.userId,
      error: profileError instanceof Error ? profileError.message : String(profileError),
    });
  }
  try {
    await convex.mutation(apiGenerated.mondayUsers.upsertFromSession, {
      mondayAccountId: args.identity.accountId,
      mondayUserId: args.identity.userId,
      mondayAppClientId: args.identity.appClientId,
      email: mondayProfile?.email ?? undefined,
      name: mondayProfile?.name ?? undefined,
      lastSeenSource: args.lastSeenSource,
    });
  } catch (provisionError) {
    console.warn("[monday-auth-session] failed to provision monday user record", {
      mondayAccountId: args.identity.accountId,
      mondayUserId: args.identity.userId,
      source: args.lastSeenSource,
      error: provisionError instanceof Error ? provisionError.message : String(provisionError),
    });
  }
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
    if (!canUseMondayDevBypass()) {
      return toJson({ ok: false, error: "Missing sessionToken" }, 400);
    }
    try {
      const identity = await getMondayDevBypassIdentity();
      await provisionMondayUserRecord({ identity, lastSeenSource: "dev_bypass" });
      return toJson({
        ok: true,
        identity,
        devBypass: true,
        sessionToken: MONDAY_DEV_BYPASS_TOKEN,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load Monday dev identity";
      return toJson({ ok: false, error: message }, 500);
    }
  }

  if (token === MONDAY_DEV_BYPASS_TOKEN && canUseMondayDevBypass()) {
    try {
      const identity = await getMondayDevBypassIdentity();
      await provisionMondayUserRecord({ identity, lastSeenSource: "dev_bypass" });
      return toJson({
        ok: true,
        identity,
        devBypass: true,
        sessionToken: MONDAY_DEV_BYPASS_TOKEN,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load Monday dev identity";
      return toJson({ ok: false, error: message }, 500);
    }
  }

  try {
    const identity = await verifyMondaySessionToken(token);
    await provisionMondayUserRecord({ identity, lastSeenSource: "iframe_session" });
    return toJson({ ok: true, identity });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to verify Monday session token";
    return toJson({ ok: false, error: message }, 401);
  }
};
