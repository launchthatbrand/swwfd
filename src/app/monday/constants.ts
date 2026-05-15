import type {
  ApprovalStepConfig,
  MondayFeatureFlags,
  UserBoardColorTheme,
  UserBoardCustomTheme,
  UserBoardDisplayMode,
  UserBoardFontSize,
  UserBoardGeneralSettings,
  UserBoardPageSize,
  UserBoardRecordSource,
  UserBoardTableDensity,
} from "./types";

export const CONTACT_UPDATE_TYPE_OPTIONS = [
  { value: "general", label: "General Update" },
  { value: "welcome_email", label: "Welcome Email Update" },
  { value: "followup", label: "Followup Update" },
  { value: "questionnaire", label: "Questionaire Update" },
  { value: "resume", label: "Resume Update" },
  { value: "resume_referral", label: "Resume Referral Update" },
] as const;

export type ContactUpdateType = (typeof CONTACT_UPDATE_TYPE_OPTIONS)[number]["value"];

export const CONTACT_UPDATE_ACTION_BUTTONS: {
  type: Exclude<ContactUpdateType, "general">;
  label: string;
  defaultBody: string;
}[] = [
    {
      type: "welcome_email",
      label: "Welcome Email Sent",
      defaultBody: "Welcome Email Sent",
    },
    {
      type: "followup",
      label: "Follow-Up Email Sent",
      defaultBody: "Follow-Up Email Sent",
    },
    {
      type: "questionnaire",
      label: "Questionnaire Sent",
      defaultBody: "Questionnaire Sent",
    },
    {
      type: "resume",
      label: "Resume Received",
      defaultBody: "Resume Received",
    },
    {
      type: "resume_referral",
      label: "Resume Referral",
      defaultBody: "Resume Referral",
    },
  ];

export type QuickContactActionButton = (typeof CONTACT_UPDATE_ACTION_BUTTONS)[number];

export const QUESTIONNAIRE_UPDATE_ACTION = {
  label: "Questionnaire Update",
} as const;

export const QUESTIONNAIRE_ENTRY_LEVEL_OPTIONS = [
  "Entry Level",
  "Skilled",
  "Professional",
  "General Construction Laborer",
  "Flagger (Traffic Control)",
  "Form Setter",
  "Asphalt Raker",
  "Concrete Finisher",
  "Heavy Equipment Operator",
  "CDL Truck Driver",
  "Mechanic",
  "Electrician",
  "Pipe Layer",
  "Landscape Laborer/Irrigation Installer",
] as const;

export const QUESTIONNAIRE_SKILLED_OPTIONS = [
  "Skilled",
  "Unskilled",
  "Entry",
  "Professional",
  "Crane Operator",
  "Pipe Layer/Pipe Fitter",
  "Surveyor",
] as const;

export const QUESTIONNAIRE_YES_NO = ["Yes", "No"] as const;

export const QUESTIONNAIRE_TRANSPORTATION = ["Yes", "No", "Public"] as const;

export const QUESTIONNAIRE_WORK_SCHEDULE = ["Full-time", "Part-time", "Both"] as const;

export const UPDATE_SUBITEM_NAME_BY_TYPE: Record<
  Exclude<ContactUpdateType, "general">,
  string
> = {
  welcome_email: "Welcome Email Update",
  followup: "Followup Update",
  questionnaire: "Questionaire Update",
  resume: "Resume Update",
  resume_referral: "Resume Referral Update",
};

export const SUBITEM_TYPE_COLUMN_ID = "color_mm2x49t2";

export const SUBITEM_TYPE_LABEL_BY_UPDATE_TYPE: Record<ContactUpdateType, string> = {
  general: "General",
  welcome_email: "Welcome Email",
  followup: "Followup",
  questionnaire: "Questionnaire",
  resume: "Resume",
  resume_referral: "Resume Referral",
};

export const APPROVAL_STEP_COLUMN_ID_BY_UPDATE_TYPE: Partial<
  Record<Exclude<ContactUpdateType, "general">, string>
> = {
  welcome_email: "color_mm1db321",
  followup: "color_mm1dwtvd",
  questionnaire: "color_mm1dwr4k",
  resume: "color_mm1dnr11",
  resume_referral: "color_mm1dgeqy",
};

export const DEFAULT_MONDAY_FEATURE_FLAGS: MondayFeatureFlags = {
  emailMarketingEnabled: false,
};

