import { env } from "~/env";
import { callMondayGraphQL, createMondayRecordUpdate } from "~/server/monday/client";

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

export interface QuestionnaireBody {
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

const normalizeDateOnly = (value: string | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const dateOnly = trimmed.includes("T") ? trimmed.slice(0, 10) : trimmed;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return null;
  return dateOnly;
};

const asOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  return value;
};

export const parseQuestionnaireBody = (raw: unknown): QuestionnaireBody => {
  if (!raw || typeof raw !== "object") return {};
  const input = raw as Record<string, unknown>;
  return {
    gender: asOptionalString(input.gender),
    entryLevel: asOptionalString(input.entryLevel),
    skilled: asOptionalString(input.skilled),
    startDate: asOptionalString(input.startDate),
    ethnicity: asOptionalString(input.ethnicity),
    educationLevel: asOptionalString(input.educationLevel),
    usWorkEligible: asOptionalString(input.usWorkEligible),
    veteran: asOptionalString(input.veteran),
    secondChance: asOptionalString(input.secondChance),
    transportation: asOptionalString(input.transportation),
    workSchedule: asOptionalString(input.workSchedule),
    candidateEducation: asOptionalString(input.candidateEducation),
    desiredHourlyWage: asOptionalString(input.desiredHourlyWage),
  };
};

const buildQuestionnaireColumnValues = (body: QuestionnaireBody): Record<string, unknown> => {
  const output: Record<string, unknown> = {};

  const setText = (key: keyof typeof COLUMN_IDS, raw: string | undefined) => {
    const value = raw?.trim() ?? "";
    if (value) output[COLUMN_IDS[key]] = value;
  };

  const setDropdown = (key: keyof typeof COLUMN_IDS, raw: string | undefined) => {
    const value = raw?.trim() ?? "";
    if (value) output[COLUMN_IDS[key]] = { labels: [value] };
  };

  setText("gender", body.gender);
  setDropdown("entryLevel", body.entryLevel);
  setDropdown("skilled", body.skilled);
  const dateOnly = normalizeDateOnly(body.startDate);
  if (dateOnly) output[COLUMN_IDS.startDate] = { date: dateOnly };
  setText("ethnicity", body.ethnicity);
  setText("educationLevel", body.educationLevel);
  setDropdown("usWorkEligible", body.usWorkEligible);
  setDropdown("veteran", body.veteran);
  setDropdown("secondChance", body.secondChance);
  setDropdown("transportation", body.transportation);
  setDropdown("workSchedule", body.workSchedule);
  setText("candidateEducation", body.candidateEducation);
  setText("desiredHourlyWage", body.desiredHourlyWage);

  output[QUESTIONNAIRE_APPROVAL_STEP_COLUMN_ID] = { label: "Done" };

  return output;
};

export const saveQuestionnaireToContact = async ({
  itemId,
  body,
  actorMondayUserId,
}: {
  itemId: string;
  body: QuestionnaireBody;
  actorMondayUserId?: string | null;
}) => {
  const apiKey = env.MONDAY_API_KEY?.trim() ?? "";
  const boardId = env.MONDAY_BOARD_ID?.trim() ?? "";
  if (!apiKey || !boardId) {
    throw new Error("Missing MONDAY_API_KEY or MONDAY_BOARD_ID");
  }

  const normalizedItemId = itemId.trim();
  if (!normalizedItemId) {
    throw new Error("Missing monday item id");
  }

  const columnValues = buildQuestionnaireColumnValues(body);

  await callMondayGraphQL(
    `
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
    {
      boardId,
      itemId: normalizedItemId,
      columnValues: JSON.stringify(columnValues),
    },
  );

  await createMondayRecordUpdate({
    itemId: normalizedItemId,
    body: "Screening Complete",
    updateType: "questionnaire",
    actorMondayUserId: actorMondayUserId?.trim() ? actorMondayUserId : null,
  });
};
