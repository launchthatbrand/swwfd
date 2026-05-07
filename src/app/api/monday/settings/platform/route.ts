import { NextResponse } from "next/server";

import { api as apiGenerated } from "@convex-config/_generated/api";

import { getConvexHttpClient } from "~/server/convexHttp";
import { requireVerifiedMondaySession } from "~/server/monday/session";

export const runtime = "nodejs";

const MASTER_ADMIN_USER_ID = "53441186";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

interface PlatformSettingsBody {
  adminUserIds?: unknown;
  employeeUserIds?: unknown;
  replyToEmails?: unknown;
}

const parseStringArray = (value: unknown) => {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) {
    return null;
  }

  return value
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .filter((entry, index, entries) => entries.indexOf(entry) === index);
};

export const GET = async (request: Request) => {
  try {
    await requireVerifiedMondaySession(request);
    const convex = getConvexHttpClient();
    const platformSettings = await convex.query(
      apiGenerated.mondaySettings.getPlatformSettings,
      {},
    );
    return toJson({ ok: true, platformSettings });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load platform settings";
    return toJson({ ok: false, error: message }, 401);
  }
};

export const POST = async (request: Request) => {
  let body: PlatformSettingsBody = {};
  try {
    body = (await request.json()) as PlatformSettingsBody;
  } catch {
    body = {};
  }

  const adminUserIds = parseStringArray(body.adminUserIds);
  const employeeUserIds = parseStringArray(body.employeeUserIds);
  const replyToEmailsRaw = parseStringArray(body.replyToEmails);

  if (!adminUserIds || !employeeUserIds || !replyToEmailsRaw) {
    return toJson(
      {
        ok: false,
        error:
          "adminUserIds, employeeUserIds, and replyToEmails must be string arrays",
      },
      400,
    );
  }

  const replyToEmails = replyToEmailsRaw.map((email) => email.toLowerCase());
  const invalidReplyToEmails = replyToEmails.filter(
    (email) => !EMAIL_PATTERN.test(email),
  );
  if (invalidReplyToEmails.length > 0) {
    return toJson(
      {
        ok: false,
        error: `Invalid reply-to emails: ${invalidReplyToEmails.join(", ")}`,
      },
      400,
    );
  }

  try {
    const identity = await requireVerifiedMondaySession(request);
    if (identity.userId !== MASTER_ADMIN_USER_ID) {
      return toJson({ ok: false, error: "Master admin access required" }, 403);
    }

    const convex = getConvexHttpClient();
    const platformSettings = await convex.mutation(
      apiGenerated.mondaySettings.setPlatformSettings,
      {
        adminUserIds,
        employeeUserIds,
        replyToEmails,
        updatedByMondayUserId: identity.userId,
      },
    );

    return toJson({ ok: true, platformSettings });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update platform settings";
    return toJson({ ok: false, error: message }, 500);
  }
};