export const APPROVAL_STEPS: ApprovalStepConfig[] = [
  { id: "color_mm1db321", title: "Approval Step 1" },
  { id: "color_mm1dwtvd", title: "Approval Step 2" },
  { id: "color_mm1dwr4k", title: "Approval Step 3" },
  { id: "color_mm1dnr11", title: "Approval Step 4" },
  { id: "color_mm1dgeqy", title: "Approval Step 5" },
  { id: "color_mm1d80yc", title: "Approval Step 6" },
  { id: "color_mm1djwjj", title: "Approval Step 7" },
  { id: "color_mm1d4e3y", title: "Approval Step 8" },
];

export const KANBAN_STEP_CONFIG: {
  updateType: Exclude<ContactUpdateType, "general"> | null;
  defaultBody: string;
  stepColumnId: string;
}[] = [
  { updateType: "welcome_email", defaultBody: "Welcome Email Sent", stepColumnId: "color_mm1db321" },
  { updateType: "followup", defaultBody: "Follow-Up Email Sent", stepColumnId: "color_mm1dwtvd" },
  { updateType: "questionnaire", defaultBody: "Questionnaire Sent", stepColumnId: "color_mm1dwr4k" },
  { updateType: "resume", defaultBody: "Resume Received", stepColumnId: "color_mm1dnr11" },
  { updateType: "resume_referral", defaultBody: "Resume Referral", stepColumnId: "color_mm1dgeqy" },
  { updateType: null, defaultBody: "Interviewing", stepColumnId: "color_mm1d80yc" },
  { updateType: null, defaultBody: "Hired", stepColumnId: "color_mm1djwjj" },
  { updateType: null, defaultBody: "Retained (30-60-90)", stepColumnId: "color_mm1d4e3y" },
];

export type StepActionVariant = "default" | "questionnaire" | "generic";

export interface StepActionConfig {
  stepIndex: number;
  columnId: string;
  updateType: Exclude<ContactUpdateType, "general"> | null;
  defaultBody: string;
  actionLabel: string;
  actionVariant: StepActionVariant;
  /** When true, the step is tracked on the board but hidden from the stepper UI (auto-completed elsewhere). */
  hiddenFromStepper?: boolean;
}

export const STEP_ACTION_CONFIG: StepActionConfig[] = [
  { stepIndex: 0, columnId: "color_mm1db321", updateType: "welcome_email", defaultBody: "Welcome Email Sent", actionLabel: "Send Welcome Email", actionVariant: "default" },
  { stepIndex: 1, columnId: "color_mm1dwtvd", updateType: "followup", defaultBody: "Follow-Up Email Sent", actionLabel: "Send Follow-Up", actionVariant: "default", hiddenFromStepper: true },
  { stepIndex: 2, columnId: "color_mm1dwr4k", updateType: "questionnaire", defaultBody: "Questionnaire Sent", actionLabel: "Complete Questionnaire", actionVariant: "questionnaire" },
  { stepIndex: 3, columnId: "color_mm1dnr11", updateType: "resume", defaultBody: "Resume Received", actionLabel: "Mark Resume Received", actionVariant: "default" },
  { stepIndex: 4, columnId: "color_mm1dgeqy", updateType: "resume_referral", defaultBody: "Resume Referral", actionLabel: "Submit Resume Referral", actionVariant: "default" },
  { stepIndex: 5, columnId: "color_mm1d80yc", updateType: null, defaultBody: "Interviewing", actionLabel: "Mark Interviewing", actionVariant: "generic" },
  { stepIndex: 6, columnId: "color_mm1djwjj", updateType: null, defaultBody: "Hired", actionLabel: "Mark as Hired", actionVariant: "generic" },
  { stepIndex: 7, columnId: "color_mm1d4e3y", updateType: null, defaultBody: "Retained (30-60-90)", actionLabel: "Mark Retained", actionVariant: "generic" },
];

// --- User board settings ---

export const USER_BOARD_PAGE_SIZE_OPTIONS: { value: UserBoardPageSize; label: string }[] = [
  { value: 20, label: "20 per page" },
  { value: 40, label: "40 per page" },
  { value: 100, label: "100 per page" },
  { value: 0, label: "Infinite scroll" },
];

export const isUserBoardPageSize = (value: unknown): value is UserBoardPageSize =>
  value === 20 || value === 40 || value === 100 || value === 0;

export const isUserBoardDisplayMode = (value: unknown): value is UserBoardDisplayMode =>
  value === "table" || value === "grid" || value === "kanban";

export const USER_BOARD_RECORD_SOURCE_OPTIONS: {
  value: UserBoardRecordSource;
  label: string;
  description: string;
}[] = [
    {
      value: "created_in_month",
      label: "Entered This Month",
      description: "Only contacts created in the selected month.",
    },
    {
      value: "touched_in_month",
      label: "Touched This Month",
      description:
        "Any owned contact with at least one touchpoint in the selected month.",
    },
  ];

