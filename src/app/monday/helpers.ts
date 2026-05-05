import type {
  AdvancedFilterCondition,
  AdvancedFilterField,
  AdvancedFilterMatchMode,
  AdvancedFilterOperator,
  ApprovalStepConfig,
  KanbanColumn,
  MockBusinessInfo,
  MondayRecord,
  SavedAdvancedFilterPreset,
  UserBoardColorTheme,
  UserBoardFontSize,
  UserBoardGeneralSettings,
} from "./types";
import {
  DEFAULT_USER_BOARD_GENERAL_SETTINGS,
  isUserBoardColorTheme,
  isUserBoardDisplayMode,
  isUserBoardFontSize,
  isUserBoardPageSize,
  isUserBoardRecordSource,
  isUserBoardTableDensity,
} from "./constants";

// --- Formatting / string helpers ---

export const formatUpdatedAt = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export const hasHtmlLikeMarkup = (value: string) => /<[a-z][\s\S]*>/i.test(value);

export const getNameInitials = (name: string) => {
  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (parts.length === 0) return "?";
  const first = parts[0] ?? "";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const second = parts[1] ?? "";
  return `${first[0] ?? ""}${second[0] ?? ""}`.toUpperCase();
};

export const getAddressDisplayParts = (address: string | null | undefined) => {
  if (!address) {
    return {
      prefix: null,
      cityStateZip: null,
      full: null,
      streetLine: null,
      localityLine: null,
    };
  }
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (parts.length === 0) {
    return {
      prefix: null,
      cityStateZip: null,
      full: null,
      streetLine: null,
      localityLine: null,
    };
  }
  if (parts.length < 3) {
    const streetLine = parts[0] ?? null;
    const localityLine = parts.length > 1 ? parts.slice(1).join(", ") : null;
    const full = [streetLine, localityLine].filter(Boolean).join(", ") || null;
    return {
      prefix: null,
      cityStateZip: localityLine,
      full,
      streetLine,
      localityLine,
    };
  }
  const city = parts.at(-3) ?? "";
  const state = parts.at(-2) ?? "";
  const zip = parts.at(-1) ?? "";
  const cityStateZip = [city, state, zip].filter((value) => value.length > 0).join(", ");
  const localityLine =
    city && state && zip
      ? `${city}, ${state} ${zip}`
      : [city, state, zip].filter((value) => value.length > 0).join(", ");
  const prefix = parts.slice(0, -3).join(", ");
  const streetLine = prefix || null;
  const full = prefix ? `${prefix}, ${cityStateZip}` : cityStateZip;
  return {
    prefix: prefix || null,
    cityStateZip,
    full,
    streetLine,
    localityLine: localityLine || null,
  };
};

export const getDistrictChipClassName = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("district 1"))
    return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
  if (normalized.includes("district 2"))
    return "bg-amber-500/15 text-amber-700 border-amber-500/30";
  if (normalized.includes("district 3"))
    return "bg-pink-500/15 text-pink-700 border-pink-500/30";
  if (normalized.includes("district 4"))
    return "bg-cyan-500/15 text-cyan-700 border-cyan-500/30";
  if (normalized.includes("district 5"))
    return "bg-violet-500/15 text-violet-700 border-violet-500/30";
  if (normalized.includes("district 6"))
    return "bg-teal-500/15 text-teal-700 border-teal-700/30";
  if (normalized.includes("district 7"))
    return "bg-sky-500/15 text-sky-700 border-sky-500/30";
  return "bg-muted text-foreground border-border";
};

export const buildMockBusinessInfo = (name: string): MockBusinessInfo => {
  const normalized = name.trim() || "Unknown Contractor";
  const seed = Array.from(normalized).reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  );
  const industries = [
    "General Contracting",
    "Remodeling",
    "Electrical",
    "Plumbing",
    "HVAC",
    "Roofing",
  ] as const;
  const cities = ["Austin", "Houston", "Dallas", "Phoenix", "Denver", "Tampa"] as const;
  const states = ["TX", "AZ", "CO", "FL", "GA", "NC"] as const;

  return {
    name: normalized,
    industry: industries[seed % industries.length] ?? "General Contracting",
    city: cities[seed % cities.length] ?? "Austin",
    state: states[seed % states.length] ?? "TX",
    teamSize: 8 + (seed % 65),
    activeProjects: 1 + (seed % 14),
    reliabilityScore: 72 + (seed % 27),
  };
};

