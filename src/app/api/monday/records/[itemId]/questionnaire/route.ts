import { NextResponse } from "next/server";

import { env } from "~/env";
import { createMondayRecordUpdate } from "~/server/monday/client";
import { requireVerifiedMondaySession } from "~/server/monday/session";

export const runtime = "nodejs";

const MONDAY_API_URL = "https://api.monday.com/v2";

const QUESTIONNAIRE_APPROVAL_STEP_COLUMN_ID = "color_mm1dwr4k";

const COLUMN_IDS = {
  gender: "text95__1",
  entryLevel: "dropdown__1",
  skilled: "dropdown7__1",
  startDate: "date__1",
  ethnicity: "text2__1",
  educationLevel: "text0__1",
  usWorkEligible: "dropdown3__1",
  veteran: "dropdown32__1",
  secondChance: "dropdown9__1",
  transportation: "dropdown8__1",
  workSchedule: "dropdown0__1",
  candidateEducation: "text5__1",
  desiredHourlyWage: "text16__1",
} as const;

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

const normalizeDateOnly = (value: string | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const dateOnly = trimmed.includes("T") ? trimmed.slice(0, 10) : trimmed;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return null;
  return dateOnly;
};

interface QuestionnaireBody {
  gender?: string;
  entryLevel?: string;
  skilled?: string;
  startDate?: string;
  ethnicity?: string;
  educationLevel?: string;
  usWorkEligible?: string;
  veteran?: string;
  secondChance?: string;
  transportation?: string;
  workSchedule?: string;
  candidateEducation?: string;
  desiredHourlyWage?: string;
}

const asOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  return value;
};

const parseBody = (raw: unknown): QuestionnaireBody => {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  return {
    gender: asOptionalString(o.gender),
    entryLevel: asOptionalString(o.entryLevel),
    skilled: asOptionalString(o.skilled),
    startDate: asOptionalString(o.startDate),
    ethnicity: asOptionalString(o.ethnicity),
    educationLevel: asOptionalString(o.educationLevel),
    usWorkEligible: asOptionalString(o.usWorkEligible),
    veteran: asOptionalString(o.veteran),
    secondChance: asOptionalString(o.secondChance),
    transportation: asOptionalString(o.transportation),
    workSchedule: asOptionalString(o.workSchedule),
    candidateEducation: asOptionalString(o.candidateEducation),
    desiredHourlyWage: asOptionalString(o.desiredHourlyWage),
  };
};

const buildColumnValues = (body: QuestionnaireBody): Record<string, unknown> => {
  const out: Record<string, unknown> = {};

  const setText = (key: keyof typeof COLUMN_IDS, raw: string | undefined) => {
    const v = raw?.trim() ?? "";
    if (v) out[COLUMN_IDS[key]] = v;
  };

  const setDropdown = (key: keyof typeof COLUMN_IDS, raw: string | undefined) => {
    const v = raw?.trim() ?? "";
    if (v) out[COLUMN_IDS[key]] = { labels: [v] };
  };

  setText("gender", body.gender);
  setDropdown("entryLevel", body.entryLevel);
  setDropdown("skilled", body.skilled);
  const dateOnly = normalizeDateOnly(body.startDate);
  if (dateOnly) out[COLUMN_IDS.startDate] = { date: dateOnly };
  setText("ethnicity", body.ethnicity);
  setText("educationLevel", body.educationLevel);
  setDropdown("usWorkEligible", body.usWorkEligible);
  setDropdown("veteran", body.veteran);
  setDropdown("secondChance", body.secondChance);
  setDropdown("transportation", body.transportation);
  setDropdown("workSchedule", body.workSchedule);
  setText("candidateEducation", body.candidateEducation);
  setText("desiredHourlyWage", body.desiredHourlyWage);

  out[QUESTIONNAIRE_APPROVAL_STEP_COLUMN_ID] = { label: "Done" };

  return out;
};

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

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return toJson({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const body = parseBody(rawBody);
  const columnValues = buildColumnValues(body);

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
          mutation QuestionnaireColumnUpdate(
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
          columnValues: JSON.stringify(columnValues),
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

    await createMondayRecordUpdate({
      itemId: itemId.trim(),
      body: "Questionnaire Update",
      updateType: "questionnaire",
    });

    return toJson({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save questionnaire";
    return toJson({ ok: false, error: message }, 500);
  }
};
