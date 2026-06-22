"use node";

import { v } from "convex/values";

import { callMondayGraphQL, getMondayApiKey } from "./lib/mondayGraphQL";
import { mondayAction } from "./lib/mondayFunctions";
import type { MondaySessionIdentity } from "./lib/mondaySession";

// ---------------------------------------------------------------------------
// Board column constants (mirrors src/server/monday/jobs.ts)
// ---------------------------------------------------------------------------

const JOB_STATUS_COLUMN_ID = "color_mkwjtwdp";
const JOB_DISTRICT_COLUMN_ID = "color_mkzece6n";
const JOB_LOCATION_COLUMN_ID = "text_mkwjn5k4";
const JOB_LOCATION_SECONDARY_COLUMN_ID = "text_mkwjg5w0";
const JOB_DESCRIPTION_COLUMN_ID = "long_text_mkwj962z";
const JOB_CATEGORIES_COLUMN_ID = "dropdown_mkwjydfq";
const JOB_CONTRACTOR_PRIMARY_COLUMN_ID = "dropdown_mkyfbpmc";
const JOB_CONTRACTOR_SECONDARY_COLUMN_ID = "dropdown_mkz4xsc0";
const JOB_CONTRACTOR_EMAIL_COLUMN_ID = "text_mkzjcr1f";
const JOB_APPLY_EMAIL_COLUMN_ID = "text_mkwj6adx";
const JOB_APPLY_PHONE_COLUMN_ID = "text_mkwj7397";
const JOB_FILLED_COLUMN_ID = "text_mkwj100p";
const JOB_SALARY_AMOUNT_COLUMN_ID = "text_mkwjz34w";
const JOB_SALARY_TYPE_COLUMN_ID = "text_mkwjt93f";
const JOB_URL_COLUMN_ID = "link_mkwjmezf";
const JOB_POSTED_DATE_COLUMN_ID = "date4";

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