export const contactUpdateTypeLabel = (value: string) => {
  const options = [
    { value: "general", label: "General Update" },
    { value: "welcome_email", label: "Welcome Email Update" },
    { value: "followup", label: "Followup Update" },
    { value: "questionnaire", label: "Questionaire Update" },
    { value: "resume", label: "Resume Update" },
    { value: "resume_referral", label: "Resume Referral Update" },
  ];
  return options.find((option) => option.value === value)?.label ?? "General Update";
};

export const getContactTooltipDetails = (record: MondayRecord) => {
  if (Array.isArray(record.contactDetails) && record.contactDetails.length > 0) {
    return record.contactDetails.slice(0, 16);
  }
  return [
    { label: "Name", value: record.name },
    { label: "Email", value: record.email ?? "—" },
    { label: "Phone", value: record.phone ?? "—" },
    { label: "Address", value: record.address ?? "—" },
    { label: "Owner", value: record.peopleText ?? "—" },
    { label: "Status", value: record.statusText ?? "—" },
  ];
};

// --- Normalizers ---

export const normalizeOwnerProfiles = (
  input: unknown,
): {
  id: string;
  name: string | null;
  email?: string | null;
  photoThumb: string | null;
}[] => {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const owner = entry as {
        id?: unknown;
        name?: unknown;
        email?: unknown;
        photoThumb?: unknown;
      };
      const id = typeof owner.id === "string" ? owner.id.trim() : "";
      if (id.length === 0) return null;
      return {
        id,
        name: typeof owner.name === "string" ? owner.name.trim() || null : null,
        email:
          typeof owner.email === "string" ? owner.email.trim() || null : null,
        photoThumb:
          typeof owner.photoThumb === "string"
            ? owner.photoThumb.trim() || null
            : null,
      };
    })
    .filter((owner): owner is NonNullable<typeof owner> => owner !== null);
};

export const normalizeOwnerIds = (input: unknown) => {
  if (!Array.isArray(input)) return [] as string[];
  return input
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
};

export const normalizeResumeFiles = (
  input: unknown,
): { assetId: string | null; name: string; url: string | null }[] => {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const file = entry as {
        assetId?: unknown;
        name?: unknown;
        url?: unknown;
      };
      const name =
        typeof file.name === "string" && file.name.trim().length > 0
          ? file.name.trim()
          : "File";
      const assetId =
        typeof file.assetId === "string" && file.assetId.trim().length > 0
          ? file.assetId.trim()
          : null;
      const url =
        typeof file.url === "string" && file.url.trim().length > 0
          ? file.url.trim()
          : null;
      if (!assetId && !url) return null;
      return { assetId, name, url };
    })
    .filter(
      (
        file,
      ): file is { assetId: string | null; name: string; url: string | null } =>
        file !== null,
    );
};

// --- Date / time helpers ---

export const formatDateTimeParts = (value: string | null) => {
  if (!value) return { date: "—", time: "" };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: value, time: "" };
  return {
    date: parsed.toLocaleDateString(),
    time: parsed.toLocaleTimeString(),
  };
};

export const toDateOnly = (value: Date) => {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getMonthBounds = (monthAnchor: Date) => {
  const start = new Date(
    Date.UTC(monthAnchor.getUTCFullYear(), monthAnchor.getUTCMonth(), 1),
  );
  const end = new Date(
    Date.UTC(monthAnchor.getUTCFullYear(), monthAnchor.getUTCMonth() + 1, 0),
  );

  return {
    from: toDateOnly(start),
    to: toDateOnly(end),
    label: start.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }),
  };
};

export const uniqueSorted = (values: (string | null)[]) => {
  return Array.from(new Set(values.filter(Boolean) as string[])).sort((a, b) =>
    a.localeCompare(b),
  );
};

export const interpolateTemplateVariables = (
  source: string,
  vars: { ownerName: string; ownerEmail: string },
) => {
  return source
    .replace(/\{\{\s*owner\.name\s*\}\}/gi, vars.ownerName)
    .replace(/\{\{\s*owner\.email\s*\}\}/gi, vars.ownerEmail);
};

