/* eslint-disable no-restricted-properties */
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const ensureViewerAdmin = mutation({
  args: { expectedEmail: v.optional(v.string()) },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // This mutation is intended ONLY for local tooling (browser automation).
    // To enable it, set this env var in the Convex dashboard for the deployment.
    if (process.env.SWWFD_DEV_AUTH_BYPASS_ENABLED !== "true") {
      throw new Error("DEV_AUTH_BYPASS_DISABLED");
    }

    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("UNAUTHORIZED");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    if (args.expectedEmail) {
      const expected = args.expectedEmail.trim().toLowerCase();
      const actual = (user.email ?? "").trim().toLowerCase();
      if (!actual || actual !== expected) {
        throw new Error("DEV_AUTH_BYPASS_EMAIL_MISMATCH");
      }
    }

    if (user.isAdmin === true) return true;
    await ctx.db.patch(userId, { isAdmin: true });
    return true;
  },
});

