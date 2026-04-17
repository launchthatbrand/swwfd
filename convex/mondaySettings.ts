import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const GLOBAL_SETTINGS_KEY = "global";
const DEFAULT_EMAIL_MARKETING_ENABLED = true;

export const getFeatureFlags = query({
  args: {},
  returns: v.object({
    emailMarketingEnabled: v.boolean(),
  }),
  handler: async (ctx) => {
    const settings = await ctx.db
      .query("mondayGlobalSettings")
      .withIndex("by_key", (q) => q.eq("key", GLOBAL_SETTINGS_KEY))
      .unique();

    return {
      emailMarketingEnabled:
        settings?.emailMarketingEnabled ?? DEFAULT_EMAIL_MARKETING_ENABLED,
    };
  },
});

export const setFeatureFlags = mutation({
  args: {
    emailMarketingEnabled: v.boolean(),
    updatedByMondayUserId: v.string(),
  },
  returns: v.object({
    emailMarketingEnabled: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("mondayGlobalSettings")
      .withIndex("by_key", (q) => q.eq("key", GLOBAL_SETTINGS_KEY))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        emailMarketingEnabled: args.emailMarketingEnabled,
        updatedAt: now,
        updatedByMondayUserId: args.updatedByMondayUserId,
      });
    } else {
      await ctx.db.insert("mondayGlobalSettings", {
        key: GLOBAL_SETTINGS_KEY,
        emailMarketingEnabled: args.emailMarketingEnabled,
        updatedAt: now,
        updatedByMondayUserId: args.updatedByMondayUserId,
      });
    }

    return {
      emailMarketingEnabled: args.emailMarketingEnabled,
    };
  },
});
