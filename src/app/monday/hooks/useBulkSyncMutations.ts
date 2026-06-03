import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@launchthatapp/ui/toast";

import { fetchMondayApi } from "../services/monday-api";
import type { MondayBulkSyncJob, MondayBulkSyncStatusResponse, MondayRecord } from "../types";

interface UseBulkSyncMutationsArgs {
  sessionToken: string | null;
  staticMode: boolean;
  isMondaySettingsAdmin: boolean;
  identityUserId: string | undefined;
  resolveContactUpdateTargetRecordId: (record: MondayRecord) => string;
  onJobCompleted?: (job: MondayBulkSyncJob) => void;
}

export const useBulkSyncMutations = ({
  sessionToken,
  staticMode,
  isMondaySettingsAdmin,
  identityUserId,
  resolveContactUpdateTargetRecordId,
  onJobCompleted,
}: UseBulkSyncMutationsArgs) => {
  const [activeBulkSyncJobId, setActiveBulkSyncJobId] = useState<string | null>(null);
  const [latestBulkSyncJob, setLatestBulkSyncJob] = useState<MondayBulkSyncJob | null>(null);
  const [syncingContactIds, setSyncingContactIds] = useState<Set<string>>(new Set());
  const finalizedBulkSyncJobIdRef = useRef<string | null>(null);

  const fetchBulkSyncStatus = useCallback(
    async (jobId?: string | null) => {
      if (!sessionToken) return null;
      const params = new URLSearchParams();
      if (jobId?.trim()) params.set("jobId", jobId.trim());
      const data = await fetchMondayApi<MondayBulkSyncStatusResponse>(
        `/api/monday/sync/bulk/status${params.toString() ? `?${params.toString()}` : ""}`,
        { sessionToken },
      );
      if (!data.ok) {
        throw new Error(data.error ?? "Failed to load bulk sync status");
      }
      const job = data.job ?? null;
      setLatestBulkSyncJob(job);
      if (job?.status === "running") {
        setActiveBulkSyncJobId(job.jobId);
        setSyncingContactIds((prev) => new Set(prev).add("__bulk_sync__"));
      }
      return job;
    },
    [sessionToken],
  );

  const startBulkSyncJob = useCallback(
    async (records: MondayRecord[]) => {
      if (!sessionToken) throw new Error("Missing monday session token");

      const dedupedTargetIds = Array.from(
        new Set(
          records
            .map((r) => resolveContactUpdateTargetRecordId(r).trim())
            .filter((id) => id.length > 0),
        ),
      );
      if (dedupedTargetIds.length === 0) throw new Error("No valid contact records selected");

      const data = await fetchMondayApi<MondayBulkSyncStatusResponse>(
        "/api/monday/sync/bulk/start",
        {
          sessionToken,
          method: "POST",
          body: { contactItemIds: dedupedTargetIds, ownerId: identityUserId },
        },
      );
      if (!data.ok || !data.job) throw new Error(data.error ?? "Failed to start bulk sync");

      finalizedBulkSyncJobIdRef.current = null;
      setLatestBulkSyncJob(data.job);
      setActiveBulkSyncJobId(data.job.jobId);
      setSyncingContactIds((prev) => new Set(prev).add("__bulk_sync__"));
      return data.job;
    },
    [identityUserId, resolveContactUpdateTargetRecordId, sessionToken],
  );

  const cancelBulkSyncJob = useCallback(
    async (jobId: string) => {
      if (!sessionToken) return;
      const data = await fetchMondayApi<MondayBulkSyncStatusResponse>(
        "/api/monday/sync/bulk/cancel",
        { sessionToken, method: "POST", body: { jobId } },
      );
      if (!data.ok) throw new Error(data.error ?? "Failed to cancel bulk sync");
      if (data.job) setLatestBulkSyncJob(data.job);
      setActiveBulkSyncJobId(null);
    },
    [sessionToken],
  );

  const retryFailedBulkSyncJob = useCallback(
    async (jobId: string) => {
      if (!sessionToken) throw new Error("Missing monday session token");
      const data = await fetchMondayApi<MondayBulkSyncStatusResponse>(
        "/api/monday/sync/bulk/retry",
        { sessionToken, method: "POST", body: { jobId } },
      );
      if (!data.ok || !data.job) throw new Error(data.error ?? "Failed to retry failed contacts");

      finalizedBulkSyncJobIdRef.current = null;
      setLatestBulkSyncJob(data.job);
      setActiveBulkSyncJobId(data.job.jobId);
      setSyncingContactIds((prev) => new Set(prev).add("__bulk_sync__"));
      return data;
    },
    [sessionToken],
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
