import { NextResponse } from "next/server";
import { api as apiGenerated } from "@convex-config/_generated/api";

import { getConvexHttpClient } from "~/server/convexHttp";
import { requireVerifiedMondaySession } from "~/server/monday/session";
import type { MonthlyBoardMapping } from "~/server/monday/sync";

const MASTER_ADMIN_USER_ID = "53441186";

export const toJson = (body: unknown, status = 200) =>
  NextResponse.json(body, { status });

export const normalizeMonthlyBoardMappings = (values: unknown): MonthlyBoardMapping[] => {
  if (!Array.isArray(values)) return [];
  const deduped = new Map<string, MonthlyBoardMapping>();
  for (const value of values) {
    if (!value || typeof value !== "object") continue;
    const entry = value as { monthKey?: unknown; boardId?: unknown };
    const monthKey = typeof entry.monthKey === "string" ? entry.monthKey.trim() : "";
    const boardId = typeof entry.boardId === "string" ? entry.boardId.trim() : "";
    if (!/^\d{4}-\d{2}$/.test(monthKey) || !boardId) continue;
    deduped.set(monthKey, { monthKey, boardId });
  }
  return Array.from(deduped.values()).sort((left, right) =>
    left.monthKey.localeCompare(right.monthKey),
  );
};

export const requireBulkSyncAdminSession = async (request: Request) => {
  const identity = await requireVerifiedMondaySession(request);
  const convex = getConvexHttpClient();
  const platformSettings = await convex.query(
    apiGenerated.mondaySettings.getPlatformSettings,
    {},
  );
  const isAdmin =
    identity.userId === MASTER_ADMIN_USER_ID ||
    platformSettings.adminUserIds.includes(identity.userId);
  if (!isAdmin) {
    throw new Error("Admin access required");
  }
  return {
    identity,
    platformSettings,
  };
};
