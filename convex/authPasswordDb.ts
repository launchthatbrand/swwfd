import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const _getUserWithPasswordByEmail = internalQuery({
  args: { email: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      userId: v.id("users"),
      email: v.string(),
      name: v.optional(v.string()),
      passwordHash: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!user) return null;
    return {
      userId: user._id,
      email: user.email,
      name: user.name,
      passwordHash: user.passwordHash,
    };
  },
});

export const _createUserWithPasswordHash = internalMutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
    name: v.optional(v.string()),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (existing) throw new Error("Email already in use.");

    const now = Date.now();
    return await ctx.db.insert("users", {
      email,
      name: args.name?.trim() ? args.name.trim() : undefined,
      passwordHash: args.passwordHash,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const _createSession = internalMutation({
  args: {
    userId: v.id("users"),
    tokenHash: v.string(),
    expiresAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("authSessions", {
      userId: args.userId,
      tokenHash: args.tokenHash,
      createdAt: Date.now(),
      expiresAt: args.expiresAt,
    });
    return null;
  },
});

export const _revokeSessionByTokenHash = internalMutation({
  args: { tokenHash: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("authSessions")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", args.tokenHash))
      .unique();
    if (!session) return null;
    if (session.revokedAt !== undefined) return null;
    await ctx.db.patch(session._id, { revokedAt: Date.now() });
    return null;
  },
});

export const _getViewerByTokenHash = internalQuery({
  args: { tokenHash: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      userId: v.id("users"),
      email: v.string(),
      name: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("authSessions")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", args.tokenHash))
      .unique();
    if (!session) return null;
    if (session.revokedAt !== undefined) return null;
    if (Date.now() >= session.expiresAt) return null;

    const user = await ctx.db.get(session.userId);
    if (!user) return null;
    return { userId: user._id, email: user.email, name: user.name };
  },
});

