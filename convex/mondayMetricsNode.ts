"use node";

import { v } from "convex/values";

import { api } from "./_generated/api";
import { mondayAction } from "./lib/mondayFunctions";
import {
  MONDAY_METRICS_SNAPSHOT_BUILD_POLL_MS,
  MONDAY_METRICS_SNAPSHOT_REFRESH_MS,
} from "./mondayMetricsSnapshots";

const metricsTotalsValidator = v.object({
  allContacts: v.number(),
  candidatesGroup: v.number(),
  reentry: v.number(),
  veterans: v.number(),
  hiredTotal: v.number(),
  hiredCandidatesGroup: v.number(),
  hiredReentry: v.number(),
  hiredVeterans: v.number(),
});

const metricsCommunicationTotalsValidator = v.object({
  emailCommunications: v.number(),
  textCommunications: v.number(),
  phoneCallCommunications: v.number(),
});

const metricsMonthlyPointValidator = v.object({
  monthKey: v.string(),
  monthLabel: v.string(),
  allContacts: v.number(),
  candidatesGroup: v.number(),
  reentry: v.number(),
  veterans: v.number(),
  hiredTotal: v.number(),
  hiredCandidatesGroup: v.number(),
  hiredReentry: v.number(),
  hiredVeterans: v.number(),
  emailCommunications: v.number(),
  textCommunications: v.number(),
  phoneCallCommunications: v.number(),
});

const metricsSummaryValidator = v.object({
  fiscalYear: v.string(),
  ownerId: v.union(v.string(), v.null()),
  boardName: v.union(v.string(), v.null()),
  totals: metricsTotalsValidator,
  communicationTotals: metricsCommunicationTotalsValidator,
  monthly: v.array(metricsMonthlyPointValidator),
  ownerBreakdown: v.array(
    v.object({
      ownerId: v.string(),
      ownerLabel: v.string(),
      allContacts: v.number(),
      candidatesGroup: v.number(),
      reentry: v.number(),
      veterans: v.number(),
      hiredTotal: v.number(),
      hiredCandidatesGroup: v.number(),
      hiredReentry: v.number(),
      hiredVeterans: v.number(),
    }),
  ),
  hiredContacts: v.array(
    v.object({
      contactId: v.string(),
      name: v.string(),
      email: v.union(v.string(), v.null()),
      url: v.union(v.string(), v.null()),
      hireCount: v.number(),
      latestHireDate: v.union(v.string(), v.null()),
    }),
  ),
  contractorReferrals: v.array(
    v.object({
      contractorName: v.string(),
      referredCount: v.number(),
    }),
  ),
  generatedAt: v.string(),
});

const metricsSnapshotStatusValidator = v.union(
  v.literal("ready"),
  v.literal("building"),
  v.literal("failed"),
);

const hasMondayConfig = () => {
  const boardId = process.env.MONDAY_BOARD_ID?.trim() ?? "";
  return boardId.length > 0;
};

const getCurrentFiscalYear = () => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const fiscalYearEnd = month >= 6 ? year + 1 : year;
  return `FY${String(fiscalYearEnd).slice(-2)}`;
};

const normalizeFiscalYear = (value: string | undefined) => {
  if (!value) return getCurrentFiscalYear();
  const normalized = value.trim().toUpperCase();
  const fy2 = /^FY(\d{2})$/.exec(normalized);
  if (fy2?.[1]) return `FY${fy2[1]}`;
  const fy4 = /^FY(\d{4})$/.exec(normalized);
  if (fy4?.[1]) return `FY${fy4[1].slice(2)}`;
  if (/^\d{4}$/.test(normalized)) return `FY${normalized.slice(2)}`;
  return getCurrentFiscalYear();
};

const parseSummaryJson = (value: string | null | undefined) => {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
};

/** GET /api/monday/metrics */
export const getMetrics = mondayAction({
  args: {
    fiscalYear: v.optional(v.string()),
    ownerId: v.optional(v.string()),
  },
  returns: v.object({
    status: metricsSnapshotStatusValidator,
    summary: v.union(metricsSummaryValidator, v.null()),
    refreshAfterMs: v.number(),
    error: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, _identity, args) => {
    if (!hasMondayConfig()) {
      throw new Error(
        "Missing Monday configuration. Set MONDAY_API_KEY and MONDAY_BOARD_ID.",
      );
    }
    const boardId = process.env.MONDAY_BOARD_ID?.trim() ?? "";
    const fiscalYear = normalizeFiscalYear(args.fiscalYear);
    const ownerId = args.ownerId?.trim() || null;
    const scopeKey = `${boardId}::${fiscalYear}::${ownerId ?? "all"}`;

    const ensureResult = await ctx.runMutation(
      api.mondayMetricsSnapshots.ensureSnapshotScan,
      {
        scopeKey,
        boardId,
        fiscalYear,
        ownerId: ownerId ?? undefined,
      },
    );
    const snapshot = ensureResult.snapshot;
    const parsedSummary = parseSummaryJson(snapshot?.summaryJson);
    const summary =
      parsedSummary && typeof parsedSummary === "object"
        ? (parsedSummary as {
            fiscalYear: string;
            ownerId: string | null;
            boardName: string | null;
            totals: {
              allContacts: number;
              candidatesGroup: number;
              reentry: number;
              veterans: number;
              hiredTotal: number;
              hiredCandidatesGroup: number;
              hiredReentry: number;
              hiredVeterans: number;
            };
            communicationTotals: {
              emailCommunications: number;
              textCommunications: number;
              phoneCallCommunications: number;
            };
            monthly: Array<{
              monthKey: string;
              monthLabel: string;
              allContacts: number;
              candidatesGroup: number;
              reentry: number;
              veterans: number;
              hiredTotal: number;
              hiredCandidatesGroup: number;
              hiredReentry: number;
              hiredVeterans: number;
              emailCommunications: number;
              textCommunications: number;
              phoneCallCommunications: number;
            }>;
            ownerBreakdown: Array<{
              ownerId: string;
              ownerLabel: string;
              allContacts: number;
              candidatesGroup: number;
              reentry: number;
              veterans: number;
              hiredTotal: number;
              hiredCandidatesGroup: number;
              hiredReentry: number;
              hiredVeterans: number;
            }>;
            hiredContacts: Array<{
              contactId: string;
              name: string;
              email: string | null;
              url: string | null;
              hireCount: number;
              latestHireDate: string | null;
            }>;
            contractorReferrals: Array<{
              contractorName: string;
              referredCount: number;
            }>;
            generatedAt: string;
          })
        : null;

    return {
      status: snapshot?.status ?? "building",
      summary,
      refreshAfterMs:
        snapshot?.status === "building"
          ? MONDAY_METRICS_SNAPSHOT_BUILD_POLL_MS
          : ensureResult.refreshAfterMs > 0
            ? ensureResult.refreshAfterMs
            : MONDAY_METRICS_SNAPSHOT_REFRESH_MS,
      error: snapshot?.lastError ?? null,
    };
  },
});
