import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { api } from "@convex-config/_generated/api";
import type { Id } from "@convex-config/_generated/dataModel";

import { getConvexHttpClient } from "~/server/convexHttp";
import { SWWFD_SESSION_COOKIE_NAME } from "~/lib/auth/session";

export const runtime = "nodejs";

export const POST = async (
  req: NextRequest,
  props: { params: Promise<{ jobId: string }> },
) => {
  const { jobId } = await props.params;

  const sessionToken = (req.cookies.get(SWWFD_SESSION_COOKIE_NAME)?.value ?? "").trim();
  if (!sessionToken) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const convex = getConvexHttpClient();
  const viewer = await convex.action(api.authPassword.getViewer, { sessionToken }).catch(() => null);
  if (!viewer) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { coverLetter?: unknown } | null;
  const coverLetter = typeof body?.coverLetter === "string" ? body.coverLetter : undefined;

  const applicationId = await convex.mutation(api.jobApplications.apply, {
    jobId: jobId as Id<"jobs">,
    userId: viewer.userId,
    coverLetter,
  });

  return NextResponse.json(
    { ok: true, applicationId },
    { headers: { "cache-control": "no-store" } },
  );
};

