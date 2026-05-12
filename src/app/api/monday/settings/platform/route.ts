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

const normalizePlatformSettingsPayload = (
  value: Record<string, unknown> | null | undefined,
) => {
  return {
    masterAdminUserId:
      typeof value?.masterAdminUserId === "string"
        ? value.masterAdminUserId
        : MASTER_ADMIN_USER_ID,
    adminUserIds: parseStringArray(value?.adminUserIds) ?? [MASTER_ADMIN_USER_ID],
    employeeUserIds: parseStringArray(value?.employeeUserIds) ?? [],
    replyToEmails: (parseStringArray(value?.replyToEmails) ?? []).map((email) =>
      email.toLowerCase(),
    ),
    monthlyBoardMappings: parseMonthlyBoardMappings(value?.monthlyBoardMappings) ?? [],
  };
};

interface PlatformSettingsBody {
  adminUserIds?: unknown;
  employeeUserIds?: unknown;
  replyToEmails?: unknown;
  monthlyBoardMappings?: unknown;
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

const MONTH_KEY_PATTERN = /^\d{4}-\d{2}$/;

const parseMonthlyBoardMappings = (value: unknown) => {
  if (!Array.isArray(value)) return null;
  const deduped = new Map<string, { monthKey: string; boardId: string }>();
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) return null;
    const rawMonthKey = (entry as { monthKey?: unknown }).monthKey;
    const rawBoardId = (entry as { boardId?: unknown }).boardId;
    if (typeof rawMonthKey !== "string" || typeof rawBoardId !== "string") {
      return null;
    }
    const monthKey = rawMonthKey.trim();
    const boardId = rawBoardId.trim();
    if (!MONTH_KEY_PATTERN.test(monthKey) || boardId.length === 0) continue;
    deduped.set(monthKey, { monthKey, boardId });
  }
  return Array.from(deduped.values()).sort((a, b) =>
    a.monthKey.localeCompare(b.monthKey),
  );
};

export const GET = async (request: Request) => {
  try {
    await requireVerifiedMondaySession(request);
    const convex = getConvexHttpClient();
    const rawPlatformSettings = (await convex.query(
      apiGenerated.mondaySettings.getPlatformSettings,
      {},
    )) as Record<string, unknown>;
    const platformSettings = normalizePlatformSettingsPayload(rawPlatformSettings);
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
  const monthlyBoardMappings = parseMonthlyBoardMappings(
    body.monthlyBoardMappings,
  );

  if (
    !adminUserIds ||
    !employeeUserIds ||
    !replyToEmailsRaw ||
    !monthlyBoardMappings
  ) {
    return toJson(
      {
        ok: false,
        error:
          "adminUserIds, employeeUserIds, replyToEmails, and monthlyBoardMappings must be valid arrays",
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
    const rawPlatformSettings = (await convex.mutation(
      apiGenerated.mondaySettings.setPlatformSettings,
      {
        adminUserIds,
        employeeUserIds,
        replyToEmails,
        monthlyBoardMappings,
        updatedByMondayUserId: identity.userId,
      },
    )) as Record<string, unknown>;
    const platformSettings = normalizePlatformSettingsPayload(rawPlatformSettings);

    return toJson({ ok: true, platformSettings });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update platform settings";
    return toJson({ ok: false, error: message }, 500);
  }
};
