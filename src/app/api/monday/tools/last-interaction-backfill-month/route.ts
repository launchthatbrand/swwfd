import { NextResponse } from "next/server";

import { backfillMondayLastInteractionDateByMonth } from "~/server/monday/client";

export const runtime = "nodejs";

const toJson = (body: unknown, status = 200) =>
  NextResponse.json(body, { status });

interface Body {
  monthKey?: string;
  dryRun?: boolean;
  pageSize?: number;
}

export const POST = async (request: Request) => {
  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  const monthKey = body.monthKey?.trim();
  if (!monthKey) {
    return toJson({ ok: false, error: "monthKey is required (YYYY-MM)" }, 400);
  }

  try {
    console.info("[MondayLastInteractionBackfillRoute] request received", {
      monthKey,
      dryRun: body.dryRun ?? true,
      pageSize: body.pageSize ?? null,
    });
    const result = await backfillMondayLastInteractionDateByMonth({
      monthKey,
      dryRun: body.dryRun ?? true,
      pageSize: body.pageSize,
    });
    console.info("[MondayLastInteractionBackfillRoute] request completed", {
      monthKey,
      dryRun: result.dryRun,
      processedContacts: result.processedContacts,
      registeredContacts: result.registeredContacts,
      contactsWouldUpdate: result.contactsWouldUpdate,
      contactsUpdated: result.contactsUpdated,
      errorsCount: result.errorsCount,
    });
    return toJson({ ok: true, result });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to backfill last interaction dates";
    console.error("[MondayLastInteractionBackfillRoute] request failed", {
      monthKey,
      error: message,
    });
    return toJson({ ok: false, error: message }, 500);
  }
};
