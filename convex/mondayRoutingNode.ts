"use node";

import { v } from "convex/values";

import { api } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import { mondayAction } from "./lib/mondayFunctions";
import type { MondaySessionIdentity } from "./lib/mondaySession";
import {
  assignMondayContactOwnerByDistrict,
  getMondayDistrictRoutingStatus,
} from "./lib/mondayRoutingImpl";

const MASTER_ADMIN_USER_ID = "53441186";

const routingStatusValidator = v.object({
  ok: v.boolean(),
  enabled: v.boolean(),
  contactBoardId: v.union(v.string(), v.null()),
  countyBoardId: v.union(v.string(), v.null()),
  districtBoardId: v.union(v.string(), v.null()),
  countyMappingsCount: v.number(),
  districtOwnerMappingsCount: v.number(),
  contactBoardUrl: v.union(v.string(), v.null()),
  countyBoardUrl: v.union(v.string(), v.null()),
  districtBoardUrl: v.union(v.string(), v.null()),
  issues: v.array(v.string()),
});

const routingResultValidator = v.object({
  ok: v.boolean(),
  status: v.string(),
  itemId: v.string(),
  source: v.union(v.literal("webhook"), v.literal("manual")),
  message: v.string(),
  countyName: v.union(v.string(), v.null()),
  countyFips: v.union(v.string(), v.null()),
  districtCode: v.union(v.string(), v.null()),
  ownerId: v.union(v.string(), v.null()),
  matchedAddress: v.union(v.string(), v.null()),
});

const assertMondayAdmin = async (ctx: ActionCtx, identity: MondaySessionIdentity) => {
  const platformSettings = await ctx.runQuery(api.mondaySettings.getPlatformSettings, {});
  const isAdmin =
    identity.userId === MASTER_ADMIN_USER_ID ||
    platformSettings.adminUserIds.includes(identity.userId);
  if (!isAdmin) {
    throw new Error("Admin access required");
  }
};

/** GET /api/monday/routing/status */
export const getRoutingStatus = mondayAction({
  args: {},
  returns: v.object({ status: routingStatusValidator }),
  handler: async (ctx, identity) => {
    await assertMondayAdmin(ctx, identity);
    const status = await getMondayDistrictRoutingStatus();
    return { status };
  },
});

/** POST /api/monday/tools/routing/assign */
export const assignOwnerByDistrict = mondayAction({
  args: {
    itemId: v.string(),
    force: v.optional(v.boolean()),
  },
  returns: v.object({
    ok: v.boolean(),
    result: routingResultValidator,
  }),
  handler: async (ctx, identity, args) => {
    await assertMondayAdmin(ctx, identity);

    const itemId = args.itemId.trim();
    if (!itemId) {
      throw new Error("itemId is required");
    }

    const result = await assignMondayContactOwnerByDistrict({
      itemId,
      source: "manual",
      force: args.force ?? true,
    });
    return { ok: result.ok, result };
  },
});
