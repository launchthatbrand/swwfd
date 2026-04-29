import { NextResponse } from "next/server";

import { fetchQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api } from "@convex-config/_generated/api";

export const runtime = "nodejs";

export const GET = async () => {
  const token = await convexAuthNextjsToken();
  if (!token) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const viewer = await fetchQuery(api.viewer.me, {}, { token }).catch(() => null);
  if (!viewer || viewer.isAdmin !== true) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  return NextResponse.json({ token });
};

