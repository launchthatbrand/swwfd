import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { api } from "@convex-config/_generated/api";
import { getConvexHttpClient } from "~/server/convexHttp";
import { SWWFD_SESSION_COOKIE_NAME } from "~/lib/auth/session";

export const runtime = "nodejs";

export const POST = async (req: NextRequest) => {
  const token = (req.cookies.get(SWWFD_SESSION_COOKIE_NAME)?.value ?? "").trim();
  if (token) {
    const convex = getConvexHttpClient();
    await convex.action(api.authPassword.signOut, { sessionToken: token }).catch(() => null);
  }

  const res = NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  res.cookies.set(SWWFD_SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 0,
  });
  return res;
};

