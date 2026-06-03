import { useCallback, useEffect, useRef, useState } from "react";
import { useConvex, useMutation as useConvexMutation } from "convex/react";
import { toast } from "@launchthatapp/ui/toast";
import type { Id } from "@convex-config/_generated/dataModel";
import { api } from "@convex-config/_generated/api";

import { fetchMondayApi } from "../services/monday-api";
import type { MondayBulkSyncJob, MondayBulkSyncStatusResponse, MondayRecord } from "../types";

interface UseBulkSyncMutationsArgs {
  sessionToken: string | null;
  staticMode: boolean;
  isMondaySettingsAdmin: boolean;
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
  mondayAccountId: job.mondayAccountId,
  requestedByMondayUserId: job.requestedByMondayUserId,
  requestedByMondayAppClientId: job.requestedByMondayAppClientId,
  ownerId: job.ownerId,
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
  isMondaySettingsAdmin,
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

  const [activeBulkSyncJobId, setActiveBulkSyncJobId] = useState<string | null>(null);
  const [latestBulkSyncJob, setLatestBulkSyncJob] = useState<MondayBulkSyncJob | null>(null);
  const [syncingContactIds, setSyncingContactIds] = useState<Set<string>>(new Set());
  const finalizedBulkSyncJobIdRef = useRef<string | null>(null);

  const applyBulkSyncJob = useCallback((job: MondayBulkSyncJob | null) => {
    setLatestBulkSyncJob(job);
    if (job?.status === "running") {
      setActiveBulkSyncJobId(job.jobId);
      setSyncingContactIds((prev) => new Set(prev).add("__bulk_sync__"));
    }
  }, []);

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
        applyBulkSyncJob(null);
        return null;
      }
      if (rawJob.mondayAccountId !== accountId) {
        throw new Error("Bulk sync job not found");
      }

      const job = toMondayBulkSyncJob(rawJob);
      applyBulkSyncJob(job);
      return job;
    },
    [applyBulkSyncJob, convex, mondayAccountId, sessionToken],
  );

  const startBulkSyncJob = useCallback(
    async (records: MondayRecord[]) => {
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

      const ownerId = requestedByMondayUserId;
      const rawJob = await createBulkSyncJob({
        mondayAccountId: accountId,
        requestedByMondayUserId,
        requestedByMondayAppClientId: mondayAppClientId?.trim() || undefined,
        ownerId,
        contactItemIds: dedupedTargetIds,
        monthlyBoardMappings: normalizeMonthlyBoardMappings(monthlyBoardMappings),
      });

      const job = toMondayBulkSyncJob(rawJob);
      finalizedBulkSyncJobIdRef.current = null;
      applyBulkSyncJob(job);
      return job;
    },
    [
      applyBulkSyncJob,
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
      if (rawJob) {
        setLatestBulkSyncJob(toMondayBulkSyncJob(rawJob));
      }
      setActiveBulkSyncJobId(null);
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
        contactItemIds: failedContactIds,
        monthlyBoardMappings: normalizeMonthlyBoardMappings(monthlyBoardMappings),
      });

      const job = toMondayBulkSyncJob(rawJob);
      finalizedBulkSyncJobIdRef.current = null;
      applyBulkSyncJob(job);
      return { ok: true as const, job, retriedContacts: failedContactIds.length };
    },
    [
      applyBulkSyncJob,
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
    if (!sessionToken || staticMode || !isMondaySettingsAdmin) return;
    void fetchBulkSyncStatus(null)
      .then((job) => {
        if (job && job.status !== "running") {
          finalizedBulkSyncJobIdRef.current = job.jobId;
        }
      })
      .catch(() => null);
  }, [fetchBulkSyncStatus, isMondaySettingsAdmin, sessionToken, staticMode]);

  useEffect(() => {
    if (!sessionToken || !activeBulkSyncJobId) return;
    if (latestBulkSyncJob?.status !== "running") return;

    let cancelled = false;
    let inFlight = false;
    const tick = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        const data = await fetchMondayApi<MondayBulkSyncStatusResponse>(
          "/api/monday/sync/bulk/tick",
          {
            sessionToken,
            method: "POST",
            body: { jobId: activeBulkSyncJobId, batchSize: 6, concurrency: 3 },
          },
        );
        if (cancelled) return;
        if (data.ok && data.job) {
          setLatestBulkSyncJob(data.job);
          return;
        }
        await fetchBulkSyncStatus(activeBulkSyncJobId);
      } catch {
        // tolerate polling failures
      } finally {
        inFlight = false;
      }
    };

    void tick();
    const timer = window.setInterval(() => void tick(), 2_500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeBulkSyncJobId, fetchBulkSyncStatus, latestBulkSyncJob?.status, sessionToken]);

  useEffect(() => {
    if (!latestBulkSyncJob) return;
    if (latestBulkSyncJob.status === "running") return;
    if (finalizedBulkSyncJobIdRef.current === latestBulkSyncJob.jobId) return;

    finalizedBulkSyncJobIdRef.current = latestBulkSyncJob.jobId;
    setActiveBulkSyncJobId(null);
    setSyncingContactIds((prev) => {
      if (!prev.has("__bulk_sync__")) return prev;
      const next = new Set(prev);
      next.delete("__bulk_sync__");
      return next;
    });

    onJobCompleted?.(latestBulkSyncJob);

    if (latestBulkSyncJob.status === "cancelled") {
      toast.error("Bulk sync cancelled");
    } else if (latestBulkSyncJob.status === "failed") {
      toast.error(latestBulkSyncJob.lastError ?? "Bulk sync failed");
    } else {
      const summary = `${latestBulkSyncJob.succeededContacts}/${latestBulkSyncJob.totalContacts} synced`;
      if (latestBulkSyncJob.failedContacts > 0) {
        toast.error(`${summary} (${latestBulkSyncJob.failedContacts} failed)`);
      } else {
        toast.success(summary);
      }
    }
  }, [latestBulkSyncJob, onJobCompleted]);

  return {
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
