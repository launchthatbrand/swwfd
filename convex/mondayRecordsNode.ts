"use node";

import { v } from "convex/values";

import { callMondayGraphQL } from "./lib/mondayGraphQL";
import { mondayAction } from "./lib/mondayFunctions";
import type { MondaySessionIdentity } from "./lib/mondaySession";

// ---------------------------------------------------------------------------
// Board column constants (mirrors src/server/monday/client.ts)
// ---------------------------------------------------------------------------

const RETENTION_REFERRED_COLUMN_ID = "dropdown_mkwqcc1w";
const RETENTION_INTERVIEWING_WITH_COLUMN_ID = "dropdown_mm3jj2gr";
const RETENTION_HIRED_WITH_COLUMN_ID = "dropdown_mkwqm5fb";
const RETENTION_HIRE_DATE_COLUMN_ID = "date_mkty234p";
const RETENTION_PERIOD_COLUMN_ID = "dropdown_mkwthbh2";
const TAGS_COLUMN_ID = "dropdown_mkvw578t";
const LAST_INTERACTION_DATE_COLUMN_ID = "date_mm3jfsd1";
const API_BOARD_CREATED_AT_COLUMN_ID = "date1__1";

const APPROVAL_STEP_COLUMN_IDS = [
  "color_mm1db321",
  "color_mm3ggf4t",
  "color_mm1dwr4k",
  "color_mm1dnr11",
  "color_mm1dgeqy",
  "color_mm1d80yc",
  "color_mm1djwjj",
] as const;

const VALID_STEP_COLUMN_IDS = new Set<string>(APPROVAL_STEP_COLUMN_IDS);

const SUBITEM_TYPE_COLUMN_ID = "color_mm2x49t2";
const SUBITEM_DATE_COLUMN_ID = "date0";
const SUBITEM_PERSON_COLUMN_ID = "person";
const SUBITEM_METHOD_COLUMN_ID = "method_of_communication__1";
const SUBITEM_INTERNAL_EXTERNAL_COLUMN_ID = "color_mm3j5y2v";
const SUBITEM_INTENT_COLUMN_ID = "color_mm40edt7";
const SUBITEM_NOTES_COLUMN_ID = "notes1__1";
const SUBITEM_NAME_MAX_LENGTH = 120;

const MONDAY_UPDATE_TYPES = [
  "general",
  "welcome_email",
  "followup",
  "questionnaire",
  "resume",
  "resume_referral",
  "job_referral",
  "merge",
] as const;

type MondayUpdateType = (typeof MONDAY_UPDATE_TYPES)[number];

const SUBITEM_TYPE_LABEL_BY_UPDATE_TYPE: Record<MondayUpdateType, string> = {
  general: "General",
  welcome_email: "Welcome Email",
  followup: "Questionnaire Sent",
  questionnaire: "Questionnaire",
  resume: "Resume",
  resume_referral: "Resume Referral",
  job_referral: "Referral",
  merge: "Merge",
};

const SUBITEM_NAME_BY_UPDATE_TYPE: Record<
  Exclude<MondayUpdateType, "general">,
  string
> = {
  welcome_email: "Welcome Email Sent",
  followup: "Questionnaire Sent Update",
  questionnaire: "Questionaire Update",
  resume: "Resume Update",
  resume_referral: "Resume Referral Update",
  job_referral: "Job Referral Update",
  merge: "Contact Merged",
};

const APPROVAL_STEP_COLUMN_ID_BY_UPDATE_TYPE: Partial<
  Record<Exclude<MondayUpdateType, "general">, string>
> = {
  welcome_email: APPROVAL_STEP_COLUMN_IDS[0],
  followup: APPROVAL_STEP_COLUMN_IDS[1],
  questionnaire: APPROVAL_STEP_COLUMN_IDS[2],
  resume: APPROVAL_STEP_COLUMN_IDS[3],
};

const CONTACT_EDITABLE_COLUMN_TYPES = new Set([
  "text",
  "long_text",
  "long-text",
  "date",
  "numbers",
  "numeric",
  "status",
  "dropdown",
]);

const SHOULD_DEBUG_PROGRESS =
  process.env.NODE_ENV !== "production" || process.env.MONDAY_DEBUG_PROGRESS === "1";
const truncateForLog = (value: string | null | undefined, limit = 240) => {
  if (!value) return value ?? null;
  return value.length <= limit ? value : `${value.slice(0, limit)}…`;
};

// ---------------------------------------------------------------------------
// Return validators
// ---------------------------------------------------------------------------

const mondayRecordValidator = v.object({
  id: v.string(),
  name: v.string(),
  url: v.union(v.string(), v.null()),
  groupTitle: v.union(v.string(), v.null()),
  statusText: v.union(v.string(), v.null()),
  peopleText: v.union(v.string(), v.null()),
  ownerIds: v.array(v.string()),
  email: v.union(v.string(), v.null()),
  phone: v.union(v.string(), v.null()),
  address: v.union(v.string(), v.null()),
  referredToContractors: v.union(v.string(), v.null()),
  interviewingWithContractors: v.union(v.string(), v.null()),
  hiredWithContractor: v.union(v.string(), v.null()),
  hireDate: v.union(v.string(), v.null()),
  retentionPeriod: v.union(v.string(), v.null()),
  tags: v.union(v.string(), v.null()),
  batteryProgress: v.union(v.number(), v.null()),
  batteryRawValue: v.union(v.string(), v.null()),
  contactDetails: v.array(
    v.object({
      label: v.string(),
      value: v.string(),
    }),
  ),
  createdAt: v.union(v.string(), v.null()),
  updatedAt: v.union(v.string(), v.null()),
  lastTouchpointAt: v.union(v.string(), v.null()),
});

const approvalStepValidator = v.object({
  id: v.string(),
  title: v.string(),
});

const editOptionsValidator = v.object({
  referredToContractors: v.array(v.string()),
  hiredWithContractor: v.array(v.string()),
  retentionPeriod: v.array(v.string()),
  tags: v.array(v.string()),
  status: v.array(v.string()),
  questionnaireGender: v.array(v.string()),
  questionnaireEntryLevel: v.array(v.string()),
  questionnaireSkilled: v.array(v.string()),
  questionnaireEthnicity: v.array(v.string()),
  questionnaireEducationLevel: v.array(v.string()),
  questionnaireUsWorkEligible: v.array(v.string()),
  questionnaireVeteran: v.array(v.string()),
  questionnaireSecondChance: v.array(v.string()),
  questionnaireTransportation: v.array(v.string()),
  questionnaireWorkSchedule: v.array(v.string()),
  questionnaireCandidateEducation: v.array(v.string()),
  questionnaireDesiredHourlyWage: v.array(v.string()),
});

const recordColumnValidator = v.object({
  id: v.string(),
  title: v.string(),
  type: v.string(),
  text: v.union(v.string(), v.null()),
  value: v.union(v.string(), v.null()),
  options: v.array(v.string()),
  isEditable: v.boolean(),
});

const mondayRecordUpdateValidator = v.object({
  id: v.string(),
  body: v.string(),
  updateType: v.string(),
  source: v.union(v.literal("item"), v.literal("subitem")),
  subitemId: v.union(v.string(), v.null()),
  subitemName: v.union(v.string(), v.null()),
  createdAt: v.union(v.string(), v.null()),
  updatedAt: v.union(v.string(), v.null()),
  creatorId: v.union(v.string(), v.null()),
  creatorName: v.union(v.string(), v.null()),
});

const subitemEntryValidator = v.object({
  id: v.string(),
  name: v.string(),
  typeLabel: v.union(v.string(), v.null()),
  updateType: v.string(),
  intent: v.union(v.literal("internal_note"), v.literal("conversation"), v.literal("campaign")),
  methodOfCommunication: v.union(v.string(), v.null()),
  createdAt: v.union(v.string(), v.null()),
  creatorUserId: v.union(v.string(), v.null()),
  creatorProfile: v.union(
    v.object({
      id: v.string(),
      name: v.union(v.string(), v.null()),
      photoThumb: v.union(v.string(), v.null()),
    }),
    v.null(),
  ),
  updates: v.array(
    v.object({
      id: v.string(),
      body: v.string(),
      createdAt: v.union(v.string(), v.null()),
      updatedAt: v.union(v.string(), v.null()),
      creatorId: v.union(v.string(), v.null()),
      creatorName: v.union(v.string(), v.null()),
    }),
  ),
});

const mondayUpdateTypeValidator = v.union(
  v.literal("general"),
  v.literal("welcome_email"),
  v.literal("followup"),
  v.literal("questionnaire"),
  v.literal("resume"),
  v.literal("resume_referral"),
  v.literal("job_referral"),
  v.literal("merge"),
);

const mondayUpdateIntentValidator = v.union(
  v.literal("internal_note"),
  v.literal("conversation"),
  v.literal("campaign"),
);

const advancedFilterFieldValidator = v.union(
  v.literal("owner"),
  v.literal("district"),
  v.literal("name"),
  v.literal("email"),
  v.literal("phone"),
  v.literal("address"),
  v.literal("tags"),
  v.literal("createdAt"),
  v.literal("hireDate"),
  v.literal("detail"),
);

const advancedFilterOperatorValidator = v.union(
  v.literal("contains"),
  v.literal("equals"),
  v.literal("not_equals"),
  v.literal("starts_with"),
  v.literal("ends_with"),
  v.literal("is_empty"),
  v.literal("is_not_empty"),
  v.literal("on_or_after"),
  v.literal("on_or_before"),
  v.literal("between"),
);

const advancedFilterMatchModeValidator = v.union(v.literal("all"), v.literal("any"));

const advancedFilterConditionValidator = v.object({
  id: v.string(),
  field: advancedFilterFieldValidator,
  operator: advancedFilterOperatorValidator,
  value: v.string(),
  valueTo: v.string(),
  target: v.string(),
});

// ---------------------------------------------------------------------------
// Env + helpers
// ---------------------------------------------------------------------------

const getMondayBoardEnv = () => {
  const boardId = process.env.MONDAY_BOARD_ID?.trim() ?? "";
  if (!boardId) {
    throw new Error(
      "Missing Monday configuration. Set MONDAY_API_KEY and MONDAY_BOARD_ID.",
    );
  }
  return { boardId };
};

const parseLimit = (value: number | undefined, max = 500) => {
  if (!Number.isFinite(value)) return 100;
  return Math.min(Math.max(Math.floor(value!), 1), max);
};

const parseIsoDateOnly = (value: string | undefined) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const parsed = Date.parse(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed);
};

