import { createAuthWrappers } from "@launchthatbrand/activepieces-convex/app-wrappers";
import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation } from "../_generated/server";

const wrappers = createAuthWrappers(components);

// These are called by @launchthatbrand/activepieces-convex to switch the active platform /
// project. For now, we keep a single platform/project, so these are no-ops.
// If/when we add multi-tenant projects, persist these to a user/session doc.

export const provisionCurrentUser = mutation({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }

    // Ensure the user has a default platform/project + memberships inside the
    // Activepieces Convex Component (idempotent if already provisioned).
    return await ctx.runMutation(
      components.activepieces.auth.mutations.provisionCurrentUser,
      {},
    );
  },
});

export const switchPlatform = mutation({
  ...wrappers.mutations.switchPlatform,
  returns: v.any(),
});

export const switchProject = mutation({
  ...wrappers.mutations.switchProject,
  returns: v.any(),
});

