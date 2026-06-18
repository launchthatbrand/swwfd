import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConvex, useMutation as useConvexMutation, useQuery } from "convex/react";
import { toast } from "@launchthatapp/ui/toast";
import type { Id } from "@convex-config/_generated/dataModel";
import { api } from "@convex-config/_generated/api";

import type { MondayBulkSyncJob, MondayRecord } from "../types";

interface UseBulkSyncMutationsArgs {
  sessionToken: string | null;
  staticMode: boolean;
  mondayAccountId: string | undefined;
  identityUserId: string | undefined;
  mondayAppClientId?: string | undefined;
  monthlyBoardMappings: Array<{ monthKey: string; boardId: string }>;
  resolveContactUpdateTargetRecordId: (record: MondayRecord) => string;
  onJobCompleted?: (job: MondayBulkSyncJob) => void;
}

const toMondayBulkSyncJob = (job: {
  jobId: Id<"mondayBulkSyncJobs">;
  status: MondayBulkSyncJob["status"];
  mondayAccountId: string;
  requestedByMondayUserId: string;
  requestedByMondayAppClientId: string | null;
  ownerId: string;
  workflowId: string | null;
  monthlyBoardIdOverride: string | null;
  totalContacts: number;
  nextIndex: number;
  processedContacts: number;
  succeededContacts: number;
  failedContacts: number;
  warningsCount: number;
  startedAt: number;
  updatedAt: number;
  finishedAt: number | null;
  lastError: string | null;
}): MondayBulkSyncJob => ({
  jobId: String(job.jobId),
  status: job.status,
  workflowId: job.workflowId ?? null,
  mondayAccountId: job.mondayAccountId,
  requestedByMondayUserId: job.requestedByMondayUserId,
  requestedByMondayAppClientId: job.requestedByMondayAppClientId,
  ownerId: job.ownerId,
  monthlyBoardIdOverride: job.monthlyBoardIdOverride ?? null,
  totalContacts: job.totalContacts,
  nextIndex: job.nextIndex,
  processedContacts: job.processedContacts,
  succeededContacts: job.succeededContacts,
  failedContacts: job.failedContacts,
  warningsCount: job.warningsCount,
  startedAt: job.startedAt,
  updatedAt: job.updatedAt,
  finishedAt: job.finishedAt,
  lastError: job.lastError,
});

const normalizeMonthlyBoardMappings = (
  values: Array<{ monthKey: string; boardId: string }>,
) => {
  const deduped = new Map<string, { monthKey: string; boardId: string }>();
  for (const value of values) {
    const monthKey = value.monthKey.trim();
    const boardId = value.boardId.trim();
    if (!/^\d{4}-\d{2}$/.test(monthKey) || boardId.length === 0) continue;
    deduped.set(monthKey, { monthKey, boardId });
  }
  return Array.from(deduped.values()).sort((left, right) =>
    left.monthKey.localeCompare(right.monthKey),
  );
};

