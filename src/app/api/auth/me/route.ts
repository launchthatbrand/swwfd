import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { api } from "@convex-config/_generated/api";
import { getConvexHttpClient } from "~/server/convexHttp";
import { SWWFD_SESSION_COOKIE_NAME } from "~/lib/auth/session";

export const runtime = "nodejs";

export const GET = async (req: NextRequest) => {
  const token = (req.cookies.get(SWWFD_SESSION_COOKIE_NAME)?.value ?? "").trim();
  if (!token) {
    return NextResponse.json({ user: null }, { headers: { "cache-control": "no-store" } });
  }

  const convex = getConvexHttpClient();
  const viewer = await convex.action(api.authPassword.getViewer, { sessionToken: token }).catch(() => null);

  if (!viewer) {
    return NextResponse.json({ user: null }, { headers: { "cache-control": "no-store" } });
  }

  return NextResponse.json(
    {
      user: {
        userId: viewer.userId,
        email: viewer.email,
        name: viewer.name ?? null,
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
};

