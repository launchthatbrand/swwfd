import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation } from "../_generated/server";

export const updateFlags = mutation({
  args: {
    platformId: v.string(),
    patch: v.any(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const patch = (args.patch ?? {}) as Record<string, unknown>;

    // Only forward the boolean flag keys that the component supports; ignore theme edits for now.
    const forwarded: Record<string, boolean> = {};
    const maybeSet = (key: string) => {
      if (typeof patch[key] === "boolean") forwarded[key] = patch[key] as boolean;
    };

    maybeSet("managePiecesEnabled");
    maybeSet("environmentsEnabled");
    maybeSet("projectRolesEnabled");
    maybeSet("apiKeysEnabled");
    maybeSet("customAppearanceEnabled");
    maybeSet("embeddingEnabled");
    maybeSet("SHOW_COMMUNITY");
    maybeSet("SHOW_BILLING");

    if (Object.keys(forwarded).length === 0) {
      return { ok: true };
    }

    return await ctx.runMutation(
      components.activepieces.flags.mutations.updateFlags,
      { platformId: args.platformId, patch: forwarded },
    );
  },
});