const normalizeDateOnlyValue = (value: string | null | undefined) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const dateOnly = trimmed.includes("T") ? trimmed.slice(0, 10) : trimmed;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return null;
  return dateOnly;
};

const normalizeIntentLabel = (
  value: string | null | undefined,
): "internal_note" | "conversation" | "campaign" => {
  const normalized = (value ?? "").trim().toLowerCase().replaceAll(/\s+/g, "_");
  if (normalized === "internal_note") return "internal_note";
  if (normalized === "campaign") return "campaign";
  return "conversation";
};

const splitCsvValues = (value: string | null | undefined) => {
  if (!value) return [] as string[];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};

const parseDropdownLabelsFromSettings = (settingsStr: string | null | undefined) => {
  if (!settingsStr || settingsStr.trim().length === 0) return [];
  try {
    const parsed = JSON.parse(settingsStr) as Record<string, unknown>;
    const labels = new Set<string>();
    const pushLabel = (value: unknown) => {
      if (typeof value === "string") {
        const normalized = value.trim();
        if (normalized.length > 0) labels.add(normalized);
        return;
      }
      if (typeof value === "object" && value !== null) {
        const record = value as Record<string, unknown>;
        for (const key of ["name", "label", "title", "value"]) {
          if (typeof record[key] === "string") {
            const normalized = (record[key] as string).trim();
            if (normalized.length > 0) labels.add(normalized);
          }
        }
      }
    };

    const labelsNode = parsed.labels;
    if (typeof labelsNode === "object" && labelsNode !== null) {
      for (const value of Object.values(labelsNode as Record<string, unknown>)) {
        pushLabel(value);
      }
    }
    const labelsPositions = parsed.labels_positions_v2;
    if (Array.isArray(labelsPositions)) {
      for (const entry of labelsPositions) pushLabel(entry);
    }
    const labelsColors = parsed.labels_colors;
    if (typeof labelsColors === "object" && labelsColors !== null) {
      for (const value of Object.values(labelsColors as Record<string, unknown>)) {
        pushLabel(value);
      }
    }
    return Array.from(labels).sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
};

const parseOptionLabelMapFromSettings = (settingsStr: string | null | undefined) => {
  if (!settingsStr || settingsStr.trim().length === 0) return new Map<string, string>();
  try {
    const parsed = JSON.parse(settingsStr) as Record<string, unknown>;
    const optionLabelMap = new Map<string, string>();
    const labelsNode = parsed.labels;
    if (typeof labelsNode === "object" && labelsNode !== null) {
      for (const [key, value] of Object.entries(labelsNode as Record<string, unknown>)) {
        if (typeof value === "string" && value.trim().length > 0) {
          optionLabelMap.set(String(key), value.trim());
          continue;
        }
        if (typeof value === "object" && value !== null) {
          const record = value as Record<string, unknown>;
          const labelCandidate =
            typeof record.label === "string"
              ? record.label
              : typeof record.name === "string"
                ? record.name
                : typeof record.title === "string"
                  ? record.title
                  : null;
          if (labelCandidate && labelCandidate.trim().length > 0) {
            optionLabelMap.set(String(key), labelCandidate.trim());
          }
        }
      }
    }
    return optionLabelMap;
  } catch {
    return new Map<string, string>();
  }
};

const toColumnDisplayValue = (text: string | null | undefined, value: string | null | undefined) => {
  const trimmedText = text?.trim() ?? "";
  if (trimmedText.length > 0) return trimmedText;
  if (!value) return "";
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (typeof parsed.text === "string" && parsed.text.trim().length > 0) {
      return parsed.text.trim();
    }
    if (Array.isArray(parsed.labels)) {
      return parsed.labels
        .filter((entry): entry is string => typeof entry === "string")
        .join(", ");
    }
    if (typeof parsed.label === "string") return parsed.label;
  } catch {
    // ignore
  }
  return "";
};

const toOptionAwareColumnDisplayValue = (args: {
  text: string | null | undefined;
  value: string | null | undefined;
  optionLabelMap?: Map<string, string>;
}) => {
  const display = toColumnDisplayValue(args.text, args.value).trim();
  if (display.length > 0) return display;
  if (!args.value || !args.optionLabelMap || args.optionLabelMap.size === 0) return display;
  try {
    const parsed = JSON.parse(args.value) as Record<string, unknown>;
    const optionIds: string[] = [];
    if (Array.isArray(parsed.ids)) {
      for (const id of parsed.ids) {
        if (typeof id === "string" || typeof id === "number") {
          optionIds.push(String(id));
        }
      }
    } else if (typeof parsed.index === "string" || typeof parsed.index === "number") {
      optionIds.push(String(parsed.index));
    }
    if (optionIds.length === 0) return display;
    const labels = optionIds
      .map((id) => args.optionLabelMap?.get(id)?.trim() ?? "")
      .filter((entry) => entry.length > 0);
    if (labels.length === 0) return display;
    return Array.from(new Set(labels)).join(", ");
  } catch {
    return display;
  }
};

const parseTimestampFromColumn = (
  value: string | null | undefined,
  text: string | null | undefined,
) => {
  if (typeof value === "string" && value.length > 0) {
    try {
      const parsed = JSON.parse(value) as {
        date?: unknown;
        time?: unknown;
        created_at?: unknown;
        updated_at?: unknown;
        changed_at?: unknown;
      };
      if (typeof parsed.date === "string" && parsed.date.length > 0) {
        if (typeof parsed.time === "string" && parsed.time.length > 0) {
          return `${parsed.date}T${parsed.time}Z`;
        }
        return `${parsed.date}T00:00:00Z`;
      }
      const rawTimestamp =
        typeof parsed.updated_at === "string"
          ? parsed.updated_at
          : typeof parsed.changed_at === "string"
            ? parsed.changed_at
            : typeof parsed.created_at === "string"
              ? parsed.created_at
              : null;
      if (rawTimestamp && rawTimestamp.length > 0) return rawTimestamp;
    } catch {
      // fall through
    }
  }
  if (typeof text === "string" && text.length > 0) {
    const fromText = Date.parse(text.replace(" UTC", "Z"));
    if (!Number.isNaN(fromText)) return new Date(fromText).toISOString();
  }
  return null;
};

const resolveBoardColumnIds = async (boardId: string) => {
  interface BoardColumnsData {
    boards?: Array<{
      columns?: Array<{
        id?: string | null;
        title?: string | null;
        type?: string | null;
        settings_str?: string | null;
      }>;
    }>;
  }
  const data = await callMondayGraphQL<BoardColumnsData>(
    `query ResolveBoardColumns($boardId: ID!) {
      boards(ids: [$boardId]) {
        columns { id title type settings_str }
      }
    }`,
    { boardId },
  );
  const columns = data.boards?.[0]?.columns ?? [];
  const columnTitleById: Record<string, string> = {};
  const columnIdByNormalizedTitle: Record<string, string> = {};
  const columnTypeById: Record<string, string> = {};
  for (const column of columns) {
    const columnId = column.id?.trim() ?? "";
    const columnTitle = column.title?.trim() ?? "";
    if (columnId && columnTitle) {
      columnTitleById[columnId] = columnTitle;
      columnIdByNormalizedTitle[columnTitle.toLowerCase()] = columnId;
    }
    if (columnId && column.type) {
      columnTypeById[columnId] = column.type.trim().toLowerCase();
    }
  }
  const optionLabelMapById: Record<string, Map<string, string>> = {};
  for (const column of columns) {
    const columnId = column.id?.trim() ?? "";
    if (!columnId) continue;
    optionLabelMapById[columnId] = parseOptionLabelMapFromSettings(column.settings_str ?? null);
  }
  const statusColumnId =
    columns.find((c) => (c.type ?? "").toLowerCase() === "status")?.id ?? null;
  const peopleColumnId =
    columns.find((c) => (c.type ?? "").toLowerCase() === "people")?.id ?? null;
  const emailColumnId =
    columns.find(
      (c) => c.id === "email__1" || (c.type ?? "").toLowerCase() === "email",
    )?.id ?? "email__1";
  const dateColumnId =
    columns.find((c) => c.id === API_BOARD_CREATED_AT_COLUMN_ID)?.id ??
    "date1__1";

  return {
    statusColumnId,
    peopleColumnId,
    emailColumnId,
    dateColumnId,
    columnTitleById,
    columnIdByNormalizedTitle,
    columnTypeById,
    optionLabelMapById,
  };
};

const isMondayUpdateType = (value: string): value is MondayUpdateType => {
  return (MONDAY_UPDATE_TYPES as readonly string[]).includes(value);
};

const buildSubitemName = (rawValue: string, fallbackName: string) => {
  const normalized = rawValue.replace(/\s+/g, " ").trim();
  const candidate = normalized.length > 0 ? normalized : fallbackName.trim();
  if (candidate.length <= SUBITEM_NAME_MAX_LENGTH) return candidate;
  return `${candidate.slice(0, SUBITEM_NAME_MAX_LENGTH - 3).trimEnd()}...`;
};

// ---------------------------------------------------------------------------
// Core implementations
// ---------------------------------------------------------------------------

interface BoardItem {
  id: string;
  name?: string;
  url?: string;
  updated_at?: string;
  group?: { title?: string | null } | null;
  column_values?: {
    id?: string;
    type?: string;
    text?: string | null;
    value?: string | null;
  }[];
}