export const isUserBoardRecordSource = (
  value: unknown,
): value is UserBoardRecordSource =>
  value === "created_in_month" || value === "touched_in_month";

export const USER_BOARD_TABLE_DENSITY_OPTIONS: {
  value: UserBoardTableDensity;
  label: string;
  description: string;
}[] = [
    {
      value: "expanded",
      label: "Expanded",
      description: "Taller rows with full contact details and progress bar",
    },
    {
      value: "compact",
      label: "Compact",
      description: "Shorter rows — name and email only, more records visible",
    },
  ];

export const isUserBoardTableDensity = (value: unknown): value is UserBoardTableDensity =>
  value === "expanded" || value === "compact";

export const VIRTUAL_ROW_HEIGHT: Record<UserBoardTableDensity, number> = {
  expanded: 72,
  compact: 56,
};

export const USER_BOARD_FONT_SIZE_OPTIONS: { value: UserBoardFontSize; label: string }[] = [
  { value: "default", label: "Default (100%)" },
  { value: "medium", label: "Medium (106%)" },
  { value: "large", label: "Large (112%)" },
];

export const USER_BOARD_FONT_SIZE_SCALE: Record<UserBoardFontSize, number> = {
  default: 1,
  medium: 1.06,
  large: 1.12,
};

export const USER_BOARD_ACTION_BUTTON_SIZE_CLASS: Record<UserBoardFontSize, string> = {
  default: "h-8 px-2.5 text-xs",
  medium: "h-9 px-3 text-sm",
  large: "h-10 px-3.5 text-base",
};

export const USER_BOARD_COLOR_THEME_OPTIONS: {
  value: UserBoardColorTheme;
  label: string;
  description: string;
  swatchClassName: string;
}[] = [
    {
      value: "neutral",
      label: "Neutral",
      description: "Balanced default styling.",
      swatchClassName: "bg-slate-400",
    },
    {
      value: "sky",
      label: "Sky",
      description: "Cool blue accents.",
      swatchClassName: "bg-sky-400",
    },
    {
      value: "emerald",
      label: "Emerald",
      description: "Fresh green accents.",
      swatchClassName: "bg-emerald-400",
    },
    {
      value: "violet",
      label: "Violet",
      description: "Calm purple accents.",
      swatchClassName: "bg-violet-400",
    },
    {
      value: "rose",
      label: "Rose",
      description: "Warm pink accents.",
      swatchClassName: "bg-rose-400",
    },
    {
      value: "custom",
      label: "Custom",
      description: "Pick any color and transparency.",
      swatchClassName: "bg-gradient-to-r from-fuchsia-500 via-sky-500 to-emerald-400",
    },
  ];

export const USER_BOARD_COLOR_THEME_STYLES: Record<
  UserBoardColorTheme,
  {
    shellCardClassName: string;
    toolbarClassName: string;
    previewClassName: string;
    actionButtonClassName: string;
  }
> = {
  neutral: {
    shellCardClassName: "bg-muted border-border",
    toolbarClassName: "bg-muted/60 border-border",
    previewClassName: "bg-muted/50 border-border",
    actionButtonClassName:
      "bg-slate-600/90 text-white hover:bg-slate-700 dark:bg-slate-500 dark:hover:bg-slate-400",
  },
  sky: {
    shellCardClassName: "bg-sky-100/90 border-sky-300 dark:bg-sky-950/60 dark:border-sky-700",
    toolbarClassName: "bg-sky-100/70 border-sky-200 dark:bg-sky-900/30 dark:border-sky-700",
    previewClassName: "bg-sky-50/80 border-sky-200 dark:bg-sky-900/20 dark:border-sky-800",
    actionButtonClassName:
      "bg-sky-500/90 text-white hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-500",
  },
  emerald: {
    shellCardClassName:
      "bg-emerald-100/90 border-emerald-300 dark:bg-emerald-950/50 dark:border-emerald-700",
    toolbarClassName:
      "bg-emerald-100/70 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-700",
    previewClassName:
      "bg-emerald-50/80 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800",
    actionButtonClassName:
      "bg-emerald-500/90 text-white hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500",
  },
  violet: {
    shellCardClassName:
      "bg-violet-100/90 border-violet-300 dark:bg-violet-950/50 dark:border-violet-700",
    toolbarClassName:
      "bg-violet-100/70 border-violet-200 dark:bg-violet-900/30 dark:border-violet-700",
    previewClassName:
      "bg-violet-50/80 border-violet-200 dark:bg-violet-900/20 dark:border-violet-800",
    actionButtonClassName:
      "bg-violet-500/90 text-white hover:bg-violet-600 dark:bg-violet-600 dark:hover:bg-violet-500",
  },
  rose: {
    shellCardClassName: "bg-rose-100/90 border-rose-300 dark:bg-rose-950/50 dark:border-rose-700",
    toolbarClassName:
      "bg-rose-100/70 border-rose-200 dark:bg-rose-900/30 dark:border-rose-700",
    previewClassName: "bg-rose-50/80 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800",
    actionButtonClassName:
      "bg-rose-500/90 text-white hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-500",
  },
  custom: {
    shellCardClassName: "bg-muted border-border",
    toolbarClassName: "bg-muted/60 border-border",
    previewClassName: "bg-muted/50 border-border",
    actionButtonClassName: "text-white hover:opacity-90",
  },
};

