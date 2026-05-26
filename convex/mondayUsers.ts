import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const mondayUserValidator = v.object({
  _id: v.id("mondayUsers"),
  _creationTime: v.number(),
  mondayAccountId: v.string(),
  mondayUserId: v.string(),
  mondayAppClientId: v.union(v.string(), v.null()),
  email: v.union(v.string(), v.null()),
  name: v.union(v.string(), v.null()),
  firstSeenAt: v.number(),
  lastSeenAt: v.number(),
  lastSeenSource: v.string(),
});

const normalizeRequiredString = (value: string) => value.trim();

const normalizeAppClientId = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
};

const normalizeOptionalString = (value: string | undefined) => {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const upsertFromSession = mutation({
  args: {
    mondayAccountId: v.string(),
    mondayUserId: v.string(),
    mondayAppClientId: v.optional(v.string()),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    lastSeenSource: v.string(),
    lastSeenAt: v.optional(v.number()),
  },
  returns: v.object({
    mondayUserRecordId: v.id("mondayUsers"),
    created: v.boolean(),
    firstSeenAt: v.number(),
    lastSeenAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const mondayAccountId = normalizeRequiredString(args.mondayAccountId);
    const mondayUserId = normalizeRequiredString(args.mondayUserId);
    const lastSeenSource = normalizeRequiredString(args.lastSeenSource);
    if (!mondayAccountId || !mondayUserId || !lastSeenSource) {
      throw new Error("Missing required monday user identity fields");
    }

    const normalizedAppClientId = normalizeAppClientId(args.mondayAppClientId);
    const normalizedEmail = normalizeOptionalString(args.email)?.toLowerCase();
    const normalizedName = normalizeOptionalString(args.name);
    const observedAt = args.lastSeenAt ?? Date.now();

    const existingRows = await ctx.db
      .query("mondayUsers")
      .withIndex("by_account_and_user", (q) =>
        q.eq("mondayAccountId", mondayAccountId).eq("mondayUserId", mondayUserId),
      )
      .collect();
    const primary =
      existingRows.find(
        (entry) => entry.mondayAppClientId === normalizedAppClientId,
      ) ?? existingRows[0];

    if (primary) {
      await ctx.db.patch(primary._id, {
        mondayAppClientId: normalizedAppClientId ?? primary.mondayAppClientId,
        email:
          normalizedEmail !== undefined
            ? normalizedEmail
            : primary.email,
        name: normalizedName !== undefined ? normalizedName : primary.name,
        lastSeenAt: observedAt,
        lastSeenSource,
      });
      for (const duplicate of existingRows) {
        if (duplicate._id !== primary._id) {
          await ctx.db.delete(duplicate._id);
        }
      }
      return {
        mondayUserRecordId: primary._id,
        created: false,
        firstSeenAt: primary.firstSeenAt,
        lastSeenAt: observedAt,
      };
    }

    const mondayUserRecordId = await ctx.db.insert("mondayUsers", {
      mondayAccountId,
      mondayUserId,
      mondayAppClientId: normalizedAppClientId,
      email: normalizedEmail ?? null,
      name: normalizedName ?? null,
      firstSeenAt: observedAt,
      lastSeenAt: observedAt,
      lastSeenSource,
    });
    return {
      mondayUserRecordId,
      created: true,
      firstSeenAt: observedAt,
      lastSeenAt: observedAt,
    };
  },
});

export const getByAccountAndUser = query({
  args: {
    mondayAccountId: v.string(),
    mondayUserId: v.string(),
  },
  returns: v.union(mondayUserValidator, v.null()),
  handler: async (ctx, args) => {
    const mondayAccountId = normalizeRequiredString(args.mondayAccountId);
    const mondayUserId = normalizeRequiredString(args.mondayUserId);
    if (!mondayAccountId || !mondayUserId) {
      return null;
    }
    const rows = await ctx.db
      .query("mondayUsers")
      .withIndex("by_account_and_user", (q) =>
        q.eq("mondayAccountId", mondayAccountId).eq("mondayUserId", mondayUserId),
      )
      .collect();
    return rows[0] ?? null;
  },
});

export const listByAccount = query({
  args: {
    mondayAccountId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(mondayUserValidator),
  handler: async (ctx, args) => {
    const mondayAccountId = normalizeRequiredString(args.mondayAccountId);
    if (!mondayAccountId) {
      return [];
    }
    const limit = Math.min(Math.max(Math.floor(args.limit ?? 200), 1), 1000);
    return await ctx.db
      .query("mondayUsers")
      .withIndex("by_account", (q) => q.eq("mondayAccountId", mondayAccountId))
      .order("desc")
      .take(limit);
  },
});