const boardItemToRecord = (item: BoardItem) => {
  const columns = item.column_values ?? [];
  const statusColumn = columns.find((column) => column.type === "status");
  const peopleColumn = columns.find((column) => column.type === "people");
  const emailColumn = columns.find(
    (column) => column.id === "email__1" || column.type === "email",
  );
  const phoneColumn = columns.find(
    (column) => column.id === "phone____1" || column.type === "phone",
  );
  const referredToContractorsColumn = columns.find(
    (column) => column.id === RETENTION_REFERRED_COLUMN_ID,
  );
  const interviewingWithContractorColumn = columns.find(
    (column) => column.id === RETENTION_INTERVIEWING_WITH_COLUMN_ID,
  );
  const hiredWithContractorColumn = columns.find(
    (column) => column.id === RETENTION_HIRED_WITH_COLUMN_ID,
  );
  const hireDateColumn = columns.find(
    (column) => column.id === RETENTION_HIRE_DATE_COLUMN_ID,
  );
  const retentionPeriodColumn = columns.find(
    (column) => column.id === RETENTION_PERIOD_COLUMN_ID,
  );
  const tagsColumn = columns.find((column) => column.id === TAGS_COLUMN_ID);
  const dateColumn = columns.find(
    (column) => column.id === API_BOARD_CREATED_AT_COLUMN_ID,
  );
  const lastTouchpointColumn = columns.find(
    (column) => column.id === LAST_INTERACTION_DATE_COLUMN_ID,
  );
  const batteryColumn = columns.find(
    (column) =>
      column.id === "columns_battery_mm1dnmq3" ||
      (column.type ?? "").toLowerCase() === "progress",
  );

  let ownerIds: string[] = [];
  if (peopleColumn?.value) {
    try {
      const parsed = JSON.parse(peopleColumn.value) as {
        personsAndTeams?: Array<{ id?: number | string; kind?: string }>;
      };
      ownerIds = (parsed.personsAndTeams ?? [])
        .filter((entry) => entry.kind === "person" && entry.id != null)
        .map((entry) => String(entry.id).trim())
        .filter((entry) => entry.length > 0);
    } catch {
      ownerIds = [];
    }
  }

  let hireDateFromColumn: string | null = null;
  if (hireDateColumn?.value) {
    try {
      const parsed = JSON.parse(hireDateColumn.value) as {
        date?: string;
        time?: string;
      };
      if (parsed.date && parsed.time) {
        hireDateFromColumn = `${parsed.date}T${parsed.time}Z`;
      } else if (parsed.date) {
        hireDateFromColumn = `${parsed.date}T00:00:00Z`;
      }
    } catch {
      // ignore
    }
  }

  const addressLine1 = columns.find((column) => column.id === "text6__1")?.text;
  const addressLine2 = columns.find((column) => column.id === "text60__1")?.text;
  const city = columns.find((column) => column.id === "text1__1")?.text;
  const state = columns.find((column) => column.id === "text7__1")?.text;
  const zip = columns.find((column) => column.id === "text3__1")?.text;
  const addressParts = [addressLine1, addressLine2, city, state, zip]
    .map((value) => value?.trim())
    .filter((value): value is string => !!value && value.length > 0);

  const parseBatteryProgress = () => {
    const fromText = batteryColumn?.text?.match(/\d{1,3}/)?.[0];
    if (fromText) {
      const parsed = Number(fromText);
      if (Number.isFinite(parsed)) return Math.max(0, Math.min(100, Math.round(parsed)));
    }
    if (batteryColumn?.value) {
      try {
        const parsed = JSON.parse(batteryColumn.value) as Record<string, unknown>;
        for (const key of ["batteryValue", "value", "percent", "progress"]) {
          const candidate = parsed[key];
          if (typeof candidate === "number" && Number.isFinite(candidate)) {
            return Math.max(0, Math.min(100, Math.round(candidate)));
          }
          if (typeof candidate === "string" && /^\d{1,3}$/.test(candidate.trim())) {
            return Math.max(0, Math.min(100, Math.round(Number(candidate.trim()))));
          }
        }
      } catch {
        // ignore
      }
    }
    return null;
  };
  const batteryProgress = parseBatteryProgress();
  const address = addressParts.length > 0 ? addressParts.join(", ") : null;
  const contactDetails: Array<{ label: string; value: string }> = [];
  if ((item.name ?? "").trim()) contactDetails.push({ label: "Name", value: item.name ?? "" });
  if ((emailColumn?.text ?? "").trim()) {
    contactDetails.push({ label: "Email", value: emailColumn?.text ?? "" });
  }
  if ((phoneColumn?.text ?? "").trim()) {
    contactDetails.push({ label: "Phone", value: phoneColumn?.text ?? "" });
  }
  if (address) {
    contactDetails.push({ label: "Address", value: address });
  }

  if (SHOULD_DEBUG_PROGRESS && batteryProgress === null) {
    const progressColumns = columns
      .filter((column) => (column.type ?? "").toLowerCase() === "progress")
      .map((column) => ({
        id: column.id ?? null,
        type: column.type ?? null,
        text: truncateForLog(column.text ?? null),
        value: truncateForLog(column.value ?? null),
      }));
    console.info("[mondayRecordsNode][progress][null]", {
      itemId: item.id,
      itemName: item.name ?? null,
      batteryColumnId: batteryColumn?.id ?? null,
      batteryColumnType: batteryColumn?.type ?? null,
      batteryColumnText: truncateForLog(batteryColumn?.text ?? null),
      batteryColumnValue: truncateForLog(batteryColumn?.value ?? null),
      progressColumns,
    });
  }

  return {
    id: item.id,
    name: item.name ?? "",
    url: item.url ?? null,
    groupTitle: item.group?.title ?? null,
    statusText: statusColumn?.text ?? null,
    peopleText: peopleColumn?.text ?? null,
    ownerIds,
    email: emailColumn?.text ?? null,
    phone: phoneColumn?.text ?? null,
    address,
    referredToContractors:
      toColumnDisplayValue(
        referredToContractorsColumn?.text,
        referredToContractorsColumn?.value,
      ) || null,
    interviewingWithContractors:
      toColumnDisplayValue(
        interviewingWithContractorColumn?.text,
        interviewingWithContractorColumn?.value,
      ) || null,
    hiredWithContractor:
      toColumnDisplayValue(
        hiredWithContractorColumn?.text,
        hiredWithContractorColumn?.value,
      ) || null,
    hireDate:
      hireDateFromColumn ??
      (toColumnDisplayValue(hireDateColumn?.text, hireDateColumn?.value).trim()
        ? toColumnDisplayValue(hireDateColumn?.text, hireDateColumn?.value)
        : null),
    retentionPeriod:
      toColumnDisplayValue(
        retentionPeriodColumn?.text,
        retentionPeriodColumn?.value,
      ) || null,
    tags: toColumnDisplayValue(tagsColumn?.text, tagsColumn?.value) || null,
    batteryProgress,
    batteryRawValue: batteryColumn?.value ?? null,
    contactDetails,
    createdAt: parseTimestampFromColumn(dateColumn?.value, dateColumn?.text),
    updatedAt: item.updated_at ?? null,
    lastTouchpointAt: parseTimestampFromColumn(
      lastTouchpointColumn?.value,
      lastTouchpointColumn?.text,
    ),
  };
};

const listMondayBoardRecordsImpl = async (args: {
  cursor?: string;
  limit?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  owner?: string;
  status?: string;
  advancedFilterConditions?: AdvancedFilterCondition[];
  advancedFilterMatchMode?: AdvancedFilterMatchMode;
}) => {
  const { boardId } = getMondayBoardEnv();
  const limit = parseLimit(args.limit);
  const cursorArg = args.cursor?.trim() || undefined;
  const searchArg = args.search?.trim() ?? "";
  const statusArg = args.status?.trim() ?? "";
  const dateFromArg = args.dateFrom;
  const dateToArg = args.dateTo;
  const shouldFilterByDateRange =
    typeof dateFromArg === "string" &&
    dateFromArg.length > 0 &&
    typeof dateToArg === "string" &&
    dateToArg.length > 0;

  const appliedFilters = { date: false, owner: false, status: false };
  const rules: string[] = [];

  if (!cursorArg) {
    try {
      const columnIds = await resolveBoardColumnIds(boardId);
      const dateColumnId = columnIds.dateColumnId ?? API_BOARD_CREATED_AT_COLUMN_ID;
      if (
        shouldFilterByDateRange &&
        /^\d{4}-\d{2}-\d{2}$/.test(dateFromArg!) &&
        /^\d{4}-\d{2}-\d{2}$/.test(dateToArg!) &&
        /^[a-zA-Z0-9_]+$/.test(dateColumnId)
      ) {
        rules.push(`{
          column_id: "${dateColumnId}"
          compare_value: ["${dateFromArg}", "${dateToArg}"]
          operator: between
        }`);
        appliedFilters.date = true;
      }
      if (
        statusArg.length > 0 &&
        columnIds.statusColumnId &&
        /^[a-zA-Z0-9_]+$/.test(columnIds.statusColumnId)
      ) {
        const escapedStatus = JSON.stringify(statusArg);
        rules.push(`{
          column_id: "${columnIds.statusColumnId}"
          compare_value: [${escapedStatus}]
          operator: any_of
        }`);
        appliedFilters.status = true;
      }
      const advancedRules = buildServerAdvancedFilterRules({
        conditions: args.advancedFilterConditions ?? [],
        matchMode: args.advancedFilterMatchMode ?? "all",
        columnIdByNormalizedTitle: columnIds.columnIdByNormalizedTitle,
        columnTypeById: columnIds.columnTypeById,
      });
      rules.push(...advancedRules);
    } catch {
      // Continue without server-side rules.
    }
  }

  const buildListBoardItemsQuery = (includeCursor: boolean, queryRules: string[]) => `
    query ListBoardItems($boardId: ID!, $limit: Int!${
      includeCursor ? ", $cursor: String" : ""
    }) {
      boards(ids: [$boardId]) {
        name
        items_page(
          limit: $limit
          ${includeCursor ? "cursor: $cursor" : ""}
          ${
            queryRules.length > 0
              ? `query_params: { rules: [${queryRules.join("\n")}] }`
              : ""
          }
        ) {
          cursor
          items {
            id
            name
            url
            updated_at
            group { title }
            column_values { id type text value }
          }
        }
      }
    }
  `;

  interface BoardQueryData {
    boards?: {
      name?: string;
      items_page?: { cursor?: string | null; items?: BoardItem[] };
    }[];
  }

  let boardName: string | null = null;
  let nextCursor: string | null = null;
  let firstItems: BoardItem[] = [];

  const isSearchFirstPage = searchArg.length >= 2 && !cursorArg;
  if (isSearchFirstPage) {
    const columnIds = await resolveBoardColumnIds(boardId);
    const emailColumnId = columnIds.emailColumnId ?? "email__1";
    const safeEmailColumnId = /^[a-zA-Z0-9_]+$/.test(emailColumnId)
      ? emailColumnId
      : "email__1";
    const escapedSearch = JSON.stringify(searchArg);
    const nameRules = [
      ...rules,
      `{ column_id: "name", compare_value: [${escapedSearch}], operator: contains_text }`,
    ];
    const emailRules = [
      ...rules,
      `{ column_id: "${safeEmailColumnId}", compare_value: [${escapedSearch}], operator: contains_text }`,
    ];
    const [nameData, emailData] = await Promise.all([
      callMondayGraphQL<BoardQueryData>(
        buildListBoardItemsQuery(false, nameRules),
        { boardId, limit },
      ),
      callMondayGraphQL<BoardQueryData>(
        buildListBoardItemsQuery(false, emailRules),
        { boardId, limit },
      ),
    ]);
    boardName = nameData.boards?.[0]?.name ?? emailData.boards?.[0]?.name ?? null;
    const seenIds = new Set<string>();
    for (const item of [
      ...(nameData.boards?.[0]?.items_page?.items ?? []),
      ...(emailData.boards?.[0]?.items_page?.items ?? []),
    ]) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        firstItems.push(item);
      }
    }
    nextCursor = nameData.boards?.[0]?.items_page?.cursor ?? null;
  } else {
    const data = await callMondayGraphQL<BoardQueryData>(
      buildListBoardItemsQuery(!!cursorArg, cursorArg ? [] : rules),
      {
        boardId,
        limit,
        ...(cursorArg ? { cursor: cursorArg } : {}),
      },
    );
    boardName = data.boards?.[0]?.name ?? null;
    nextCursor = data.boards?.[0]?.items_page?.cursor ?? null;
    firstItems = data.boards?.[0]?.items_page?.items ?? [];
  }

  const columnIds = await resolveBoardColumnIds(boardId);
  const approvalSteps = APPROVAL_STEP_COLUMN_IDS.map((id, index) => ({
    id,
    title: columnIds.columnTitleById[id]?.trim() || `Approval Step ${index + 1}`,
  }));

  const mappedRecords = firstItems.map(boardItemToRecord);
  for (let index = 0; index < mappedRecords.length; index += 1) {
    const record = mappedRecords[index];
    const sourceItem = firstItems[index];
    if (!record || !sourceItem) continue;
    const columns = sourceItem.column_values ?? [];
    for (const column of columns) {
      const columnId = column.id?.trim() ?? "";
      if (!columnId) continue;
      if ((column.type ?? "").trim().toLowerCase() === "creation_log") continue;
      const value = toOptionAwareColumnDisplayValue({
        text: column.text,
        value: column.value,
        optionLabelMap: columnIds.optionLabelMapById[columnId],
      }).trim();
      if (!value) continue;
      const label = columnIds.columnTitleById[columnId]?.trim() || columnId;
      const hasLabelValue = record.contactDetails.some(
        (detail) =>
          detail.label.trim().toLowerCase() === label.toLowerCase() &&
          detail.value.trim().toLowerCase() === value.toLowerCase(),
      );
      if (!hasLabelValue) {
        record.contactDetails.push({ label, value });
      }
    }
    for (const step of approvalSteps) {
      const value = columns
        .find((column) => column.id === step.id)
        ?.text?.trim();
      if (!value) continue;
      const hasLabel = record.contactDetails.some(
        (detail) => detail.label.trim().toLowerCase() === step.title.trim().toLowerCase(),
      );
      if (!hasLabel) {
        record.contactDetails.push({
          label: step.title,
          value,
        });
      }
    }
  }
  if (SHOULD_DEBUG_PROGRESS) {
    const withProgress = mappedRecords.filter(
      (record) => typeof record.batteryProgress === "number",
    ).length;
    console.info("[mondayRecordsNode][progress][summary]", {
      search: searchArg,
      cursor: cursorArg ?? null,
      isSearchFirstPage,
      total: mappedRecords.length,
      withProgress,
      withoutProgress: mappedRecords.length - withProgress,
      sample: mappedRecords.slice(0, 8).map((record) => ({
        id: record.id,
        name: record.name,
        batteryProgress: record.batteryProgress,
        batteryRawValue: truncateForLog(record.batteryRawValue),
      })),
    });
  }

  return {
    records: mappedRecords,
    nextCursor,
    boardName,
    appliedFilters,
    approvalSteps,
  };
};

