import { NextResponse } from "next/server";

import { api as apiGenerated } from "@convex-config/_generated/api";

import { getConvexHttpClient } from "~/server/convexHttp";

export const runtime = "nodejs";

const apiAny = apiGenerated as any;

const VALID_TOOL_TYPES = [
  "monthly_migration",
  "hire_event_backfill",
  "touch_range_backfill",
  "touch_backfill",
  "touch_csv_export",
] as const;

const VALID_STATUSES = ["running", "done", "failed", "cancelled"] as const;

type UnifiedToolType = (typeof VALID_TOOL_TYPES)[number];
type UnifiedMigrationJobStatus = (typeof VALID_STATUSES)[number];

interface UnifiedMigrationJobRow {
  toolType: UnifiedToolType;
  toolLabel: string;
  legacy: boolean;
  jobId: string;
  status: UnifiedMigrationJobStatus;
  workflowId?: string | null;
  startedAt: number;
  updatedAt: number;
  finishedAt?: number | null;
  dryRun?: boolean;
  sourceBoardId?: string | null;
  sourceBoardName?: string | null;
  targetBoardId?: string | null;
  sourceTag?: string | null;
  baselineDate?: string | null;
  monthTag?: string | null;
  monthKey?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  pageSize?: number;
  processedCount: number;
  mappedCount: number;
  skippedCount: number;
  createdCount: number;
  updatedCount: number;
  errorCount: number;
  warningCount: number;
  lastError?: string | null;
  searchText: string;
}

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 200;

const toJson = (body: unknown, status = 200) => NextResponse.json(body, { status });

const parseLimit = (value: string | null) => {
  if (!value) return DEFAULT_LIMIT;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(parsed)));
};

const parseFilterValues = (values: string[]) => {
  const allValues = values
    .flatMap((value) => value.split(","))
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
  return new Set(allValues);
};

const toToolTypeSet = (values: Set<string>) => {
  const allowed = new Set<UnifiedToolType>();
  for (const value of values) {
    if (VALID_TOOL_TYPES.includes(value as UnifiedToolType)) {
      allowed.add(value as UnifiedToolType);
    }
  }
  return allowed;
};

const toStatusSet = (values: Set<string>) => {
  const allowed = new Set<UnifiedMigrationJobStatus>();
  for (const value of values) {
    if (VALID_STATUSES.includes(value as UnifiedMigrationJobStatus)) {
      allowed.add(value as UnifiedMigrationJobStatus);
    }
  }
  return allowed;
};

const normalizeSearch = (value: string | null) => (value?.trim().toLowerCase() ?? "");

export const GET = async (request: Request) => {
  try {
    const url = new URL(request.url);
    const limit = parseLimit(url.searchParams.get("limit"));
    const requestedToolTypeValues = parseFilterValues(url.searchParams.getAll("toolType"));
    const requestedStatusValues = parseFilterValues(url.searchParams.getAll("status"));
    const toolTypeFilter = toToolTypeSet(requestedToolTypeValues);
    const statusFilter = toStatusSet(requestedStatusValues);
    const search = normalizeSearch(url.searchParams.get("search"));
    const convex = getConvexHttpClient();

    const perToolLimit = Math.min(MAX_LIMIT, Math.max(50, limit * 3));
    const [monthlyJobs, hireEventJobs, touchRangeJobs, touchBackfillJobs, touchCsvJobs] =
      await Promise.all([
        convex.query(apiAny.mondayMonthlyMigration.listRecentJobs, {
          limit: perToolLimit,
        }) as Promise<UnifiedMigrationJobRow[]>,
        convex.query(apiAny.mondayHireEventBackfill.listRecentJobs, {
          limit: perToolLimit,
        }) as Promise<UnifiedMigrationJobRow[]>,
        convex.query(apiAny.mondayTouchRangeBackfill.listRecentJobs, {
          limit: perToolLimit,
        }) as Promise<UnifiedMigrationJobRow[]>,
        convex.query(apiAny.mondayTouchBackfill.listRecentJobs, {
          limit: perToolLimit,
        }) as Promise<UnifiedMigrationJobRow[]>,
        convex.query(apiAny.mondayTouchBackfill.listRecentCsvExportJobs, {
          limit: perToolLimit,
        }) as Promise<UnifiedMigrationJobRow[]>,
      ]);

    const aggregated = [
      ...monthlyJobs,
      ...hireEventJobs,
      ...touchRangeJobs,
      ...touchBackfillJobs,
      ...touchCsvJobs,
    ];

    const filtered = aggregated
      .filter((job) => {
        if (toolTypeFilter.size > 0 && !toolTypeFilter.has(job.toolType)) return false;
        if (statusFilter.size > 0 && !statusFilter.has(job.status)) return false;
        if (search.length > 0 && !job.searchText.includes(search)) return false;
        return true;
      })
      .sort((a, b) => {
        if (b.startedAt !== a.startedAt) return b.startedAt - a.startedAt;
        return b.updatedAt - a.updatedAt;
      });

    const jobs = filtered.slice(0, limit);
    return toJson({
      ok: true,
      jobs,
      meta: {
        total: filtered.length,
        limit,
        toolTypeFilter: Array.from(toolTypeFilter),
        statusFilter: Array.from(statusFilter),
        search,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load tool history";
    return toJson({ ok: false, error: message }, 500);
  }
};
