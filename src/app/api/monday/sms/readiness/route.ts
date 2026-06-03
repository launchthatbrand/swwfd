import { NextResponse } from "next/server";
import { requireVerifiedMondaySession } from "~/server/monday/session";
import { getTwilioConfig } from "~/server/twilio/config";

export const runtime = "nodejs";

export const GET = async (request: Request) => {
  try {
    await requireVerifiedMondaySession(request);
    const config = getTwilioConfig();
    return NextResponse.json({
      ok: true,
      ready: !!config,
      fromPhone: config?.fromPhone ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load SMS readiness";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
};

