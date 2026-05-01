import { NextResponse } from "next/server";

import { env } from "~/env";
import { assignMondayContactOwnerByDistrict } from "~/server/monday/routing";

export const runtime = "nodejs";

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

const normalizeValue = (value: unknown) => {
  return typeof value === "string" ? value.trim() : "";
};

const toRecord = (value: unknown) => {
  if (typeof value !== "object" || value === null) return null;
  return value as Record<string, unknown>;
};

const extractWebhookPayload = (body: unknown) => {
  const payload = toRecord(body);
  if (!payload) return { challenge: "", boardId: "", itemId: "" };

  const challenge = normalizeValue(payload.challenge);
  const event = toRecord(payload.event) ?? payload;
  const boardId =
    normalizeValue(event.boardId) ||
    normalizeValue(event.board_id) ||
    normalizeValue(payload.boardId) ||
    normalizeValue(payload.board_id);
  const itemId =
    normalizeValue(event.pulseId) ||
    normalizeValue(event.pulse_id) ||
    normalizeValue(event.itemId) ||
    normalizeValue(event.item_id) ||
    normalizeValue(payload.pulseId) ||
    normalizeValue(payload.itemId);

  return { challenge, boardId, itemId };
};

export const POST = async (request: Request) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return toJson({ ok: false, error: "Invalid JSON body" }, 400);
  }

  console.log("[Webhook] Received payload:", JSON.stringify(body));

  const { challenge, boardId, itemId } = extractWebhookPayload(body);
  if (challenge) {
    return toJson({ challenge });
  }

  const contactBoardId = normalizeValue(env.MONDAY_BOARD_ID);
  if (contactBoardId && boardId && boardId !== contactBoardId) {
    return toJson({
      ok: true,
      ignored: true,
      reason: `Ignoring board ${boardId}; expected ${contactBoardId}`,
    });
  }

  if (!itemId) {
    console.log("[Webhook] Missing itemId. Extracted boardId:", boardId, "from payload keys:", Object.keys(toRecord(body) ?? {}));
    return toJson(
      {
        ok: false,
        error: "Webhook payload missing item id",
      },
      400,
    );
  }

  const result = await assignMondayContactOwnerByDistrict({
    itemId,
    source: "webhook",
  });
  return toJson({
    ok: result.ok,
    result,
  });
};
