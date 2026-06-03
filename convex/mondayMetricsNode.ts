"use node";

import { v } from "convex/values";

import { mondayAction } from "./lib/mondayFunctions";
import { buildMondayMetricsSummary } from "./lib/mondayMetricsImpl";

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

const hasMondayConfig = () => {
  const boardId = process.env.MONDAY_BOARD_ID?.trim() ?? "";
  return boardId.length > 0;
};

/** GET /api/monday/metrics */
export const getMetrics = mondayAction({
  args: {
    fiscalYear: v.optional(v.string()),
    ownerId: v.optional(v.string()),
  },
  returns: v.object({ summary: metricsSummaryValidator }),
  handler: async (_ctx, _identity, args) => {
    if (!hasMondayConfig()) {
      throw new Error(
        "Missing Monday configuration. Set MONDAY_API_KEY and MONDAY_BOARD_ID.",
      );
    }

    const summary = await buildMondayMetricsSummary({
      fiscalYear: args.fiscalYear ?? null,
      ownerId: args.ownerId ?? null,
    });
    return { summary };
  },
});
