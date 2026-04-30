import { NextResponse } from "next/server";

import { api as apiGenerated } from "@convex-config/_generated/api";

import { getConvexHttpClient } from "~/server/convexHttp";
import { requireVerifiedMondaySession } from "~/server/monday/session";

export const runtime = "nodejs";

type BoardColorTheme = "neutral" | "sky" | "emerald" | "violet" | "rose";
type BoardFontSize = "default" | "medium" | "large";
type BoardTableDensity = "expanded" | "compact";
type BoardDisplayMode = "table" | "grid";
const VALID_PAGE_SIZES = [20, 40, 100, 0] as const;

interface UpsertBoardSettingsBody {
  ownerId?: string;
  colorTheme?: BoardColorTheme;
  fontSize?: BoardFontSize;
  tableDensity?: BoardTableDensity;
  pageSize?: number;
  displayMode?: BoardDisplayMode;
}

const COLOR_THEMES: BoardColorTheme[] = ["neutral", "sky", "emerald", "violet", "rose"];
const FONT_SIZES: BoardFontSize[] = ["default", "medium", "large"];
const TABLE_DENSITIES: BoardTableDensity[] = ["expanded", "compact"];
const DISPLAY_MODES: BoardDisplayMode[] = ["table", "grid"];

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

const normalizeValue = (value: string | null | undefined) => {
  if (!value) return "";
  return value.trim();
};

const isBoardColorTheme = (value: unknown): value is BoardColorTheme => {
  return typeof value === "string" && COLOR_THEMES.includes(value as BoardColorTheme);
};

const isBoardFontSize = (value: unknown): value is BoardFontSize => {
  return typeof value === "string" && FONT_SIZES.includes(value as BoardFontSize);
};

const isBoardTableDensity = (value: unknown): value is BoardTableDensity => {
  return typeof value === "string" && TABLE_DENSITIES.includes(value as BoardTableDensity);
};

const isBoardDisplayMode = (value: unknown): value is BoardDisplayMode => {
  return typeof value === "string" && DISPLAY_MODES.includes(value as BoardDisplayMode);
};

const isValidPageSize = (value: unknown): value is number => {
  return typeof value === "number" && (VALID_PAGE_SIZES as readonly number[]).includes(value);
};

export const GET = async (request: Request) => {
  try {
    const identity = await requireVerifiedMondaySession(request);
    const url = new URL(request.url);
    const ownerId = normalizeValue(url.searchParams.get("ownerId"));
    if (!ownerId) {
      return toJson({ ok: false, error: "ownerId is required" }, 400);
    }

    const convex = getConvexHttpClient();
    const settings = await convex.query(apiGenerated.mondayUserBoardSettings.getForOwnerBoard, {
      accountId: identity.accountId,
      ownerMondayUserId: ownerId,
    });
    return toJson({ ok: true, settings });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load board settings";
    return toJson({ ok: false, error: message }, 500);
  }
};

export const POST = async (request: Request) => {
  let body: UpsertBoardSettingsBody = {};
  try {
    body = (await request.json()) as UpsertBoardSettingsBody;
  } catch {
    body = {};
  }

  const ownerId = normalizeValue(body.ownerId);
  if (!ownerId) {
    return toJson({ ok: false, error: "ownerId is required" }, 400);
  }
  if (!isBoardColorTheme(body.colorTheme)) {
    return toJson({ ok: false, error: "colorTheme is invalid" }, 400);
  }
  if (!isBoardFontSize(body.fontSize)) {
    return toJson({ ok: false, error: "fontSize is invalid" }, 400);
  }
  if (body.tableDensity !== undefined && !isBoardTableDensity(body.tableDensity)) {
    return toJson({ ok: false, error: "tableDensity is invalid" }, 400);
  }

  try {
    const identity = await requireVerifiedMondaySession(request);
    const convex = getConvexHttpClient();
    const settings = await convex.mutation(
      apiGenerated.mondayUserBoardSettings.upsertForOwnerBoard,
      {
        accountId: identity.accountId,
        ownerMondayUserId: ownerId,
        viewerMondayUserId: identity.userId,
        colorTheme: body.colorTheme,
        fontSize: body.fontSize,
        tableDensity: isBoardTableDensity(body.tableDensity) ? body.tableDensity : undefined,
        pageSize: isValidPageSize(body.pageSize) ? body.pageSize : undefined,
        displayMode: isBoardDisplayMode(body.displayMode) ? body.displayMode : undefined,
      },
    );
    return toJson({ ok: true, settings });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save board settings";
    return toJson({ ok: false, error: message }, 500);
  }
};
