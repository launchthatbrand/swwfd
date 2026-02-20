import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const ensureFirstAdmin = mutation({
  args: {},
  returns: v.object({
    becameAdmin: v.boolean(),
    isAdmin: v.boolean(),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { becameAdmin: false, isAdmin: false };
    }

    const existingAdmin = await ctx.db
      .query("users")
      .withIndex("by_isAdmin", (q) => q.eq("isAdmin", true))
      .take(1);

    const user = await ctx.db.get(userId);
    if (!user) return { becameAdmin: false, isAdmin: false };

    if (existingAdmin.length === 0 && user.isAdmin !== true) {
      await ctx.db.patch(userId, { isAdmin: true });
      return { becameAdmin: true, isAdmin: true };
    }

    return { becameAdmin: false, isAdmin: user.isAdmin === true };
  },
});

export const listAdmins = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("users"),
      email: v.optional(v.string()),
      name: v.optional(v.string()),
      isAdmin: v.optional(v.boolean()),
    }),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const me = await ctx.db.get(userId);
    if (!me || me.isAdmin !== true) return [];

    const admins = await ctx.db
      .query("users")
      .withIndex("by_isAdmin", (q) => q.eq("isAdmin", true))
      .take(100);

    return admins.map((u) => ({
      _id: u._id,
      email: u.email,
      name: u.name,
      isAdmin: u.isAdmin,
    }));
  },
});

