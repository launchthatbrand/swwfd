import { NextResponse } from "next/server";
import { api as apiGenerated } from "@convex-config/_generated/api";
import { getConvexHttpClient } from "~/server/convexHttp";
import { requireVerifiedMondaySession } from "~/server/monday/session";
import { sendSmsMessage } from "~/server/twilio/sendSms";

export const runtime = "nodejs";

interface SendSmsBody {
  to: string;
  body: string;
  contactItemId?: string;
}

const normalizeUserId = (value: string | null | undefined) => value?.trim() ?? "";

export const POST = async (request: Request) => {
  try {
    const identity = await requireVerifiedMondaySession(request);
    let payload: SendSmsBody;
    try {
      payload = (await request.json()) as SendSmsBody;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const to = payload.to?.trim() ?? "";
    const body = payload.body?.trim() ?? "";
    const contactItemId = payload.contactItemId?.trim() ?? "";
    if (!to || !body || !contactItemId) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: to, body, contactItemId" },
        { status: 400 },
      );
    }

    const convex = getConvexHttpClient();
    const platformSettings = await convex.query(
      apiGenerated.mondaySettings.getPlatformSettings,
      {},
    );
    const teamUserIds = Array.from(
      new Set(
        [
          platformSettings.masterAdminUserId,
          ...platformSettings.adminUserIds,
          ...platformSettings.employeeUserIds,
        ]
          .map((entry) => normalizeUserId(entry))
          .filter((entry) => entry.length > 0),
      ),
    );
    if (!teamUserIds.includes(identity.userId)) {
      return NextResponse.json(
        {
          ok: false,
          error: "You are not authorized to send SMS for this workspace.",
        },
        { status: 403 },
      );
    }

    const result = await sendSmsMessage({
      to,
      body,
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send SMS";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
};