const mondayJobListingValidator = v.object({
  id: v.string(),
  title: v.string(),
  status: v.union(v.string(), v.null()),
  district: v.union(v.string(), v.null()),
  location: v.union(v.string(), v.null()),
  locationSecondary: v.union(v.string(), v.null()),
  description: v.union(v.string(), v.null()),
  categories: v.array(v.string()),
  contractor: v.union(v.string(), v.null()),
  contractorEmail: v.union(v.string(), v.null()),
  applyEmail: v.union(v.string(), v.null()),
  applyPhone: v.union(v.string(), v.null()),
  salaryAmount: v.union(v.string(), v.null()),
  salaryType: v.union(v.string(), v.null()),
  websiteUrl: v.union(v.string(), v.null()),
  postedDate: v.union(v.string(), v.null()),
  updatedAt: v.union(v.string(), v.null()),
  isAvailable: v.boolean(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const parseLimit = (value: number | undefined) => {
  if (!Number.isFinite(value)) return 200;
  return Math.min(Math.max(Math.floor(value!), 1), 500);
};

const parseOnlyAvailable = (value: boolean | undefined) => value ?? true;

interface MondayJobColumnValue {
  id?: string | null;
  text?: string | null;
  value?: string | null;
}

interface MondayJobItem {
  id?: string | null;
  name?: string | null;
  updated_at?: string | null;
  column_values?: MondayJobColumnValue[];
}

const splitCsv = (value: string | null | undefined) => {
  if (!value) return [] as string[];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};

const readColumnText = (item: MondayJobItem, columnId: string) => {
  const value = item.column_values
    ?.find((column) => column.id === columnId)
    ?.text?.trim();
  return value && value.length > 0 ? value : null;
};

const readLinkColumnUrl = (item: MondayJobItem, columnId: string) => {
  const column = item.column_values?.find((entry) => entry.id === columnId);
  if (!column) return null;
  if (column.value) {
    try {
      const parsed = JSON.parse(column.value) as { url?: string };
      const rawUrl = parsed.url?.trim();
      if (rawUrl) return rawUrl;
    } catch {
      // fall back to text
    }
  }
  const fallbackText = column.text?.trim();
  return fallbackText && fallbackText.length > 0 ? fallbackText : null;
};

const parseIsAvailable = (status: string | null, jobFilled: string | null) => {
  const normalizedStatus = status?.trim().toLowerCase() ?? "";
  const normalizedJobFilled = jobFilled?.trim().toLowerCase() ?? "";
  const isMarkedFilled =
    normalizedJobFilled.includes("yes") ||
    normalizedJobFilled.includes("true") ||
    normalizedJobFilled.includes("filled") ||
    normalizedJobFilled.includes("closed");
  return normalizedStatus === "publish" && !isMarkedFilled;
};

const listMondayJobsImpl = async (args?: {
  boardId?: string;
  limit?: number;
  search?: string;
  district?: string;
  onlyAvailable?: boolean;
}) => {
  getMondayApiKey();
  const boardId =
    args?.boardId?.trim() ||
    process.env.MONDAY_JOBS_BOARD_ID?.trim();
  if (!boardId) throw new Error("MONDAY_JOBS_BOARD_ID env var is not set");

  const limit = parseLimit(args?.limit);
  const search = args?.search?.trim().toLowerCase() ?? "";
  const districtFilter = args?.district?.trim().toLowerCase() ?? "";
  const onlyAvailable = parseOnlyAvailable(args?.onlyAvailable);

  interface JobsBoardData {
    boards?: Array<{
      id?: string | null;
      name?: string | null;
      items_page?: { items?: MondayJobItem[] } | null;
    }>;
  }

  const data = await callMondayGraphQL<JobsBoardData>(
    `query ListJobsBoard($boardId: ID!, $limit: Int!) {
      boards(ids: [$boardId]) {
        id
        name
        items_page(limit: $limit) {
          items {
            id
            name
            updated_at
            column_values(ids: [
              "${JOB_STATUS_COLUMN_ID}",
              "${JOB_DISTRICT_COLUMN_ID}",
              "${JOB_LOCATION_COLUMN_ID}",
              "${JOB_LOCATION_SECONDARY_COLUMN_ID}",
              "${JOB_DESCRIPTION_COLUMN_ID}",
              "${JOB_CATEGORIES_COLUMN_ID}",
              "${JOB_CONTRACTOR_PRIMARY_COLUMN_ID}",
              "${JOB_CONTRACTOR_SECONDARY_COLUMN_ID}",
              "${JOB_CONTRACTOR_EMAIL_COLUMN_ID}",
              "${JOB_APPLY_EMAIL_COLUMN_ID}",
              "${JOB_APPLY_PHONE_COLUMN_ID}",
              "${JOB_FILLED_COLUMN_ID}",
              "${JOB_SALARY_AMOUNT_COLUMN_ID}",
              "${JOB_SALARY_TYPE_COLUMN_ID}",
              "${JOB_URL_COLUMN_ID}",
              "${JOB_POSTED_DATE_COLUMN_ID}"
            ]) {
              id
              text
              value
            }
          }
        }
      }
    }`,
    { boardId, limit },
  );

  const board = data.boards?.[0];
  const jobs = (board?.items_page?.items ?? [])
    .map((item) => {
      const id = item.id?.trim() ?? "";
      const title = item.name?.trim() ?? "";
      if (!id || !title) return null;

      const status = readColumnText(item, JOB_STATUS_COLUMN_ID);
      const district = readColumnText(item, JOB_DISTRICT_COLUMN_ID);
      const location = readColumnText(item, JOB_LOCATION_COLUMN_ID);
      const locationSecondary = readColumnText(
        item,
        JOB_LOCATION_SECONDARY_COLUMN_ID,
      );
      const description = readColumnText(item, JOB_DESCRIPTION_COLUMN_ID);
      const categories = splitCsv(readColumnText(item, JOB_CATEGORIES_COLUMN_ID));
      const contractorPrimary = readColumnText(
        item,
        JOB_CONTRACTOR_PRIMARY_COLUMN_ID,
      );
      const contractorSecondary = readColumnText(
        item,
        JOB_CONTRACTOR_SECONDARY_COLUMN_ID,
      );
      const contractor = contractorPrimary || contractorSecondary;
      const contractorEmail = readColumnText(item, JOB_CONTRACTOR_EMAIL_COLUMN_ID);
      const applyEmail = readColumnText(item, JOB_APPLY_EMAIL_COLUMN_ID);
      const applyPhone = readColumnText(item, JOB_APPLY_PHONE_COLUMN_ID);
      const jobFilled = readColumnText(item, JOB_FILLED_COLUMN_ID);
      const salaryAmount = readColumnText(item, JOB_SALARY_AMOUNT_COLUMN_ID);
      const salaryType = readColumnText(item, JOB_SALARY_TYPE_COLUMN_ID);
      const websiteUrl = readLinkColumnUrl(item, JOB_URL_COLUMN_ID);
      const postedDate = readColumnText(item, JOB_POSTED_DATE_COLUMN_ID);
      const isAvailable = parseIsAvailable(status, jobFilled);

      return {
        id,
        title,
        status,
        district,
        location,
        locationSecondary,
        description,
        categories,
        contractor,
        contractorEmail,
        applyEmail,
        applyPhone,
        salaryAmount,
        salaryType,
        websiteUrl,
        postedDate,
        updatedAt: item.updated_at ?? null,
        isAvailable,
      };
    })
    .filter((job): job is NonNullable<typeof job> => job !== null)
    .filter((job) => {
      if (onlyAvailable && !job.isAvailable) return false;
      if (districtFilter.length > 0) {
        const haystack =
          `${job.district ?? ""} ${job.location ?? ""} ${job.locationSecondary ?? ""}`.toLowerCase();
        if (!haystack.includes(districtFilter)) return false;
      }
      if (search.length > 0) {
        const haystack = [
          job.title,
          job.contractor ?? "",
          job.location ?? "",
          job.locationSecondary ?? "",
          job.categories.join(" "),
          job.description ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const aTime = Date.parse(a.updatedAt ?? "");
      const bTime = Date.parse(b.updatedAt ?? "");
      return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
    });

  return {
    boardId: board?.id ?? boardId,
    boardName: board?.name ?? null,
    jobs,
  };
};

// ---------------------------------------------------------------------------
// Public actions
// ---------------------------------------------------------------------------

/** GET /api/monday/jobs — list available job postings */
export const listJobs = mondayAction({
  args: {
    limit: v.optional(v.number()),
    boardId: v.optional(v.string()),
    search: v.optional(v.string()),
    district: v.optional(v.string()),
    onlyAvailable: v.optional(v.boolean()),
  },
  returns: v.object({
    boardId: v.string(),
    boardName: v.union(v.string(), v.null()),
    jobs: v.array(mondayJobListingValidator),
  }),
  handler: async (_ctx, _identity: MondaySessionIdentity, args) => {
    return listMondayJobsImpl({
      boardId: args.boardId,
      limit: args.limit,
      search: args.search,
      district: args.district,
      onlyAvailable: args.onlyAvailable,
    });
  },
});
