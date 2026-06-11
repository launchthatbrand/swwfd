import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const connectionValidator = v.object({
  _id: v.id("zohoConnections"),
  _creationTime: v.number(),
  mondayAccountId: v.string(),
  mondayAppClientId: v.union(v.string(), v.null()),
  connectedByMondayUserId: v.string(),
  senderEmail: v.union(v.string(), v.null()),
  senderName: v.union(v.string(), v.null()),
  encryptedAccessToken: v.union(v.string(), v.null()),
  encryptedRefreshToken: v.string(),
  accessTokenExpiresAt: v.number(),
  scopes: v.array(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const normalizeAppClientId = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
};

const normalizeOptionalString = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
};

const normalizeRequiredString = (value: string) => value.trim();

export const getByMondayAccount = query({
  args: {
    mondayAccountId: v.string(),
    mondayAppClientId: v.optional(v.string()),
  },
  returns: v.union(connectionValidator, v.null()),
  handler: async (ctx, args) => {
    const mondayAccountId = normalizeRequiredString(args.mondayAccountId);
    if (!mondayAccountId) return null;
    const normalizedAppClientId = normalizeAppClientId(args.mondayAppClientId);
    const exact = await ctx.db
      .query("zohoConnections")
      .withIndex("by_account_and_app", (q) =>
        q
          .eq("mondayAccountId", mondayAccountId)
          .eq("mondayAppClientId", normalizedAppClientId),
      )
      .first();
    if (exact) return exact;
    if (normalizedAppClientId === null) return null;
    const fallback = await ctx.db
      .query("zohoConnections")
      .withIndex("by_account_and_app", (q) =>
        q.eq("mondayAccountId", mondayAccountId).eq("mondayAppClientId", null),
      )
      .first();
    return fallback ?? null;
  },
});

export const upsertByMondayAccount = mutation({
  args: {
    mondayAccountId: v.string(),
    mondayAppClientId: v.optional(v.string()),
    connectedByMondayUserId: v.string(),
    senderEmail: v.optional(v.string()),
    senderName: v.optional(v.string()),
    encryptedAccessToken: v.optional(v.string()),
    encryptedRefreshToken: v.string(),
    accessTokenExpiresAt: v.number(),
    scopes: v.array(v.string()),
  },
  returns: v.object({
    connectionId: v.id("zohoConnections"),
  }),
  handler: async (ctx, args) => {
    const mondayAccountId = normalizeRequiredString(args.mondayAccountId);
    const connectedByMondayUserId = normalizeRequiredString(
      args.connectedByMondayUserId,
    );
    if (!mondayAccountId || !connectedByMondayUserId) {
      throw new Error("Missing required Zoho connection fields");
    }
    const normalizedAppClientId = normalizeAppClientId(args.mondayAppClientId);
    const normalizedSenderEmail = normalizeOptionalString(args.senderEmail)?.toLowerCase();
    const normalizedSenderName = normalizeOptionalString(args.senderName);
    const normalizedAccessToken = normalizeOptionalString(args.encryptedAccessToken);
    const scopes = args.scopes
      .map((scope) => scope.trim())
      .filter((scope) => scope.length > 0);
    const now = Date.now();

    const existing = await ctx.db
      .query("zohoConnections")
      .withIndex("by_account_and_app", (q) =>
        q
          .eq("mondayAccountId", mondayAccountId)
          .eq("mondayAppClientId", normalizedAppClientId),
      )
      .collect();
    const primary = existing[0] ?? null;

    if (primary) {
      await ctx.db.patch(primary._id, {
        connectedByMondayUserId,
        senderEmail: normalizedSenderEmail ?? null,
        senderName: normalizedSenderName ?? null,
        encryptedAccessToken: normalizedAccessToken,
        encryptedRefreshToken: args.encryptedRefreshToken,
        accessTokenExpiresAt: args.accessTokenExpiresAt,
        scopes,
        updatedAt: now,
      });
      for (const duplicate of existing.slice(1)) {
        await ctx.db.delete(duplicate._id);
      }
      return { connectionId: primary._id };
    }

    const connectionId = await ctx.db.insert("zohoConnections", {
      mondayAccountId,
      mondayAppClientId: normalizedAppClientId,
      connectedByMondayUserId,
      senderEmail: normalizedSenderEmail ?? null,
      senderName: normalizedSenderName ?? null,
      encryptedAccessToken: normalizedAccessToken,
      encryptedRefreshToken: args.encryptedRefreshToken,
      accessTokenExpiresAt: args.accessTokenExpiresAt,
      scopes,
      createdAt: now,
      updatedAt: now,
    });
    return { connectionId };
  },
});

export const removeByMondayAccount = mutation({
  args: {
    mondayAccountId: v.string(),
    mondayAppClientId: v.optional(v.string()),
  },
  returns: v.object({
    removedCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const mondayAccountId = normalizeRequiredString(args.mondayAccountId);
    if (!mondayAccountId) return { removedCount: 0 };
    const normalizedAppClientId = normalizeAppClientId(args.mondayAppClientId);
    let removedCount = 0;

    const exact = await ctx.db
      .query("zohoConnections")
      .withIndex("by_account_and_app", (q) =>
        q
          .eq("mondayAccountId", mondayAccountId)
          .eq("mondayAppClientId", normalizedAppClientId),
      )
      .collect();
    for (const row of exact) {
      await ctx.db.delete(row._id);
      removedCount += 1;
    }

    if (normalizedAppClientId !== null) {
      const fallback = await ctx.db
        .query("zohoConnections")
        .withIndex("by_account_and_app", (q) =>
          q.eq("mondayAccountId", mondayAccountId).eq("mondayAppClientId", null),
        )
        .collect();
      for (const row of fallback) {
        await ctx.db.delete(row._id);
        removedCount += 1;
      }
    }

    return { removedCount };
  },
});
