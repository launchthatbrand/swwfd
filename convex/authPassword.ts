"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const sha256Base64Url = (value: string): string => {
  const digest = createHash("sha256").update(value).digest("base64");
  return digest.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const generateSessionToken = (): string => {
  // 32 bytes -> 256 bits of entropy, base64url encoded.
  const raw = randomBytes(32).toString("base64");
  return raw.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const signUp = action({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.optional(v.string()),
  },
  returns: v.union(
    v.object({
      ok: v.literal(true),
      sessionToken: v.string(),
      userId: v.id("users"),
      email: v.string(),
      name: v.optional(v.string()),
    }),
    v.object({
      ok: v.literal(false),
      error: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const password = args.password.trim();
    if (!email.includes("@")) {
      return { ok: false as const, error: "Email is invalid." };
    }
    if (password.length < 8) {
      return { ok: false as const, error: "Password must be at least 8 characters." };
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const createResult = await ctx
      .runMutation(internal.authPasswordDb._createUserWithPasswordHash, {
        email,
        passwordHash,
        name: args.name,
      })
      .then((userId) => ({ ok: true as const, userId }))
      .catch((err: unknown) => ({
        ok: false as const,
        error: err instanceof Error ? err.message : "Unable to create account.",
      }));

    if (!createResult.ok) {
      return {
        ok: false as const,
        error: createResult.error,
      };
    }

    const sessionToken = generateSessionToken();
    const tokenHash = sha256Base64Url(sessionToken);

    await ctx.runMutation(internal.authPasswordDb._createSession, {
      userId: createResult.userId,
      tokenHash,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });

    return {
      ok: true as const,
      sessionToken,
      userId: createResult.userId,
      email,
      name: (args.name ?? "").trim() ? args.name?.trim() : undefined,
    };
  },
});

export const signIn = action({
  args: { email: v.string(), password: v.string() },
  returns: v.union(
    v.object({
      ok: v.literal(true),
      sessionToken: v.string(),
      userId: v.id("users"),
      email: v.string(),
      name: v.optional(v.string()),
    }),
    v.object({
      ok: v.literal(false),
      error: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const password = args.password.trim();

    const record = await ctx.runQuery(internal.authPasswordDb._getUserWithPasswordByEmail, {
      email,
    });
    if (!record) {
      return { ok: false as const, error: "Invalid email or password." };
    }

    const valid = await bcrypt.compare(password, record.passwordHash);
    if (!valid) {
      return { ok: false as const, error: "Invalid email or password." };
    }

    const sessionToken = generateSessionToken();
    const tokenHash = sha256Base64Url(sessionToken);

    await ctx.runMutation(internal.authPasswordDb._createSession, {
      userId: record.userId,
      tokenHash,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });

    return {
      ok: true as const,
      sessionToken,
      userId: record.userId,
      email: record.email,
      name: record.name,
    };
  },
});

export const signOut = action({
  args: { sessionToken: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const token = args.sessionToken.trim();
    if (!token) return null;
    const tokenHash = sha256Base64Url(token);
    await ctx.runMutation(internal.authPasswordDb._revokeSessionByTokenHash, { tokenHash });
    return null;
  },
});

export const getViewer = action({
  args: { sessionToken: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      userId: v.id("users"),
      email: v.string(),
      name: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const token = args.sessionToken.trim();
    if (!token) return null;
    const tokenHash = sha256Base64Url(token);
    return await ctx.runQuery(internal.authPasswordDb._getViewerByTokenHash, { tokenHash });
  },
});

