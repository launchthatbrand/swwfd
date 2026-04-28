import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

const colorThemeValidator = v.union(
  v.literal("neutral"),
  v.literal("sky"),
  v.literal("emerald"),
  v.literal("violet"),
  v.literal("rose"),
);
const fontSizeValidator = v.union(
  v.literal("default"),
  v.literal("medium"),
  v.literal("large"),
);
const tableDensityValidator = v.union(v.literal("expanded"), v.literal("compact"));
const displayModeValidator = v.union(v.literal("table"), v.literal("grid"));

const settingsValidator = v.object({
  ownerMondayUserId: v.string(),
  colorTheme: colorThemeValidator,
  fontSize: fontSizeValidator,
  tableDensity: v.optional(tableDensityValidator),
  pageSize: v.optional(v.number()),
  displayMode: v.optional(displayModeValidator),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const DEFAULT_COLOR_THEME = "neutral" as const;
const DEFAULT_FONT_SIZE = "medium" as const;

const normalizeInput = (value: string) => value.trim();

export const getForOwnerBoard = query({
  args: {
    accountId: v.string(),
    ownerMondayUserId: v.string(),
  },
  returns: settingsValidator,
  handler: async (ctx, args) => {
    const accountId = normalizeInput(args.accountId);
    const ownerMondayUserId = normalizeInput(args.ownerMondayUserId);
    if (!accountId || !ownerMondayUserId) {
    return {
      ownerMondayUserId: ownerMondayUserId || "",
      colorTheme: DEFAULT_COLOR_THEME,
      fontSize: DEFAULT_FONT_SIZE,
      tableDensity: undefined,
      pageSize: undefined,
      displayMode: undefined,
      createdAt: 0,
      updatedAt: 0,
    };
  }

  const existing = await ctx.db
    .query("mondayUserBoardSettings")
    .withIndex("by_account_and_owner", (q) =>
      q.eq("accountId", accountId).eq("ownerMondayUserId", ownerMondayUserId),
    )
    .unique();

  if (!existing) {
    return {
      ownerMondayUserId,
      colorTheme: DEFAULT_COLOR_THEME,
      fontSize: DEFAULT_FONT_SIZE,
      tableDensity: undefined,
      pageSize: undefined,
      displayMode: undefined,
      createdAt: 0,
      updatedAt: 0,
    };
  }

  return {
    ownerMondayUserId: existing.ownerMondayUserId,
    colorTheme: existing.colorTheme,
    fontSize: existing.fontSize,
    tableDensity: existing.tableDensity,
    pageSize: existing.pageSize,
    displayMode: existing.displayMode,
    createdAt: existing.createdAt,
    updatedAt: existing.updatedAt,
  };
  },
});

export const upsertForOwnerBoard = mutation({
  args: {
    accountId: v.string(),
    ownerMondayUserId: v.string(),
    viewerMondayUserId: v.string(),
    colorTheme: colorThemeValidator,
    fontSize: fontSizeValidator,
    tableDensity: v.optional(tableDensityValidator),
    pageSize: v.optional(v.number()),
    displayMode: v.optional(displayModeValidator),
  },
  returns: settingsValidator,
  handler: async (ctx, args) => {
    const accountId = normalizeInput(args.accountId);
    const ownerMondayUserId = normalizeInput(args.ownerMondayUserId);
    const viewerMondayUserId = normalizeInput(args.viewerMondayUserId);
    if (!accountId || !ownerMondayUserId || !viewerMondayUserId) {
      throw new Error("Missing required fields for board settings");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("mondayUserBoardSettings")
      .withIndex("by_account_and_owner", (q) =>
        q.eq("accountId", accountId).eq("ownerMondayUserId", ownerMondayUserId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        colorTheme: args.colorTheme,
        fontSize: args.fontSize,
        tableDensity: args.tableDensity,
        pageSize: args.pageSize,
        displayMode: args.displayMode,
        updatedAt: now,
        updatedByMondayUserId: viewerMondayUserId,
      });
      return {
        ownerMondayUserId,
        colorTheme: args.colorTheme,
        fontSize: args.fontSize,
        tableDensity: args.tableDensity,
        pageSize: args.pageSize,
        displayMode: args.displayMode,
        createdAt: existing.createdAt,
        updatedAt: now,
      };
    }

    await ctx.db.insert("mondayUserBoardSettings", {
      accountId,
      ownerMondayUserId,
      colorTheme: args.colorTheme,
      fontSize: args.fontSize,
      tableDensity: args.tableDensity,
      pageSize: args.pageSize,
      displayMode: args.displayMode,
      createdAt: now,
      updatedAt: now,
      updatedByMondayUserId: viewerMondayUserId,
    });
    return {
      ownerMondayUserId,
      colorTheme: args.colorTheme,
      fontSize: args.fontSize,
      tableDensity: args.tableDensity,
      pageSize: args.pageSize,
      displayMode: args.displayMode,
      createdAt: now,
      updatedAt: now,
    };
  },
});
