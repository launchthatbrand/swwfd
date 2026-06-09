"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

import { callMondayGraphQL } from "./lib/mondayGraphQL";

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

const QUESTIONNAIRE_COLUMN_IDS = Object.values(COLUMN_IDS);

const getBoardId = () => {
  const boardId = process.env.MONDAY_BOARD_ID?.trim() ?? "";
  if (!boardId) throw new Error("Missing MONDAY_BOARD_ID");
  return boardId;
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

// ── resolve email column id ──────────────────────────────────────────

const resolveEmailColumnId = async (boardId: string): Promise<string> => {
  const data = await callMondayGraphQL<{
    boards?: Array<{ columns?: Array<{ id?: string; type?: string }> }>;
  }>(
    `query ($boardId: ID!) { boards(ids: [$boardId]) { columns { id type } } }`,
    { boardId },
  );
  const columns = data.boards?.[0]?.columns ?? [];
  const emailCol = columns.find((c) => c.type === "email");
  return emailCol?.id ?? "email__1";
};

// ── public actions ───────────────────────────────────────────────────

export const getOptions = action({
  args: {},
  returns: v.object({
    gender: v.array(v.string()),
    entryLevel: v.array(v.string()),
    skilled: v.array(v.string()),
    ethnicity: v.array(v.string()),
    educationLevel: v.array(v.string()),
    usWorkEligible: v.array(v.string()),
    veteran: v.array(v.string()),
    secondChance: v.array(v.string()),
    transportation: v.array(v.string()),
    workSchedule: v.array(v.string()),
    candidateEducation: v.array(v.string()),
    desiredHourlyWage: v.array(v.string()),
  }),
  handler: async () => {
    const boardId = getBoardId();

    const data = await callMondayGraphQL<{
      boards?: Array<{
        columns?: Array<{
          id?: string;
          type?: string;
          settings_str?: string;
        }>;
      }>;
    }>(
      `query ($boardId: ID!) {
        boards(ids: [$boardId]) {
          columns { id type settings_str }
        }
      }`,
      { boardId },
    );

    const columns = data.boards?.[0]?.columns ?? [];

    const getLabels = (colId: string): string[] => {
      const col = columns.find((c) => c.id === colId);
      if (!col?.settings_str) return [];
      try {
        const settings = JSON.parse(col.settings_str) as {
          labels?: Record<string, string>;
          labels_colors?: Record<string, { label?: string }>;
        };
        if (settings.labels) {
          return Object.values(settings.labels).filter((l) => l.trim().length > 0);
        }
        if (settings.labels_colors) {
          return Object.values(settings.labels_colors)
            .map((entry) => entry.label ?? "")
            .filter((l) => l.trim().length > 0);
        }
      } catch { /* ignore */ }
      return [];
    };

    return {
      gender: getLabels(COLUMN_IDS.gender),
      entryLevel: getLabels(COLUMN_IDS.entryLevel),
      skilled: getLabels(COLUMN_IDS.skilled),
      ethnicity: getLabels(COLUMN_IDS.ethnicity),
      educationLevel: getLabels(COLUMN_IDS.educationLevel),
      usWorkEligible: getLabels(COLUMN_IDS.usWorkEligible),
      veteran: getLabels(COLUMN_IDS.veteran),
      secondChance: getLabels(COLUMN_IDS.secondChance),
      transportation: getLabels(COLUMN_IDS.transportation),
      workSchedule: getLabels(COLUMN_IDS.workSchedule),
      candidateEducation: getLabels(COLUMN_IDS.candidateEducation),
      desiredHourlyWage: getLabels(COLUMN_IDS.desiredHourlyWage),
    };
  },
});

const contactValidator = v.object({
  id: v.string(),
  name: v.string(),
  email: v.union(v.string(), v.null()),
});

const questionnaireValidator = v.object({
  gender: v.optional(v.string()),
  entryLevel: v.optional(v.union(v.string(), v.array(v.string()))),
  skilled: v.optional(v.union(v.string(), v.array(v.string()))),
  startDate: v.optional(v.string()),
  ethnicity: v.optional(v.string()),
  educationLevel: v.optional(v.string()),
  usWorkEligible: v.optional(v.string()),
  veteran: v.optional(v.string()),
  secondChance: v.optional(v.string()),
  transportation: v.optional(v.string()),
  workSchedule: v.optional(v.string()),
  candidateEducation: v.optional(v.string()),
  desiredHourlyWage: v.optional(v.string()),
});

export const lookupByEmail = action({
  args: { email: v.string() },
  returns: v.object({
    contact: contactValidator,
    questionnaire: questionnaireValidator,
  }),
  handler: async (_ctx, args) => {
    const email = normalizeEmail(args.email);
    if (!email) throw new Error("Missing email");

    const boardId = getBoardId();
    const emailColumnId = await resolveEmailColumnId(boardId);

    const data = await callMondayGraphQL<{
      boards?: Array<{
        items_page?: {
          items?: Array<{
            id?: string;
            name?: string;
            updated_at?: string | null;
            column_values?: Array<{
              id?: string;
              text?: string | null;
              value?: string | null;
            }>;
          }>;
        };
      }>;
    }>(
      `query ($boardId: ID!, $limit: Int!) {
        boards(ids: [$boardId]) {
          items_page(
            limit: $limit
            query_params: {
              rules: [{
                column_id: "${emailColumnId}"
                compare_value: [${JSON.stringify(email)}]
                operator: any_of
              }]
            }
          ) {
            items {
              id name updated_at
              column_values { id text value }
            }
          }
        }
      }`,
      { boardId, limit: 20 },
    );

    const items = data.boards?.[0]?.items_page?.items ?? [];
    const matches = items
      .filter((item) => {
        const itemEmail = item.column_values
          ?.find((c) => c.id === emailColumnId)
          ?.text?.trim()
          .toLowerCase();
        return itemEmail === email;
      })
      .sort((a, b) => {
        const aTime = a.updated_at ? Date.parse(a.updated_at) : 0;
        const bTime = b.updated_at ? Date.parse(b.updated_at) : 0;
        return bTime - aTime;
      });

    const match = matches[0];
    if (!match) throw new Error("No contact found for this email");

    const contact = {
      id: String(match.id ?? ""),
      name: match.name ?? "",
      email: match.column_values?.find((c) => c.id === emailColumnId)?.text ?? null,
    };

    const colValues = match.column_values ?? [];
    const getText = (colId: string) =>
      colValues.find((c) => c.id === colId)?.text?.trim() || undefined;
    const parseDateValue = (colId: string): string | undefined => {
      const raw = colValues.find((c) => c.id === colId)?.value;
      if (!raw) return undefined;
      try {
        const parsed = JSON.parse(raw) as { date?: string };
        const d = parsed.date?.trim();
        if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
      } catch { /* ignore */ }
      return undefined;
    };
    const splitCsv = (val: string | undefined): string[] | undefined => {
      if (!val) return undefined;
      const parts = val.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
      return parts.length > 0 ? parts : undefined;
    };

    const questionnaire = {
      gender: getText(COLUMN_IDS.gender),
      entryLevel: splitCsv(getText(COLUMN_IDS.entryLevel)),
      skilled: splitCsv(getText(COLUMN_IDS.skilled)),
      startDate: parseDateValue(COLUMN_IDS.startDate) ?? getText(COLUMN_IDS.startDate),
      ethnicity: getText(COLUMN_IDS.ethnicity),
      educationLevel: getText(COLUMN_IDS.educationLevel),
      usWorkEligible: getText(COLUMN_IDS.usWorkEligible),
      veteran: getText(COLUMN_IDS.veteran),
      secondChance: getText(COLUMN_IDS.secondChance),
      transportation: getText(COLUMN_IDS.transportation),
      workSchedule: getText(COLUMN_IDS.workSchedule),
      candidateEducation: getText(COLUMN_IDS.candidateEducation),
      desiredHourlyWage: getText(COLUMN_IDS.desiredHourlyWage),
    };

    return { contact, questionnaire };
  },
});

const optionalStringOrArray = v.optional(v.union(v.string(), v.array(v.string())));

const normalizeDateOnly = (value: string | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const dateOnly = trimmed.includes("T") ? trimmed.slice(0, 10) : trimmed;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return null;
  return dateOnly;
};

type Body = Record<string, string | string[] | undefined>;

const buildColumnValues = (body: Body, markComplete: boolean): Record<string, unknown> => {
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
  const dateOnly = normalizeDateOnly(typeof body.startDate === "string" ? body.startDate : undefined);
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

  if (markComplete) {
    output[QUESTIONNAIRE_APPROVAL_STEP_COLUMN_ID] = { label: "Done" };
  }

  return output;
};

export const saveByEmail = action({
  args: {
    email: v.string(),
    submissionMode: v.union(v.literal("partial"), v.literal("complete")),
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
  returns: v.object({
    contact: contactValidator,
  }),
  handler: async (_ctx, args) => {
    const email = normalizeEmail(args.email);
    if (!email) throw new Error("Email is required");

    const boardId = getBoardId();
    const emailColumnId = await resolveEmailColumnId(boardId);

    const searchData = await callMondayGraphQL<{
      boards?: Array<{
        items_page?: {
          items?: Array<{
            id?: string;
            name?: string;
            updated_at?: string | null;
            column_values?: Array<{ id?: string; text?: string | null }>;
          }>;
        };
      }>;
    }>(
      `query ($boardId: ID!, $limit: Int!) {
        boards(ids: [$boardId]) {
          items_page(
            limit: $limit
            query_params: {
              rules: [{
                column_id: "${emailColumnId}"
                compare_value: [${JSON.stringify(email)}]
                operator: any_of
              }]
            }
          ) {
            items {
              id name updated_at
              column_values { id text }
            }
          }
        }
      }`,
      { boardId, limit: 20 },
    );

    const items = searchData.boards?.[0]?.items_page?.items ?? [];
    const matches = items
      .filter((item) => {
        const itemEmail = item.column_values
          ?.find((c) => c.id === emailColumnId)
          ?.text?.trim()
          .toLowerCase();
        return itemEmail === email;
      })
      .sort((a, b) => {
        const aTime = a.updated_at ? Date.parse(a.updated_at) : 0;
        const bTime = b.updated_at ? Date.parse(b.updated_at) : 0;
        return bTime - aTime;
      });

    const match = matches[0];
    if (!match) throw new Error("No contact found for this email");

    const itemId = String(match.id ?? "");
    const markComplete = args.submissionMode === "complete";

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

    const columnValues = buildColumnValues(body, markComplete);

    await callMondayGraphQL<{ change_multiple_column_values?: { id?: string } }>(
      `mutation ($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
        change_multiple_column_values(
          board_id: $boardId
          item_id: $itemId
          column_values: $columnValues
          create_labels_if_missing: true
        ) { id }
      }`,
      { boardId, itemId, columnValues: JSON.stringify(columnValues) },
    );

    if (markComplete) {
      await callMondayGraphQL<{ create_update?: { id?: string } }>(
        `mutation ($itemId: ID!, $body: String!) {
          create_update(item_id: $itemId, body: $body) { id }
        }`,
        { itemId, body: "<p>Screening Complete</p>" },
      );
    }

    return {
      contact: {
        id: itemId,
        name: match.name ?? "",
        email: match.column_values?.find((c) => c.id === emailColumnId)?.text ?? null,
      },
    };
  },
});
