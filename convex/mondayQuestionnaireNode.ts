"use node";

import { v } from "convex/values";

import { callMondayGraphQL } from "./lib/mondayGraphQL";
import { mondayAction } from "./lib/mondayFunctions";

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

const normalizeDateOnly = (value: string | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const dateOnly = trimmed.includes("T") ? trimmed.slice(0, 10) : trimmed;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return null;
  return dateOnly;
};

type Body = Record<string, string | string[] | undefined>;

const buildColumnValues = (body: Body): Record<string, unknown> => {
  const output: Record<string, unknown> = {};

  const setText = (key: keyof typeof COLUMN_IDS, raw: string | undefined) => {
    const value = raw?.trim() ?? "";
    if (value) output[COLUMN_IDS[key]] = value;
  };

  const setDropdown = (key: keyof typeof COLUMN_IDS, raw: string | string[] | undefined) => {
    const labels =
      typeof raw === "string"
        ? [raw.trim()].filter((s) => s.length > 0)
        : (raw ?? []).map((s) => s.trim()).filter((s) => s.length > 0);
    if (labels.length > 0) {
      output[COLUMN_IDS[key]] = { labels: Array.from(new Set(labels)) };
    }
  };

  setText("gender", typeof body.gender === "string" ? body.gender : undefined);
  setDropdown("entryLevel", body.entryLevel);
  setDropdown("skilled", body.skilled);
  const dateOnly = normalizeDateOnly(
    typeof body.startDate === "string" ? body.startDate : undefined,
  );
  if (dateOnly) output[COLUMN_IDS.startDate] = { date: dateOnly };
  setText("ethnicity", typeof body.ethnicity === "string" ? body.ethnicity : undefined);
  setText("educationLevel", typeof body.educationLevel === "string" ? body.educationLevel : undefined);
  setDropdown("usWorkEligible", body.usWorkEligible);
  setDropdown("veteran", body.veteran);
  setDropdown("secondChance", body.secondChance);
  setDropdown("transportation", body.transportation);
  setDropdown("workSchedule", body.workSchedule);
  setText("candidateEducation", typeof body.candidateEducation === "string" ? body.candidateEducation : undefined);
  setText("desiredHourlyWage", typeof body.desiredHourlyWage === "string" ? body.desiredHourlyWage : undefined);

  output[QUESTIONNAIRE_APPROVAL_STEP_COLUMN_ID] = { label: "Done" };

  return output;
};

const optionalStringOrArray = v.optional(v.union(v.string(), v.array(v.string())));

export const saveQuestionnaire = mondayAction({
  args: {
    itemId: v.string(),
    gender: v.optional(v.string()),
    entryLevel: optionalStringOrArray,
    skilled: optionalStringOrArray,
    startDate: v.optional(v.string()),
    ethnicity: v.optional(v.string()),
    educationLevel: v.optional(v.string()),
    usWorkEligible: optionalStringOrArray,
    veteran: optionalStringOrArray,
    secondChance: optionalStringOrArray,
    transportation: optionalStringOrArray,
    workSchedule: optionalStringOrArray,
    candidateEducation: v.optional(v.string()),
    desiredHourlyWage: v.optional(v.string()),
  },
  returns: v.object({ ok: v.literal(true) }),
  handler: async (_ctx, identity, args) => {
    const itemId = args.itemId.trim();
    if (!itemId) throw new Error("Missing monday item id");

    const boardId = process.env.MONDAY_BOARD_ID?.trim() ?? "";
    if (!boardId) throw new Error("Missing MONDAY_BOARD_ID");

    const body: Body = {
      gender: args.gender,
      entryLevel: args.entryLevel,
      skilled: args.skilled,
      startDate: args.startDate,
      ethnicity: args.ethnicity,
      educationLevel: args.educationLevel,
      usWorkEligible: args.usWorkEligible,
      veteran: args.veteran,
      secondChance: args.secondChance,
      transportation: args.transportation,
      workSchedule: args.workSchedule,
      candidateEducation: args.candidateEducation,
      desiredHourlyWage: args.desiredHourlyWage,
    };

    const columnValues = buildColumnValues(body);

    await callMondayGraphQL<{ change_multiple_column_values?: { id?: string } }>(
      `mutation QuestionnaireColumnUpdate(
        $boardId: ID!
        $itemId: ID!
        $columnValues: JSON!
      ) {
        change_multiple_column_values(
          board_id: $boardId
          item_id: $itemId
          column_values: $columnValues
          create_labels_if_missing: true
        ) { id }
      }`,
      { boardId, itemId, columnValues: JSON.stringify(columnValues) },
    );

    const actorId = identity.userId?.trim() || null;
    const updateBody = actorId
      ? `<p>Screening Complete</p><p>Submitted by user ${actorId}</p>`
      : `<p>Screening Complete</p>`;

    await callMondayGraphQL<{ create_update?: { id?: string } }>(
      `mutation CreateQuestionnaireUpdate($itemId: ID!, $body: String!) {
        create_update(item_id: $itemId, body: $body) { id }
      }`,
      { itemId, body: updateBody },
    );

    return { ok: true as const };
  },
});
