import { useCallback, useEffect, useState } from "react";
import { toast } from "@launchthatapp/ui/toast";

type JobStatus = "running" | "done" | "failed" | "cancelled";

interface ToolJobConfig<TJob> {
  statusUrl: string;
  startUrl: string;
  cancelUrl: string;
  label: string;
  parseJob: (data: Record<string, unknown>) => TJob | null;
}

interface ToolJobState<TJob> {
  job: TJob | null;
  isLoading: boolean;
  isStarting: boolean;
  isCancelling: boolean;
  refresh: () => Promise<void>;
  start: (body: Record<string, unknown>) => Promise<void>;
  cancel: (body?: Record<string, unknown>) => Promise<void>;
}

export const useToolJob = <TJob extends { status: JobStatus }>(
  config: ToolJobConfig<TJob>,
  opts?: {
    onRefreshComplete?: () => void;
    onStartComplete?: () => void;
  },
): ToolJobState<TJob> => {
  const [job, setJob] = useState<TJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(config.statusUrl, {
        method: "GET",
        cache: "no-store",
      });
      const data = (await response.json()) as Record<string, unknown>;
      if (!response.ok || !data.ok) {
        throw new Error((data.error as string) ?? `Failed to load ${config.label} status`);
      }
      setJob(config.parseJob(data));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : `Failed to load ${config.label} status`,
      );
    } finally {
      setIsLoading(false);
      opts?.onRefreshComplete?.();
    }
  }, [config.statusUrl, config.label, config.parseJob, opts?.onRefreshComplete]);

  const start = useCallback(
    async (body: Record<string, unknown>) => {
      setIsStarting(true);
      try {
        const response = await fetch(config.startUrl, {
          method: "POST",
          cache: "no-store",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await response.json()) as Record<string, unknown>;
        if (!response.ok || !data.ok) {
          throw new Error((data.error as string) ?? `Failed to start ${config.label}`);
        }
        toast.success(`${config.label} started`);
        await refresh();
        opts?.onStartComplete?.();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : `Failed to start ${config.label}`,
        );
      } finally {
        setIsStarting(false);
      }
    },
    [config.startUrl, config.label, refresh, opts?.onStartComplete],
  );

  const cancel = useCallback(
    async (body?: Record<string, unknown>) => {
      setIsCancelling(true);
      try {
        const response = await fetch(config.cancelUrl, {
          method: "POST",
          cache: "no-store",
          ...(body ? {
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          } : {}),
        });
        const data = (await response.json()) as Record<string, unknown>;
        if (!response.ok || !data.ok) {
          throw new Error((data.error as string) ?? `Failed to cancel ${config.label}`);
        }
        toast.success(`${config.label} cancelled`);
        await refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : `Failed to cancel ${config.label}`,
        );
      } finally {
        setIsCancelling(false);
      }
    },
    [config.cancelUrl, config.label, refresh],
  );

  return { job, isLoading, isStarting, isCancelling, refresh, start, cancel };
};

/**
 * Polls multiple job statuses at a regular interval when any job is running.
 */
export const useToolJobPoller = (
  jobs: Array<{ status?: string }>,
  callbacks: Array<() => Promise<void>>,
  intervalMs = 5000,
) => {
  useEffect(() => {
    const anyRunning = jobs.some((j) => j.status === "running");
    if (!anyRunning) return;

    const timer = setInterval(() => {
      for (const cb of callbacks) {
        void cb();
      }
    }, intervalMs);
    return () => clearInterval(timer);
  }, [jobs, callbacks, intervalMs]);
};
