"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { buildMondayMetricsSummary } from "./lib/mondayMetricsImpl";

export const runScanJob = internalAction({
  args: {
    jobId: v.id("mondayMetricsScanJobs"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.runMutation(internal.mondayMetricsSnapshots.markScanJobRunning, {
      jobId: args.jobId,
    });
    if (!job) return null;

    try {
      const summary = await buildMondayMetricsSummary({
        fiscalYear: job.fiscalYear,
        ownerId: job.ownerId,
      });
      await ctx.runMutation(internal.mondayMetricsSnapshots.markScanJobCompleted, {
        jobId: args.jobId,
        summaryJson: JSON.stringify(summary),
        summaryGeneratedAt: summary.generatedAt,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown Monday metrics scan failure";
      await ctx.runMutation(internal.mondayMetricsSnapshots.markScanJobFailed, {
        jobId: args.jobId,
        error: message,
      });
    }
    return null;
  },
});
