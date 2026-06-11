import { NextResponse } from "next/server";

import { getRequestOrigin } from "~/server/http/requestOrigin";
import { getConvexHttpClient } from "~/server/convexHttp";
import { requireVerifiedMondaySession } from "~/server/monday/session";
import { sendMarketingEmailBatch } from "~/server/email/sendBatch";

export const runtime = "nodejs";

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

export const POST = async (request: Request) => {
  try {
    const identity = await requireVerifiedMondaySession(request);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return toJson({ ok: false, error: "Invalid JSON body" }, 400);
    }

    const result = await sendMarketingEmailBatch({
      identity: {
        userId: identity.userId,
        accountId: identity.accountId,
        appClientId: identity.appClientId,
      },
      body: body as {
        subject?: string;
        html?: string;
        recipients?: Array<{
          to: string;
          contactItemId: string;
          ownerMondayUserId?: string;
          subject?: string;
          html?: string;
        }>;
      },
      requestOrigin: getRequestOrigin(request),
      convex: getConvexHttpClient(),
    });

    if (result.sentCount === 0) {
      const firstFailure =
        result.results.find((entry) => !entry.ok)?.error ??
        "Failed to send email";
      return toJson(
        {
          ok: false,
          error: firstFailure,
          provider: result.provider,
          reason: result.reason,
          sentCount: result.sentCount,
          failedCount: result.failedCount,
          results: result.results,
        },
        400,
      );
    }

    return toJson({
      ok: result.failedCount === 0,
      provider: result.provider,
      reason: result.reason,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      results: result.results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email batch";
    return toJson({ ok: false, error: message }, 500);
  }
};