export const splitCsvValues = (value: string | null | undefined) => {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};

export const sortFiscalYearTagsDesc = (values: string[]) => {
  const fiscalYearPattern = /^fy(\d{2})\b/i;
  const toFiscalYear = (value: string) => {
    const match = fiscalYearPattern.exec(value.trim());
    if (!match?.[1]) return null;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : null;
  };

  return [...values].sort((a, b) => {
    const yearA = toFiscalYear(a);
    const yearB = toFiscalYear(b);
    if (yearA !== null && yearB !== null && yearA !== yearB) {
      return yearB - yearA;
    }
    if (yearA !== null && yearB === null) return -1;
    if (yearA === null && yearB !== null) return 1;
    return a.localeCompare(b);
  });
};

export const normalizeDateOnlyFromRecord = (value: string | null | undefined) => {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return "";
  return new Date(parsed).toISOString().slice(0, 10);
};

export const toDateOnlyLocal = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// --- Monday embed / session helpers ---

export const readTokenFromLocation = () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("sessionToken");
  return token && token.trim().length > 0 ? token.trim() : null;
};

export const readTokenFromSdkResponse = (value: unknown) => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  if (typeof value === "object" && value !== null) {
    const maybeData = (value as { data?: unknown }).data;
    if (typeof maybeData === "string" && maybeData.trim().length > 0) {
      return maybeData.trim();
    }
  }
  return null;
};

export const applyMondayThemeClass = (theme: unknown) => {
  const normalizedTheme = typeof theme === "string" ? theme.toLowerCase() : "";
  const resolvedTheme =
    normalizedTheme === "dark" || normalizedTheme === "black" ? "dark" : "light";
  const root = document.documentElement;
  console.info("[MondayThemeSync] Applying theme", {
    mondayTheme: theme,
    normalizedTheme,
    resolvedTheme,
    beforeClasses: root.className,
  });
  root.classList.remove("light", "dark");
  root.classList.add(resolvedTheme);
  console.info("[MondayThemeSync] Applied root classes", { afterClasses: root.className });
};

export const extractThemeFromContextPayload = (value: unknown) => {
  if (typeof value !== "object" || value === null) return null;
  const data = (value as { data?: unknown }).data;
  if (typeof data !== "object" || data === null) return null;
  const theme = (data as { theme?: unknown }).theme;
  return typeof theme === "string" ? theme : null;
};

export const toTrimmedBoardId = (value: unknown) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : "";
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
};

export const extractBoardIdFromContextPayload = (value: unknown) => {
  if (typeof value !== "object" || value === null) return "";
  const payloadObject = value as { data?: unknown };
  const data = payloadObject.data;
  const context = typeof data === "object" && data !== null ? data : value;
  const contextObject = context as {
    boardId?: unknown;
    board_id?: unknown;
    boardIds?: unknown;
  };
  const directBoardId =
    toTrimmedBoardId(contextObject.boardId) || toTrimmedBoardId(contextObject.board_id);
  if (directBoardId) return directBoardId;
  if (Array.isArray(contextObject.boardIds)) {
    for (const boardIdCandidate of contextObject.boardIds) {
      const normalized = toTrimmedBoardId(boardIdCandidate);
      if (normalized) return normalized;
    }
  }
  return "";
};

export const hasUnsubscribe = (
  value: unknown,
): value is {
  unsubscribe: () => void;
} => {
  if (typeof value !== "object" || value === null) return false;
  if (!("unsubscribe" in value)) return false;
  const maybeUnsubscribe = (value as { unsubscribe?: unknown }).unsubscribe;
  return typeof maybeUnsubscribe === "function";
};

// --- Advanced filters ---

export const ADVANCED_FILTER_FIELDS: {
  value: AdvancedFilterField;
  label: string;
  kind: "text" | "date";
}[] = [
    { value: "owner", label: "Owner", kind: "text" },
    { value: "district", label: "District", kind: "text" },
    { value: "name", label: "Name", kind: "text" },
    { value: "email", label: "Email", kind: "text" },
    { value: "phone", label: "Phone", kind: "text" },
    { value: "address", label: "Address", kind: "text" },
    { value: "tags", label: "Tags", kind: "text" },
    { value: "createdAt", label: "Created Date", kind: "date" },
    { value: "hireDate", label: "Hire Date", kind: "date" },
    { value: "detail", label: "Board Column", kind: "text" },
  ];

