"use node";

import { v } from "convex/values";
import { api } from "./_generated/api";
import { internalAction, action } from "./_generated/server";
import { resolveMondayIdentity } from "./lib/mondaySession";

export const mondayIdentityValidator = v.object({
  userId: v.string(),
  accountId: v.string(),
  boardId: v.optional(v.string()),
  appClientId: v.optional(v.string()),
});

export const verifySession = internalAction({
  args: { sessionToken: v.string() },
  returns: mondayIdentityValidator,
  handler: async (_ctx, args) => {
    const identity = await resolveMondayIdentity(args.sessionToken);
    return {
      userId: identity.userId,
      accountId: identity.accountId,
      boardId: identity.boardId,
      appClientId: identity.appClientId,
    };
  },
});

export const verifyAndProvision = action({
  args: { sessionToken: v.string() },
  returns: mondayIdentityValidator,
  handler: async (ctx, args) => {
    const identity = await resolveMondayIdentity(args.sessionToken);

    await ctx.runMutation(api.mondayUsers.upsertFromSession, {
      mondayAccountId: identity.accountId,
      mondayUserId: identity.userId,
      mondayAppClientId: identity.appClientId,
      lastSeenSource: "session-verify",
    });

    return {
      userId: identity.userId,
      accountId: identity.accountId,
      boardId: identity.boardId,
      appClientId: identity.appClientId,
    };
  },
});
