import { v } from "convex/values";
import type { FunctionReference } from "convex/server";

import { components } from "../../_generated/api";
import { mutation, query } from "../../_generated/server";

type PresenceHeartbeat = FunctionReference<
  "mutation",
  "public",
  { roomId: string; userId: string; sessionId: string; interval?: number },
  { roomToken: string; sessionToken: string }
>;
type PresenceDisconnect = FunctionReference<
  "mutation",
  "public",
  { sessionToken: string },
  null
>;
type PresenceList = FunctionReference<
  "query",
  "public",
  { roomToken: string; limit?: number },
  {
    userId: string;
    online: boolean;
    lastDisconnected: number;
    data?: unknown;
  }[]
>;

const supportPresenceHeartbeat =
  (components as any).launchthat_support.mutations
    .supportPresenceHeartbeat as unknown as PresenceHeartbeat;
const supportPresenceDisconnect =
  (components as any).launchthat_support.mutations
    .supportPresenceDisconnect as unknown as PresenceDisconnect;
const supportPresenceList =
  (components as any).launchthat_support.queries
    .supportPresenceList as unknown as PresenceList;

export const heartbeat = mutation({
  args: {
    roomId: v.string(),
    userId: v.string(),
    sessionId: v.string(),
    interval: v.optional(v.number()),
  },
  returns: v.object({
    roomToken: v.string(),
    sessionToken: v.string(),
  }),
  handler: async (ctx, args) => {
    return await ctx.runMutation(supportPresenceHeartbeat, args);
  },
});

export const list = query({
  args: {
    roomToken: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      userId: v.string(),
      online: v.boolean(),
      lastDisconnected: v.number(),
      data: v.optional(v.any()),
    }),
  ),
  handler: async (ctx, args) => {
    return await ctx.runQuery(supportPresenceList, args);
  },
});

export const disconnect = mutation({
  args: {
    sessionToken: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(supportPresenceDisconnect, args);
    return null;
  },
});
