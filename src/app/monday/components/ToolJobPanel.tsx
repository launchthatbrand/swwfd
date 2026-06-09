"use client";

import type { ComponentProps, ReactNode } from "react";

import { Badge } from "@launchthatapp/ui/badge";
import { Button } from "@launchthatapp/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@launchthatapp/ui/card";

type JobStatus = "running" | "done" | "failed" | "cancelled";

const getStatusBadgeVariant = (
  status: JobStatus | undefined,
): ComponentProps<typeof Badge>["variant"] => {
  switch (status) {
    case "running":
      return "default";
    case "done":
      return "secondary";
    case "failed":
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
};

const formatTimestamp = (ts: number | null | undefined) => {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
};

interface ToolJobPanelProps<TJob extends { status: JobStatus }> {
  title: string;
  description?: string;
  job: TJob | null;
  isStarting: boolean;
  isCancelling: boolean;
  onStart: () => void;
  onCancel: () => void;
  startLabel?: string;
  cancelLabel?: string;
  startDisabled?: boolean;
  /** Render custom form inputs above the start button */
  renderForm?: () => ReactNode;
  /** Render custom job status details */
  renderJobDetails?: (job: TJob) => ReactNode;
}

export const ToolJobPanel = <TJob extends {
  status: JobStatus;
  startedAt: number;
  updatedAt: number;
  finishedAt?: number | null;
  lastError?: string | null;
}>({
  title,
  description,
  job,
  isStarting,
  isCancelling,
  onStart,
  onCancel,
  startLabel = "Start",
  cancelLabel = "Cancel",
  startDisabled,
  renderForm,
  renderJobDetails,
}: ToolJobPanelProps<TJob>) => {
  const isRunning = job?.status === "running";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          {job && (
            <Badge variant={getStatusBadgeVariant(job.status)}>
              {job.status}
            </Badge>
          )}
        </div>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {renderForm?.()}

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={onStart}
            disabled={isStarting || isRunning || startDisabled}
          >
            {isStarting ? "Starting…" : startLabel}
          </Button>
          {isRunning && (
            <Button
              size="sm"
              variant="destructive"
              onClick={onCancel}
              disabled={isCancelling}
            >
              {isCancelling ? "Cancelling…" : cancelLabel}
            </Button>
          )}
        </div>

        {job && (
          <div className="space-y-1 text-xs">
            <div className="text-muted-foreground">
              Started: {formatTimestamp(job.startedAt)}
              {job.finishedAt && <> · Finished: {formatTimestamp(job.finishedAt)}</>}
            </div>
            {job.lastError && (
              <div className="text-destructive truncate">
                Error: {job.lastError}
              </div>
            )}
            {renderJobDetails?.(job)}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
