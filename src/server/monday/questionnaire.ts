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
  entryLevel?: string | string[];
  skilled?: string | string[];
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

const asOptionalStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const values = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
  if (values.length === 0) return undefined;
  return Array.from(new Set(values));
};

export const parseQuestionnaireBody = (raw: unknown): QuestionnaireBody => {
  if (!raw || typeof raw !== "object") return {};
  const input = raw as Record<string, unknown>;
  return {
    gender: asOptionalString(input.gender),
    entryLevel: asOptionalStringArray(input.entryLevel) ?? asOptionalString(input.entryLevel),
    skilled: asOptionalStringArray(input.skilled) ?? asOptionalString(input.skilled),
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

const buildQuestionnaireColumnValues = ({
  body,
  markComplete,
}: {
  body: QuestionnaireBody;
  markComplete: boolean;
}): Record<string, unknown> => {
  const output: Record<string, unknown> = {};

  const setText = (key: keyof typeof COLUMN_IDS, raw: string | undefined) => {
    const value = raw?.trim() ?? "";
    if (value) output[COLUMN_IDS[key]] = value;
  };

  const setDropdown = (key: keyof typeof COLUMN_IDS, raw: string | string[] | undefined) => {
    const labels =
      typeof raw === "string"
        ? [raw.trim()].filter((value) => value.length > 0)
        : (raw ?? []).map((value) => value.trim()).filter((value) => value.length > 0);
    if (labels.length > 0) {
      output[COLUMN_IDS[key]] = { labels: Array.from(new Set(labels)) };
    }
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

  if (markComplete) {
    output[QUESTIONNAIRE_APPROVAL_STEP_COLUMN_ID] = { label: "Done" };
  }

  return output;
};

export const saveQuestionnaireToContact = async ({
  itemId,
  body,
  actorMondayUserId,
  markComplete = true,
}: {
  itemId: string;
  body: QuestionnaireBody;
  actorMondayUserId?: string | null;
  markComplete?: boolean;
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

  const columnValues = buildQuestionnaireColumnValues({ body, markComplete });

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

  if (markComplete) {
    await createMondayRecordUpdate({
      itemId: normalizedItemId,
      body: "Screening Complete",
      updateType: "questionnaire",
      actorMondayUserId: actorMondayUserId?.trim() ? actorMondayUserId : null,
    });
  }
};

interface QuestionnaireColumnsData {
  items?: Array<{
    column_values?: Array<{
      id?: string | null;
      text?: string | null;
      value?: string | null;
    }>;
  }>;
}

const QUESTIONNAIRE_COLUMN_IDS = [
  COLUMN_IDS.gender,
  COLUMN_IDS.entryLevel,
  COLUMN_IDS.skilled,
  COLUMN_IDS.startDate,
  COLUMN_IDS.ethnicity,
  COLUMN_IDS.educationLevel,
  COLUMN_IDS.usWorkEligible,
  COLUMN_IDS.veteran,
  COLUMN_IDS.secondChance,
  COLUMN_IDS.transportation,
  COLUMN_IDS.workSchedule,
  COLUMN_IDS.candidateEducation,
  COLUMN_IDS.desiredHourlyWage,
] as const;

const parseDateColumnFromValue = (rawValue: string | null | undefined): string | undefined => {
  if (!rawValue) return undefined;
  try {
    const parsed = JSON.parse(rawValue) as { date?: string };
    const dateOnly = normalizeDateOnly(parsed.date);
    return dateOnly ?? undefined;
  } catch {
    return undefined;
  }
};

const splitCommaSeparatedValues = (value: string): string[] =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

export const getQuestionnaireForContact = async (itemId: string): Promise<QuestionnaireBody> => {
  const normalizedItemId = itemId.trim();
  if (!normalizedItemId) return {};

  const data = await callMondayGraphQL<QuestionnaireColumnsData>(
    `
      query QuestionnaireValues($itemIds: [ID!], $columnIds: [String!]) {
        items(ids: $itemIds) {
          column_values(ids: $columnIds) {
            id
            text
            value
          }
        }
      }
    `,
    {
      itemIds: [normalizedItemId],
      columnIds: [...QUESTIONNAIRE_COLUMN_IDS],
    },
  );

  const columnValues = data.items?.[0]?.column_values ?? [];
  const byId = new Map(
    columnValues
      .filter((column): column is { id: string; text?: string | null; value?: string | null } =>
        typeof column.id === "string",
      )
      .map((column) => [column.id, column] as const),
  );
  const getText = (columnId: string) => byId.get(columnId)?.text?.trim() ?? "";

  return {
    gender: getText(COLUMN_IDS.gender) || undefined,
    entryLevel: splitCommaSeparatedValues(getText(COLUMN_IDS.entryLevel)),
    skilled: splitCommaSeparatedValues(getText(COLUMN_IDS.skilled)),
    startDate:
      parseDateColumnFromValue(byId.get(COLUMN_IDS.startDate)?.value) ??
      (getText(COLUMN_IDS.startDate) || undefined),
    ethnicity: getText(COLUMN_IDS.ethnicity) || undefined,
    educationLevel: getText(COLUMN_IDS.educationLevel) || undefined,
    usWorkEligible: getText(COLUMN_IDS.usWorkEligible) || undefined,
    veteran: getText(COLUMN_IDS.veteran) || undefined,
    secondChance: getText(COLUMN_IDS.secondChance) || undefined,
    transportation: getText(COLUMN_IDS.transportation) || undefined,
    workSchedule: getText(COLUMN_IDS.workSchedule) || undefined,
    candidateEducation: getText(COLUMN_IDS.candidateEducation) || undefined,
    desiredHourlyWage: getText(COLUMN_IDS.desiredHourlyWage) || undefined,
  };
};