export const DEFAULT_USER_BOARD_CUSTOM_THEME: UserBoardCustomTheme = {
  colorHex: "#0ea5e9",
  alpha: 0.22,
};

export const DEFAULT_USER_BOARD_GENERAL_SETTINGS: UserBoardGeneralSettings = {
  colorTheme: "neutral",
  customTheme: DEFAULT_USER_BOARD_CUSTOM_THEME,
  fontSize: "medium",
  tableDensity: "expanded",
  hoverPopoversEnabled: true,
  pageSize: 0,
  displayMode: "table",
  recordSource: "created_in_month",
};

export const isUserBoardColorTheme = (value: unknown): value is UserBoardColorTheme => {
  return USER_BOARD_COLOR_THEME_OPTIONS.some((option) => option.value === value);
};

const isHexColor = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value);

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const hexToRgb = (hexColor: string) => {
  const normalized = hexColor.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return { red, green, blue };
};

const getReadableTextColor = (hexColor: string) => {
  const { red, green, blue } = hexToRgb(hexColor);
  const yiq = (red * 299 + green * 587 + blue * 114) / 1000;
  return yiq >= 160 ? "#111827" : "#ffffff";
};

export const parseUserBoardCustomTheme = (input: unknown): UserBoardCustomTheme => {
  if (!input || typeof input !== "object") {
    return { ...DEFAULT_USER_BOARD_CUSTOM_THEME };
  }
  const candidate = input as Partial<UserBoardCustomTheme>;
  const colorHex =
    typeof candidate.colorHex === "string" && isHexColor(candidate.colorHex.trim())
      ? candidate.colorHex.trim().toLowerCase()
      : DEFAULT_USER_BOARD_CUSTOM_THEME.colorHex;
  const alphaRaw =
    typeof candidate.alpha === "number" && Number.isFinite(candidate.alpha)
      ? candidate.alpha
      : DEFAULT_USER_BOARD_CUSTOM_THEME.alpha;
  return {
    colorHex,
    alpha: clamp01(alphaRaw),
  };
};

export const buildUserBoardThemeInlineStyles = (settings: {
  colorTheme: UserBoardColorTheme;
  customTheme?: UserBoardCustomTheme;
}) => {
  if (settings.colorTheme !== "custom") {
    return {
      shellCardStyle: undefined,
      previewStyle: undefined,
      actionButtonStyle: undefined,
    };
  }
  const customTheme = parseUserBoardCustomTheme(settings.customTheme);
  const { red, green, blue } = hexToRgb(customTheme.colorHex);
  const shellAlpha = clamp01(customTheme.alpha);
  const previewAlpha = clamp01(customTheme.alpha + 0.08);
  const borderAlpha = clamp01(customTheme.alpha + 0.28);
  const actionTextColor = getReadableTextColor(customTheme.colorHex);
  return {
    shellCardStyle: {
      backgroundColor: `rgba(${red}, ${green}, ${blue}, ${shellAlpha})`,
      borderColor: `rgba(${red}, ${green}, ${blue}, ${borderAlpha})`,
    },
    previewStyle: {
      backgroundColor: `rgba(${red}, ${green}, ${blue}, ${previewAlpha})`,
      borderColor: `rgba(${red}, ${green}, ${blue}, ${borderAlpha})`,
    },
    actionButtonStyle: {
      backgroundColor: customTheme.colorHex,
      color: actionTextColor,
    },
  };
};

export const isUserBoardFontSize = (value: unknown): value is UserBoardFontSize => {
  return USER_BOARD_FONT_SIZE_OPTIONS.some((option) => option.value === value);
};

export const MONDAY_DEV_BYPASS_TOKEN = "swwfd-dev-bypass";
export const MONDAY_OWNER_SCOPE_ADMIN_USER_IDS = ["38959704", "53441186"];

export const isEmbeddedMondaySessionToken = (token: string | null) =>
  !!token && token.trim().length > 0 && token.trim() !== MONDAY_DEV_BYPASS_TOKEN;
