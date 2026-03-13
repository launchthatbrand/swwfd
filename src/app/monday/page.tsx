"use client";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Mail,
  RefreshCcw,
  Settings,
  UserPlus,
} from "lucide-react";
import type {
  ColumnDefinition,
  EntityAction,
} from "@acme/ui/entity-list";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@acme/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@acme/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@acme/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@acme/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@acme/ui/tooltip";
import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { Badge } from "@acme/ui/badge";
import { Button } from "@acme/ui/button";
import { Calendar } from "@acme/ui/calendar";
import { EntityList } from "@acme/ui/entity-list";
import { Input } from "@acme/ui/input";
import Link from "next/link";
import type { MondayClientSdk } from "monday-sdk-js";
import { MultiSelect } from "@acme/ui/multi-select";
import { Progress } from "@acme/ui/progress";
import mondaySdkInitialize from "monday-sdk-js";
import { toast } from "@acme/ui/toast";

interface MondayRecord extends Record<string, unknown> {
  id: string;
  contactId?: string | null;
  touchItemId?: string | null;
  touchedAt?: string | null;
  touchedBy?: string | null;
  touchSource?: string | null;
  name: string;
  url: string | null;
  groupTitle: string | null;
  statusText: string | null;
  peopleText: string | null;
  ownerIds: string[];
  ownerProfiles: {
    id: string;
    name: string | null;
    photoThumb: string | null;
  }[];
  email: string | null;
  phone: string | null;
  address: string | null;
  referredToContractors: string | null;
  hiredWithContractor: string | null;
  hireDate: string | null;
  retentionPeriod: string | null;
  tags: string | null;
  batteryProgress: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  contactDetails: {
    label: string;
    value: string;
  }[];
  resumeFiles: {
    assetId: string | null;
    name: string;
    url: string | null;
  }[];
}

interface MondayResponse {
  ok: boolean;
  error?: string;
  boardName?: string | null;
  records?: MondayRecord[];
  nextCursor?: string | null;
  approvalSteps?: ApprovalStepConfig[];
}

interface MondayEmailTemplate {
  id: string;
  name: string;
  url: string | null;
  updatedAt: string | null;
  content: string;
  renderedHtml: string;
  docLink: string | null;
}

interface MondayEmailTemplatesResponse {
  ok: boolean;
  error?: string;
  boardName?: string | null;
  boardId?: string;
  workdocColumnId?: string;
  templates?: MondayEmailTemplate[];
}

interface MondayIdentity {
  userId: string;
  accountId: string;
  boardId?: string;
  appClientId?: string;
  expiresAt?: number;
}

interface MondayUserProfileResponse {
  ok: boolean;
  error?: string;
  user?: {
    id: string;
    email: string | null;
    name: string | null;
  } | null;
}

interface OutlookConnectionStatusResponse {
  ok: boolean;
  error?: string;
  connected?: boolean;
  callbackPath?: string;
  connection?: {
    email: string | null;
    displayName: string | null;
    accessTokenExpiresAt: number;
    scopes: string[];
    updatedAt: number;
  } | null;
}

interface MondayRecordEditOptionsResponse {
  ok: boolean;
  error?: string;
  options?: {
    referredToContractors: string[];
    hiredWithContractor: string[];
    retentionPeriod: string[];
    tags: string[];
  };
}

interface MondayContactCandidate {
  id: string;
  name: string;
  url: string | null;
  email: string | null;
  owner: string | null;
  updatedAt: string | null;
}

interface MondayContactsLookupResponse {
  ok: boolean;
  error?: string;
  identity?: { userId: string };
  existing?: MondayContactCandidate[];
}

interface MondayCreateContactResponse {
  ok: boolean;
  error?: string;
  created?: { id: string };
}

interface MondayRecordUpdate {
  id: string;
  body: string;
  createdAt: string | null;
  updatedAt: string | null;
  creatorId: string | null;
  creatorName: string | null;
}

interface MondayRecordUpdatesResponse {
  ok: boolean;
  error?: string;
  itemId?: string;
  itemName?: string | null;
  updates?: MondayRecordUpdate[];
}

interface MondayResumeUploadResponse {
  ok: boolean;
  error?: string;
}

interface ResumePreviewState {
  fileName: string;
  href: string;
  recordName: string;
}

interface MockBusinessInfo {
  name: string;
  industry: string;
  city: string;
  state: string;
  teamSize: number;
  activeProjects: number;
  reliabilityScore: number;
}

interface ApprovalStepConfig {
  id: string;
  title: string;
}

interface MondaySendEmailResponse {
  ok: boolean;
  error?: string;
}

interface AddNewContactValues {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  ownerId: string;
}

const formatUpdatedAt = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const hasHtmlLikeMarkup = (value: string) => /<[a-z][\s\S]*>/i.test(value);

