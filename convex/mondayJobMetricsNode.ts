"use node";

import { v } from "convex/values";

import { callMondayGraphQL, getMondayApiKey } from "./lib/mondayGraphQL";
import { mondayAction } from "./lib/mondayFunctions";
import type { MondaySessionIdentity } from "./lib/mondaySession";

// ---------------------------------------------------------------------------
// Column IDs — match mondayJobsNode.ts
// ---------------------------------------------------------------------------

const JOB_STATUS_COLUMN_ID = "color_mkwjtwdp";
const JOB_DISTRICT_COLUMN_ID = "color_mkzece6n";
const JOB_CATEGORIES_COLUMN_ID = "dropdown_mkwjydfq";
const JOB_CONTRACTOR_PRIMARY_COLUMN_ID = "dropdown_mkyfbpmc";
const JOB_SALARY_TYPE_COLUMN_ID = "text_mkwjt93f";
const JOB_FILLED_COLUMN_ID = "text_mkwj100p";
const JOB_POSTED_DATE_COLUMN_ID = "date4";

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

const jobMetricsMonthlyPointValidator = v.object({
  monthKey: v.string(),
  monthLabel: v.string(),
  posted: v.number(),
  available: v.number(),
});

const jobMetricsSummaryValidator = v.object({
  fiscalYear: v.string(),
  liveJobCount: v.number(),
  postedThisFY: v.number(),
  monthly: v.array(jobMetricsMonthlyPointValidator),
  byCategory: v.array(v.object({ category: v.string(), count: v.number() })),
  byContractor: v.array(v.object({ contractor: v.string(), count: v.number() })),
  bySalaryType: v.array(v.object({ salaryType: v.string(), count: v.number() })),
  byDistrict: v.array(v.object({ district: v.string(), count: v.number() })),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RawJob {
  status: string | null;
  district: string | null;
  categories: string[];
  contractor: string | null;
  salaryType: string | null;
  postedDate: string | null;
  isAvailable: boolean;
}

interface JobMetricsMonthlyPoint {
  monthKey: string;
  monthLabel: string;
  posted: number;
  available: number;
}

interface MondayJobMetricsSummary {
  fiscalYear: string;
  liveJobCount: number;
  postedThisFY: number;
  monthly: JobMetricsMonthlyPoint[];
  byCategory: Array<{ category: string; count: number }>;
  byContractor: Array<{ contractor: string; count: number }>;
  bySalaryType: Array<{ salaryType: string; count: number }>;
  byDistrict: Array<{ district: string; count: number }>;
}

// ---------------------------------------------------------------------------
// Fiscal year helpers (self-contained; mirrors mondayMetricsImpl.ts)
// ---------------------------------------------------------------------------

const parseFiscalYearEnd = (fiscalYear: string | null | undefined): number | null => {
  if (!fiscalYear) return null;
  const normalized = fiscalYear.trim().toUpperCase();
  const fy2 = /^FY(\d{2})$/.exec(normalized);
  if (fy2?.[1]) return 2000 + Number(fy2[1]);
  const fy4 = /^FY(\d{4})$/.exec(normalized);
  if (fy4?.[1]) return Number(fy4[1]);
  if (/^\d{4}$/.test(normalized)) return Number(normalized);
  return null;
};

const getCurrentFiscalYearEnd = () => {
  const now = new Date();
  return now.getUTCMonth() >= 6 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
};

const formatFiscalYear = (endYear: number) => `FY${String(endYear).slice(-2)}`;

const buildFiscalYearMonths = (endYear: number): JobMetricsMonthlyPoint[] => {
  const points: JobMetricsMonthlyPoint[] = [];
  for (let offset = 0; offset < 12; offset++) {
    const cursor = new Date(Date.UTC(endYear - 1, 6 + offset, 1));
    points.push({
      monthKey: cursor.toISOString().slice(0, 7),
      monthLabel: cursor.toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }),
      posted: 0,
      available: 0,
    });
  }
  return points;
};

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const JOB_METRICS_CACHE_TTL_MS = 2 * 60 * 1000;
const jobMetricsCache = new Map<
  string,
  { expiresAt: number; summary: MondayJobMetricsSummary }
>();

// ---------------------------------------------------------------------------
// GraphQL fetch
// ---------------------------------------------------------------------------

interface JobColumnValue {
  id?: string | null;
  text?: string | null;
}

interface JobItem {
  id?: string | null;
  column_values?: JobColumnValue[];
}

const readColumnText = (item: JobItem, columnId: string): string | null => {
  const text = item.column_values?.find((c) => c.id === columnId)?.text?.trim();
  return text && text.length > 0 ? text : null;
};

const splitCsv = (value: string | null): string[] => {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
};

const parseIsAvailable = (status: string | null, filled: string | null): boolean => {
  const s = status?.trim().toLowerCase() ?? "";
  const f = filled?.trim().toLowerCase() ?? "";
  const markedFilled =
    f.includes("yes") || f.includes("true") || f.includes("filled") || f.includes("closed");
  return s === "publish" && !markedFilled;
};

