import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const advancedFilterFieldValidator = v.union(
  v.literal("owner"),
  v.literal("district"),
  v.literal("name"),
  v.literal("email"),
  v.literal("phone"),
  v.literal("address"),
  v.literal("tags"),
  v.literal("createdAt"),
  v.literal("hireDate"),
  v.literal("detail"),
);

const advancedFilterOperatorValidator = v.union(
  v.literal("contains"),
  v.literal("equals"),
  v.literal("not_equals"),
  v.literal("starts_with"),
  v.literal("ends_with"),
  v.literal("is_empty"),
  v.literal("is_not_empty"),
  v.literal("on_or_after"),
  v.literal("on_or_before"),
  v.literal("between"),
);

const advancedFilterConditionValidator = v.object({
  id: v.string(),
  field: advancedFilterFieldValidator,
  operator: advancedFilterOperatorValidator,
  value: v.string(),
  valueTo: v.string(),
  target: v.optional(v.string()),
});

const savedPresetValidator = v.object({
  id: v.string(),
  name: v.string(),
  matchMode: v.union(v.literal("all"), v.literal("any")),
  conditions: v.array(advancedFilterConditionValidator),
  createdAt: v.number(),
  updatedAt: v.number(),
  ownerMondayUserId: v.string(),
});

const toPresetId = (value: string): Id<"mondayUserFilterPresets"> => {
  return value as Id<"mondayUserFilterPresets">;
};

const normalizeInput = (value: string) => value.trim();

const toCaseInsensitiveValue = (value: string) => value.trim().toLowerCase();

export const listForOwnerBoard = query({
  args: {
    accountId: v.string(),
    ownerMondayUserId: v.string(),
  },
  returns: v.array(savedPresetValidator),
  handler: async (ctx, args) => {
    const accountId = normalizeInput(args.accountId);
    const ownerMondayUserId = normalizeInput(args.ownerMondayUserId);
    if (!accountId || !ownerMondayUserId) return [];

    const presets = await ctx.db
      .query("mondayUserFilterPresets")
      .withIndex("by_account_and_owner", (q) =>
        q.eq("accountId", accountId).eq("ownerMondayUserId", ownerMondayUserId),
      )
      .collect();

    return presets
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((preset) => ({
        id: String(preset._id),
        name: preset.name,
        matchMode: preset.matchMode,
        conditions: preset.conditions,
        createdAt: preset.createdAt,
        updatedAt: preset.updatedAt,
        ownerMondayUserId: preset.ownerMondayUserId,
      }));
  },
});

export const upsertForOwnerBoard = mutation({
  args: {
    accountId: v.string(),
    ownerMondayUserId: v.string(),
    viewerMondayUserId: v.string(),
    presetId: v.optional(v.string()),
    name: v.string(),
    matchMode: v.union(v.literal("all"), v.literal("any")),
    conditions: v.array(advancedFilterConditionValidator),
  },
  returns: savedPresetValidator,
  handler: async (ctx, args) => {
    const accountId = normalizeInput(args.accountId);
    const ownerMondayUserId = normalizeInput(args.ownerMondayUserId);
    const viewerMondayUserId = normalizeInput(args.viewerMondayUserId);
    const name = normalizeInput(args.name);
    if (!accountId || !ownerMondayUserId || !viewerMondayUserId || !name) {
      throw new Error("Missing required fields for filter preset");
    }

    const now = Date.now();
    const normalizedName = toCaseInsensitiveValue(name);
    const inputPresetId = normalizeInput(args.presetId ?? "");
    if (inputPresetId) {
      const existing = await ctx.db.get(toPresetId(inputPresetId));
      if (!existing) {
        throw new Error("Preset not found");
      }
      if (existing.accountId !== accountId || existing.ownerMondayUserId !== ownerMondayUserId) {
        throw new Error("Preset does not belong to this owner board");
      }
      await ctx.db.patch(existing._id, {
        name,
        matchMode: args.matchMode,
        conditions: args.conditions,
        updatedAt: now,
        updatedByMondayUserId: viewerMondayUserId,
      });
      return {
        id: String(existing._id),
        name,
        matchMode: args.matchMode,
        conditions: args.conditions,
        createdAt: existing.createdAt,
        updatedAt: now,
        ownerMondayUserId,
      };
    }

    const existingByName = (
      await ctx.db
        .query("mondayUserFilterPresets")
        .withIndex("by_account_and_owner", (q) =>
          q.eq("accountId", accountId).eq("ownerMondayUserId", ownerMondayUserId),
        )
        .collect()
    ).find((preset) => toCaseInsensitiveValue(preset.name) === normalizedName);

    if (existingByName) {
      await ctx.db.patch(existingByName._id, {
        name,
        matchMode: args.matchMode,
        conditions: args.conditions,
        updatedAt: now,
        updatedByMondayUserId: viewerMondayUserId,
      });
      return {
        id: String(existingByName._id),
        name,
        matchMode: args.matchMode,
        conditions: args.conditions,
        createdAt: existingByName.createdAt,
        updatedAt: now,
        ownerMondayUserId,
      };
    }

    const presetId = await ctx.db.insert("mondayUserFilterPresets", {
      accountId,
      ownerMondayUserId,
      name,
      matchMode: args.matchMode,
      conditions: args.conditions,
      createdAt: now,
      updatedAt: now,
      createdByMondayUserId: viewerMondayUserId,
      updatedByMondayUserId: viewerMondayUserId,
    });

    return {
      id: String(presetId),
      name,
      matchMode: args.matchMode,
      conditions: args.conditions,
      createdAt: now,
      updatedAt: now,
      ownerMondayUserId,
    };
  },
});

export const removeForOwnerBoard = mutation({
  args: {
    accountId: v.string(),
    ownerMondayUserId: v.string(),
    presetId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const accountId = normalizeInput(args.accountId);
    const ownerMondayUserId = normalizeInput(args.ownerMondayUserId);
    const presetId = normalizeInput(args.presetId);
    if (!accountId || !ownerMondayUserId || !presetId) {
      throw new Error("Missing required fields for preset removal");
    }

    const existing = await ctx.db.get(toPresetId(presetId));
    if (!existing) return null;
    if (existing.accountId !== accountId || existing.ownerMondayUserId !== ownerMondayUserId) {
      throw new Error("Preset does not belong to this owner board");
    }

    await ctx.db.delete(existing._id);
    return null;
  },
});