const filterRecordsClientSide = (
  records: ReturnType<typeof boardItemToRecord>[],
  args: {
    search: string;
    group: string;
    status: string;
    owner: string;
    dateFrom: Date | null;
    dateTo: Date | null;
    appliedFilters?: { date?: boolean; status?: boolean; owner?: boolean };
  },
) => {
  const { search, group, status, owner, dateFrom, dateTo, appliedFilters } = args;
  return records.filter((record) => {
    if (search.length > 0) {
      const haystack = [
        record.name,
        record.id,
        record.groupTitle ?? "",
        record.statusText ?? "",
        record.peopleText ?? "",
        record.email ?? "",
        record.address ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    if (group.length > 0) {
      if ((record.groupTitle ?? "").toLowerCase() !== group) return false;
    }
    if (status.length > 0 && !appliedFilters?.status) {
      if ((record.statusText ?? "").toLowerCase() !== status) return false;
    }
    if (owner.length > 0 && !appliedFilters?.owner) {
      const peopleTextValue = (record.peopleText ?? "").toLowerCase();
      const ownerIds = record.ownerIds.map((id) => id.toLowerCase());
      if (!ownerIds.includes(owner) && peopleTextValue !== owner) return false;
    }
    if ((dateFrom || dateTo) && !appliedFilters?.date) {
      const createdAt = record.createdAt ? new Date(record.createdAt) : null;
      if (!createdAt || Number.isNaN(createdAt.getTime())) return false;
      if (dateFrom && createdAt < dateFrom) return false;
      if (dateTo) {
        const end = new Date(dateTo);
        end.setUTCHours(23, 59, 59, 999);
        if (createdAt > end) return false;
      }
    }
    return true;
  });
};

type AdvancedFilterField =
  | "owner"
  | "district"
  | "name"
  | "email"
  | "phone"
  | "address"
  | "tags"
  | "createdAt"
  | "hireDate"
  | "detail";
type AdvancedFilterOperator =
  | "contains"
  | "equals"
  | "not_equals"
  | "starts_with"
  | "ends_with"
  | "is_empty"
  | "is_not_empty"
  | "on_or_after"
  | "on_or_before"
  | "between";
type AdvancedFilterMatchMode = "all" | "any";
type AdvancedFilterCondition = {
  id: string;
  field: AdvancedFilterField;
  operator: AdvancedFilterOperator;
  value: string;
  valueTo: string;
  target: string;
};

const LEGACY_FIELD_TO_BOARD_COLUMN_LABEL: Partial<
  Record<Exclude<AdvancedFilterField, "detail">, string>
> = {
  owner: "Owner",
  district: "Status",
  name: "Name",
  email: "Email",
  phone: "Phone",
  address: "Address",
  tags: "Tags",
  createdAt: "Date",
  hireDate: "Hire Date",
};

const getBoardColumnTargetForCondition = (condition: AdvancedFilterCondition) => {
  if (condition.field === "detail") return condition.target.trim();
  return LEGACY_FIELD_TO_BOARD_COLUMN_LABEL[condition.field]?.trim() ?? "";
};

const normalizeAdvancedDate = (value: string | null | undefined) => {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return "";
  return new Date(parsed).toISOString().slice(0, 10);
};

const getRecordFieldValuesForCondition = (
  record: ReturnType<typeof boardItemToRecord>,
  condition: AdvancedFilterCondition,
) => {
  const boardColumnTarget = getBoardColumnTargetForCondition(condition);
  if (boardColumnTarget.length > 0) {
    const normalizedTarget = boardColumnTarget.trim().toLowerCase();
    const detailValues = (record.contactDetails ?? [])
      .filter((detail) => detail.label.trim().toLowerCase() === normalizedTarget)
      .flatMap((detail) =>
        detail.value
          .split(",")
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0),
      );
    if (detailValues.length > 0) {
      return detailValues;
    }
    if (normalizedTarget === "owner") {
      const ownerProfileValues = record.ownerIds.map((entry) => entry.trim()).filter(Boolean);
      return [record.peopleText ?? "", ...ownerProfileValues].map((value) => value.trim()).filter(Boolean);
    }
    if (normalizedTarget === "status" || normalizedTarget === "district") {
      return [record.statusText ?? ""].map((value) => value.trim()).filter(Boolean);
    }
    return [];
  }
  return [];
};

const doesRecordMatchAdvancedCondition = (
  record: ReturnType<typeof boardItemToRecord>,
  condition: AdvancedFilterCondition,
) => {
  const values = getRecordFieldValuesForCondition(record, condition);
  const hasValue = values.length > 0;
  if (condition.operator === "is_empty") return !hasValue;
  if (condition.operator === "is_not_empty") return hasValue;

  if (
    condition.operator === "on_or_after" ||
    condition.operator === "on_or_before" ||
    condition.operator === "between"
  ) {
    const target = normalizeAdvancedDate(condition.value);
    const targetTo = normalizeAdvancedDate(condition.valueTo);
    const dateValues = values.map((value) => normalizeAdvancedDate(value)).filter(Boolean);
    if (dateValues.length === 0) return false;
    if (condition.operator === "between") {
      if (!target || !targetTo) return true;
      return dateValues.some((value) => value >= target && value <= targetTo);
    }
    if (condition.operator === "on_or_after") {
      if (!target) return true;
      return dateValues.some((value) => value >= target);
    }
    if (!target) return true;
    return dateValues.some((value) => value <= target);
  }

  const normalizedNeedle = condition.value.trim().toLowerCase();
  if (normalizedNeedle.length === 0) return true;
  const normalizedValues = values.map((value) => value.toLowerCase());
  if (normalizedValues.length === 0) return false;
  switch (condition.operator) {
    case "contains":
      return normalizedValues.some((value) => value.includes(normalizedNeedle));
    case "equals":
      return normalizedValues.some((value) => value === normalizedNeedle);
    case "not_equals":
      return normalizedValues.every((value) => value !== normalizedNeedle);
    case "starts_with":
      return normalizedValues.some((value) => value.startsWith(normalizedNeedle));
    case "ends_with":
      return normalizedValues.some((value) => value.endsWith(normalizedNeedle));
    default:
      return true;
  }
};

const isAdvancedConditionActive = (condition: AdvancedFilterCondition) => {
  const target = getBoardColumnTargetForCondition(condition);
  if (target.length === 0) return false;
  if (condition.operator === "is_empty" || condition.operator === "is_not_empty") return true;
  if (condition.operator === "between") {
    return condition.value.trim().length > 0 && condition.valueTo.trim().length > 0;
  }
  return condition.value.trim().length > 0;
};

const filterRecordsByAdvancedConditions = (
  records: ReturnType<typeof boardItemToRecord>[],
  conditions: AdvancedFilterCondition[],
  matchMode: AdvancedFilterMatchMode,
) => {
  const activeConditions = conditions.filter((condition) => isAdvancedConditionActive(condition));
  if (activeConditions.length === 0) return records;
  if (matchMode === "any") {
    return records.filter((record) =>
      activeConditions.some((condition) => doesRecordMatchAdvancedCondition(record, condition)),
    );
  }
  return records.filter((record) =>
    activeConditions.every((condition) => doesRecordMatchAdvancedCondition(record, condition)),
  );
};

const buildServerAdvancedFilterRules = (args: {
  conditions: AdvancedFilterCondition[];
  matchMode: AdvancedFilterMatchMode;
  columnIdByNormalizedTitle: Record<string, string>;
  columnTypeById: Record<string, string>;
}) => {
  // Monday rules are most reliable for "AND" semantics.
  if (args.matchMode !== "all") return [] as string[];
  const rules: string[] = [];
  for (const condition of args.conditions) {
    if (!isAdvancedConditionActive(condition)) continue;
    const targetLabel = getBoardColumnTargetForCondition(condition).trim();
    if (!targetLabel) continue;
    const columnId = args.columnIdByNormalizedTitle[targetLabel.toLowerCase()] ?? "";
    if (!columnId || !/^[a-zA-Z0-9_]+$/.test(columnId)) continue;
    const normalizedValue = condition.value.trim();
    const columnType = args.columnTypeById[columnId] ?? "";

    if (
      (condition.operator === "contains" || condition.operator === "equals") &&
      normalizedValue.length > 0
    ) {
      const escapedValue = JSON.stringify(normalizedValue);
      const operator =
        condition.operator === "equals" &&
        (columnType === "dropdown" || columnType === "status")
          ? "any_of"
          : "contains_text";
      rules.push(`{
        column_id: "${columnId}"
        compare_value: [${escapedValue}]
        operator: ${operator}
      }`);
      continue;
    }

    if (condition.operator === "is_empty") {
      rules.push(`{
        column_id: "${columnId}"
        compare_value: [""]
        operator: is_empty
      }`);
      continue;
    }
    if (condition.operator === "is_not_empty") {
      rules.push(`{
        column_id: "${columnId}"
        compare_value: [""]
        operator: is_not_empty
      }`);
    }
  }
  return rules;
};

const getMondayRecordEditOptionsImpl = async () => {
  const { boardId } = getMondayBoardEnv();
  interface BoardColumnsData {
    boards?: Array<{
      columns?: Array<{ id?: string | null; settings_str?: string | null }>;
      items_page?: {
        items?: Array<{
          column_values?: Array<{ id?: string | null; text?: string | null }>;
        }>;
      };
    }>;
  }

  const data = await callMondayGraphQL<BoardColumnsData>(
    `query GetRecordEditColumns($boardId: ID!) {
      boards(ids: [$boardId]) {
        columns { id settings_str }
        items_page(limit: 500) {
          items { column_values { id text } }
        }
      }
    }`,
    { boardId },
  );

  const columns = data.boards?.[0]?.columns ?? [];
  const boardItems = data.boards?.[0]?.items_page?.items ?? [];
  const boardColumnIds = await resolveBoardColumnIds(boardId);

  const getLabelsForColumn = (columnId: string) => {
    const column = columns.find((entry) => entry.id === columnId);
    return parseDropdownLabelsFromSettings(column?.settings_str);
  };
  const getSuggestedTextValuesForColumn = (columnId: string) => {
    const values = new Set<string>();
    for (const item of boardItems) {
      const text =
        item.column_values?.find((column) => column.id === columnId)?.text?.trim() ??
        "";
      if (text.length > 0) values.add(text);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  };

  return {
    referredToContractors: getLabelsForColumn(RETENTION_REFERRED_COLUMN_ID),
    hiredWithContractor: getLabelsForColumn(RETENTION_HIRED_WITH_COLUMN_ID),
    retentionPeriod: getLabelsForColumn(RETENTION_PERIOD_COLUMN_ID),
    tags: getLabelsForColumn(TAGS_COLUMN_ID),
    status: boardColumnIds.statusColumnId
      ? getLabelsForColumn(boardColumnIds.statusColumnId)
      : [],
    questionnaireGender: getSuggestedTextValuesForColumn("text95__1"),
    questionnaireEntryLevel: getLabelsForColumn("dropdown__1"),
    questionnaireSkilled: getLabelsForColumn("dropdown7__1"),
    questionnaireEthnicity: getSuggestedTextValuesForColumn("text2__1"),
    questionnaireEducationLevel: getSuggestedTextValuesForColumn("text0__1"),
    questionnaireUsWorkEligible: getLabelsForColumn("dropdown3__1"),
    questionnaireVeteran: getLabelsForColumn("dropdown32__1"),
    questionnaireSecondChance: getLabelsForColumn("dropdown9__1"),
    questionnaireTransportation: getLabelsForColumn("dropdown8__1"),
    questionnaireWorkSchedule: getLabelsForColumn("dropdown0__1"),
    questionnaireCandidateEducation: getSuggestedTextValuesForColumn("text5__1"),
    questionnaireDesiredHourlyWage: getSuggestedTextValuesForColumn("text16__1"),
  };
};

const fetchMondayItemColumnsImpl = async (itemId: string) => {
  interface ItemData {
    items?: Array<{
      id?: string | null;
      name?: string | null;
      board?: { id?: string | null } | null;
      column_values?: Array<{
        id?: string | null;
        type?: string | null;
        text?: string | null;
        value?: string | null;
      }>;
    }>;
  }

  const data = await callMondayGraphQL<ItemData>(
    `query GetItemColumns($itemIds: [ID!]) {
      items(ids: $itemIds) {
        id
        name
        board { id }
        column_values { id type text value }
      }
    }`,
    { itemIds: [itemId] },
  );

  const item = data.items?.[0];
  const boardId = item?.board?.id;
  let boardColumnsById = new Map<
    string,
    { id: string; title: string; type: string; settingsStr: string | null }
  >();
  let columnTitles = new Map<string, string>();

  if (boardId) {
    interface BoardData {
      boards?: Array<{
        columns?: Array<{
          id?: string | null;
          title?: string | null;
          type?: string | null;
          settings_str?: string | null;
        }>;
      }>;
    }
    const boardData = await callMondayGraphQL<BoardData>(
      `query GetBoardColumns($boardId: ID!) {
        boards(ids: [$boardId]) { columns { id title type settings_str } }
      }`,
      { boardId },
    );
    columnTitles = new Map(
      (boardData.boards?.[0]?.columns ?? [])
        .filter((c) => c.id && c.title)
        .map((c) => [c.id!, c.title!]),
    );
    boardColumnsById = new Map(
      (boardData.boards?.[0]?.columns ?? [])
        .filter(
          (column): column is {
            id: string;
            title: string;
            type: string;
            settings_str?: string | null;
          } => Boolean(column.id && column.title && column.type),
        )
        .map((column) => [
          column.id,
          {
            id: column.id,
            title: column.title,
            type: column.type,
            settingsStr: column.settings_str ?? null,
          },
        ]),
    );
  }

  const columns = (item?.column_values ?? [])
    .filter((col) => col.id)
    .map((col) => {
      const resolvedColumn = boardColumnsById.get(col.id!);
      const type = (col.type ?? resolvedColumn?.type ?? "unknown").trim();
      const normalizedType = type.toLowerCase();
      const options =
        normalizedType === "status" || normalizedType === "dropdown"
          ? parseDropdownLabelsFromSettings(resolvedColumn?.settingsStr)
          : [];
      const isEditable =
        CONTACT_EDITABLE_COLUMN_TYPES.has(normalizedType) &&
        (normalizedType !== "status" && normalizedType !== "dropdown"
          ? true
          : options.length > 0);
      return {
        id: col.id!,
        title: columnTitles.get(col.id!) ?? col.id!,
        type,
        text: col.text?.trim() || null,
        value: col.value ?? null,
        options,
        isEditable,
      };
    });

  return {
    itemId: item?.id ?? itemId,
    itemName: item?.name ?? null,
    columns,
  };
};

const updateMondayRecordFieldsImpl = async (args: {
  itemId: string;
  referredToContractors?: string[] | string | null;
  interviewingWithContractors?: string[] | string | null;
  hiredWithContractor?: string | null;
  hireDate?: string | null;
  lastInteractionDate?: string | null;
  retentionPeriod?: string | null;
  tags?: string[] | null;
  status?: string | null;
  ownerId?: string | null;
}) => {
  const { boardId } = getMondayBoardEnv();
  const itemId = args.itemId.trim();
  if (!itemId) throw new Error("Missing itemId");

  const boardColumnIds = await resolveBoardColumnIds(boardId);
  const columnValues: Record<string, unknown> = {};

  if (args.referredToContractors !== undefined) {
    const valuesRaw = Array.isArray(args.referredToContractors)
      ? args.referredToContractors
      : splitCsvValues(args.referredToContractors);
    const labels = valuesRaw.map((v) => v.trim()).filter((v) => v.length > 0);
    columnValues[RETENTION_REFERRED_COLUMN_ID] =
      labels.length > 0 ? { labels } : null;
  }
  if (args.interviewingWithContractors !== undefined) {
    const valuesRaw = Array.isArray(args.interviewingWithContractors)
      ? args.interviewingWithContractors
      : splitCsvValues(args.interviewingWithContractors);
    const labels = valuesRaw.map((v) => v.trim()).filter((v) => v.length > 0);
    columnValues[RETENTION_INTERVIEWING_WITH_COLUMN_ID] =
      labels.length > 0 ? { labels } : null;
  }
  if (args.hiredWithContractor !== undefined) {
    const value = args.hiredWithContractor?.trim() ?? "";
    columnValues[RETENTION_HIRED_WITH_COLUMN_ID] = value
      ? { labels: [value] }
      : null;
  }
  if (args.hireDate !== undefined) {
    const dateOnly = normalizeDateOnlyValue(args.hireDate);
    columnValues[RETENTION_HIRE_DATE_COLUMN_ID] = dateOnly
      ? { date: dateOnly }
      : null;
  }
  if (args.lastInteractionDate !== undefined) {
    const dateOnly = normalizeDateOnlyValue(args.lastInteractionDate);
    columnValues[LAST_INTERACTION_DATE_COLUMN_ID] = dateOnly
      ? { date: dateOnly }
      : null;
  }
  if (args.retentionPeriod !== undefined) {
    const value = args.retentionPeriod?.trim() ?? "";
    columnValues[RETENTION_PERIOD_COLUMN_ID] = value
      ? { labels: [value] }
      : null;
  }
  if (args.tags !== undefined) {
    const labels = (args.tags ?? [])
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    columnValues[TAGS_COLUMN_ID] = labels.length > 0 ? { labels } : null;
  }
  if (args.status !== undefined) {
    if (!boardColumnIds.statusColumnId) {
      throw new Error("Status column not found on Monday board");
    }
    const value = args.status?.trim() ?? "";
    columnValues[boardColumnIds.statusColumnId] = value
      ? { label: value }
      : null;
  }
  if (args.ownerId !== undefined) {
    if (!boardColumnIds.peopleColumnId) {
      throw new Error("Owner people column not found on Monday board");
    }
    const ownerIdRaw = args.ownerId?.trim() ?? "";
    if (!ownerIdRaw) {
      columnValues[boardColumnIds.peopleColumnId] = null;
    } else {
      const ownerAsNumber = Number(ownerIdRaw);
      columnValues[boardColumnIds.peopleColumnId] = {
        personsAndTeams: [
          {
            id: Number.isFinite(ownerAsNumber) ? ownerAsNumber : ownerIdRaw,
            kind: "person",
          },
        ],
      };
    }
  }

  if (Object.keys(columnValues).length === 0) {
    throw new Error("No update fields provided");
  }

  await callMondayGraphQL<{ change_multiple_column_values?: { id?: string } }>(
    `mutation UpdateMondayItemColumns($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
      change_multiple_column_values(
        board_id: $boardId
        item_id: $itemId
        column_values: $columnValues
        create_labels_if_missing: true
      ) { id }
    }`,
    { boardId, itemId, columnValues: JSON.stringify(columnValues) },
  );
};

const updateMondayRecordColumnValueImpl = async (args: {
  itemId: string;
  columnId: string;
  columnType: string;
  value: string | null;
}) => {
  const { boardId } = getMondayBoardEnv();
  const itemId = args.itemId.trim();
  const columnId = args.columnId.trim();
  const columnType = args.columnType.trim().toLowerCase();
  const rawValue = args.value?.trim() ?? "";
  const normalizedValue = rawValue.length > 0 ? rawValue : null;

  if (!itemId) throw new Error("Missing itemId");
  if (!columnId) throw new Error("Missing columnId");
  if (!/^[a-zA-Z0-9_]+$/.test(columnId)) throw new Error("Invalid columnId");
  if (!CONTACT_EDITABLE_COLUMN_TYPES.has(columnType)) {
    throw new Error(`Column type "${columnType}" is not editable`);
  }

  const columnValues: Record<string, unknown> = {};

  if (columnType === "status" || columnType === "dropdown") {
    interface BoardColumnsData {
      boards?: Array<{
        columns?: Array<{
          id?: string | null;
          settings_str?: string | null;
        }>;
      }>;
    }
    const boardData = await callMondayGraphQL<BoardColumnsData>(
      `query ResolveBoardColumn($boardId: ID!) {
        boards(ids: [$boardId]) { columns { id settings_str } }
      }`,
      { boardId },
    );
    const matchedColumn = (boardData.boards?.[0]?.columns ?? []).find(
      (column) => column.id === columnId,
    );
    if (!matchedColumn) {
      throw new Error("Column does not exist on the main API board");
    }
    const allowedLabels = parseDropdownLabelsFromSettings(
      matchedColumn.settings_str ?? null,
    );
    if (columnType === "status") {
      if (normalizedValue && allowedLabels.length === 0) {
        throw new Error("No predefined options are available for this column");
      }
      if (
        normalizedValue &&
        !allowedLabels.some(
          (label) => label.toLowerCase() === normalizedValue.toLowerCase(),
        )
      ) {
        throw new Error("Value must match one of the predefined options");
      }
      const canonicalValue =
        normalizedValue == null
          ? null
          : (allowedLabels.find(
              (label) => label.toLowerCase() === normalizedValue.toLowerCase(),
            ) ?? normalizedValue);
      columnValues[columnId] = canonicalValue ? { label: canonicalValue } : null;
    } else {
      const selectedLabels =
        normalizedValue == null
          ? []
          : Array.from(
              new Set(
                normalizedValue
                  .split(",")
                  .map((entry) => entry.trim())
                  .filter((entry) => entry.length > 0),
              ),
            );
      if (selectedLabels.length > 0 && allowedLabels.length === 0) {
        throw new Error("No predefined options are available for this column");
      }
      const invalidLabel = selectedLabels.find(
        (selectedLabel) =>
          !allowedLabels.some(
            (allowedLabel) =>
              allowedLabel.toLowerCase() === selectedLabel.toLowerCase(),
          ),
      );
      if (invalidLabel) {
        throw new Error(`Value "${invalidLabel}" must match one of the predefined options`);
      }
      const canonicalLabels = selectedLabels.map(
        (selectedLabel) =>
          allowedLabels.find(
            (allowedLabel) =>
              allowedLabel.toLowerCase() === selectedLabel.toLowerCase(),
          ) ?? selectedLabel,
      );
      columnValues[columnId] =
        canonicalLabels.length > 0 ? { labels: canonicalLabels } : null;
    }
  } else if (columnType === "date") {
    const dateOnly = normalizeDateOnlyValue(normalizedValue);
    if (normalizedValue && !dateOnly) {
      throw new Error("Date must be in YYYY-MM-DD format");
    }
    columnValues[columnId] = dateOnly ? { date: dateOnly } : null;
  } else if (columnType === "numbers" || columnType === "numeric") {
    if (!normalizedValue) {
      columnValues[columnId] = null;
    } else {
      const numericValue = Number(normalizedValue);
      if (!Number.isFinite(numericValue)) {
        throw new Error("Numbers columns require a valid numeric value");
      }
      columnValues[columnId] = numericValue;
    }
  } else if (columnType === "long_text" || columnType === "long-text") {
    columnValues[columnId] = normalizedValue ? { text: normalizedValue } : null;
  } else {
    columnValues[columnId] = normalizedValue ?? null;
  }

  await callMondayGraphQL<{ change_multiple_column_values?: { id?: string } }>(
    `mutation UpdateMondayItemColumnValue($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
      change_multiple_column_values(
        board_id: $boardId
        item_id: $itemId
        column_values: $columnValues
        create_labels_if_missing: false
      ) { id }
    }`,
    { boardId, itemId, columnValues: JSON.stringify(columnValues) },
  );
};

const listMondayRecordUpdatesImpl = async (args: {
  itemId: string;
  limit?: number;
}) => {
  const itemId = args.itemId.trim();
  if (!itemId) throw new Error("Missing monday item id");

  const limit = Math.min(Math.max(args.limit ?? 100, 1), 200);
  const typeColId = SUBITEM_TYPE_COLUMN_ID;
  const methodColId = SUBITEM_METHOD_COLUMN_ID;
  const dateColId = SUBITEM_DATE_COLUMN_ID;
  const personColId = SUBITEM_PERSON_COLUMN_ID;
  const intentColId = SUBITEM_INTENT_COLUMN_ID;
  const notesColId = SUBITEM_NOTES_COLUMN_ID;

  interface MondayItemUpdatesData {
    items?: Array<{
      id?: string | null;
      name?: string | null;
      updates?: Array<{
        id?: string | null;
        body?: string | null;
        created_at?: string | null;
        updated_at?: string | null;
        creator?: { id?: string | null; name?: string | null } | null;
      }>;
      subitems?: Array<{
        id?: string | null;
        name?: string | null;
        created_at?: string | null;
        column_values?: Array<{
          id?: string | null;
          text?: string | null;
          value?: string | null;
        }>;
        updates?: Array<{
          id?: string | null;
          body?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          creator?: { id?: string | null; name?: string | null } | null;
        }>;
      }>;
    }>;
  }

  const data = await callMondayGraphQL<MondayItemUpdatesData>(
    `query GetMondayItemUpdates($itemIds: [ID!], $limit: Int!) {
      items(ids: $itemIds) {
        id
        name
        updates(limit: $limit) {
          id body created_at updated_at
          creator { id name }
        }
        subitems {
          id name created_at
          column_values(ids: ["${typeColId}", "${methodColId}", "${dateColId}", "${personColId}", "${intentColId}", "${notesColId}"]) {
            id text value
          }
          updates(limit: $limit) {
            id body created_at updated_at
            creator { id name }
          }
        }
      }
    }`,
    { itemIds: [itemId], limit },
  );

  const item = data.items?.[0];
  const toSortableTime = (value: string | null | undefined) => {
    if (!value) return 0;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const deriveUpdateTypeFromSubitemName = (subitemName: string | null | undefined) => {
    const normalized = (subitemName ?? "").trim().toLowerCase().replaceAll(/\s+/g, " ");
    if (normalized.includes("merge") || normalized.includes("dedup")) return "merge";
    if (normalized.includes("job referral") || normalized.startsWith("referral -")) {
      return "job_referral";
    }
    if (normalized.includes("resume referral")) return "resume_referral";
    if (normalized.includes("question")) return "questionnaire";
    if (normalized.includes("welcome")) return "welcome_email";
    if (
      normalized.includes("questionnaire sent") ||
      normalized.includes("follow-up") ||
      normalized.includes("follow up") ||
      normalized.includes("followup")
    ) {
      return "followup";
    }
    if (normalized.includes("resume")) return "resume";
    return "general";
  };

  const deriveUpdateTypeFromColumnValue = (columnText: string | null | undefined) => {
    const normalized = (columnText ?? "").trim().toLowerCase();
    if (!normalized) return null;
    for (const [type, label] of Object.entries(SUBITEM_TYPE_LABEL_BY_UPDATE_TYPE)) {
      if (normalized === label.toLowerCase()) return type;
    }
    return null;
  };

  const readSubitemNotes = (
    value: string | null | undefined,
    text: string | null | undefined,
  ) => {
    if (value) {
      try {
        const parsed = JSON.parse(value) as { text?: string };
        if (typeof parsed.text === "string" && parsed.text.trim().length > 0) {
          return parsed.text;
        }
      } catch {
        // ignore
      }
    }
    return typeof text === "string" && text.trim().length > 0 ? text : null;
  };

  type RecordUpdateRow = {
    id: string;
    body: string;
    updateType: string;
    source: "item" | "subitem";
    subitemId: string | null;
    subitemName: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    creatorId: string | null;
    creatorName: string | null;
  };

  const parentUpdates: RecordUpdateRow[] = [];
  for (const update of item?.updates ?? []) {
    const updateId = update.id?.trim() ?? "";
    if (!updateId) continue;
    parentUpdates.push({
      id: updateId,
      body: update.body ?? "",
      updateType: "general",
      source: "item",
      subitemId: null,
      subitemName: null,
      createdAt: update.created_at ?? null,
      updatedAt: update.updated_at ?? null,
      creatorId: update.creator?.id ?? null,
      creatorName: update.creator?.name ?? null,
    });
  }

  const subitemUpdates: RecordUpdateRow[] = [];
  const subitems: Array<{
    id: string;
    name: string;
    typeLabel: string | null;
    updateType: string;
    intent: "internal_note" | "conversation" | "campaign";
    methodOfCommunication: string | null;
    createdAt: string | null;
    creatorUserId: string | null;
    creatorProfile: {
      id: string;
      name: string | null;
      photoThumb: string | null;
    } | null;
    updates: Array<{
      id: string;
      body: string;
      createdAt: string | null;
      updatedAt: string | null;
      creatorId: string | null;
      creatorName: string | null;
    }>;
  }> = [];

  for (const subitem of item?.subitems ?? []) {
    const subitemId = subitem.id?.trim() ?? "";
    const subitemName = subitem.name?.trim() ?? null;
    const typeColText =
      subitem.column_values?.find((c) => c.id === typeColId)?.text ?? null;
    const methodText =
      subitem.column_values?.find((c) => c.id === methodColId)?.text?.trim() ??
      null;
    const personValue =
      subitem.column_values?.find((c) => c.id === personColId)?.value ?? null;
    const intentText = subitem.column_values?.find((c) => c.id === intentColId)?.text ?? null;
    const dateCol = subitem.column_values?.find((c) => c.id === dateColId);
    const notesCol = subitem.column_values?.find((c) => c.id === notesColId);
    const subitemNotes = readSubitemNotes(notesCol?.value, notesCol?.text);
    const subitemDisplayName = subitemNotes ?? subitemName;
    let subitemCreatedAt: string | null = subitem.created_at ?? null;
    if (dateCol?.value) {
      try {
        const parsed = JSON.parse(dateCol.value) as { date?: string; time?: string };
        if (parsed.date && parsed.time) {
          subitemCreatedAt = `${parsed.date}T${parsed.time}Z`;
        } else if (parsed.date) {
          subitemCreatedAt = `${parsed.date}T00:00:00Z`;
        }
      } catch {
        // ignore
      }
    }
    const updateType =
      deriveUpdateTypeFromColumnValue(typeColText) ??
      deriveUpdateTypeFromColumnValue(methodText) ??
      deriveUpdateTypeFromSubitemName(subitemName);
    let creatorUserId: string | null = null;
    if (personValue) {
      try {
        const parsed = JSON.parse(personValue) as {
          personsAndTeams?: Array<{ id?: number | string; kind?: string }>;
        };
        const firstPersonId = (parsed.personsAndTeams ?? []).find(
          (entry) => entry.kind === "person" && entry.id != null,
        )?.id;
        creatorUserId =
          firstPersonId == null ? null : String(firstPersonId).trim() || null;
      } catch {
        creatorUserId = null;
      }
    }

    const subitemUpdateList: (typeof subitems)[number]["updates"] = [];
    for (const update of subitem.updates ?? []) {
      const updateId = update.id?.trim() ?? "";
      if (!updateId) continue;
      subitemUpdates.push({
        id: updateId,
        body: update.body ?? "",
        updateType,
        source: "subitem",
        subitemId: subitemId || null,
        subitemName: subitemDisplayName,
        createdAt: update.created_at ?? null,
        updatedAt: update.updated_at ?? null,
        creatorId: update.creator?.id ?? null,
        creatorName: update.creator?.name ?? null,
      });
      subitemUpdateList.push({
        id: updateId,
        body: update.body ?? "",
        createdAt: update.created_at ?? null,
        updatedAt: update.updated_at ?? null,
        creatorId: update.creator?.id ?? null,
        creatorName: update.creator?.name ?? null,
      });
    }

    if (subitemId) {
      subitems.push({
        id: subitemId,
        name: subitemDisplayName ?? `Subitem ${subitemId}`,
        typeLabel: typeColText ?? methodText,
        updateType,
        intent: normalizeIntentLabel(intentText),
        methodOfCommunication: methodText,
        createdAt: subitemCreatedAt,
        creatorUserId,
        creatorProfile: null,
        updates: subitemUpdateList.sort(
          (a, b) => toSortableTime(b.createdAt) - toSortableTime(a.createdAt),
        ),
      });
    }
  }

  const updates = [...parentUpdates, ...subitemUpdates]
    .sort((a, b) => {
      const aTime = Math.max(toSortableTime(a.createdAt), toSortableTime(a.updatedAt));
      const bTime = Math.max(toSortableTime(b.createdAt), toSortableTime(b.updatedAt));
      return bTime - aTime;
    })
    .slice(0, limit);

  subitems.sort((a, b) => toSortableTime(b.createdAt) - toSortableTime(a.createdAt));

  return {
    itemId: item?.id ?? itemId,
    itemName: item?.name ?? null,
    updates,
    subitems,
  };
};

const createMondayRecordUpdateImpl = async (args: {
  itemId: string;
  body: string;
  updateType?: MondayUpdateType;
  intent?: "internal_note" | "conversation" | "campaign";
  date?: string;
  dateTime?: string;
  methodOfCommunication?: string;
  actorMondayUserId?: string | null;
  internalExternalStatus?: "Internal" | "External";
  subitemNameOverride?: string;
  suppressApprovalStepMarking?: boolean;
}) => {
  const { boardId } = getMondayBoardEnv();
  const itemId = args.itemId.trim();
  const body = args.body.trim();
  if (!itemId) throw new Error("Missing monday item id");
  if (!body) throw new Error("Update body cannot be empty");

  const requestedUpdateType = args.updateType ?? "general";
  const intent = args.intent ?? "conversation";
  const updateType: MondayUpdateType = isMondayUpdateType(requestedUpdateType)
    ? requestedUpdateType
    : "general";
  const suppressApprovalStepMarking = args.suppressApprovalStepMarking === true;

  const subitemTypeLabel = SUBITEM_TYPE_LABEL_BY_UPDATE_TYPE[updateType];
  const subitemNameOverride = args.subitemNameOverride?.trim();
  const baseSubitemName =
    subitemNameOverride && subitemNameOverride.length > 0
      ? subitemNameOverride
      : updateType === "general"
        ? body
        : SUBITEM_NAME_BY_UPDATE_TYPE[updateType];
  const subitemName = buildSubitemName(baseSubitemName, "General Update");
  const methodOfCommunication = args.methodOfCommunication?.trim();
  const normalizedDateTime = args.dateTime?.trim();
  const parsedDateTime = normalizedDateTime ? new Date(normalizedDateTime) : null;
  const hasValidDateTime =
    !!parsedDateTime && !Number.isNaN(parsedDateTime.getTime());
  const fallbackNow = new Date();
  const normalizedDate = args.date?.trim();
  const interactionDateOnly = hasValidDateTime
    ? parsedDateTime!.toISOString().slice(0, 10)
    : normalizeDateOnlyValue(normalizedDate) ||
      fallbackNow.toISOString().slice(0, 10);
  const normalizedActorMondayUserId =
    args.actorMondayUserId == null ? "" : String(args.actorMondayUserId).trim();
  const normalizedInternalExternalStatus = args.internalExternalStatus?.trim();

  const columnValues: Record<string, unknown> = {
    [SUBITEM_TYPE_COLUMN_ID]: { label: subitemTypeLabel },
    ...(hasValidDateTime
      ? {
          [SUBITEM_DATE_COLUMN_ID]: {
            date: parsedDateTime!.toISOString().slice(0, 10),
            time: parsedDateTime!.toISOString().slice(11, 19),
          },
        }
      : normalizedDate
        ? { [SUBITEM_DATE_COLUMN_ID]: { date: normalizedDate } }
        : {
            [SUBITEM_DATE_COLUMN_ID]: {
              date: fallbackNow.toISOString().slice(0, 10),
              time: fallbackNow.toISOString().slice(11, 19),
            },
          }),
    ...(methodOfCommunication
      ? { [SUBITEM_METHOD_COLUMN_ID]: { label: methodOfCommunication } }
      : {}),
    ...(normalizedInternalExternalStatus
      ? {
          [SUBITEM_INTERNAL_EXTERNAL_COLUMN_ID]: {
            label: normalizedInternalExternalStatus,
          },
        }
      : {}),
    [SUBITEM_INTENT_COLUMN_ID]: { label: intent },
    [SUBITEM_NOTES_COLUMN_ID]: { text: body },
    ...(/^\d+$/.test(normalizedActorMondayUserId)
      ? {
          [SUBITEM_PERSON_COLUMN_ID]: {
            personsAndTeams: [
              { id: Number(normalizedActorMondayUserId), kind: "person" },
            ],
          },
        }
      : {}),
  };

  const createdSubitemData = await callMondayGraphQL<{
    create_subitem?: { id?: string | null } | null;
  }>(
    `mutation CreateSubitem($parentItemId: ID!, $itemName: String!, $columnValues: JSON!) {
      create_subitem(
        parent_item_id: $parentItemId
        item_name: $itemName
        column_values: $columnValues
        create_labels_if_missing: true
      ) { id }
    }`,
    {
      parentItemId: itemId,
      itemName: subitemName,
      columnValues: JSON.stringify(columnValues),
    },
  );

  const targetSubitemId = createdSubitemData.create_subitem?.id?.trim() ?? "";
  if (!targetSubitemId) {
    throw new Error("Failed to create subitem for update");
  }

  let lastInteractionWarning: string | null = null;
  try {
    await updateMondayRecordFieldsImpl({
      itemId,
      lastInteractionDate: interactionDateOnly,
    });
  } catch (error) {
    lastInteractionWarning =
      error instanceof Error
        ? error.message
        : "Failed to sync last interaction date";
  }

  let approvalStepMarked = false;
  let approvalStepWarning: string | null = null;
  let stepColumnId: string | null = null;
  if (!suppressApprovalStepMarking && updateType !== "general") {
    stepColumnId = APPROVAL_STEP_COLUMN_ID_BY_UPDATE_TYPE[updateType] ?? null;
    if (stepColumnId) {
      try {
        await callMondayGraphQL<{ change_multiple_column_values?: { id?: string } }>(
          `mutation MarkApprovalStepDone($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
            change_multiple_column_values(
              board_id: $boardId
              item_id: $itemId
              column_values: $columnValues
              create_labels_if_missing: true
            ) { id }
          }`,
          {
            boardId,
            itemId,
            columnValues: JSON.stringify({
              [stepColumnId]: { label: "Done" },
            }),
          },
        );
        approvalStepMarked = true;
      } catch (error) {
        approvalStepWarning =
          error instanceof Error
            ? error.message
            : "Failed to mark onboarding step done";
      }
    }
  }

  const warning = [approvalStepWarning, lastInteractionWarning]
    .filter((value): value is string => !!value && value.trim().length > 0)
    .join(" | ") || null;

  return {
    id: targetSubitemId,
    body,
    updateType,
    source: "subitem" as const,
    subitemName,
    approvalStepMarked,
    warning,
  };
};

// ---------------------------------------------------------------------------
// Public actions (session auth via mondayAction)
// ---------------------------------------------------------------------------

/** GET /api/monday/records — paginated board record listing */
export const listRecords = mondayAction({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
    search: v.optional(v.string()),
    group: v.optional(v.string()),
    status: v.optional(v.string()),
    owner: v.optional(v.string()),
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
    advancedFilterConditions: v.optional(v.array(advancedFilterConditionValidator)),
    advancedFilterMatchMode: v.optional(advancedFilterMatchModeValidator),
  },
  returns: v.object({
    boardName: v.union(v.string(), v.null()),
    records: v.array(mondayRecordValidator),
    nextCursor: v.union(v.string(), v.null()),
    approvalSteps: v.array(approvalStepValidator),
    appliedFilters: v.object({
      date: v.boolean(),
      owner: v.boolean(),
      status: v.boolean(),
    }),
  }),
  handler: async (_ctx, _identity: MondaySessionIdentity, args) => {
    const search = args.search?.trim().toLowerCase() ?? "";
    const group = args.group?.trim().toLowerCase() ?? "";
    const status = args.status?.trim().toLowerCase() ?? "";
    const owner = args.owner?.trim().toLowerCase() ?? "";
    const dateFrom = parseIsoDateOnly(args.dateFrom);
    const dateTo = parseIsoDateOnly(args.dateTo);
    const advancedFilterConditions = args.advancedFilterConditions ?? [];
    const advancedFilterMatchMode = args.advancedFilterMatchMode ?? "all";

    const result = await listMondayBoardRecordsImpl({
      cursor: args.cursor,
      limit: args.limit,
      search: search || undefined,
      dateFrom: dateFrom ? dateFrom.toISOString().slice(0, 10) : undefined,
      dateTo: dateTo ? dateTo.toISOString().slice(0, 10) : undefined,
      owner: owner || undefined,
      status: status || undefined,
      advancedFilterConditions,
      advancedFilterMatchMode,
    });

    const clientFiltered = filterRecordsClientSide(result.records, {
      search,
      group,
      status,
      owner,
      dateFrom,
      dateTo,
      appliedFilters: result.appliedFilters,
    });
    const filtered = filterRecordsByAdvancedConditions(
      clientFiltered,
      advancedFilterConditions,
      advancedFilterMatchMode,
    );

    return {
      boardName: result.boardName,
      records: filtered,
      nextCursor: result.nextCursor,
      approvalSteps: result.approvalSteps,
      appliedFilters: result.appliedFilters,
    };
  },
});

/** GET /api/monday/records/edit-options */
export const getEditOptions = mondayAction({
  args: {},
  returns: v.object({ options: editOptionsValidator }),
  handler: async (_ctx, _identity) => {
    const options = await getMondayRecordEditOptionsImpl();
    return { options };
  },
});

/** GET /api/monday/records/[itemId] */
export const getRecordColumns = mondayAction({
  args: { itemId: v.string() },
  returns: v.object({
    itemId: v.string(),
    itemName: v.union(v.string(), v.null()),
    columns: v.array(recordColumnValidator),
  }),
  handler: async (_ctx, _identity, args) => {
    const itemId = args.itemId.trim();
    if (!itemId) throw new Error("Missing monday item id");
    return fetchMondayItemColumnsImpl(itemId);
  },
});

/** PATCH /api/monday/records/[itemId] */
export const patchRecord = mondayAction({
  args: {
    itemId: v.string(),
    referredToContractors: v.optional(v.union(v.array(v.string()), v.string(), v.null())),
    interviewingWithContractors: v.optional(
      v.union(v.array(v.string()), v.string(), v.null()),
    ),
    hiredWithContractor: v.optional(v.union(v.string(), v.null())),
    hireDate: v.optional(v.union(v.string(), v.null())),
    lastInteractionDate: v.optional(v.union(v.string(), v.null())),
    retentionPeriod: v.optional(v.union(v.string(), v.null())),
    tags: v.optional(v.union(v.array(v.string()), v.null())),
    status: v.optional(v.union(v.string(), v.null())),
    ownerId: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.object({
    hireEvent: v.union(
      v.null(),
      v.object({
        id: v.union(v.string(), v.null()),
        upserted: v.union(v.literal("created"), v.literal("skipped")),
      }),
    ),
    warning: v.union(v.string(), v.null()),
  }),
  handler: async (_ctx, _identity, args) => {
    const itemId = args.itemId.trim();
    if (!itemId) throw new Error("Missing monday item id");

    const updateArgs: Parameters<typeof updateMondayRecordFieldsImpl>[0] = {
      itemId,
    };
    if (args.referredToContractors !== undefined) {
      updateArgs.referredToContractors = args.referredToContractors;
    }
    if (args.interviewingWithContractors !== undefined) {
      updateArgs.interviewingWithContractors = args.interviewingWithContractors;
    }
    if (args.hiredWithContractor !== undefined) {
      updateArgs.hiredWithContractor = args.hiredWithContractor;
    }
    if (args.hireDate !== undefined) updateArgs.hireDate = args.hireDate;
    if (args.lastInteractionDate !== undefined) {
      updateArgs.lastInteractionDate = args.lastInteractionDate;
    }
    if (args.retentionPeriod !== undefined) {
      updateArgs.retentionPeriod = args.retentionPeriod;
    }
    if (args.tags !== undefined) updateArgs.tags = args.tags ?? undefined;
    if (args.status !== undefined) updateArgs.status = args.status;
    if (args.ownerId !== undefined) updateArgs.ownerId = args.ownerId;

    await updateMondayRecordFieldsImpl(updateArgs);

    // Hire-event subitem capture (upsertMondayHireEventSubitem) is not ported yet.
    return { hireEvent: null, warning: null };
  },
});

/** PATCH /api/monday/records/[itemId]/columns */
export const patchRecordColumn = mondayAction({
  args: {
    itemId: v.string(),
    columnId: v.string(),
    columnType: v.string(),
    value: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.object({
    itemId: v.string(),
    columnId: v.string(),
    columnType: v.string(),
  }),
  handler: async (_ctx, _identity, args) => {
    const itemId = args.itemId.trim();
    const columnId = args.columnId.trim();
    const columnType = args.columnType.trim();
    if (!itemId) throw new Error("Missing monday item id");
    if (!columnId) throw new Error("Missing columnId");
    if (!columnType) throw new Error("Missing columnType");

    await updateMondayRecordColumnValueImpl({
      itemId,
      columnId,
      columnType,
      value: typeof args.value === "string" ? args.value : null,
    });

    return { itemId, columnId, columnType };
  },
});

/** GET /api/monday/records/[itemId]/updates */
export const listRecordUpdates = mondayAction({
  args: {
    itemId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    itemId: v.string(),
    itemName: v.union(v.string(), v.null()),
    updates: v.array(mondayRecordUpdateValidator),
    subitems: v.array(subitemEntryValidator),
  }),
  handler: async (_ctx, _identity, args) => {
    return listMondayRecordUpdatesImpl({
      itemId: args.itemId,
      limit: args.limit,
    });
  },
});

/** POST /api/monday/records/[itemId]/updates */
export const createRecordUpdate = mondayAction({
  args: {
    itemId: v.string(),
    body: v.string(),
    updateType: v.optional(mondayUpdateTypeValidator),
    intent: v.optional(mondayUpdateIntentValidator),
    date: v.optional(v.string()),
    dateTime: v.optional(v.string()),
    methodOfCommunication: v.optional(v.string()),
    internalExternalStatus: v.optional(
      v.union(v.literal("Internal"), v.literal("External")),
    ),
    subitemNameOverride: v.optional(v.string()),
    suppressApprovalStepMarking: v.optional(v.boolean()),
  },
  returns: v.object({
    update: v.object({
      id: v.string(),
      body: v.string(),
      updateType: v.string(),
      source: v.literal("subitem"),
      subitemName: v.string(),
      approvalStepMarked: v.boolean(),
      warning: v.union(v.string(), v.null()),
    }),
  }),
  handler: async (_ctx, identity, args) => {
    const result = await createMondayRecordUpdateImpl({
      itemId: args.itemId,
      body: args.body,
      updateType: args.updateType,
      intent: args.intent,
      date: args.date,
      dateTime: args.dateTime,
      methodOfCommunication: args.methodOfCommunication,
      actorMondayUserId: identity.userId,
      internalExternalStatus: args.internalExternalStatus,
      subitemNameOverride: args.subitemNameOverride,
      suppressApprovalStepMarking: args.suppressApprovalStepMarking === true,
    });
    return {
      update: {
        id: result.id,
        body: result.body,
        updateType: result.updateType,
        source: result.source,
        subitemName: result.subitemName,
        approvalStepMarked: result.approvalStepMarked,
        warning: result.warning,
      },
    };
  },
});

/** POST /api/monday/records/[itemId]/reset-step */
export const resetApprovalStep = mondayAction({
  args: {
    itemId: v.string(),
    stepColumnId: v.string(),
    action: v.optional(
      v.union(v.literal("reset"), v.literal("done"), v.literal("skipped")),
    ),
  },
  returns: v.null(),
  handler: async (_ctx, _identity, args) => {
    const { boardId } = getMondayBoardEnv();
    const itemId = args.itemId.trim();
    const stepColumnId = args.stepColumnId.trim();
    if (!itemId) throw new Error("Missing monday item id");
    if (!stepColumnId || !VALID_STEP_COLUMN_IDS.has(stepColumnId)) {
      throw new Error("Invalid stepColumnId");
    }

    const action = args.action ?? "reset";
    const label =
      action === "done" ? "Done" : action === "skipped" ? "Skipped" : "";

    await callMondayGraphQL<{ change_multiple_column_values?: { id?: string } }>(
      `mutation ResetApprovalStep($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
        change_multiple_column_values(
          board_id: $boardId
          item_id: $itemId
          column_values: $columnValues
          create_labels_if_missing: true
        ) { id }
      }`,
      {
        boardId,
        itemId,
        columnValues: JSON.stringify({ [stepColumnId]: { label } }),
      },
    );
    return null;
  },
});