const fetchAllJobsRaw = async (boardId: string): Promise<RawJob[]> => {
  interface Data {
    boards?: Array<{ items_page?: { items?: JobItem[] } | null }>;
  }
  const data = await callMondayGraphQL<Data>(
    `query ListAllJobsForMetrics($boardId: ID!, $limit: Int!) {
      boards(ids: [$boardId]) {
        items_page(limit: $limit) {
          items {
            id
            column_values(ids: [
              "${JOB_STATUS_COLUMN_ID}",
              "${JOB_DISTRICT_COLUMN_ID}",
              "${JOB_CATEGORIES_COLUMN_ID}",
              "${JOB_CONTRACTOR_PRIMARY_COLUMN_ID}",
              "${JOB_SALARY_TYPE_COLUMN_ID}",
              "${JOB_FILLED_COLUMN_ID}",
              "${JOB_POSTED_DATE_COLUMN_ID}"
            ]) { id text }
          }
        }
      }
    }`,
    { boardId, limit: 500 },
  );

  return (data.boards?.[0]?.items_page?.items ?? [])
    .filter((item) => !!item.id?.trim())
    .map((item) => {
      const status = readColumnText(item, JOB_STATUS_COLUMN_ID);
      const filled = readColumnText(item, JOB_FILLED_COLUMN_ID);
      return {
        status,
        district: readColumnText(item, JOB_DISTRICT_COLUMN_ID),
        categories: splitCsv(readColumnText(item, JOB_CATEGORIES_COLUMN_ID)),
        contractor: readColumnText(item, JOB_CONTRACTOR_PRIMARY_COLUMN_ID),
        salaryType: readColumnText(item, JOB_SALARY_TYPE_COLUMN_ID),
        postedDate: readColumnText(item, JOB_POSTED_DATE_COLUMN_ID),
        isAvailable: parseIsAvailable(status, filled),
      };
    });
};

// ---------------------------------------------------------------------------
// Metrics computation
// ---------------------------------------------------------------------------

const sortByCountDesc = (map: Map<string, number>) =>
  Array.from(map.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key, count]) => ({ key, count }));

const buildJobMetricsSummary = async (args: {
  fiscalYear: string | null;
}): Promise<MondayJobMetricsSummary> => {
  getMondayApiKey();
  const boardId = process.env.MONDAY_JOBS_BOARD_ID?.trim();
  if (!boardId) throw new Error("MONDAY_JOBS_BOARD_ID env var is not set");

  const fiscalYearEnd = parseFiscalYearEnd(args.fiscalYear) ?? getCurrentFiscalYearEnd();
  const fiscalYear = formatFiscalYear(fiscalYearEnd);
  const cacheKey = `${boardId}::jobs::${fiscalYear}`;

  const cached = jobMetricsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.summary;

  // FY window: July 1 (endYear-1) inclusive → July 1 (endYear) exclusive
  const fyStartMs = Date.UTC(fiscalYearEnd - 1, 6, 1);
  const fyEndMs = Date.UTC(fiscalYearEnd, 6, 1);

  const allJobs = await fetchAllJobsRaw(boardId);

  const monthlyPoints = buildFiscalYearMonths(fiscalYearEnd);
  const monthMap = new Map(monthlyPoints.map((p) => [p.monthKey, p]));

  const categoryMap = new Map<string, number>();
  const contractorMap = new Map<string, number>();
  const salaryTypeMap = new Map<string, number>();
  const districtMap = new Map<string, number>();
  let postedThisFY = 0;

  for (const job of allJobs) {
    let postedMs: number | null = null;
    if (job.postedDate) {
      const parsed = Date.parse(job.postedDate);
      if (!Number.isNaN(parsed)) postedMs = parsed;
    }

    const isInFY = postedMs !== null && postedMs >= fyStartMs && postedMs < fyEndMs;
    if (!isInFY) continue;

    postedThisFY++;

    const monthKey = new Date(postedMs!).toISOString().slice(0, 7);
    const point = monthMap.get(monthKey);
    if (point) {
      point.posted++;
      if (job.isAvailable) point.available++;
    }

    for (const cat of job.categories) {
      categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);
    }
    if (job.contractor) {
      contractorMap.set(job.contractor, (contractorMap.get(job.contractor) ?? 0) + 1);
    }
    if (job.salaryType) {
      const s = job.salaryType.trim();
      if (s) salaryTypeMap.set(s, (salaryTypeMap.get(s) ?? 0) + 1);
    }
    if (job.district) {
      districtMap.set(job.district, (districtMap.get(job.district) ?? 0) + 1);
    }
  }

  const summary: MondayJobMetricsSummary = {
    fiscalYear,
    liveJobCount: allJobs.filter((j) => j.isAvailable).length,
    postedThisFY,
    monthly: monthlyPoints,
    byCategory: sortByCountDesc(categoryMap).map(({ key, count }) => ({
      category: key,
      count,
    })),
    byContractor: sortByCountDesc(contractorMap).map(({ key, count }) => ({
      contractor: key,
      count,
    })),
    bySalaryType: sortByCountDesc(salaryTypeMap).map(({ key, count }) => ({
      salaryType: key,
      count,
    })),
    byDistrict: sortByCountDesc(districtMap).map(({ key, count }) => ({
      district: key,
      count,
    })),
  };

  jobMetricsCache.set(cacheKey, { expiresAt: Date.now() + JOB_METRICS_CACHE_TTL_MS, summary });
  return summary;
};

// ---------------------------------------------------------------------------
// Public action
// ---------------------------------------------------------------------------

export const getJobMetrics = mondayAction({
  args: {
    fiscalYear: v.optional(v.string()),
  },
  returns: v.object({ summary: jobMetricsSummaryValidator }),
  handler: async (_ctx, _identity: MondaySessionIdentity, args) => {
    const summary = await buildJobMetricsSummary({
      fiscalYear: args.fiscalYear ?? null,
    });
    return { summary };
  },
});