export const useBulkSyncMutations = ({
  sessionToken,
  staticMode,
  mondayAccountId,
  identityUserId,
  mondayAppClientId,
  monthlyBoardMappings,
  resolveContactUpdateTargetRecordId,
  onJobCompleted,
}: UseBulkSyncMutationsArgs) => {
  const convex = useConvex();
  const createBulkSyncJob = useConvexMutation(api.mondayBulkSync.createJob);
  const cancelBulkSyncJobMutation = useConvexMutation(api.mondayBulkSync.cancelJob);
  const accountId = mondayAccountId?.trim();
  const rawJobs = useQuery(
    api.mondayBulkSync.listJobsForAccount,
    sessionToken && !staticMode && accountId
      ? {
          mondayAccountId: accountId,
          limit: 25,
        }
      : "skip",
  );

  const [syncingContactIds, setSyncingContactIds] = useState<Set<string>>(new Set());
  const finalizedBulkSyncJobIdsRef = useRef<Set<string>>(new Set());
  const bulkSyncJobs = useMemo(
    () => (rawJobs ?? []).map((job) => toMondayBulkSyncJob(job)),
    [rawJobs],
  );
  const latestBulkSyncJob = bulkSyncJobs[0] ?? null;
  const activeBulkSyncJobId =
    bulkSyncJobs.find((job) => job.status === "running")?.jobId ?? null;

  const fetchBulkSyncStatus = useCallback(
    async (jobId?: string | null) => {
      const accountId = mondayAccountId?.trim();
      if (!sessionToken || !accountId) return null;

      const trimmedJobId = jobId?.trim();
      const rawJob = trimmedJobId
        ? await convex.query(api.mondayBulkSync.getJob, {
            jobId: trimmedJobId as Id<"mondayBulkSyncJobs">,
          })
        : await convex.query(api.mondayBulkSync.getLatestJobForAccount, {
            mondayAccountId: accountId,
          });

      if (!rawJob) {
        return null;
      }
      if (rawJob.mondayAccountId !== accountId) {
        throw new Error("Bulk sync job not found");
      }

      const job = toMondayBulkSyncJob(rawJob);
      return job;
    },
    [convex, mondayAccountId, sessionToken],
  );

  const startBulkSyncJob = useCallback(
    async (
      records: MondayRecord[],
      options?: {
        ownerId?: string;
        monthlyBoardIdOverride?: string;
      },
    ) => {
      const accountId = mondayAccountId?.trim();
      const requestedByMondayUserId = identityUserId?.trim();
      if (!sessionToken) throw new Error("Missing monday session token");
      if (!accountId || !requestedByMondayUserId) {
        throw new Error("Missing Monday account or user identity");
      }

      const dedupedTargetIds = Array.from(
        new Set(
          records
            .map((r) => resolveContactUpdateTargetRecordId(r).trim())
            .filter((id) => id.length > 0),
        ),
      );
      if (dedupedTargetIds.length === 0) throw new Error("No valid contact records selected");

      const ownerId = options?.ownerId?.trim() || requestedByMondayUserId;
      const rawJob = await createBulkSyncJob({
        mondayAccountId: accountId,
        requestedByMondayUserId,
        requestedByMondayAppClientId: mondayAppClientId?.trim() || undefined,
        ownerId,
        monthlyBoardIdOverride: options?.monthlyBoardIdOverride?.trim() || undefined,
        contactItemIds: dedupedTargetIds,
        monthlyBoardMappings: normalizeMonthlyBoardMappings(monthlyBoardMappings),
      });

      return toMondayBulkSyncJob(rawJob);
    },
    [
      createBulkSyncJob,
      identityUserId,
      mondayAccountId,
      mondayAppClientId,
      monthlyBoardMappings,
      resolveContactUpdateTargetRecordId,
      sessionToken,
    ],
  );

  const cancelBulkSyncJob = useCallback(
    async (jobId: string) => {
      if (!sessionToken) return;
      const rawJob = await cancelBulkSyncJobMutation({
        jobId: jobId as Id<"mondayBulkSyncJobs">,
      });
      if (!rawJob) return;
    },
    [cancelBulkSyncJobMutation, sessionToken],
  );

  const retryFailedBulkSyncJob = useCallback(
    async (jobId: string) => {
      const accountId = mondayAccountId?.trim();
      const requestedByMondayUserId = identityUserId?.trim();
      if (!sessionToken) throw new Error("Missing monday session token");
      if (!accountId || !requestedByMondayUserId) {
        throw new Error("Missing Monday account or user identity");
      }

      const sourceJob = await convex.query(api.mondayBulkSync.getJob, {
        jobId: jobId as Id<"mondayBulkSyncJobs">,
      });
      if (!sourceJob || sourceJob.mondayAccountId !== accountId) {
        throw new Error("Bulk sync job not found");
      }

      const failedContactIds = await convex.query(api.mondayBulkSync.listFailedContactIds, {
        jobId: sourceJob.jobId,
      });
      if (failedContactIds.length === 0) {
        throw new Error("No failed contacts to retry");
      }

      const rawJob = await createBulkSyncJob({
        mondayAccountId: accountId,
        requestedByMondayUserId,
        requestedByMondayAppClientId: mondayAppClientId?.trim() || undefined,
        ownerId: sourceJob.ownerId,
        monthlyBoardIdOverride: sourceJob.monthlyBoardIdOverride ?? undefined,
        contactItemIds: failedContactIds,
        monthlyBoardMappings: normalizeMonthlyBoardMappings(monthlyBoardMappings),
      });

      return {
        ok: true as const,
        job: toMondayBulkSyncJob(rawJob),
        retriedContacts: failedContactIds.length,
      };
    },
    [
      convex,
      createBulkSyncJob,
      identityUserId,
      mondayAccountId,
      mondayAppClientId,
      monthlyBoardMappings,
      sessionToken,
    ],
  );

  useEffect(() => {
    const hasRunning = bulkSyncJobs.some((job) => job.status === "running");
    setSyncingContactIds((prev) => {
      if (hasRunning && prev.has("__bulk_sync__")) return prev;
      if (!hasRunning && !prev.has("__bulk_sync__")) return prev;
      const next = new Set(prev);
      if (hasRunning) next.add("__bulk_sync__");
      else next.delete("__bulk_sync__");
      return next;
    });
  }, [bulkSyncJobs]);

  useEffect(() => {
    for (const job of bulkSyncJobs) {
      if (job.status === "running") continue;
      if (finalizedBulkSyncJobIdsRef.current.has(job.jobId)) continue;
      finalizedBulkSyncJobIdsRef.current.add(job.jobId);

      onJobCompleted?.(job);

      if (job.status === "cancelled") {
        toast.error("Bulk sync cancelled");
      } else if (job.status === "failed") {
        toast.error(job.lastError ?? "Bulk sync failed");
      } else {
        const summary = `${job.succeededContacts}/${job.totalContacts} synced`;
        if (job.failedContacts > 0) {
          toast.error(`${summary} (${job.failedContacts} failed)`);
        } else {
          toast.success(summary);
        }
      }
    }
  }, [bulkSyncJobs, onJobCompleted]);

  return {
    bulkSyncJobs,
    activeBulkSyncJobId,
    latestBulkSyncJob,
    syncingContactIds,
    setSyncingContactIds,
    fetchBulkSyncStatus,
    startBulkSyncJob,
    cancelBulkSyncJob,
    retryFailedBulkSyncJob,
  };
};
