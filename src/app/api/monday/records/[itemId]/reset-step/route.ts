import { NextResponse } from "next/server";

import { env } from "~/env";
import { requireVerifiedMondaySession } from "~/server/monday/session";

export const runtime = "nodejs";

const MONDAY_API_URL = "https://api.monday.com/v2";

const VALID_STEP_COLUMN_IDS = new Set([
  "color_mm1db321",
  "color_mm1dwtvd",
  "color_mm1dwr4k",
  "color_mm1dnr11",
  "color_mm1dgeqy",
  "color_mm1d80yc",
  "color_mm1djwjj",
  "color_mm1d4e3y",
]);

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

interface ResetStepBody {
  stepColumnId?: string;
  action?: "reset" | "done";
}

export const POST = async (
  request: Request,
  context: { params: Promise<{ itemId: string }> },
) => {
  try {
    await requireVerifiedMondaySession(request);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unauthorized Monday session";
    return toJson({ ok: false, error: message }, 401);
  }

  const { itemId } = await context.params;
  if (!itemId?.trim()) {
    return toJson({ ok: false, error: "Missing monday item id" }, 400);
  }

  let body: ResetStepBody = {};
  try {
    body = (await request.json()) as ResetStepBody;
  } catch {
    return toJson({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const stepColumnId = body.stepColumnId?.trim() ?? "";
  if (!stepColumnId || !VALID_STEP_COLUMN_IDS.has(stepColumnId)) {
    return toJson({ ok: false, error: "Invalid stepColumnId" }, 400);
  }

  const action = body.action ?? "reset";
  const label = action === "done" ? "Done" : "";

  const apiKey = env.MONDAY_API_KEY?.trim() ?? "";
  const boardId = env.MONDAY_BOARD_ID?.trim() ?? "";
  if (!apiKey || !boardId) {
    return toJson(
      { ok: false, error: "Missing MONDAY_API_KEY or MONDAY_BOARD_ID" },
      500,
    );
  }

  try {
    const response = await fetch(MONDAY_API_URL, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          mutation ResetApprovalStep(
            $boardId: ID!
            $itemId: ID!
            $columnValues: JSON!
          ) {
            change_multiple_column_values(
              board_id: $boardId
              item_id: $itemId
              column_values: $columnValues
              create_labels_if_missing: true
            ) {
              id
            }
          }
        `,
        variables: {
          boardId,
          itemId: itemId.trim(),
          columnValues: JSON.stringify({
            [stepColumnId]: { label },
          }),
        },
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Monday API request failed (${response.status})`);
    }

    const json = (await response.json()) as {
      data?: unknown;
      errors?: Array<{ message?: string }>;
    };

    if (Array.isArray(json.errors) && json.errors.length > 0) {
      const message = json.errors
        .map((e) => e.message)
        .filter(Boolean)
        .join(" | ");
      throw new Error(message || "Monday API error");
    }

    return toJson({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update step";
    return toJson({ ok: false, error: message }, 500);
  }
};
