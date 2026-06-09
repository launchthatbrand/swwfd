import { NextResponse } from "next/server";
import { resolveMondayContactOwnerId } from "~/server/monday/client";
import { requireVerifiedMondaySession } from "~/server/monday/session";

export const runtime = "nodejs";

export const GET = async (
  request: Request,
  context: { params: Promise<{ itemId: string }> },
) => {
  try {
    await requireVerifiedMondaySession(request);
    const { itemId } = await context.params;
    const normalizedItemId = itemId.trim();
    if (!normalizedItemId) {
      return NextResponse.json(
        { ok: false, error: "Missing contact item id" },
        { status: 400 },
      );
    }

    const ownerUserId = await resolveMondayContactOwnerId({
      itemId: normalizedItemId,
    });

    return NextResponse.json({
      ok: true,
      ownerUserId: ownerUserId ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to resolve contact owner";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
};