const getNameInitials = (name: string) => {
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

const getAddressDisplayParts = (address: string | null | undefined) => {
  if (!address) return { prefix: null, cityStateZip: null, full: null };
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (parts.length === 0) return { prefix: null, cityStateZip: null, full: null };
  if (parts.length < 3) {
    return { prefix: null, cityStateZip: null, full: parts.join(", ") };
  }
  const cityStateZip = parts.slice(-3).join(", ");
  const prefix = parts.slice(0, -3).join(", ");
  const full = prefix ? `${prefix}, ${cityStateZip}` : cityStateZip;
  return { prefix: prefix || null, cityStateZip, full };
};

const getDistrictChipClassName = (value: string) => {
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

const APPROVAL_STEPS: ApprovalStepConfig[] = [
  { id: "color_mm1db321", title: "Approval Step 1" },
  { id: "color_mm1dwtvd", title: "Approval Step 2" },
  { id: "color_mm1dwr4k", title: "Approval Step 3" },
  { id: "color_mm1dnr11", title: "Approval Step 4" },
  { id: "color_mm1dgeqy", title: "Approval Step 5" },
  { id: "color_mm1d80yc", title: "Approval Step 6" },
  { id: "color_mm1djwjj", title: "Approval Step 7" },
  { id: "color_mm1d4e3y", title: "Approval Step 8" },
];

const buildMockBusinessInfo = (name: string): MockBusinessInfo => {
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

const BusinessInfoHoverCard = (props: {
  companyName: string;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const info = useMemo(
    () => buildMockBusinessInfo(props.companyName),
    [props.companyName],
  );

  return (
    <Popover open={open}>
      <PopoverTrigger asChild>
        <div
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className="inline-flex"
        >
          {props.children}
        </div>
      </PopoverTrigger>
      <PopoverContent
        portal={false}
        side="top"
        align="start"
        className="w-[min(22rem,calc(100vw-2rem))]"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <div className="space-y-1.5">
          <p className="text-sm font-semibold wrap-break-word">{info.name}</p>
          <p className="text-muted-foreground text-xs wrap-break-word">
            {info.industry} · {info.city}, {info.state}
          </p>
          <div className="text-muted-foreground grid grid-cols-2 gap-2 pt-1 text-xs">
            <span>Team size: {info.teamSize}</span>
            <span>Projects: {info.activeProjects}</span>
            <span className="col-span-2">
              Reliability score: {info.reliabilityScore}/100
            </span>
          </div>
          <p className="text-muted-foreground pt-1 text-[11px] leading-snug wrap-break-word whitespace-normal">
            Mock business data preview. Replace with CRM/company profile data when
            integration is ready.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const ApprovalProgressIndicator = (props: {
  progressValue: number | null;
  steps: ApprovalStepConfig[];
}) => {
  const [open, setOpen] = useState(false);
  const safeProgress = Math.max(0, Math.min(100, Math.round(props.progressValue ?? 0)));
  const stepCount = Math.max(props.steps.length, 1);
  const stepSize = 100 / stepCount;
  const completedSteps = Math.floor(safeProgress / stepSize);

  return (
    <Popover open={open}>
      <PopoverTrigger asChild>
        <div
          className="mt-1 space-y-1"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <div className="text-muted-foreground flex items-center justify-between text-[10px] uppercase">
            <span>Progress</span>
            <span>{props.progressValue !== null ? `${safeProgress}%` : "—"}</span>
          </div>
          <div className="relative h-2 overflow-hidden rounded-full bg-muted/80">
            <div
              className="bg-primary h-full transition-all"
              style={{ width: `${safeProgress}%` }}
            />
            {props.steps.map((step, index) => {
              const left =
                props.steps.length === 1
                  ? 0
                  : (index / (props.steps.length - 1)) * 100;
              const completed = safeProgress >= (index + 1) * stepSize;
              return (
                <span
                  key={step.id}
                  className={`absolute top-0 z-10 h-full w-0.5 -translate-x-1/2 ${completed ? "bg-foreground/60" : "bg-border/70"
                    }`}
                  style={{ left: `${left}%` }}
                />
              );
            })}
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent
        portal={false}
        side="top"
        align="start"
        className="w-72"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Onboarding Progress</p>
            <span className="text-muted-foreground text-xs">
              {completedSteps}/{props.steps.length} steps
            </span>
          </div>
          <div className="space-y-1">
            {props.steps.map((step, index) => {
              const completed = safeProgress >= (index + 1) * stepSize;
              return (
                <div
                  key={step.id}
                  className="flex items-center justify-between gap-2 rounded-sm px-1 py-0.5 text-xs"
                >
                  <span className="truncate">
                    {index + 1}. {step.title}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${completed
                        ? "bg-emerald-500/15 text-emerald-700"
                        : "bg-muted text-muted-foreground"
                      }`}
                  >
                    {completed ? "Done" : "Pending"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const normalizeOwnerProfiles = (
  input: unknown,
): { id: string; name: string | null; photoThumb: string | null }[] => {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const owner = entry as {
        id?: unknown;
        name?: unknown;
        photoThumb?: unknown;
      };
      const id = typeof owner.id === "string" ? owner.id.trim() : "";
      if (id.length === 0) return null;
      return {
        id,
        name: typeof owner.name === "string" ? owner.name.trim() || null : null,
        photoThumb:
          typeof owner.photoThumb === "string"
            ? owner.photoThumb.trim() || null
            : null,
      };
    })
    .filter(
      (
        owner,
      ): owner is { id: string; name: string | null; photoThumb: string | null } =>
        owner !== null,
    );
};

const normalizeOwnerIds = (input: unknown) => {
  if (!Array.isArray(input)) return [] as string[];
  return input
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
};

const normalizeResumeFiles = (
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

const formatDateTimeParts = (value: string | null) => {
  if (!value) return { date: "—", time: "" };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: value, time: "" };
  return {
    date: parsed.toLocaleDateString(),
    time: parsed.toLocaleTimeString(),
  };
};

const toDateOnly = (value: Date) => {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getMonthBounds = (monthAnchor: Date) => {
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

const uniqueSorted = (values: (string | null)[]) => {
  return Array.from(new Set(values.filter(Boolean) as string[])).sort((a, b) =>
    a.localeCompare(b),
  );
};

const splitCsvValues = (value: string | null | undefined) => {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};

const sortFiscalYearTagsDesc = (values: string[]) => {
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

const normalizeDateOnlyFromRecord = (value: string | null | undefined) => {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return "";
  return new Date(parsed).toISOString().slice(0, 10);
};

const toDateOnlyLocal = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function AddNewContactForm(props: {
  values: AddNewContactValues;
  ownerOptions: { value: string; label: string }[];
  isSubmitting: boolean;
  onChange: <K extends keyof AddNewContactValues>(
    key: K,
    value: AddNewContactValues[K],
  ) => void;
  onSubmit: () => void;
}) {
  const { values, ownerOptions, isSubmitting, onChange, onSubmit } = props;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium">First Name</label>
          <Input
            value={values.firstName}
            onChange={(event) => onChange("firstName", event.target.value)}
            placeholder="First name"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Last Name</label>
          <Input
            value={values.lastName}
            onChange={(event) => onChange("lastName", event.target.value)}
            placeholder="Last name"
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Email</label>
        <Input
          type="email"
          value={values.email}
          onChange={(event) => onChange("email", event.target.value)}
          placeholder="name@example.com"
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Address</label>
        <Input
          value={values.address}
          onChange={(event) => onChange("address", event.target.value)}
          placeholder="Street, City, State, Zip"
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Owner</label>
        <select
          value={values.ownerId}
          onChange={(event) => onChange("ownerId", event.target.value)}
          className="bg-background border-input h-9 w-full rounded-md border px-3 text-sm"
        >
          {ownerOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-end">
        <Button
          onClick={() => onSubmit()}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Checking..." : "Continue"}
        </Button>
      </div>
    </div>
  );
}

const readTokenFromLocation = () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("sessionToken");
  return token && token.trim().length > 0 ? token.trim() : null;
};

const readTokenFromSdkResponse = (value: unknown) => {
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

const applyMondayThemeClass = (theme: unknown) => {
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

const extractThemeFromContextPayload = (value: unknown) => {
  if (typeof value !== "object" || value === null) return null;
  const data = (value as { data?: unknown }).data;
  if (typeof data !== "object" || data === null) return null;
  const theme = (data as { theme?: unknown }).theme;
  return typeof theme === "string" ? theme : null;
};

const hasUnsubscribe = (
  value: unknown,
): value is {
  unsubscribe: () => void;
} => {
  if (typeof value !== "object" || value === null) return false;
  if (!("unsubscribe" in value)) return false;
  const maybeUnsubscribe = (value as { unsubscribe?: unknown }).unsubscribe;
  return typeof maybeUnsubscribe === "function";
};

const getContactTooltipDetails = (record: MondayRecord) => {
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

export type MondayBoardViewMode = "all" | "userScoped";

interface MondayBoardViewProps {
  viewMode?: MondayBoardViewMode;
}

const ADMIN_OWNER_OVERRIDE_EMAIL = "desmond.tatilian@qcausa.com";
const MONDAY_DEV_BYPASS_TOKEN = "__monday_dev_bypass__";

export function MondayBoardView({ viewMode = "all" }: MondayBoardViewProps) {
  const isTouchScopedView = viewMode === "userScoped";
  const [identity, setIdentity] = useState<MondayIdentity | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [staticMode, setStaticMode] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [addContactStep, setAddContactStep] = useState<1 | 2>(1);
  const [addContactValues, setAddContactValues] = useState<AddNewContactValues>({
    firstName: "",
    lastName: "",
    email: "",
    address: "",
    ownerId: "",
  });
  const [existingContactsByEmail, setExistingContactsByEmail] = useState<
    MondayContactCandidate[]
  >([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [isCreatingContact, setIsCreatingContact] = useState(false);
  const [retentionDialogRecord, setRetentionDialogRecord] =
    useState<MondayRecord | null>(null);
  const [tagsDialogRecord, setTagsDialogRecord] = useState<MondayRecord | null>(null);
  const [statusDialogRecord, setStatusDialogRecord] = useState<MondayRecord | null>(null);
  const [ownerDialogRecord, setOwnerDialogRecord] = useState<MondayRecord | null>(null);
  const [contactHistoryDialogRecord, setContactHistoryDialogRecord] =
    useState<MondayRecord | null>(null);
  const [retentionDraft, setRetentionDraft] = useState({
    referredToContractors: [] as string[],
    hiredWithContractor: "",
    hireDate: "",
    retentionPeriod: "",
  });
  const [tagsDraft, setTagsDraft] = useState<string[]>([]);
  const [statusDraft, setStatusDraft] = useState("");
  const [ownerDraft, setOwnerDraft] = useState("");
  const [isSavingRetention, setIsSavingRetention] = useState(false);
  const [retentionHireDatePopoverOpen, setRetentionHireDatePopoverOpen] =
    useState(false);
  const [isSavingTags, setIsSavingTags] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isSavingOwner, setIsSavingOwner] = useState(false);
  const [uploadingResumeByRecordId, setUploadingResumeByRecordId] = useState<
    Record<string, boolean>
  >({});
  const [resumePreview, setResumePreview] = useState<ResumePreviewState | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sendEmailRecord, setSendEmailRecord] = useState<MondayRecord | null>(null);
  const [sendEmailStep, setSendEmailStep] = useState<1 | 2 | 3>(1);
  const [sendEmailTemplateId, setSendEmailTemplateId] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isConnectingOutlook, setIsConnectingOutlook] = useState(false);
  const [isDisconnectingOutlook, setIsDisconnectingOutlook] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeMonth, setActiveMonth] = useState(
    () => new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)),
  );
  const loadMoreAnchorRef = useRef<HTMLDivElement | null>(null);
  const monday = useMemo<MondayClientSdk>(() => {
    const sdk: MondayClientSdk = mondaySdkInitialize();
    console.info("[MondayThemeSync] Initialized monday-sdk-js instance");
    return sdk;
  }, []);

  useEffect(() => {
    // Activepieces route temporarily swaps token formats via `ap-hsl-vars`.
    // Ensure Monday page always renders with the default app token set.
    document.documentElement.classList.remove("ap-hsl-vars");
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const root = document.documentElement;
    const hadLightClass = root.classList.contains("light");
    const hadDarkClass = root.classList.contains("dark");
    console.info("[MondayThemeSync] Initializing", {
      hadLightClass,
      hadDarkClass,
      currentClasses: root.className,
      hasListen: typeof monday.listen === "function",
    });
    let didCleanup = false;
    let unsubscribe: (() => void) | undefined;

    const handleContextPayload = (payload: unknown) => {
      console.info("[MondayThemeSync] Received context payload", payload);
      const theme = extractThemeFromContextPayload(payload);
      if (!theme) {
        console.warn("[MondayThemeSync] No theme found in context payload");
        return;
      }
      console.info("[MondayThemeSync] Extracted theme from payload", { theme });
      applyMondayThemeClass(theme);
    };

    void (monday
      .get("context")
      .then((value: unknown) => {
        if (didCleanup) return;
        console.info("[MondayThemeSync] sdk.get('context') resolved", value);
        handleContextPayload(value);
      })
      .catch((error: unknown) => {
        console.error("[MondayThemeSync] sdk.get('context') failed", error);
      }) as Promise<unknown>);

    if (typeof monday.listen === "function") {
      const listenerResult = monday.listen("context", (value: unknown) => {
        if (didCleanup) return;
        console.info("[MondayThemeSync] sdk.listen('context') event", value);
        handleContextPayload(value);
      }) as unknown;
      if (typeof listenerResult === "function") {
        const unsubscribeFunction = listenerResult as () => void;
        unsubscribe = () => unsubscribeFunction();
        console.info("[MondayThemeSync] Registered listener with function unsubscribe");
      } else if (hasUnsubscribe(listenerResult)) {
        const unsubscribeFromListener = listenerResult.unsubscribe;
        unsubscribe = () => unsubscribeFromListener();
        console.info("[MondayThemeSync] Registered listener with object.unsubscribe");
      } else {
        console.info(
          "[MondayThemeSync] Listener registered without explicit unsubscribe handle",
        );
      }
    } else {
      console.warn("[MondayThemeSync] sdk.listen is not available");
    }

    return () => {
      didCleanup = true;
      unsubscribe?.();
      console.info("[MondayThemeSync] Cleanup restoring previous classes", {
        hadLightClass,
        hadDarkClass,
        beforeRestore: root.className,
      });
      root.classList.remove("light", "dark");
      if (hadLightClass) root.classList.add("light");
      if (hadDarkClass) root.classList.add("dark");
      console.info("[MondayThemeSync] Cleanup complete", {
        afterRestore: root.className,
      });
    };
  }, [monday]);

  const monthBounds = useMemo(() => getMonthBounds(activeMonth), [activeMonth]);
  const recordsQuery = useInfiniteQuery({
    queryKey: [
      "monday-records",
      viewMode,
      monthBounds.from,
      monthBounds.to,
      debouncedSearch,
      statusFilter,
      ownerFilter,
      sessionToken,
    ],
    enabled: !!sessionToken && !staticMode,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const recordsEndpoint = isTouchScopedView
        ? "/api/monday/user-records"
        : "/api/monday/records";
      const params = new URLSearchParams();
      params.set("limit", "100");
      if (pageParam) params.set("cursor", pageParam);
      const normalizedSearch = debouncedSearch.trim();
      if (normalizedSearch.length >= 2) params.set("search", normalizedSearch);
      if (statusFilter.trim()) params.set("status", statusFilter.trim());
      if (ownerFilter.trim()) params.set("owner", ownerFilter.trim());
      params.set("dateFrom", monthBounds.from);
      params.set("dateTo", monthBounds.to);

      const response = await fetch(`${recordsEndpoint}?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
        headers: sessionToken
          ? { "x-monday-session-token": sessionToken }
          : undefined,
      });
      const data = (await response.json()) as MondayResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to load Monday records");
      }
      return data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
  });

  const shouldAutoLoadMore =
    !staticMode &&
    !isTouchScopedView &&
    debouncedSearch.trim().length === 0 &&
    statusFilter.trim().length === 0 &&
    ownerFilter.trim().length === 0;

  const emailTemplatesQuery = useQuery({
    queryKey: ["monday-email-templates", sessionToken],
    enabled: !!sessionToken && !staticMode && (settingsOpen || !!sendEmailRecord),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("boardId", "18401299370");
      params.set("workdocColumnId", "doc_mm0wq4r");
      params.set("limit", "250");

      const response = await fetch(`/api/monday/email-templates?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
        headers: sessionToken ? { "x-monday-session-token": sessionToken } : undefined,
      });
      const data = (await response.json()) as MondayEmailTemplatesResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to load email templates");
      }
      return data;
    },
    staleTime: 60_000,
  });

  const userProfileQuery = useQuery({
    queryKey: ["monday-user-profile", sessionToken, identity?.userId],
    enabled: !!sessionToken && !!identity?.userId && !staticMode,
    queryFn: async () => {
      const response = await fetch("/api/monday/users/me", {
        method: "GET",
        cache: "no-store",
        headers: sessionToken ? { "x-monday-session-token": sessionToken } : undefined,
      });
      const data = (await response.json()) as MondayUserProfileResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to load Monday user profile");
      }
      return data.user ?? null;
    },
    staleTime: 60_000,
  });

  const editOptionsQuery = useQuery({
    queryKey: ["monday-record-edit-options", sessionToken],
    enabled: !!sessionToken && !staticMode,
    queryFn: async () => {
      const response = await fetch("/api/monday/records/edit-options", {
        method: "GET",
        cache: "no-store",
        headers: sessionToken ? { "x-monday-session-token": sessionToken } : undefined,
      });
      const data = (await response.json()) as MondayRecordEditOptionsResponse;
      if (!response.ok || !data.ok || !data.options) {
        throw new Error(data.error ?? "Failed to load monday edit options");
      }
      return data.options;
    },
    staleTime: 60_000,
  });

  const outlookStatusQuery = useQuery({
    queryKey: ["monday-outlook-status", sessionToken, identity?.userId, settingsOpen],
    enabled: !!sessionToken && !!identity?.userId && settingsOpen && !staticMode,
    queryFn: async () => {
      const response = await fetch("/api/monday/email/outlook/status", {
        method: "GET",
        cache: "no-store",
        headers: sessionToken ? { "x-monday-session-token": sessionToken } : undefined,
      });
      const data = (await response.json()) as OutlookConnectionStatusResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to load Outlook connection status");
      }
      return data;
    },
    staleTime: 30_000,
  });

  const contactUpdatesQuery = useQuery({
    queryKey: [
      "monday-record-updates",
      sessionToken,
      contactHistoryDialogRecord?.id,
      contactHistoryDialogRecord?.contactId,
    ],
    enabled: !!sessionToken && !!contactHistoryDialogRecord && !staticMode,
    queryFn: async () => {
      const contactId = contactHistoryDialogRecord?.contactId?.trim();
      const targetRecordId =
        contactId && contactId.length > 0
          ? contactId
          : (contactHistoryDialogRecord?.id ?? "");
      const response = await fetch(
        `/api/monday/records/${encodeURIComponent(targetRecordId)}/updates?limit=200`,
        {
          method: "GET",
          cache: "no-store",
          headers: sessionToken
            ? { "x-monday-session-token": sessionToken }
            : undefined,
        },
      );
      const data = (await response.json()) as MondayRecordUpdatesResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to load contact conversation history");
      }
      return data;
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ownerParam = params.get("owner");
    const staticParam = params.get("static");
    const outlookParam = params.get("outlook");
    const outlookMessage = params.get("outlookMessage");

    if (ownerParam && ownerParam.trim().length > 0) {
      setOwnerFilter(ownerParam.trim());
    }
    if (staticParam === "1" || staticParam === "true") {
      setStaticMode(true);
    }
    if (outlookParam === "connected") {
      toast.success("Outlook account connected");
    } else if (outlookParam === "error" && outlookMessage) {
      toast.error(outlookMessage);
    }
  }, []);

  useEffect(() => {
    const handleOutlookOAuthMessage = (event: MessageEvent) => {
      const data = event.data as
        | { type?: string; status?: "connected" | "error"; message?: string | null }
        | null;
      if (!data || data.type !== "outlook-oauth-result") return;
      if (data.status === "connected") {
        toast.success("Outlook account connected");
        void outlookStatusQuery.refetch();
      } else if (data.status === "error") {
        toast.error(data.message ?? "Outlook OAuth failed");
      }
    };
    window.addEventListener("message", handleOutlookOAuthMessage);
    return () =>
      window.removeEventListener("message", handleOutlookOAuthMessage);
  }, [outlookStatusQuery]);

  useEffect(() => {
    const initEmbeddedSession = async () => {
      if (staticMode) {
        setSessionToken("static-mode");
        setIdentity({
          accountId: "static-account",
          userId: "53441186",
        });
        setAuthLoading(false);
        return;
      }

      setAuthLoading(true);
      setIdentity(null);

      try {
        let maybeToken = readTokenFromLocation();

        if (!maybeToken) {
          const tokenResponse = await monday.get("sessionToken");
          maybeToken = readTokenFromSdkResponse(tokenResponse);
        }

        if (!maybeToken) {
          const devAuthResponse = await fetch("/api/monday/auth/session", {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({}),
            cache: "no-store",
          });
          const devAuthData = (await devAuthResponse.json()) as {
            ok?: boolean;
            error?: string;
            identity?: MondayIdentity;
            sessionToken?: string;
          };
          if (devAuthResponse.ok && devAuthData.ok && devAuthData.identity) {
            setSessionToken(devAuthData.sessionToken ?? MONDAY_DEV_BYPASS_TOKEN);
            setIdentity(devAuthData.identity);
            return;
          }
          throw new Error(
            devAuthData.error ??
            "Missing Monday session token from SDK/query string",
          );
        }

        const authResponse = await fetch("/api/monday/auth/session", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-monday-session-token": maybeToken,
          },
          body: JSON.stringify({ sessionToken: maybeToken }),
          cache: "no-store",
        });

        const authData = (await authResponse.json()) as {
          ok: boolean;
          error?: string;
          identity?: MondayIdentity;
          sessionToken?: string;
        };

        if (!authResponse.ok || !authData.ok || !authData.identity) {
          throw new Error(authData.error ?? "Unable to verify Monday session");
        }

        setSessionToken(authData.sessionToken ?? maybeToken);
        setIdentity(authData.identity);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to initialize Monday embed session";
        toast.error(message);
      } finally {
        setAuthLoading(false);
      }
    };

    void initEmbeddedSession();
  }, [monday, staticMode]);

  useEffect(() => {
    if (viewMode !== "userScoped") return;
    if (!identity?.userId) return;
    const overrideEnabled =
      (userProfileQuery.data?.email?.toLowerCase() ?? null) === ADMIN_OWNER_OVERRIDE_EMAIL;
    setOwnerFilter((currentValue) => {
      if (currentValue.trim().length > 0) return currentValue;
      return overrideEnabled ? "" : identity.userId;
    });
  }, [identity?.userId, userProfileQuery.data?.email, viewMode]);

  useEffect(() => {
    if (staticMode) return;
    if (!recordsQuery.error) return;
    const message =
      recordsQuery.error instanceof Error
        ? recordsQuery.error.message
        : "Unknown loading error";
    toast.error(message);
  }, [recordsQuery.error, staticMode]);

  useEffect(() => {
    if (staticMode) return;
    if (!settingsOpen) return;
    if (!emailTemplatesQuery.error) return;
    const message =
      emailTemplatesQuery.error instanceof Error
        ? emailTemplatesQuery.error.message
        : "Unknown loading error";
    toast.error(message);
  }, [emailTemplatesQuery.error, settingsOpen, staticMode]);

  useEffect(() => {
    if (staticMode) return;
    if (!userProfileQuery.error) return;
    const message =
      userProfileQuery.error instanceof Error
        ? userProfileQuery.error.message
        : "Unknown loading error";
    toast.error(message);
  }, [staticMode, userProfileQuery.error]);

  useEffect(() => {
    if (staticMode) return;
    if (!editOptionsQuery.error) return;
    const message =
      editOptionsQuery.error instanceof Error
        ? editOptionsQuery.error.message
        : "Unknown loading error";
    toast.error(message);
  }, [editOptionsQuery.error, staticMode]);

  useEffect(() => {
    if (staticMode) return;
    if (!settingsOpen) return;
    if (!outlookStatusQuery.error) return;
    const message =
      outlookStatusQuery.error instanceof Error
        ? outlookStatusQuery.error.message
        : "Unknown loading error";
    toast.error(message);
  }, [outlookStatusQuery.error, settingsOpen, staticMode]);

  useEffect(() => {
    if (staticMode) return;
    if (!contactHistoryDialogRecord) return;
    if (!contactUpdatesQuery.error) return;
    const message =
      contactUpdatesQuery.error instanceof Error
        ? contactUpdatesQuery.error.message
        : "Unknown loading error";
    toast.error(message);
  }, [contactHistoryDialogRecord, contactUpdatesQuery.error, staticMode]);

  useEffect(() => {
    const target = loadMoreAnchorRef.current;
    if (!target || !recordsQuery.hasNextPage || !shouldAutoLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (recordsQuery.isFetchingNextPage) return;
        void recordsQuery.fetchNextPage();
      },
      { rootMargin: "300px 0px 300px 0px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [recordsQuery, shouldAutoLoadMore]);

  const staticRecords = useMemo<MondayRecord[]>(() => {
    if (!staticMode) return [];
    const statuses = ["New", "Qualified", "Contacted", "Closed"] as const;
    return Array.from({ length: 50 }, (_, index) => {
      const id = String(index + 1);
      const ownerId = index % 3 === 0 ? "53441186" : index % 3 === 1 ? "71234567" : "74561234";
      return {
        id,
        name: `Static Lead ${id}`,
        url: null,
        groupTitle: "Static Group",
        statusText: statuses[index % statuses.length] ?? "New",
        peopleText:
          ownerId === "53441186"
            ? "Current Monday User"
            : ownerId === "71234567"
              ? "Owner Two"
              : "Owner Three",
        ownerIds: [ownerId],
        ownerProfiles: [
          {
            id: ownerId,
            name:
              ownerId === "53441186"
                ? "Current Monday User"
                : ownerId === "71234567"
                  ? "Owner Two"
                  : "Owner Three",
            photoThumb: null,
          },
        ],
        email: `lead${id}@example.com`,
        phone: `(555) 010-${String(index).padStart(2, "0")}`,
        address: `${100 + index} Test Ave, Test City`,
        referredToContractors: index % 2 === 0 ? "Contractor A" : "Contractor B",
        hiredWithContractor: index % 3 === 0 ? "Contractor C" : "—",
        hireDate: new Date(
          Date.UTC(2026, 1, (index % 28) + 1, 0, 0, 0),
        ).toISOString(),
        retentionPeriod: ["30 days", "60 days", "90 days"][index % 3] ?? null,
        tags: ["Priority", "Follow Up", "VIP"][index % 3] ?? null,
        createdAt: new Date(
          Date.UTC(2026, 1, (index % 28) + 1, 12, index % 60, 0),
        ).toISOString(),
        updatedAt: new Date(
          Date.UTC(2026, 1, (index % 28) + 1, 13, index % 60, 0),
        ).toISOString(),
        contactDetails: [
          { label: "Name", value: `Static Lead ${id}` },
          { label: "Email", value: `lead${id}@example.com` },
          { label: "Phone", value: `(555) 010-${String(index).padStart(2, "0")}` },
          { label: "Address", value: `${100 + index} Test Ave, Test City` },
          {
            label: "Owner",
            value:
              ownerId === "53441186"
                ? "Current Monday User"
                : ownerId === "71234567"
                  ? "Owner Two"
                  : "Owner Three",
          },
          { label: "Status", value: statuses[index % statuses.length] ?? "New" },
        ],
        resumeFiles: [],
        batteryProgress: index % 5 === 0 ? null : (index * 7) % 101,
      };
    });
  }, [staticMode]);

  const apiRecords = useMemo(() => {
    return (recordsQuery.data?.pages ?? []).flatMap((page) =>
      (page.records ?? []).map((record) => {
        const ownerProfiles = normalizeOwnerProfiles(record.ownerProfiles);
        const ownerIds = normalizeOwnerIds(record.ownerIds);
        const batteryProgress =
          typeof record.batteryProgress === "number" &&
          Number.isFinite(record.batteryProgress)
            ? Math.max(0, Math.min(100, Math.round(record.batteryProgress)))
            : null;
        return {
          ...record,
          ownerProfiles,
          ownerIds,
          resumeFiles: normalizeResumeFiles(record.resumeFiles),
          batteryProgress,
        };
      }),
    );
  }, [recordsQuery.data?.pages]);

  const records = useMemo(() => {
    if (!staticMode) return apiRecords;
    return staticRecords.filter((record) => {
      if (debouncedSearch.trim().length >= 2) {
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
        if (!haystack.includes(debouncedSearch.toLowerCase().trim())) {
          return false;
        }
      }
      if (statusFilter.trim().length > 0) {
        if ((record.statusText ?? "").toLowerCase() !== statusFilter.toLowerCase()) {
          return false;
        }
      }
      if (ownerFilter.trim().length > 0) {
        const ownerIdMatch = record.ownerIds
          .map((ownerId) => ownerId.toLowerCase())
          .includes(ownerFilter.toLowerCase());
        const ownerTextMatch = (record.peopleText ?? "").toLowerCase() === ownerFilter.toLowerCase();
        if (!ownerIdMatch && !ownerTextMatch) {
          return false;
        }
      }
      return true;
    });
  }, [apiRecords, debouncedSearch, ownerFilter, staticMode, staticRecords, statusFilter]);
  const boardName = staticMode
    ? "Static Test Board (50 records)"
    : recordsQuery.data?.pages[0]?.boardName ?? "Monday Board";
  const approvalSteps = useMemo(() => {
    const fromApi = recordsQuery.data?.pages[0]?.approvalSteps;
    if (!fromApi || fromApi.length === 0) {
      return APPROVAL_STEPS;
    }
    const titleById = new Map(
      fromApi
        .filter(
          (step): step is ApprovalStepConfig =>
            step.id.trim().length > 0 && step.title.trim().length > 0,
        )
        .map((step) => [step.id.trim(), step.title.trim()] as const),
    );
    return APPROVAL_STEPS.map((step) => ({
      id: step.id,
      title: titleById.get(step.id) ?? step.title,
    }));
  }, [recordsQuery.data?.pages]);
  const emailTemplates = useMemo(
    () => (staticMode ? [] : (emailTemplatesQuery.data?.templates ?? [])),
    [emailTemplatesQuery.data?.templates, staticMode],
  );
  const currentUserEmail = userProfileQuery.data?.email?.toLowerCase() ?? null;
  const canOverrideUserScopeOwner =
    viewMode === "userScoped" && currentUserEmail === ADMIN_OWNER_OVERRIDE_EMAIL;
  const isOwnerFilterEditable = viewMode === "all" || canOverrideUserScopeOwner;

  useEffect(() => {
    if (viewMode !== "userScoped") return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (ownerFilter.trim().length > 0) {
      params.set("owner", ownerFilter.trim());
    } else {
      params.delete("owner");
    }
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
    window.history.replaceState(null, "", nextUrl);
  }, [ownerFilter, viewMode]);

  useEffect(() => {
    if (emailTemplates.length === 0) return;
    if (
      selectedTemplateId &&
      emailTemplates.some((template) => template.id === selectedTemplateId)
    ) {
      return;
    }
    setSelectedTemplateId(emailTemplates[0]?.id ?? null);
  }, [emailTemplates, selectedTemplateId]);

  useEffect(() => {
    if (!identity?.userId) return;
    setAddContactValues((prev) => {
      if (prev.ownerId.trim().length > 0) return prev;
      return { ...prev, ownerId: identity.userId };
    });
  }, [identity?.userId]);

  const selectedTemplate = useMemo(() => {
    return (
      emailTemplates.find((template) => template.id === selectedTemplateId) ??
      emailTemplates[0] ??
      null
    );
  }, [emailTemplates, selectedTemplateId]);
  const sendEmailTemplate = useMemo(() => {
    return (
      emailTemplates.find((template) => template.id === sendEmailTemplateId) ??
      emailTemplates[0] ??
      null
    );
  }, [emailTemplates, sendEmailTemplateId]);

  const callbackUrl = useMemo(() => {
    if (typeof window === "undefined") return "/api/monday/email/outlook/callback";
    const path =
      outlookStatusQuery.data?.callbackPath ?? "/api/monday/email/outlook/callback";
    return `${window.location.origin}${path}`;
  }, [outlookStatusQuery.data?.callbackPath]);

  const handleConnectOutlook = async () => {
    if (!sessionToken) {
      toast.error("Missing Monday session token");
      return;
    }
    setIsConnectingOutlook(true);
    try {
      const response = await fetch("/api/monday/email/outlook/connect", {
        method: "GET",
        cache: "no-store",
        headers: { "x-monday-session-token": sessionToken },
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        authorizeUrl?: string;
      };
      if (!response.ok || !data.ok || !data.authorizeUrl) {
        throw new Error(data.error ?? "Failed to initialize Outlook OAuth");
      }
      const popup = window.open(
        data.authorizeUrl,
        "outlook-oauth",
        "popup=yes,width=680,height=760,noopener",
      );
      if (!popup) {
        window.location.assign(data.authorizeUrl);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to initialize Outlook OAuth";
      toast.error(message);
    } finally {
      setIsConnectingOutlook(false);
    }
  };

  const handleDisconnectOutlook = async () => {
    if (!sessionToken) {
      toast.error("Missing Monday session token");
      return;
    }
    setIsDisconnectingOutlook(true);
    try {
      const response = await fetch("/api/monday/email/outlook/disconnect", {
        method: "POST",
        cache: "no-store",
        headers: { "x-monday-session-token": sessionToken },
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to disconnect Outlook");
      }
      toast.success("Outlook account disconnected");
      await outlookStatusQuery.refetch();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to disconnect Outlook";
      toast.error(message);
    } finally {
      setIsDisconnectingOutlook(false);
    }
  };

  const openSendEmailDialog = (record: MondayRecord) => {
    setSendEmailRecord(record);
    setSendEmailStep(1);
    setSendEmailTemplateId(emailTemplates[0]?.id ?? null);
  };
  const closeSendEmailDialog = () => {
    setSendEmailRecord(null);
    setSendEmailStep(1);
    setSendEmailTemplateId(null);
    setIsSendingEmail(false);
  };
  const handleConfirmSendEmail = async () => {
    if (!sessionToken || !sendEmailRecord || !sendEmailTemplate) {
      toast.error("Missing email send context");
      return;
    }
    const recipient = sendEmailRecord.email?.trim() ?? "";
    if (!recipient) {
      toast.error("This contact does not have an email address");
      return;
    }
    setIsSendingEmail(true);
    try {
      const response = await fetch("/api/monday/email/send", {
        method: "POST",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-monday-session-token": sessionToken,
        },
        body: JSON.stringify({
          to: recipient,
          subject: sendEmailTemplate.name,
          html:
            sendEmailTemplate.renderedHtml.trim().length > 0
              ? sendEmailTemplate.renderedHtml
              : sendEmailTemplate.content,
        }),
      });
      const data = (await response.json()) as MondaySendEmailResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to send email");
      }
      toast.success(`Email sent to ${recipient}`);
      closeSendEmailDialog();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send email";
      toast.error(message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const ownerProfileById = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string | null; photoThumb: string | null }
    >();
    for (const record of records) {
      for (const owner of record.ownerProfiles) {
        if (!map.has(owner.id)) {
          map.set(owner.id, owner);
        }
      }
    }
    return map;
  }, [records]);

  const ownerOptions = useMemo(() => {
    return Array.from(
      new Map(
        records
          .flatMap((record) => {
            const ids = Array.isArray(record.ownerIds) ? record.ownerIds : [];
            return ids.map((id) => ({
              value: id,
              label:
                record.peopleText && record.peopleText.trim().length > 0
                  ? `${record.peopleText} (${id})`
                  : `User ${id}`,
            }));
          })
          .map((entry) => [entry.value, entry.label] as const),
      ),
    )
      .map(([value, label]) => {
        const ownerProfile = ownerProfileById.get(value);
        return {
          value,
          label,
          name: ownerProfile?.name ?? null,
          photoThumb: ownerProfile?.photoThumb ?? null,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [ownerProfileById, records]);
  const addContactOwnerOptions = useMemo(() => {
    const base = ownerOptions.map((option) => ({ ...option }));
    if (identity?.userId) {
      const exists = base.some((option) => option.value === identity.userId);
      if (!exists) {
        base.unshift({
          value: identity.userId,
          label: `Current User (${identity.userId})`,
          name: null,
          photoThumb: null,
        });
      }
    }
    return base;
  }, [identity?.userId, ownerOptions]);
  const ownerOptionHasSelectedValue = useMemo(() => {
    if (ownerFilter.trim().length === 0) return true;
    return ownerOptions.some((option) => option.value === ownerFilter);
  }, [ownerFilter, ownerOptions]);

  const statusOptions = useMemo(() => {
    return uniqueSorted(records.map((record) => record.statusText)).map((value) => ({
      label: value,
      value,
    }));
  }, [records]);

  const retentionOptions = useMemo(() => {
    const fromApi = editOptionsQuery.data;
    const referredFallback = uniqueSorted(
      records.map((record) => record.referredToContractors),
    );
    const hiredFallback = uniqueSorted(records.map((record) => record.hiredWithContractor));
    const periodFallback = uniqueSorted(records.map((record) => record.retentionPeriod));
    const tagsFallback = uniqueSorted(
      records.flatMap((record) => splitCsvValues(record.tags)),
    );
    const hireDateFallback = uniqueSorted(
      records.map((record) => normalizeDateOnlyFromRecord(record.hireDate)).filter(Boolean),
    );

    return {
      referredToContractors: fromApi?.referredToContractors.length
        ? fromApi.referredToContractors
        : referredFallback,
      hiredWithContractor: fromApi?.hiredWithContractor.length
        ? fromApi.hiredWithContractor
        : hiredFallback,
      retentionPeriod: fromApi?.retentionPeriod.length
        ? fromApi.retentionPeriod
        : periodFallback,
      tags: fromApi?.tags.length ? fromApi.tags : tagsFallback,
      hireDate: hireDateFallback,
    };
  }, [editOptionsQuery.data, records]);

  const openRetentionDialog = (record: MondayRecord) => {
    setRetentionDialogRecord(record);
    setRetentionHireDatePopoverOpen(false);
    setRetentionDraft({
      referredToContractors: splitCsvValues(record.referredToContractors),
      hiredWithContractor: record.hiredWithContractor ?? "",
      hireDate: normalizeDateOnlyFromRecord(record.hireDate),
      retentionPeriod: record.retentionPeriod ?? "",
    });
  };

  const openTagsDialog = (record: MondayRecord) => {
    setTagsDialogRecord(record);
    setTagsDraft(splitCsvValues(record.tags));
  };
  const openStatusDialog = (record: MondayRecord) => {
    setStatusDialogRecord(record);
    setStatusDraft(record.statusText ?? "");
  };
  const openOwnerDialog = (record: MondayRecord) => {
    setOwnerDialogRecord(record);
    setOwnerDraft(record.ownerIds[0] ?? "");
  };
  const openContactHistoryDialog = (record: MondayRecord) => {
    setContactHistoryDialogRecord(record);
  };

  const handleSaveRetention = async () => {
    if (!sessionToken || !retentionDialogRecord) {
      toast.error("Missing monday session context");
      return;
    }
    if (!window.confirm("Are you sure you want to update retention values?")) {
      return;
    }
    setIsSavingRetention(true);
    try {
      const contactId = retentionDialogRecord.contactId?.trim();
      const targetRecordId =
        contactId && contactId.length > 0
          ? contactId
          : retentionDialogRecord.id;
      const response = await fetch(`/api/monday/records/${targetRecordId}`, {
        method: "PATCH",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-monday-session-token": sessionToken,
        },
        body: JSON.stringify({
          referredToContractors:
            retentionDraft.referredToContractors.length > 0
              ? retentionDraft.referredToContractors
              : null,
          hiredWithContractor: retentionDraft.hiredWithContractor || null,
          hireDate: retentionDraft.hireDate || null,
          retentionPeriod: retentionDraft.retentionPeriod || null,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to update retention values");
      }
      toast.success("Retention values updated");
      setRetentionDialogRecord(null);
      await recordsQuery.refetch();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update retention values";
      toast.error(message);
    } finally {
      setIsSavingRetention(false);
    }
  };

  const handleSaveTags = async () => {
    if (!sessionToken || !tagsDialogRecord) {
      toast.error("Missing monday session context");
      return;
    }
    if (!window.confirm("Are you sure you want to update tags?")) {
      return;
    }
    setIsSavingTags(true);
    try {
      const contactId = tagsDialogRecord.contactId?.trim();
      const targetRecordId =
        contactId && contactId.length > 0 ? contactId : tagsDialogRecord.id;
      const response = await fetch(`/api/monday/records/${targetRecordId}`, {
        method: "PATCH",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-monday-session-token": sessionToken,
        },
        body: JSON.stringify({
          tags: tagsDraft,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to update tags");
      }
      toast.success("Tags updated");
      setTagsDialogRecord(null);
      await recordsQuery.refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update tags";
      toast.error(message);
    } finally {
      setIsSavingTags(false);
    }
  };
  const handleSaveStatus = async () => {
    if (!sessionToken || !statusDialogRecord) {
      toast.error("Missing monday session context");
      return;
    }
    if (!window.confirm("Are you sure you want to update status?")) {
      return;
    }
    setIsSavingStatus(true);
    try {
      const contactId = statusDialogRecord.contactId?.trim();
      const targetRecordId =
        contactId && contactId.length > 0 ? contactId : statusDialogRecord.id;
      const response = await fetch(`/api/monday/records/${targetRecordId}`, {
        method: "PATCH",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-monday-session-token": sessionToken,
        },
        body: JSON.stringify({
          status: statusDraft || null,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to update status");
      }
      toast.success("Status updated");
      setStatusDialogRecord(null);
      await recordsQuery.refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update status";
      toast.error(message);
    } finally {
      setIsSavingStatus(false);
    }
  };
  const handleSaveOwner = async () => {
    if (!sessionToken || !ownerDialogRecord) {
      toast.error("Missing monday session context");
      return;
    }
    if (!window.confirm("Are you sure you want to update owner?")) {
      return;
    }
    setIsSavingOwner(true);
    try {
      const contactId = ownerDialogRecord.contactId?.trim();
      const targetRecordId =
        contactId && contactId.length > 0 ? contactId : ownerDialogRecord.id;
      const response = await fetch(`/api/monday/records/${targetRecordId}`, {
        method: "PATCH",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-monday-session-token": sessionToken,
        },
        body: JSON.stringify({
          ownerId: ownerDraft || null,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to update owner");
      }
      toast.success("Owner updated");
      setOwnerDialogRecord(null);
      await recordsQuery.refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update owner";
      toast.error(message);
    } finally {
      setIsSavingOwner(false);
    }
  };

  const handleUploadResume = async (record: MondayRecord, file: File) => {
    if (!sessionToken) {
      toast.error("Missing monday session context");
      return;
    }
    if (file.size <= 0) {
      toast.error("Please choose a valid file");
      return;
    }

    const contactId = record.contactId?.trim();
    const targetRecordId = contactId && contactId.length > 0 ? contactId : record.id;

    setUploadingResumeByRecordId((prev) => ({
      ...prev,
      [record.id]: true,
    }));
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(
        `/api/monday/records/${encodeURIComponent(targetRecordId)}/resume`,
        {
          method: "POST",
          cache: "no-store",
          headers: {
            "x-monday-session-token": sessionToken,
          },
          body: formData,
        },
      );
      const data = (await response.json()) as MondayResumeUploadResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to upload resume");
      }
      toast.success("Resume uploaded");
      await recordsQuery.refetch();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to upload resume";
      toast.error(message);
    } finally {
      setUploadingResumeByRecordId((prev) => ({
        ...prev,
        [record.id]: false,
      }));
    }
  };

  const getResumeFileHref = (file: {
    assetId: string | null;
    url: string | null;
  }) => {
    if (file.assetId) {
      return `/api/monday/email-templates/assets/${encodeURIComponent(file.assetId)}`;
    }
    if (file.url) return file.url;
    return null;
  };

  const resetAddContactDialog = () => {
    setAddContactStep(1);
    setExistingContactsByEmail([]);
    setIsCheckingDuplicates(false);
    setIsCreatingContact(false);
    setAddContactValues({
      firstName: "",
      lastName: "",
      email: "",
      address: "",
      ownerId: identity?.userId ?? "",
    });
  };

  const handleCreateContact = async () => {
    if (!sessionToken) {
      toast.error("Missing monday session token");
      return;
    }
    setIsCreatingContact(true);
    try {
      const response = await fetch("/api/monday/contacts", {
        method: "POST",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-monday-session-token": sessionToken,
        },
        body: JSON.stringify(addContactValues),
      });
      const data = (await response.json()) as MondayCreateContactResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to create contact");
      }
      toast.success("Contact created");
      setAddContactOpen(false);
      resetAddContactDialog();
      await recordsQuery.refetch();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create contact";
      toast.error(message);
    } finally {
      setIsCreatingContact(false);
    }
  };

  const handleCheckDuplicatesAndContinue = async () => {
    if (!sessionToken) {
      toast.error("Missing monday session token");
      return;
    }
    if (
      !addContactValues.firstName.trim() ||
      !addContactValues.lastName.trim() ||
      !addContactValues.email.trim()
    ) {
      toast.error("First name, last name, and email are required");
      return;
    }
    setIsCheckingDuplicates(true);
    try {
      const params = new URLSearchParams();
      params.set("email", addContactValues.email.trim());
      const response = await fetch(`/api/monday/contacts?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
        headers: { "x-monday-session-token": sessionToken },
      });
      const data = (await response.json()) as MondayContactsLookupResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed duplicate lookup");
      }
      const existing = data.existing ?? [];
      if (existing.length > 0) {
        setExistingContactsByEmail(existing);
        setAddContactStep(2);
        return;
      }
      await handleCreateContact();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed duplicate lookup";
      toast.error(message);
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  const columns: ColumnDefinition<MondayRecord>[] = [
    {
      id: "name",
      header: "Item",
      accessorKey: "name",
      cell: (item: MondayRecord) => {
        const details = getContactTooltipDetails(item);
        const addressDisplay = getAddressDisplayParts(item.address);
        return (
          <button
            type="button"
            onClick={() => openContactHistoryDialog(item)}
            className="hover:bg-accent/40 flex w-full cursor-pointer gap-3 rounded-md p-2 text-left"
          >
            <Avatar className="mt-0.5 size-9">
              <AvatarFallback className="text-xs font-semibold">
                {getNameInitials(item.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="space-y-1">
                    <span className="block font-medium">{item.name}</span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {item.email ?? "No email"}
                    </span>
                    {addressDisplay.full ? (
                      <span className="text-muted-foreground block text-xs">
                        {addressDisplay.prefix ? `${addressDisplay.prefix}, ` : ""}
                        {addressDisplay.cityStateZip ? (
                          <span className="text-sm font-semibold text-foreground">
                            {addressDisplay.cityStateZip}
                          </span>
                        ) : (
                          addressDisplay.full
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground block text-xs">No address</span>
                    )}
                    <span className="text-muted-foreground block text-xs">
                      {item.phone ?? "No phone"}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  align="start"
                  sideOffset={8}
                  className="max-w-md p-3"
                >
                  <div className="space-y-2">
                    <p className="text-xs font-semibold tracking-wide uppercase">
                      Contact details
                    </p>
                    <div className="max-h-72 space-y-1 overflow-y-auto">
                      {details.map((detail) => (
                        <div
                          key={`${detail.label}-${detail.value}`}
                          className="grid grid-cols-[100px_1fr] gap-2 text-xs"
                        >
                          <span className="text-muted">{detail.label}</span>
                          <span className="wrap-break-word">{detail.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
              <ApprovalProgressIndicator
                progressValue={item.batteryProgress}
                steps={approvalSteps}
              />
            </div>
          </button>
        );
      },
    },
    {
      id: "statusText",
      header: "District",
      accessorKey: "statusText",
      cell: (item: MondayRecord) => (
        <button
          type="button"
          onClick={() => openStatusDialog(item)}
          className="hover:bg-accent/40 w-full cursor-pointer rounded-md p-2 text-left"
        >
          {item.statusText ? (
            <span
              className={`inline-flex min-w-[86px] items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium ${getDistrictChipClassName(item.statusText)}`}
            >
              {item.statusText}
            </span>
          ) : (
            "—"
          )}
        </button>
      ),
    },
    {
      id: "peopleText",
      header: "Owner",
      accessorKey: "peopleText",
      cell: (item: MondayRecord) => (
        <button
          type="button"
          onClick={() => openOwnerDialog(item)}
          className="hover:bg-accent/40 flex w-full cursor-pointer items-center justify-center rounded-md p-2 text-center"
        >
          {item.ownerProfiles.length > 0 ? (
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center justify-center -space-x-2">
                {item.ownerProfiles.slice(0, 3).map((owner) => (
                  <Avatar
                    key={owner.id}
                    className="size-8 border-2 border-background shadow-sm"
                  >
                    {owner.photoThumb ? (
                      <AvatarImage src={owner.photoThumb} alt={owner.name ?? owner.id} />
                    ) : null}
                    <AvatarFallback className="text-xs font-semibold">
                      {getNameInitials(owner.name ?? owner.id)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="line-clamp-2 max-w-[180px] text-[11px] leading-tight">
                {item.ownerProfiles
                  .map((owner) => owner.name?.trim() ?? owner.id)
                  .join(", ")}
              </span>
            </div>
          ) : (
            <span className="text-xs">{item.peopleText ?? "—"}</span>
          )}
        </button>
      ),
    },
    {
      id: "retention",
      header: "Retention",
      accessorKey: "referredToContractors",
      cell: (item: MondayRecord) => {
        const referredValues = splitCsvValues(item.referredToContractors);
        return (
          <button
            type="button"
            onClick={() => openRetentionDialog(item)}
            className="hover:bg-accent/40 flex w-full max-w-[340px] cursor-pointer flex-col items-start gap-1 rounded-md p-2 text-left"
          >
            <div className="w-full space-y-1">
              <span className="block text-xs font-medium">Referred:</span>
              {referredValues.length > 0 ? (
                <div className="flex max-w-full flex-wrap gap-1">
                  {referredValues.map((value) => (
                    <BusinessInfoHoverCard
                      key={value}
                      companyName={value}
                    >
                      <Badge
                        variant="secondary"
                        className="max-w-full cursor-help truncate text-[10px]"
                        title={value}
                      >
                        {value}
                      </Badge>
                    </BusinessInfoHoverCard>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )}
            </div>
            <span className="block w-full truncate text-xs">
              <span className="font-medium">Hired With:</span>{" "}
              {item.hiredWithContractor?.trim() ? (
                <BusinessInfoHoverCard companyName={item.hiredWithContractor}>
                  <Badge variant="secondary" className="ml-1 cursor-help text-[10px]">
                    {item.hiredWithContractor}
                  </Badge>
                </BusinessInfoHoverCard>
              ) : (
                "—"
              )}
            </span>
            <span className="block w-full truncate text-xs">
              <span className="font-medium">Hire Date:</span>{" "}
              {item.hireDate ? formatUpdatedAt(item.hireDate) : "—"}
            </span>
            <span className="block w-full truncate text-xs">
              <span className="font-medium">Period:</span>{" "}
              {item.retentionPeriod ?? "—"}
            </span>
          </button>
        );
      },
    },
    {
      id: "tags",
      header: "Tags",
      accessorKey: "tags",
      cell: (item: MondayRecord) => {
        const tagValues = splitCsvValues(item.tags);
        return (
          <button
            type="button"
            onClick={() => openTagsDialog(item)}
            title={item.tags ?? ""}
            className="hover:bg-accent/40 w-full cursor-pointer rounded-md p-2 text-left"
          >
            {tagValues.length > 0 ? (
              <div className="flex max-w-[260px] flex-wrap gap-1">
                {tagValues.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="max-w-full truncate text-[10px]"
                    title={tag}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground text-xs">—</span>
            )}
          </button>
        );
      },
    },
    {
      id: "resume",
      header: "Resume",
      accessorKey: "resumeFiles",
      cell: (item: MondayRecord) => {
        const firstFile = item.resumeFiles[0] ?? null;
        const isUploading = uploadingResumeByRecordId[item.id] === true;
        const fileHref = firstFile ? getResumeFileHref(firstFile) : null;
        return (
          <div className="space-y-2 p-1">
            {firstFile ? (
              <button
                type="button"
                onClick={() => {
                  if (!fileHref) {
                    toast.error("Unable to open resume file");
                    return;
                  }
                  setResumePreview({
                    fileName: firstFile.name,
                    href: fileHref,
                    recordName: item.name,
                  });
                }}
                className="text-primary block truncate text-xs underline"
                title={firstFile.name}
              >
                {firstFile.name}
              </button>
            ) : (
              <span className="text-muted-foreground block text-xs">No file</span>
            )}
            <div className="flex items-center gap-2">
              <input
                type="file"
                className="max-w-[170px] text-xs"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void handleUploadResume(item, file);
                  event.currentTarget.value = "";
                }}
                disabled={isUploading || staticMode}
              />
              {isUploading ? (
                <span className="text-muted-foreground text-xs">Uploading...</span>
              ) : null}
            </div>
          </div>
        );
      },
    },
    {
      id: "createdAt",
      header: "Created at",
      accessorKey: "createdAt",
      sortable: true,
      cell: (item: MondayRecord) => {
        const formatted = formatDateTimeParts(item.createdAt);
        return (
          <div className="leading-tight">
            <div>{formatted.date}</div>
            {formatted.time ? (
              <div className="text-muted-foreground text-xs">{formatted.time}</div>
            ) : null}
          </div>
        );
      },
    },
    {
      id: "updatedAt",
      header: "Updated",
      accessorKey: "updatedAt",
      sortable: true,
      cell: (item: MondayRecord) => {
        const formatted = formatDateTimeParts(item.updatedAt);
        return (
          <div className="leading-tight">
            <div>{formatted.date}</div>
            {formatted.time ? (
              <div className="text-muted-foreground text-xs">{formatted.time}</div>
            ) : null}
          </div>
        );
      },
    },
  ];

  const entityActions: EntityAction<MondayRecord>[] = [
    {
      id: "open",
      label: "Open",
      icon: <ExternalLink className="h-4 w-4" />,
      variant: "outline",
      onClick: (record) => {
        if (!record.url) return;
        window.open(record.url, "_blank", "noopener,noreferrer");
      },
      isDisabled: (record) => !record.url,
    },
    {
      id: "send-email",
      label: "Send Email",
      icon: <Mail className="h-4 w-4" />,
      variant: "secondary",
      onClick: (record) => {
        openSendEmailDialog(record);
      },
      isDisabled: (record) => !record.email || !sessionToken || staticMode,
    },

  ];

  return (
    <div className="monday-like-page container mx-auto max-w-[1600px] space-y-3 py-4">
      {identity ? (
        <div className="text-muted-foreground text-xs">
          Connected account: {identity.accountId} · user: {identity.userId} · board:{" "}
          {boardName}
          {staticMode ? " · static mode" : ""}
          {viewMode === "userScoped" && !isOwnerFilterEditable
            ? " · owner scope locked to current user"
            : ""}
          {canOverrideUserScopeOwner ? " · owner scope override enabled" : ""}
        </div>
      ) : null}

      <div className="bg-card/70 rounded-lg border px-3 py-2">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="w-full max-w-xl min-w-[280px] flex-1 space-y-1">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search records (server, 2+ chars)"
                className="bg-background/90 h-8 max-w-xl text-sm"
              />
              {search.trim().length > 0 && search.trim().length < 2 ? (
                <p className="text-muted-foreground text-xs">
                  Type at least 2 characters to run server search.
                </p>
              ) : null}
            </div>
            <div className="bg-background flex items-center gap-1 rounded-md border p-1">
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2.5"
                onClick={() => {
                  setActiveMonth(
                    (prev) =>
                      new Date(
                        Date.UTC(
                          prev.getUTCFullYear(),
                          prev.getUTCMonth() - 1,
                          1,
                        ),
                      ),
                  );
                }}
              >
                <ChevronLeft className="mr-1.5 h-4 w-4" />
                Prev month
              </Button>
              <Badge variant="outline" className="h-8 rounded-sm px-2 text-xs">
                {monthBounds.label}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2.5"
                onClick={() => {
                  setActiveMonth(
                    (prev) =>
                      new Date(
                        Date.UTC(
                          prev.getUTCFullYear(),
                          prev.getUTCMonth() + 1,
                          1,
                        ),
                      ),
                  );
                }}
              >
                Next month
                <ChevronRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="border-t pt-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 *:shrink-0">
                <select
                  value={ownerFilter || "__all_owner__"}
                  onChange={(event) => {
                    if (!isOwnerFilterEditable) return;
                    const value = event.target.value;
                    setOwnerFilter(value === "__all_owner__" ? "" : value);
                  }}
                  className="bg-background border-input h-8 w-60 rounded-md border px-2.5 text-xs"
                  disabled={!isOwnerFilterEditable}
                >
                  {isOwnerFilterEditable ? (
                    <option value="__all_owner__">Owner: all</option>
                  ) : (
                    <option value={identity?.userId ?? "__all_owner__"}>Owner: me</option>
                  )}
                  {!ownerOptionHasSelectedValue && ownerFilter.trim().length > 0 ? (
                    <option value={ownerFilter}>{`Owner ${ownerFilter} (selected)`}</option>
                  ) : null}
                  {ownerOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={statusFilter || "__all_status__"}
                  onChange={(event) => {
                    const value = event.target.value;
                    setStatusFilter(value === "__all_status__" ? "" : value);
                  }}
                  className="bg-background border-input h-8 w-[200px] rounded-md border px-2.5 text-xs"
                >
                  <option value="__all_status__">District: all</option>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 *:shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => {
                    if (staticMode) return;
                    void recordsQuery.refetch();
                  }}
                  disabled={staticMode || recordsQuery.isFetching}
                >
                  <RefreshCcw className="mr-1.5 h-4 w-4" />
                  Reload
                </Button>
                {viewMode === "userScoped" ? (
                  <Button
                    size="sm"
                    variant="default"
                    className="h-8"
                    onClick={() => {
                      resetAddContactDialog();
                      setAddContactOpen(true);
                    }}
                    disabled={authLoading || !identity?.userId}
                  >
                    <UserPlus className="mr-1.5 h-4 w-4" />
                    Add Contact
                  </Button>
                ) : null}
                {!staticMode && recordsQuery.hasNextPage ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8"
                    onClick={() => {
                      void recordsQuery.fetchNextPage();
                    }}
                    disabled={recordsQuery.isFetchingNextPage}
                  >
                    {recordsQuery.isFetchingNextPage ? "Loading..." : "Load more"}
                  </Button>
                ) : null}
                <Button asChild size="sm" variant="outline" className="h-8">
                  <Link
                    href="https://developer.monday.com/api-reference/reference/items-page"
                    target="_blank"
                    rel="noreferrer"
                  >
                    API docs
                  </Link>
                </Button>
                <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="h-8">
                      <Settings className="mr-1.5 h-4 w-4" />
                      Settings
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Monday Settings</DialogTitle>
                    </DialogHeader>
                    <Tabs defaultValue="email-templates" className="flex gap-4">
                      <TabsList className="h-auto w-56 shrink-0 flex-col items-stretch">
                        <TabsTrigger
                          value="email-templates"
                          className="w-full justify-start text-left"
                        >
                          Email Templates
                        </TabsTrigger>
                        <TabsTrigger
                          value="email-settings"
                          className="w-full justify-start text-left"
                        >
                          Email Settings
                        </TabsTrigger>
                        <TabsTrigger
                          value="user-zip-map"
                          className="w-full justify-start text-left"
                        >
                          User {"<->"} Zipcode map
                        </TabsTrigger>
                      </TabsList>
                      <div className="min-h-80 flex-1 rounded-md border p-4">
                        <TabsContent value="email-templates" className="mt-0">
                          <div className="grid gap-4 md:grid-cols-[260px_1fr]">
                            <div className="space-y-2">
                              <p className="text-sm font-medium">
                                Templates ({emailTemplates.length})
                              </p>
                              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                                {emailTemplates.map((template) => {
                                  const isActive = template.id === selectedTemplate?.id;
                                  return (
                                    <button
                                      key={template.id}
                                      type="button"
                                      className={[
                                        "w-full rounded-md border px-3 py-2 text-left text-sm transition-colors",
                                        isActive
                                          ? "border-primary bg-primary/10"
                                          : "hover:bg-muted/60",
                                      ].join(" ")}
                                      onClick={() => {
                                        setSelectedTemplateId(template.id);
                                      }}
                                    >
                                      <p className="line-clamp-1 font-medium">{template.name}</p>
                                      <p className="text-muted-foreground mt-1 text-xs">
                                        Updated {formatUpdatedAt(template.updatedAt)}
                                      </p>
                                    </button>
                                  );
                                })}
                                {emailTemplates.length === 0 && !emailTemplatesQuery.isLoading ? (
                                  <p className="text-muted-foreground text-sm">
                                    No templates found on board 18401299370.
                                  </p>
                                ) : null}
                                {emailTemplatesQuery.isLoading ? (
                                  <p className="text-muted-foreground text-sm">
                                    Loading templates...
                                  </p>
                                ) : null}
                              </div>
                            </div>
                            <div className="bg-background min-h-[420px] rounded-md border p-4">
                              {selectedTemplate ? (
                                <div className="space-y-4">
                                  <div className="border-b pb-3">
                                    <p className="text-xs font-semibold tracking-wide uppercase">
                                      Subject
                                    </p>
                                    <p className="mt-1 text-base font-medium">
                                      {selectedTemplate.name}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold tracking-wide uppercase">
                                      Email Preview (Lead View)
                                    </p>
                                    <div className="bg-card mt-2 rounded-md border p-4">
                                      {selectedTemplate.content.trim().length === 0 ? (
                                        <p className="text-muted-foreground text-sm">
                                          No content found in column doc_mm0wq4r.
                                        </p>
                                      ) : selectedTemplate.renderedHtml.trim().length > 0 ? (
                                        <div
                                          className="prose prose-sm dark:prose-invert max-w-none"
                                          dangerouslySetInnerHTML={{
                                            __html: selectedTemplate.renderedHtml,
                                          }}
                                        />
                                      ) : (
                                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                          {selectedTemplate.content}
                                        </div>
                                      )}
                                      {selectedTemplate.docLink ? (
                                        <p className="mt-3 text-xs">
                                          <a
                                            href={selectedTemplate.docLink}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-primary underline underline-offset-2"
                                          >
                                            Open source Monday Workdoc
                                          </a>
                                        </p>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-muted-foreground text-sm">
                                  Select an email template to preview.
                                </p>
                              )}
                            </div>
                          </div>
                        </TabsContent>
                        <TabsContent value="user-zip-map" className="mt-0">
                          <div className="space-y-2">
                            <p className="text-sm font-medium">User {"<->"} Zipcode map</p>
                            <p className="text-muted-foreground text-sm">
                              Define zipcode ownership and routing by user.
                            </p>
                          </div>
                        </TabsContent>
                        <TabsContent value="email-settings" className="mt-0">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Email Settings</p>
                              <p className="text-muted-foreground text-sm">
                                Configure outbound email account settings for sending
                                monday-designed templates.
                              </p>
                            </div>
                            <div className="space-y-3 rounded-md border p-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant={
                                    outlookStatusQuery.data?.connected
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {outlookStatusQuery.data?.connected
                                    ? "Outlook connected"
                                    : "Outlook not connected"}
                                </Badge>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    void handleConnectOutlook();
                                  }}
                                  disabled={isConnectingOutlook}
                                >
                                  {isConnectingOutlook ? "Connecting..." : "Connect Outlook"}
                                </Button>
                                {outlookStatusQuery.data?.connected ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      void handleDisconnectOutlook();
                                    }}
                                    disabled={isDisconnectingOutlook}
                                  >
                                    {isDisconnectingOutlook
                                      ? "Disconnecting..."
                                      : "Disconnect"}
                                  </Button>
                                ) : null}
                              </div>
                              <div className="text-muted-foreground text-sm">
                                {outlookStatusQuery.data?.connection?.email ? (
                                  <p>
                                    Connected mailbox:{" "}
                                    {outlookStatusQuery.data.connection.email}
                                  </p>
                                ) : (
                                  <p>
                                    Use OAuth to connect Outlook, then use this account
                                    for sending and engagement tracking.
                                  </p>
                                )}
                                {outlookStatusQuery.data?.connection?.updatedAt ? (
                                  <p className="mt-1">
                                    Last updated:{" "}
                                    {new Date(
                                      outlookStatusQuery.data.connection.updatedAt,
                                    ).toLocaleString()}
                                  </p>
                                ) : null}
                              </div>
                              <div className="rounded-md border bg-muted/30 p-3">
                                <p className="text-xs font-semibold tracking-wide uppercase">
                                  Callback URL
                                </p>
                                <p className="mt-1 break-all font-mono text-xs">
                                  {callbackUrl}
                                </p>
                              </div>
                            </div>
                          </div>
                        </TabsContent>
                      </div>
                    </Tabs>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={addContactOpen}
        onOpenChange={(open) => {
          setAddContactOpen(open);
          if (!open) {
            resetAddContactDialog();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
          </DialogHeader>
          {addContactStep === 1 ? (
            <AddNewContactForm
              values={addContactValues}
              ownerOptions={addContactOwnerOptions}
              isSubmitting={isCheckingDuplicates || isCreatingContact}
              onChange={(key, value) => {
                setAddContactValues((prev) => ({ ...prev, [key]: value }));
              }}
              onSubmit={() => {
                void handleCheckDuplicatesAndContinue();
              }}
            />
          ) : (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Before we create, we found these records with the same email.
                </p>
                <p className="text-muted-foreground text-sm">
                  Do you want to use one of these existing records?
                </p>
              </div>
              <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border p-2">
                {existingContactsByEmail.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between gap-3 rounded-md border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{record.name || record.id}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {record.email ?? "No email"} · {record.owner ?? "No owner"}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Updated: {record.updatedAt ? formatUpdatedAt(record.updatedAt) : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {record.url ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            window.open(record.url ?? "", "_blank", "noopener,noreferrer")
                          }
                        >
                          Open
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        onClick={() => {
                          toast.success("Using existing contact");
                          setAddContactOpen(false);
                          resetAddContactDialog();
                        }}
                      >
                        Use Existing
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between gap-2">
                <Button
                  variant="outline"
                  onClick={() => setAddContactStep(1)}
                  disabled={isCreatingContact}
                >
                  Back
                </Button>
                <Button
                  onClick={() => {
                    void handleCreateContact();
                  }}
                  disabled={isCreatingContact}
                >
                  {isCreatingContact ? "Creating..." : "Create New Anyway"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!retentionDialogRecord}
        onOpenChange={(open) => {
          if (!open) setRetentionDialogRecord(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Update Retention</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* <div className="space-y-2 rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Business Connections Overview</p>
                <p className="text-muted-foreground text-xs">
                  Snapshot of linked contractor relationships (mock data preview).
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="bg-background space-y-2 rounded-md border p-2.5">
                  <p className="text-xs font-semibold tracking-wide uppercase">
                    Referred To Contractor(s)
                  </p>
                  {retentionDraft.referredToContractors.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {retentionDraft.referredToContractors.map((contractor) => (
                        <BusinessInfoHoverCard
                          key={contractor}
                          companyName={contractor}
                        >
                          <Badge variant="secondary" className="cursor-help text-[11px]">
                            {contractor}
                          </Badge>
                        </BusinessInfoHoverCard>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs">No referrals selected.</p>
                  )}
                </div>
                <div className="bg-background space-y-2 rounded-md border p-2.5">
                  <p className="text-xs font-semibold tracking-wide uppercase">
                    Hired With Contractor
                  </p>
                  {retentionDraft.hiredWithContractor.trim() ? (
                    <BusinessInfoHoverCard
                      companyName={retentionDraft.hiredWithContractor}
                    >
                      <Badge variant="secondary" className="cursor-help text-[11px]">
                        {retentionDraft.hiredWithContractor}
                      </Badge>
                    </BusinessInfoHoverCard>
                  ) : (
                    <p className="text-muted-foreground text-xs">No contractor selected.</p>
                  )}
                </div>
              </div>
            </div> */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Referred To Contractor(s)</label>
              <MultiSelect
                key={`${retentionDialogRecord?.id ?? "no-item"}-${retentionDraft.referredToContractors.join("|")}`}
                options={Array.from(
                  new Set([
                    ...retentionOptions.referredToContractors,
                    ...retentionDraft.referredToContractors,
                  ]),
                )
                  .filter((value) => value.trim().length > 0)
                  .map((value) => ({ label: value, value }))}
                defaultValue={retentionDraft.referredToContractors}
                onValueChange={(values) => {
                  setRetentionDraft((prev) => ({
                    ...prev,
                    referredToContractors: values,
                  }));
                }}
                placeholder="Select contractor(s)"
                disablePortal
                popoverSide="bottom"
                popoverAvoidCollisions={false}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Hired With Contractor</label>
              <select
                value={retentionDraft.hiredWithContractor || "__none__"}
                onChange={(event) => {
                  const value = event.target.value;
                  setRetentionDraft((prev) => ({
                    ...prev,
                    hiredWithContractor: value === "__none__" ? "" : value,
                  }));
                }}
                className="bg-background border-input h-9 w-full rounded-md border px-3 text-sm"
              >
                <option value="__none__">Select value</option>
                {Array.from(
                  new Set([
                    ...retentionOptions.hiredWithContractor,
                    retentionDraft.hiredWithContractor,
                  ]),
                )
                  .filter((value): value is string => !!value && value.trim().length > 0)
                  .map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Hire Date</label>
              <div className="flex items-center gap-2">
                <Popover
                  open={retentionHireDatePopoverOpen}
                  onOpenChange={setRetentionHireDatePopoverOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 flex-1 justify-start font-normal"
                    >
                      {retentionDraft.hireDate || "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="start" portal={false}>
                    <Calendar
                      mode="single"
                      selected={
                        retentionDraft.hireDate
                          ? new Date(`${retentionDraft.hireDate}T00:00:00`)
                          : undefined
                      }
                      onSelect={(date) => {
                        if (!date) return;
                        setRetentionDraft((prev) => ({
                          ...prev,
                          hireDate: toDateOnlyLocal(date),
                        }));
                        setRetentionHireDatePopoverOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRetentionDraft((prev) => ({ ...prev, hireDate: "" }));
                  }}
                  disabled={!retentionDraft.hireDate}
                >
                  Clear
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Retention Period</label>
              <select
                value={retentionDraft.retentionPeriod || "__none__"}
                onChange={(event) => {
                  const value = event.target.value;
                  setRetentionDraft((prev) => ({
                    ...prev,
                    retentionPeriod: value === "__none__" ? "" : value,
                  }));
                }}
                className="bg-background border-input h-9 w-full rounded-md border px-3 text-sm"
              >
                <option value="__none__">Select value</option>
                {Array.from(
                  new Set([
                    ...retentionOptions.retentionPeriod,
                    retentionDraft.retentionPeriod,
                  ]),
                )
                  .filter((value): value is string => !!value && value.trim().length > 0)
                  .map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setRetentionDialogRecord(null)}
                disabled={isSavingRetention}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  void handleSaveRetention();
                }}
                disabled={isSavingRetention}
              >
                {isSavingRetention ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!statusDialogRecord}
        onOpenChange={(open) => {
          if (!open) setStatusDialogRecord(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Update Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                value={statusDraft || "__none__"}
                onChange={(event) => {
                  const value = event.target.value;
                  setStatusDraft(value === "__none__" ? "" : value);
                }}
                className="bg-background border-input h-9 w-full rounded-md border px-3 text-sm"
              >
                <option value="__none__">Select value</option>
                {Array.from(new Set([...statusOptions.map((entry) => entry.value), statusDraft]))
                  .filter((value): value is string => !!value && value.trim().length > 0)
                  .map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setStatusDialogRecord(null)}
                disabled={isSavingStatus}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  void handleSaveStatus();
                }}
                disabled={isSavingStatus}
              >
                {isSavingStatus ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!ownerDialogRecord}
        onOpenChange={(open) => {
          if (!open) setOwnerDialogRecord(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Update Owner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Owner</label>
              <Select
                value={ownerDraft || "__none__"}
                onValueChange={(value) => {
                  setOwnerDraft(value === "__none__" ? "" : value);
                }}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select value</SelectItem>
                  {Array.from(
                    new Map(
                      [
                        ...ownerOptions.map((option) => [option.value, option] as const),
                        ownerDraft.trim().length > 0
                          ? [
                            ownerDraft,
                            {
                              value: ownerDraft,
                              label: `User ${ownerDraft}`,
                              name: null,
                              photoThumb: null,
                            },
                          ]
                          : null,
                      ].filter(
                        (
                          entry,
                        ): entry is readonly [
                          string,
                          {
                            value: string;
                            label: string;
                            name: string | null;
                            photoThumb: string | null;
                          },
                        ] => !!entry,
                      ),
                    ),
                  )
                    .map(([, option]) => option)
                    .map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-5">
                            {option.photoThumb ? (
                              <AvatarImage
                                src={option.photoThumb}
                                alt={option.name ?? option.value}
                              />
                            ) : null}
                            <AvatarFallback className="text-[10px] font-semibold">
                              {getNameInitials(option.name ?? option.value)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">
                            {option.name ?? option.label}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setOwnerDialogRecord(null)}
                disabled={isSavingOwner}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  void handleSaveOwner();
                }}
                disabled={isSavingOwner}
              >
                {isSavingOwner ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!tagsDialogRecord}
        onOpenChange={(open) => {
          if (!open) setTagsDialogRecord(null);
        }}
      >
        <DialogContent className="max-w-lg overflow-visible">
          <DialogHeader>
            <DialogTitle>Update Tags</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tags</label>
              <MultiSelect
                key={`${tagsDialogRecord?.id ?? "no-item"}-${splitCsvValues(tagsDialogRecord?.tags).join("|")}`}
                options={sortFiscalYearTagsDesc(
                  Array.from(new Set([...retentionOptions.tags, ...tagsDraft])).filter(
                    (value) => value.trim().length > 0,
                  ),
                )
                  .map((value) => ({ label: value, value }))}
                defaultValue={tagsDraft}
                onValueChange={(values) => setTagsDraft(values)}
                placeholder="Select tags"
                disablePortal
                popoverSide="bottom"
                popoverAvoidCollisions={false}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setTagsDialogRecord(null)}
                disabled={isSavingTags}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  void handleSaveTags();
                }}
                disabled={isSavingTags}
              >
                {isSavingTags ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!contactHistoryDialogRecord}
        onOpenChange={(open) => {
          if (!open) setContactHistoryDialogRecord(null);
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {contactHistoryDialogRecord?.name ?? "Contact"} · Conversation history
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border p-3">
              {(() => {
                const addressDisplay = getAddressDisplayParts(
                  contactHistoryDialogRecord?.address,
                );
                return (
                  <div className="flex items-start gap-3">
                    <Avatar className="size-10">
                      <AvatarFallback className="text-sm font-semibold">
                        {getNameInitials(contactHistoryDialogRecord?.name ?? "")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 space-y-1 text-sm">
                      <p className="font-medium">{contactHistoryDialogRecord?.name ?? "—"}</p>
                      <p className="text-muted-foreground">
                        {contactHistoryDialogRecord?.email ?? "—"}
                      </p>
                      <p className="text-muted-foreground">
                        {addressDisplay.full ? (
                          <>
                            {addressDisplay.prefix ? `${addressDisplay.prefix}, ` : ""}
                            {addressDisplay.cityStateZip ? (
                              <span className="text-[15px] font-semibold text-foreground">
                                {addressDisplay.cityStateZip}
                              </span>
                            ) : (
                              addressDisplay.full
                            )}
                          </>
                        ) : (
                          "—"
                        )}
                      </p>
                      <p className="text-muted-foreground">
                        {contactHistoryDialogRecord?.phone ?? "—"}
                      </p>
                      <div className="pt-1 space-y-1">
                        <div className="text-muted-foreground flex items-center justify-between text-[10px] uppercase">
                          <span>Progress</span>
                          <span>
                            {contactHistoryDialogRecord?.batteryProgress !== null &&
                              contactHistoryDialogRecord?.batteryProgress !== undefined
                              ? `${contactHistoryDialogRecord.batteryProgress}%`
                              : "—"}
                          </span>
                        </div>
                        <Progress
                          value={contactHistoryDialogRecord?.batteryProgress ?? 0}
                          className="h-1.5"
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Conversation history (Updates)</p>
              {staticMode ? (
                <p className="text-muted-foreground text-sm">
                  Update history is unavailable in static mode.
                </p>
              ) : contactUpdatesQuery.isLoading ? (
                <p className="text-muted-foreground text-sm">Loading updates...</p>
              ) : (contactUpdatesQuery.data?.updates?.length ?? 0) === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No updates found for this record.
                </p>
              ) : (
                <div className="space-y-3">
                  {(contactUpdatesQuery.data?.updates ?? []).map((update) => (
                    <div key={update.id} className="rounded-md border p-3">
                      <div className="text-muted-foreground mb-2 flex items-center justify-between text-xs">
                        <span>{update.creatorName ?? "Unknown user"}</span>
                        <span>{formatUpdatedAt(update.createdAt ?? update.updatedAt)}</span>
                      </div>
                      {update.body.trim().length === 0 ? (
                        <p className="text-muted-foreground text-sm">No message body</p>
                      ) : hasHtmlLikeMarkup(update.body) ? (
                        <div
                          className="prose prose-sm dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: update.body }}
                        />
                      ) : (
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                          {update.body}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setContactHistoryDialogRecord(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <EntityList<MondayRecord>
        // title="Board Records"
        // description="List view optimized for board operations."
        data={records}
        columns={columns}
        enableVirtualization
        virtualRowHeight={72}
        virtualOverscan={10}
        hideFilters
        isLoading={authLoading || (!staticMode && recordsQuery.isLoading)}
        enableSearch={false}
        viewModes={[]}
        defaultViewMode="list"
        initialSort={{ id: "createdAt", direction: "desc" }}
        getRowId={(item) => item.id}
        entityActions={entityActions}
      />

      <Dialog
        open={!!resumePreview}
        onOpenChange={(open) => {
          if (!open) setResumePreview(null);
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              Resume · {resumePreview?.recordName ?? "Contact"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Resume preview dialog with open in new tab fallback.
            </DialogDescription>
          </DialogHeader>
          {resumePreview ? (
            <div className="space-y-3">
              {(() => {
                const lowerName = resumePreview.fileName.toLowerCase();
                const isPdf = lowerName.endsWith(".pdf");
                const isImage =
                  lowerName.endsWith(".png") ||
                  lowerName.endsWith(".jpg") ||
                  lowerName.endsWith(".jpeg") ||
                  lowerName.endsWith(".gif") ||
                  lowerName.endsWith(".webp") ||
                  lowerName.endsWith(".svg");
                return (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-medium">{resumePreview.fileName}</p>
                      <a
                        href={resumePreview.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary text-xs underline"
                      >
                        Open in new tab
                      </a>
                    </div>
                    <div className="bg-muted/20 h-[65vh] overflow-hidden rounded-md border">
                      {isPdf ? (
                        <iframe
                          src={resumePreview.href}
                          title={`Resume preview: ${resumePreview.fileName}`}
                          className="h-full w-full"
                        />
                      ) : isImage ? (
                        <object
                          data={resumePreview.href}
                          className="h-full w-full"
                        >
                          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
                            <p className="text-sm font-medium">Image preview unavailable</p>
                            <a
                              href={resumePreview.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary text-xs underline"
                            >
                              Open resume in new tab
                            </a>
                          </div>
                        </object>
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
                          <p className="text-sm font-medium">
                            This file type cannot be previewed inline.
                          </p>
                          <a
                            href={resumePreview.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary text-xs underline"
                          >
                            Open resume in new tab
                          </a>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!sendEmailRecord}
        onOpenChange={(open) => {
          if (!open) closeSendEmailDialog();
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Send Email</DialogTitle>
          </DialogHeader>
          {sendEmailRecord ? (
            <div className="space-y-4">
              <div className="text-muted-foreground text-sm">
                Recipient:{" "}
                <span className="text-foreground font-medium">
                  {sendEmailRecord.name}
                  {" · "}
                  {sendEmailRecord.email ?? "No email"}
                </span>
              </div>
              {sendEmailStep === 1 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Step 1: Choose an email template
                  </p>
                  <div className="max-h-[360px] space-y-2 overflow-y-auto rounded-md border p-2">
                    {emailTemplates.map((template) => {
                      const isActive = template.id === sendEmailTemplateId;
                      return (
                        <button
                          key={template.id}
                          type="button"
                          className={[
                            "w-full rounded-md border px-3 py-2 text-left text-sm transition-colors",
                            isActive
                              ? "border-primary bg-primary/10"
                              : "hover:bg-muted/60",
                          ].join(" ")}
                          onClick={() => {
                            setSendEmailTemplateId(template.id);
                          }}
                        >
                          <p className="line-clamp-1 font-medium">{template.name}</p>
                          <p className="text-muted-foreground mt-1 text-xs">
                            Updated {formatUpdatedAt(template.updatedAt)}
                          </p>
                        </button>
                      );
                    })}
                    {emailTemplates.length === 0 && !emailTemplatesQuery.isLoading ? (
                      <p className="text-muted-foreground text-sm">
                        No templates found.
                      </p>
                    ) : null}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={closeSendEmailDialog}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => setSendEmailStep(2)}
                      disabled={!sendEmailTemplate}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}

              {sendEmailStep === 2 && sendEmailTemplate ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Step 2: Preview template</p>
                  <div className="rounded-md border p-4">
                    <p className="text-xs font-semibold tracking-wide uppercase">Subject</p>
                    <p className="mt-1 text-base font-medium">{sendEmailTemplate.name}</p>
                    <p className="mt-3 text-xs font-semibold tracking-wide uppercase">
                      Email Preview (Lead View)
                    </p>
                    <div className="bg-card mt-2 rounded-md border p-4">
                      {sendEmailTemplate.content.trim().length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                          No content found in template.
                        </p>
                      ) : sendEmailTemplate.renderedHtml.trim().length > 0 ? (
                        <div
                          className="prose prose-sm dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: sendEmailTemplate.renderedHtml,
                          }}
                        />
                      ) : (
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                          {sendEmailTemplate.content}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between gap-2">
                    <Button variant="outline" onClick={() => setSendEmailStep(1)}>
                      Back
                    </Button>
                    <Button onClick={() => setSendEmailStep(3)}>Next</Button>
                  </div>
                </div>
              ) : null}

              {sendEmailStep === 3 && sendEmailTemplate ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Step 3: Confirm send</p>
                  <div className="rounded-md border p-4 text-sm">
                    Are you sure you want to send this email?
                  </div>
                  <div className="flex justify-between gap-2">
                    <Button variant="outline" onClick={() => setSendEmailStep(2)}>
                      Back
                    </Button>
                    <Button
                      onClick={() => {
                        void handleConfirmSendEmail();
                      }}
                      disabled={isSendingEmail || !sendEmailRecord.email}
                    >
                      {isSendingEmail ? "Sending..." : "Send Email"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      {!staticMode && recordsQuery.hasNextPage ? (
        <div ref={loadMoreAnchorRef} className="h-10" />
      ) : null}
    </div>
  );
}

export default function MondayBoardPage() {
  return <MondayBoardView viewMode="all" />;
}
