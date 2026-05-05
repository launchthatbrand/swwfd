import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { requireAdmin } from "./lib/admin";

const connectionValidator = v.object({
  _id: v.id("outlookConnections"),
  _creationTime: v.number(),
  mondayAccountId: v.string(),
  mondayUserId: v.string(),
  mondayAppClientId: v.union(v.string(), v.null()),
  email: v.union(v.string(), v.null()),
  displayName: v.union(v.string(), v.null()),
  tenantId: v.string(),
  clientId: v.string(),
  encryptedAccessToken: v.union(v.string(), v.null()),
  encryptedRefreshToken: v.string(),
  accessTokenExpiresAt: v.number(),
  scopes: v.array(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const upsertArgsValidator = {
  mondayAccountId: v.string(),
  mondayUserId: v.string(),
  mondayAppClientId: v.optional(v.string()),
  email: v.optional(v.string()),
  displayName: v.optional(v.string()),
  tenantId: v.string(),
  clientId: v.string(),
  encryptedAccessToken: v.optional(v.string()),
  encryptedRefreshToken: v.string(),
  accessTokenExpiresAt: v.number(),
  scopes: v.array(v.string()),
};

const normalizeAppClientId = (value: string | undefined) => {
  return value?.trim() ? value.trim() : null;
};

const normalizeOptionalString = (value: string | undefined) => {
  return value?.trim() ? value.trim() : null;
};

const requireAuthenticatedAdmin = async (ctx: QueryCtx | MutationCtx) => {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("UNAUTHORIZED");
  }
  await requireAdmin(ctx, userId);
};

export const getByMondayIdentity = query({
  args: {
    mondayAccountId: v.string(),
    mondayUserId: v.string(),
    mondayAppClientId: v.optional(v.string()),
  },
  returns: v.union(connectionValidator, v.null()),
  handler: async (ctx, args) => {
    const normalizedAppClientId = normalizeAppClientId(args.mondayAppClientId);
    const exact = await ctx.db
      .query("outlookConnections")
      .withIndex("by_monday_identity", (q) =>
        q
          .eq("mondayAccountId", args.mondayAccountId)
          .eq("mondayUserId", args.mondayUserId)
          .eq("mondayAppClientId", normalizedAppClientId),
      )
      .first();
    if (exact) return exact;

    if (normalizedAppClientId === null) {
      return null;
    }

    const fallback = await ctx.db
      .query("outlookConnections")
      .withIndex("by_monday_identity", (q) =>
        q
          .eq("mondayAccountId", args.mondayAccountId)
          .eq("mondayUserId", args.mondayUserId)
          .eq("mondayAppClientId", null),
      )
      .first();
    return fallback ?? null;
  },
});

export const upsertByMondayIdentity = mutation({
  args: upsertArgsValidator,
  returns: v.object({
    connectionId: v.id("outlookConnections"),
  }),
  handler: async (ctx, args) => {
    const normalizedAppClientId = normalizeAppClientId(args.mondayAppClientId);
    const normalizedEmail = normalizeOptionalString(args.email);
    const normalizedDisplayName = normalizeOptionalString(args.displayName);
    const normalizedAccessToken = normalizeOptionalString(args.encryptedAccessToken);
    const normalizedScopes = args.scopes
      .map((scope) => scope.trim())
      .filter((scope) => scope.length > 0);

    const existing = await ctx.db
      .query("outlookConnections")
      .withIndex("by_monday_identity", (q) =>
        q
          .eq("mondayAccountId", args.mondayAccountId)
          .eq("mondayUserId", args.mondayUserId)
          .eq("mondayAppClientId", normalizedAppClientId),
      )
      .collect();
    const primary = existing[0] ?? null;
    const now = Date.now();

    if (primary) {
      await ctx.db.patch(primary._id, {
        email: normalizedEmail,
        displayName: normalizedDisplayName,
        tenantId: args.tenantId,
        clientId: args.clientId,
        encryptedAccessToken: normalizedAccessToken,
        encryptedRefreshToken: args.encryptedRefreshToken,
        accessTokenExpiresAt: args.accessTokenExpiresAt,
        scopes: normalizedScopes,
        updatedAt: now,
      });
      for (const duplicate of existing.slice(1)) {
        await ctx.db.delete(duplicate._id);
      }
      return { connectionId: primary._id };
    }

    const connectionId = await ctx.db.insert("outlookConnections", {
      mondayAccountId: args.mondayAccountId,
      mondayUserId: args.mondayUserId,
      mondayAppClientId: normalizedAppClientId,
      email: normalizedEmail,
      displayName: normalizedDisplayName,
      tenantId: args.tenantId,
      clientId: args.clientId,
      encryptedAccessToken: normalizedAccessToken,
      encryptedRefreshToken: args.encryptedRefreshToken,
      accessTokenExpiresAt: args.accessTokenExpiresAt,
      scopes: normalizedScopes,
      createdAt: now,
      updatedAt: now,
    });
    return { connectionId };
  },
});

export const removeByMondayIdentity = mutation({
  args: {
    mondayAccountId: v.string(),
    mondayUserId: v.string(),
    mondayAppClientId: v.optional(v.string()),
  },
  returns: v.object({
    removedCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const normalizedAppClientId = normalizeAppClientId(args.mondayAppClientId);
    let removedCount = 0;

    const exactMatches = await ctx.db
      .query("outlookConnections")
      .withIndex("by_monday_identity", (q) =>
        q
          .eq("mondayAccountId", args.mondayAccountId)
          .eq("mondayUserId", args.mondayUserId)
          .eq("mondayAppClientId", normalizedAppClientId),
      )
      .collect();
    for (const connection of exactMatches) {
      await ctx.db.delete(connection._id);
      removedCount += 1;
    }

    if (normalizedAppClientId !== null) {
      const fallbackMatches = await ctx.db
        .query("outlookConnections")
        .withIndex("by_monday_identity", (q) =>
          q
            .eq("mondayAccountId", args.mondayAccountId)
            .eq("mondayUserId", args.mondayUserId)
            .eq("mondayAppClientId", null),
        )
        .collect();
      for (const connection of fallbackMatches) {
        await ctx.db.delete(connection._id);
        removedCount += 1;
      }
    }

    return { removedCount };
  },
});

export const listForAdmin = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(connectionValidator),
  handler: async (ctx, args) => {
    await requireAuthenticatedAdmin(ctx);
    const safeLimit = Math.min(Math.max(Math.floor(args.limit ?? 200), 1), 1000);
    return await ctx.db
      .query("outlookConnections")
      .withIndex("by_creation_time", (q) => q)
      .order("desc")
      .take(safeLimit);
  },
});

export const removeConnectionAsAdmin = mutation({
  args: {
    connectionId: v.id("outlookConnections"),
  },
  returns: v.object({
    removed: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await requireAuthenticatedAdmin(ctx);
    const existing = await ctx.db.get(args.connectionId);
    if (!existing) {
      return { removed: false };
    }
    await ctx.db.delete(args.connectionId);
    return { removed: true };
  },
});
