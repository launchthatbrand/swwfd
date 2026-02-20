import { createPlatformWrappers } from "@launchthatbrand/activepieces-convex/app-wrappers";
import { v } from "convex/values";
import { components } from "../_generated/api";
import { query } from "../_generated/server";

const wrappers = createPlatformWrappers(components);

const buildPlanFromPlatformDoc = (platform: Record<string, unknown>) => {
  const flags = (platform.flags ?? {}) as Record<string, unknown>;
  const bool = (value: unknown, fallback = false) =>
    typeof value === "boolean" ? value : fallback;
  const pickFlag = (key: string, fallback = false) =>
    bool(flags[key], bool(platform[key], fallback));

  // Activepieces UI expects `platform.plan.*` for feature gating.
  return {
    platformId: String(platform.id ?? ""),
    includedAiCredits: 0,
    environmentsEnabled: pickFlag("environmentsEnabled", false),
    analyticsEnabled: false,
    showPoweredBy: false,
    agentsEnabled: false,
    mcpsEnabled: false,
    tablesEnabled: false,
    todosEnabled: false,
    auditLogEnabled: false,
    embeddingEnabled: pickFlag("embeddingEnabled", false),
    managePiecesEnabled: pickFlag("managePiecesEnabled", false),
    manageTemplatesEnabled: false,
    customAppearanceEnabled: pickFlag("customAppearanceEnabled", false),
    manageProjectsEnabled: true,
    projectRolesEnabled: pickFlag("projectRolesEnabled", false),
    customDomainsEnabled: false,
    globalConnectionsEnabled: false,
    customRolesEnabled: false,
    apiKeysEnabled: pickFlag("apiKeysEnabled", false),
    eligibleForTrial: false,
    ssoEnabled: false,
    SHOW_COMMUNITY: pickFlag("SHOW_COMMUNITY", false),
    SHOW_BILLING: pickFlag("SHOW_BILLING", false),
  };
};

export const getPlatform = query({
  args: wrappers.queries.getPlatform.args,
  returns: v.any(),
  handler: async (ctx, args) => {
    const tryGet = async (id: string) => {
      const platform = (await ctx.runQuery(
        components.activepieces.platform.queries.getPlatform,
        { id },
      )) as Record<string, unknown>;
      return {
        ...platform,
        plan: buildPlanFromPlatformDoc(platform),
      };
    };

    try {
      return await tryGet(args.id);
    } catch {
      // If the caller passed a placeholder platform ID, fall back to the
      // current platform from the Activepieces session context.
      const session = (await ctx.runQuery(
        components.activepieces.auth.queries.getSessionContext,
        {},
      )) as { platformId?: string | null } | null;
      const fallbackId = session?.platformId ?? null;
      if (fallbackId && fallbackId !== args.id) {
        return await tryGet(fallbackId);
      }
      throw new Error("Forbidden");
    }
  },
});

export const listPlatforms = query({
  returns: v.any(),
  handler: async (ctx) => {
    const rows = (await ctx.runQuery(
      components.activepieces.platform.queries.listPlatforms,
      {},
    )) as Array<Record<string, unknown>>;
    return rows.map((p) => ({ ...p, plan: buildPlanFromPlatformDoc(p) }));
  },
});

export const getProject = query({
  ...wrappers.queries.getProject,
  returns: v.any(),
});

export const listProjects = query({
  ...wrappers.queries.listProjects,
  returns: v.any(),
});

export const listPlatformUsers = query({
  ...wrappers.queries.listPlatformUsers,
  returns: v.any(),
});