export const ADVANCED_TEXT_OPERATORS: AdvancedFilterOperator[] = [
  "contains",
  "equals",
  "not_equals",
  "starts_with",
  "ends_with",
  "is_empty",
  "is_not_empty",
];

export const ADVANCED_DATE_OPERATORS: AdvancedFilterOperator[] = [
  "on_or_after",
  "on_or_before",
  "between",
  "is_empty",
  "is_not_empty",
];

export const ADVANCED_OPERATOR_LABELS: Record<AdvancedFilterOperator, string> = {
  contains: "contains",
  equals: "is",
  not_equals: "is not",
  starts_with: "starts with",
  ends_with: "ends with",
  is_empty: "is empty",
  is_not_empty: "is not empty",
  on_or_after: "on or after",
  on_or_before: "on or before",
  between: "between",
};

export const LEGACY_FIELD_TO_BOARD_COLUMN_LABEL: Partial<
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

export const createAdvancedFilterId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `af_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

export const isAdvancedFilterField = (value: unknown): value is AdvancedFilterField => {
  if (typeof value !== "string") return false;
  return ADVANCED_FILTER_FIELDS.some((field) => field.value === value);
};

export const isAdvancedDateField = (field: AdvancedFilterField) => {
  return ADVANCED_FILTER_FIELDS.find((entry) => entry.value === field)?.kind === "date";
};

export const getAdvancedOperatorsForField = (field: AdvancedFilterField) => {
  if (field === "detail") return [...ADVANCED_TEXT_OPERATORS, ...ADVANCED_DATE_OPERATORS];
  return isAdvancedDateField(field) ? ADVANCED_DATE_OPERATORS : ADVANCED_TEXT_OPERATORS;
};

export const getDefaultAdvancedOperatorForField = (
  field: AdvancedFilterField,
): AdvancedFilterOperator => {
  if (isAdvancedDateField(field)) return "on_or_after";
  if (field === "owner" || field === "district") return "equals";
  return "contains";
};

export const isAdvancedFilterOperator = (value: unknown): value is AdvancedFilterOperator => {
  if (typeof value !== "string") return false;
  return (
    ADVANCED_TEXT_OPERATORS.includes(value as AdvancedFilterOperator) ||
    ADVANCED_DATE_OPERATORS.includes(value as AdvancedFilterOperator)
  );
};

export const createAdvancedFilterCondition = (
  field: AdvancedFilterField = "detail",
  target = "",
): AdvancedFilterCondition => ({
  id: createAdvancedFilterId(),
  field,
  operator: getDefaultAdvancedOperatorForField(field),
  value: "",
  valueTo: "",
  target,
});

export const isAdvancedDateOperator = (operator: AdvancedFilterOperator) => {
  return (
    operator === "on_or_after" || operator === "on_or_before" || operator === "between"
  );
};

export const getBoardColumnTargetForCondition = (condition: AdvancedFilterCondition) => {
  if (condition.field === "detail") return condition.target.trim();
  return LEGACY_FIELD_TO_BOARD_COLUMN_LABEL[condition.field]?.trim() ?? "";
};

export const normalizeAdvancedDate = (value: string | null | undefined) => {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return "";
  return new Date(parsed).toISOString().slice(0, 10);
};

export const isAdvancedConditionActive = (condition: AdvancedFilterCondition) => {
  const boardColumnTarget = getBoardColumnTargetForCondition(condition);
  if (boardColumnTarget.length === 0) {
    return false;
  }
  if (condition.operator === "is_empty" || condition.operator === "is_not_empty") {
    return true;
  }
  if (condition.operator === "between") {
    return condition.value.trim().length > 0 && condition.valueTo.trim().length > 0;
  }
  return condition.value.trim().length > 0;
};

export const getRecordFieldValues = (record: MondayRecord, field: AdvancedFilterField) => {
  switch (field) {
    case "owner": {
      const ownerProfileValues = record.ownerProfiles.flatMap((owner) => [
        owner.id,
        owner.name ?? "",
        owner.email ?? "",
      ]);
      return [...record.ownerIds, record.peopleText ?? "", ...ownerProfileValues]
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
    }
    case "district":
      return [record.statusText ?? ""].map((value) => value.trim()).filter(Boolean);
    case "name":
      return [record.name].map((value) => value.trim()).filter(Boolean);
    case "email":
      return [record.email ?? ""].map((value) => value.trim()).filter(Boolean);
    case "phone":
      return [record.phone ?? ""].map((value) => value.trim()).filter(Boolean);
    case "address":
      return [record.address ?? ""].map((value) => value.trim()).filter(Boolean);
    case "tags":
      return splitCsvValues(record.tags).map((value) => value.trim()).filter(Boolean);
    case "createdAt": {
      const normalized = normalizeDateOnlyFromRecord(record.createdAt);
      return normalized ? [normalized] : [];
    }
    case "hireDate": {
      const normalized = normalizeDateOnlyFromRecord(record.hireDate);
      return normalized ? [normalized] : [];
    }
    case "detail":
      return [];
    default:
      return [];
  }
};

export const getRecordFieldValuesForCondition = (
  record: MondayRecord,
  condition: AdvancedFilterCondition,
) => {
  const boardColumnTarget = getBoardColumnTargetForCondition(condition);
  if (boardColumnTarget.length > 0) {
    return record.contactDetails
      .filter((detail) => detail.label.trim() === boardColumnTarget)
      .map((detail) => detail.value.trim())
      .filter((value) => value.length > 0);
  }
  return getRecordFieldValues(record, condition.field);
};

export const doesRecordMatchAdvancedCondition = (
  record: MondayRecord,
  condition: AdvancedFilterCondition,
) => {
  const values = getRecordFieldValuesForCondition(record, condition);
  const hasValue = values.length > 0;

  if (condition.operator === "is_empty") return !hasValue;
  if (condition.operator === "is_not_empty") return hasValue;

  if (isAdvancedDateOperator(condition.operator)) {
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

export const doesRecordMatchAdvancedFilters = (
  record: MondayRecord,
  conditions: AdvancedFilterCondition[],
  matchMode: AdvancedFilterMatchMode,
) => {
  if (conditions.length === 0) return true;
  if (matchMode === "any") {
    return conditions.some((condition) =>
      doesRecordMatchAdvancedCondition(record, condition),
    );
  }
  return conditions.every((condition) =>
    doesRecordMatchAdvancedCondition(record, condition),
  );
};

export const parseAdvancedCondition = (input: unknown): AdvancedFilterCondition | null => {
  if (!input || typeof input !== "object") return null;
  const candidate = input as Partial<AdvancedFilterCondition>;
  if (!isAdvancedFilterField(candidate.field)) return null;
  if (!isAdvancedFilterOperator(candidate.operator)) return null;
  if (
    candidate.field !== "detail" &&
    !getAdvancedOperatorsForField(candidate.field).includes(candidate.operator)
  ) {
    return null;
  }
  return {
    id:
      typeof candidate.id === "string" && candidate.id.trim().length > 0
        ? candidate.id
        : createAdvancedFilterId(),
    field: candidate.field,
    operator: candidate.operator,
    value: typeof candidate.value === "string" ? candidate.value : "",
    valueTo: typeof candidate.valueTo === "string" ? candidate.valueTo : "",
    target: typeof candidate.target === "string" ? candidate.target : "",
  };
};

export const parseSavedAdvancedFilterPreset = (input: unknown): SavedAdvancedFilterPreset | null => {
  if (!input || typeof input !== "object") return null;
  const candidate = input as Partial<SavedAdvancedFilterPreset>;
  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
  if (!name) return null;
  const parsedConditions = Array.isArray(candidate.conditions)
    ? candidate.conditions
      .map((condition) => parseAdvancedCondition(condition))
      .filter((condition): condition is AdvancedFilterCondition => condition !== null)
    : [];
  return {
    id:
      typeof candidate.id === "string" && candidate.id.trim().length > 0
        ? candidate.id
        : createAdvancedFilterId(),
    name,
    matchMode: candidate.matchMode === "any" ? "any" : "all",
    conditions: parsedConditions,
    createdAt: typeof candidate.createdAt === "number" ? candidate.createdAt : Date.now(),
    updatedAt: typeof candidate.updatedAt === "number" ? candidate.updatedAt : undefined,
    ownerMondayUserId:
      typeof candidate.ownerMondayUserId === "string"
        ? candidate.ownerMondayUserId
        : undefined,
  };
};

// --- Settings parsers ---

export const parseUserBoardGeneralSettings = (input: unknown): UserBoardGeneralSettings => {
  if (!input || typeof input !== "object") return { ...DEFAULT_USER_BOARD_GENERAL_SETTINGS };
  const candidate = input as Partial<UserBoardGeneralSettings>;
  return {
    ownerMondayUserId:
      typeof candidate.ownerMondayUserId === "string"
        ? candidate.ownerMondayUserId
        : undefined,
    colorTheme: isUserBoardColorTheme(candidate.colorTheme)
      ? candidate.colorTheme
      : DEFAULT_USER_BOARD_GENERAL_SETTINGS.colorTheme,
    fontSize: isUserBoardFontSize(candidate.fontSize)
      ? candidate.fontSize
      : DEFAULT_USER_BOARD_GENERAL_SETTINGS.fontSize,
    tableDensity: isUserBoardTableDensity(candidate.tableDensity)
      ? candidate.tableDensity
      : DEFAULT_USER_BOARD_GENERAL_SETTINGS.tableDensity,
    pageSize: isUserBoardPageSize(candidate.pageSize)
      ? candidate.pageSize
      : DEFAULT_USER_BOARD_GENERAL_SETTINGS.pageSize,
    displayMode: isUserBoardDisplayMode(candidate.displayMode)
      ? candidate.displayMode
      : DEFAULT_USER_BOARD_GENERAL_SETTINGS.displayMode,
    recordSource: isUserBoardRecordSource(candidate.recordSource)
      ? candidate.recordSource
      : DEFAULT_USER_BOARD_GENERAL_SETTINGS.recordSource,
    createdAt: typeof candidate.createdAt === "number" ? candidate.createdAt : undefined,
    updatedAt: typeof candidate.updatedAt === "number" ? candidate.updatedAt : undefined,
  };
};

// --- Kanban helpers ---

export const getRecordStepIndex = (
  batteryProgress: number | null,
  stepCount: number,
): number => {
  if (batteryProgress === null || batteryProgress <= 0) return 0;
  const safeProgress = Math.max(0, Math.min(100, Math.round(batteryProgress)));
  if (safeProgress >= 100) return stepCount;
  const stepSize = 100 / stepCount;
  return Math.floor(safeProgress / stepSize);
};

export const buildKanbanColumns = (
  records: MondayRecord[],
  steps: ApprovalStepConfig[],
): KanbanColumn[] => {
  const columns: KanbanColumn[] = [
    { index: 0, id: "kanban-col-not-started", title: "Not Started", records: [] },
    ...steps.map((step, i) => ({
      index: i + 1,
      id: `kanban-col-${step.id}`,
      title: step.title,
      records: [] as MondayRecord[],
    })),
  ];
  for (const record of records) {
    const stepIndex = getRecordStepIndex(record.batteryProgress, steps.length);
    const clampedIndex = Math.max(0, Math.min(columns.length - 1, stepIndex));
    columns[clampedIndex]!.records.push(record);
  }
  return columns;
};

// --- Subitem type matching ---

export const doesSubitemMatchUpdateType = (subitemName: string, type: string) => {
  const normalized = subitemName.trim().toLowerCase().replaceAll(/\s+/g, " ");
  switch (type) {
    case "welcome_email":
      return normalized.includes("welcome");
    case "followup":
      return (
        normalized.includes("follow-up") ||
        normalized.includes("follow up") ||
        normalized.includes("followup")
      );
    case "questionnaire":
      return normalized.includes("question");
    case "resume":
      return normalized.includes("resume") && !normalized.includes("referral");
    case "resume_referral":
      return normalized.includes("resume referral");
    default:
      return false;
  }
};
