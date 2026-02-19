import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { api } from "@convex-config/_generated/api";
import { getConvexHttpClient } from "~/server/convexHttp";
import { getSessionCookieOptions, SWWFD_SESSION_COOKIE_NAME } from "~/lib/auth/session";

export const runtime = "nodejs";

export const POST = async (req: NextRequest) => {
  const body = (await req.json().catch(() => null)) as
    | { email?: unknown; password?: unknown; name?: unknown }
    | null;

  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const name = typeof body?.name === "string" ? body.name : undefined;

  const convex = getConvexHttpClient();
  const result = await convex.action(api.authPassword.signUp, { email, password, name });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  const res = NextResponse.json(
    {
      ok: true,
      user: {
        userId: result.userId,
        email: result.email,
        name: result.name ?? null,
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
  res.cookies.set(SWWFD_SESSION_COOKIE_NAME, result.sessionToken, getSessionCookieOptions());
  return res;
};

