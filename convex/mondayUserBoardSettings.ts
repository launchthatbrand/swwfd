import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

const colorThemeValidator = v.union(
  v.literal("neutral"),
  v.literal("sky"),
  v.literal("emerald"),
  v.literal("violet"),
  v.literal("rose"),
  v.literal("custom"),
);
const customThemeValidator = v.object({
  colorHex: v.string(),
  alpha: v.number(),
});
const fontSizeValidator = v.union(
  v.literal("default"),
  v.literal("medium"),
  v.literal("large"),
);
const tableDensityValidator = v.union(v.literal("expanded"), v.literal("compact"));
const displayModeValidator = v.union(v.literal("table"), v.literal("grid"));
const recordSourceValidator = v.union(
  v.literal("created_in_month"),
  v.literal("touched_in_month"),
);

const settingsValidator = v.object({
  ownerMondayUserId: v.string(),
  colorTheme: colorThemeValidator,
  customTheme: v.optional(customThemeValidator),
  fontSize: fontSizeValidator,
  tableDensity: v.optional(tableDensityValidator),
  pageSize: v.optional(v.number()),
  displayMode: v.optional(displayModeValidator),
  recordSource: v.optional(recordSourceValidator),
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
      customTheme: undefined,
      fontSize: DEFAULT_FONT_SIZE,
      tableDensity: undefined,
      pageSize: undefined,
      displayMode: undefined,
      recordSource: undefined,
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
      customTheme: undefined,
      fontSize: DEFAULT_FONT_SIZE,
      tableDensity: undefined,
      pageSize: undefined,
      displayMode: undefined,
      recordSource: undefined,
      createdAt: 0,
      updatedAt: 0,
    };
  }

  return {
    ownerMondayUserId: existing.ownerMondayUserId,
    colorTheme: existing.colorTheme,
    customTheme: existing.customTheme,
    fontSize: existing.fontSize,
    tableDensity: existing.tableDensity,
    pageSize: existing.pageSize,
    displayMode: existing.displayMode,
    recordSource: existing.recordSource,
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
    customTheme: v.optional(customThemeValidator),
    fontSize: fontSizeValidator,
    tableDensity: v.optional(tableDensityValidator),
    pageSize: v.optional(v.number()),
    displayMode: v.optional(displayModeValidator),
    recordSource: v.optional(recordSourceValidator),
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
        customTheme: args.customTheme,
        fontSize: args.fontSize,
        tableDensity: args.tableDensity,
        pageSize: args.pageSize,
        displayMode: args.displayMode,
        recordSource: args.recordSource,
        updatedAt: now,
        updatedByMondayUserId: viewerMondayUserId,
      });
      return {
        ownerMondayUserId,
        colorTheme: args.colorTheme,
        customTheme: args.customTheme,
        fontSize: args.fontSize,
        tableDensity: args.tableDensity,
        pageSize: args.pageSize,
        displayMode: args.displayMode,
        recordSource: args.recordSource,
        createdAt: existing.createdAt,
        updatedAt: now,
      };
    }

    await ctx.db.insert("mondayUserBoardSettings", {
      accountId,
      ownerMondayUserId,
      colorTheme: args.colorTheme,
      customTheme: args.customTheme,
      fontSize: args.fontSize,
      tableDensity: args.tableDensity,
      pageSize: args.pageSize,
      displayMode: args.displayMode,
      recordSource: args.recordSource,
      createdAt: now,
      updatedAt: now,
      updatedByMondayUserId: viewerMondayUserId,
    });
    return {
      ownerMondayUserId,
      colorTheme: args.colorTheme,
      customTheme: args.customTheme,
      fontSize: args.fontSize,
      tableDensity: args.tableDensity,
      pageSize: args.pageSize,
      displayMode: args.displayMode,
      recordSource: args.recordSource,
      createdAt: now,
      updatedAt: now,
    };
  },
});
