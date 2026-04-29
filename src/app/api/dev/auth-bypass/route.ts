/**
 * DEV-ONLY: Auth bypass for tooling (browser automation, Cursor browser, etc.).
 *
 * Uses Convex Auth Password provider to create a session for a known email,
 * sets Convex Auth cookies, marks the user as admin, then redirects.
 *
 * Usage:
 *   GET /api/dev/auth-bypass?redirect=/admin/users
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { fetchAction, fetchMutation } from "convex/nextjs";
import { api } from "@convex-config/_generated/api";

import { env } from "~/env";

export const runtime = "nodejs";

interface Tokens {
  token: string;
  refreshToken: string;
}

const extractTokens = (result: unknown): Tokens | null => {
  if (!result || typeof result !== "object") return null;

  const anyResult = result as Record<string, unknown>;
  const maybeTokens = anyResult.tokens;
  if (maybeTokens && typeof maybeTokens === "object") {
    const t = maybeTokens as Record<string, unknown>;
    if (typeof t.token === "string" && typeof t.refreshToken === "string") {
      return { token: t.token, refreshToken: t.refreshToken };
    }
  }

  if (
    typeof anyResult.token === "string" &&
    typeof anyResult.refreshToken === "string"
  ) {
    return { token: anyResult.token, refreshToken: anyResult.refreshToken };
  }

  return null;
};

const getRedirectTarget = (request: NextRequest): string => {
  const raw = (request.nextUrl.searchParams.get("redirect") ?? "").trim();
  if (!raw) return "/admin/users";
  if (raw.startsWith("/")) return raw;
  return "/admin/users";
};

const setAuthCookies = (res: NextResponse, tokens: Tokens) => {
  // Names used by Convex Auth Next.js server package.
  // See: https://labs.convex.dev/auth/api_reference/nextjs/server
  res.cookies.set("__convexAuthJWT", tokens.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  res.cookies.set("__convexAuthRefreshToken", tokens.refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
};

const signInOrUp = async (email: string, password: string, name: string): Promise<Tokens> => {
  // Password sign-in/sign-up (requires the correct password for existing accounts).
  // Try signIn first (normal case), then signUp (first time), then signIn again.
  const baseArgs = {
    provider: "password",
    calledBy: "swwfd-dev-auth-bypass",
  };

  const trySignIn = async () => {
    return (await fetchAction(api.auth.signIn, {
      ...baseArgs,
      params: { flow: "signIn", email, password },
    })) as unknown;
  };

  const trySignUp = async () => {
    return (await fetchAction(api.auth.signIn, {
      ...baseArgs,
      params: { flow: "signUp", email, password, name },
    })) as unknown;
  };

  const a = await trySignIn().catch((): null => null);
  const aTokens = extractTokens(a);
  if (aTokens) return aTokens;

  const b = await trySignUp().catch((): null => null);
  const bTokens = extractTokens(b);
  if (bTokens) return bTokens;

  const c = await trySignIn().catch((): null => null);
  const cTokens = extractTokens(c);
  if (cTokens) return cTokens;

  throw new Error("Unable to sign in via dev bypass.");
};

export const GET = async (request: NextRequest) => {
  if (env.NODE_ENV === "production") {
    return Response.json({ error: "Not available." }, { status: 404 });
  }

  if (env.SWWFD_DEV_AUTH_BYPASS_ENABLED !== "true") {
    return Response.json({ error: "Not enabled." }, { status: 404 });
  }

  const email = (env.SWWFD_DEV_AUTH_BYPASS_EMAIL ?? "desmond.tatilian@qcausa.com").trim().toLowerCase();
  const password = (env.SWWFD_DEV_AUTH_BYPASS_PASSWORD ?? "dev-password-unsafe").trim();

  const tokens = await signInOrUp(email, password, "Desmond");

  // Ensure this viewer is admin (DEV-only, gated by Convex env var).
  await fetchMutation(
    api.devAuthBypass.ensureViewerAdmin,
    { expectedEmail: email },
    { token: tokens.token },
  ).catch(() => null);

  const redirectTo = getRedirectTarget(request);
  const url = new URL(redirectTo, request.nextUrl.origin);
  const res = NextResponse.redirect(url);
  setAuthCookies(res, tokens);
  return res;
};

