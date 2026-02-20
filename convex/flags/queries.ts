import { v } from "convex/values";
import { components } from "../_generated/api";
import { query } from "../_generated/server";

const DEFAULT_THEME = {
  websiteName: "SWWFD Automations",
  logos: {
    fullLogoUrl: "/t3-icon.svg",
    favIconUrl: "/favicon.ico",
    logoIconUrl: "/t3-icon.svg",
  },
  colors: {
    primary: {
      default: "#4f46e5",
      dark: "#4338ca",
      light: "#818cf8",
    },
  },
};

export const getFlags = query({
  args: {
    platformId: v.optional(v.string()),
  },
  // The embedded UI indexes this response by flag ID string, so we keep it loose.
  returns: v.any(),
  handler: async (ctx, args) => {
    const base = (await ctx.runQuery(
      components.activepieces.flags.queries.getFlags,
      { platformId: args.platformId },
    )) as
      | {
          managePiecesEnabled?: boolean;
          environmentsEnabled?: boolean;
          projectRolesEnabled?: boolean;
          apiKeysEnabled?: boolean;
          customAppearanceEnabled?: boolean;
          embeddingEnabled?: boolean;
          SHOW_COMMUNITY?: boolean;
          SHOW_BILLING?: boolean;
        }
      | null;

    // UI expects a mixed "flags" object that includes theme + edition.
    return {
      THEME: DEFAULT_THEME,
      EDITION: "CLOUD",

      // Keep these for UI feature gating where applicable.
      managePiecesEnabled: base?.managePiecesEnabled ?? true,
      environmentsEnabled: base?.environmentsEnabled ?? false,
      projectRolesEnabled: base?.projectRolesEnabled ?? false,
      apiKeysEnabled: base?.apiKeysEnabled ?? false,
      customAppearanceEnabled: base?.customAppearanceEnabled ?? true,
      embeddingEnabled: base?.embeddingEnabled ?? true,

      SHOW_COMMUNITY: base?.SHOW_COMMUNITY ?? false,
      SHOW_BILLING: base?.SHOW_BILLING ?? false,
    };
  },
});

