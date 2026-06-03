import { useCallback, useState } from "react";
import {
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from "convex/react";
import type { FunctionArgs, FunctionReference } from "convex/server";
import { toast } from "@launchthatapp/ui/toast";

type JobStatus = "running" | "done" | "failed" | "cancelled";

export interface ToolJobConfig<
  TStatusQuery extends FunctionReference<"query", "public">,
  TStartMutation extends FunctionReference<"mutation", "public">,
  TCancelMutation extends FunctionReference<"mutation", "public">,
> {
  statusQuery: TStatusQuery;
  startMutation: TStartMutation;
  cancelMutation: TCancelMutation;
  label: string;
  statusQueryArgs?: FunctionArgs<TStatusQuery>;
}

export interface UseToolJobOptions {
  onStartComplete?: () => void;
}

export interface ToolJobState<
  TJob,
  TStartArgs extends Record<string, unknown>,
  TCancelArgs extends Record<string, unknown>,
> {
  /** Latest job from Convex, `null` when none, `undefined` while the query is loading */
  job: TJob | null | undefined;
  isStarting: boolean;
  isCancelling: boolean;
  start: (args: TStartArgs) => Promise<void>;
  cancel: (args?: TCancelArgs) => Promise<void>;
}

/**
 * Reactive tool-job controls backed by Convex queries and mutations.
 *
 * @example
 * ```ts
 * import { api } from "@convex-config/_generated/api";
 *
 * const backfill = useToolJob({
 *   statusQuery: api.mondayTouchBackfill.getLatestJob,
 *   startMutation: api.mondayTouchBackfill.startBackfill,
 *   cancelMutation: api.mondayTouchBackfill.cancelBackfill,
 *   label: "Touch backfill",
 * });
 * ```
 */
export const useToolJob = <
  TJob extends { status: JobStatus },
  TStatusQuery extends FunctionReference<
    "query",
    "public",
    Record<string, never>,
    TJob | null
  >,
  TStartMutation extends FunctionReference<"mutation", "public">,
  TCancelMutation extends FunctionReference<"mutation", "public">,
>(
  config: ToolJobConfig<TStatusQuery, TStartMutation, TCancelMutation>,
  opts?: UseToolJobOptions,
): ToolJobState<
  TJob,
  FunctionArgs<TStartMutation>,
  FunctionArgs<TCancelMutation>
> => {
  const statusArgs = (config.statusQueryArgs ?? {}) as FunctionArgs<TStatusQuery>;
  const rawJob = useConvexQuery(config.statusQuery, statusArgs);
  const runStart = useConvexMutation(config.startMutation);
  const runCancel = useConvexMutation(config.cancelMutation);

  const [isStarting, setIsStarting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const start = useCallback(
    async (args: FunctionArgs<TStartMutation>) => {
      setIsStarting(true);
      try {
        await runStart(args);
        toast.success(`${config.label} started`);
        opts?.onStartComplete?.();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : `Failed to start ${config.label}`,
        );
      } finally {
        setIsStarting(false);
      }
    },
    [config.label, runStart, opts?.onStartComplete],
  );

  const cancel = useCallback(
    async (args?: FunctionArgs<TCancelMutation>) => {
      setIsCancelling(true);
      try {
        await runCancel((args ?? {}) as FunctionArgs<TCancelMutation>);
        toast.success(`${config.label} cancelled`);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : `Failed to cancel ${config.label}`,
        );
      } finally {
        setIsCancelling(false);
      }
    },
    [config.label, runCancel],
  );

  return {
    job: rawJob as TJob | null | undefined,
    isStarting,
    isCancelling,
    start,
    cancel,
  };
};

/**
 * @deprecated Convex status queries are reactive; interval polling is unnecessary.
 */
export const useToolJobPoller = (
  _jobs?: Array<{ status?: string }>,
  _callbacks?: Array<() => Promise<void>>,
  _intervalMs?: number,
) => {
  // no-op
};
