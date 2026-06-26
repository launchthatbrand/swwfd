import { NextResponse } from "next/server";

import { env } from "~/env";
import { isAuthorizedMondayWebhookRequest } from "../../webhookAuth";
import { assignMondayContactOwnerByDistrict } from "~/server/monday/routing";

export const runtime = "nodejs";

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

const normalizeValue = (value: unknown) => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
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
    console.info("[Webhook][routing] challenge handshake", { boardId, itemId });
    return toJson({ challenge });
  }
  if (!isAuthorizedMondayWebhookRequest(request)) {
    console.warn("[Webhook][routing] unauthorized request", {
      boardId,
      itemId,
      hasSecretHeader: !!request.headers.get("x-monday-webhook-secret"),
      hasSecretQuery: !!new URL(request.url).searchParams.get("secret"),
    });
    return toJson({ ok: false, error: "Unauthorized webhook request" }, 401);
  }

  const contactBoardId = normalizeValue(env.MONDAY_BOARD_ID);
  if (contactBoardId && boardId && boardId !== contactBoardId) {
    console.info("[Webhook][routing] ignored board mismatch", {
      boardId,
      expectedBoardId: contactBoardId,
      itemId,
    });
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
  console.info("[Webhook][routing] assignment completed", {
    itemId,
    boardId,
    ok: result.ok,
    status: result.status,
    districtCode: result.districtCode,
    ownerId: result.ownerId,
    message: result.message,
  });
  return toJson({
    ok: result.ok,
    result,
  });
};
