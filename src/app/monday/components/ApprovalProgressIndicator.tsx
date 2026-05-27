"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@launchthatapp/ui/popover";
import type { ApprovalStepConfig, MondayRecord } from "../types";
import { getApprovalStepProgress } from "../helpers";
import { cn } from "~/lib/utils";

export const ApprovalProgressIndicator = (props: {
  record: MondayRecord;
  progressValue: number | null;
  steps: ApprovalStepConfig[];
  rawProgressValue?: string | null;
  className?: string;
  onHoverChange?: (hovering: boolean) => void;
  hoverPopoversEnabled?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const hoverPopoversEnabled = props.hoverPopoversEnabled ?? true;
  const updateOpen = (next: boolean) => {
    if (!hoverPopoversEnabled) return;
    setOpen(next);
    props.onHoverChange?.(next);
  };
  const stepProgress = getApprovalStepProgress(props.record, props.steps);
  const safeProgress = Math.max(0, Math.min(100, Math.round(props.progressValue ?? 0)));
  const completedSteps = stepProgress.completedCount;
  const firstNotDoneStepIndex = stepProgress.states.findIndex((entry) => entry.state !== "done");
  const shouldShowRaw = props.rawProgressValue != null && hoverPopoversEnabled;
  const indicator = (
    <div className={cn("mt-1 space-y-1", props.className)}>
      <div className="text-muted-foreground flex items-center justify-end text-[10px]">
        <span>{props.progressValue !== null ? `${safeProgress}%` : "—"}</span>
      </div>
      <div
        className="flex cursor-default gap-0.5"
        onMouseEnter={hoverPopoversEnabled ? () => updateOpen(true) : undefined}
        onMouseLeave={hoverPopoversEnabled ? () => updateOpen(false) : undefined}
      >
        {stepProgress.states.map((step, index) => {
          const isCurrentStep = firstNotDoneStepIndex >= 0 && index === firstNotDoneStepIndex;
          const segmentClassName =
            step.state === "done"
              ? "bg-emerald-500"
              : step.state === "skipped"
                ? "bg-amber-400"
                : isCurrentStep
                  ? "bg-primary/40"
                  : "bg-muted/80";
          return (
            <span
              key={step.step.id}
              className={cn(
                "h-2 min-w-0 flex-1 rounded-[2px] transition-colors",
                segmentClassName,
              )}
            />
          );
        })}
      </div>
      {shouldShowRaw && (
        <p className="text-muted-foreground font-mono text-[10px] leading-tight break-all">
          raw: {props.rawProgressValue}
        </p>
      )}
    </div>
  );

  if (!hoverPopoversEnabled) {
    return indicator;
  }

  return (
    <Popover open={open} onOpenChange={updateOpen}>
      <PopoverTrigger asChild>{indicator}</PopoverTrigger>
      <PopoverContent
        portal={false}
        side="top"
        align="start"
        className="w-72"
        onMouseEnter={() => updateOpen(true)}
        onMouseLeave={() => updateOpen(false)}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Onboarding Progress</p>
            <span className="text-muted-foreground text-xs">
              {completedSteps}/{props.steps.length} steps done
            </span>
          </div>
          <div className="space-y-1">
            {props.steps.map((step, index) => {
              const resolvedStep = stepProgress.states[index];
              const state = resolvedStep?.state ?? "pending";
              const statusLabel =
                state === "done" ? "Done" : state === "skipped" ? "Skipped" : "Pending";
              const statusClassName =
                state === "done"
                  ? "bg-emerald-500/15 text-emerald-700"
                  : state === "skipped"
                    ? "bg-amber-500/15 text-amber-700"
                    : "bg-muted text-muted-foreground";
              return (
                <div
                  key={step.id}
                  className="flex items-center justify-between gap-2 rounded-sm px-1 py-0.5 text-xs"
                >
                  <span className="truncate">
                    {index + 1}. {step.title}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                      statusClassName,
                    )}
                  >
                    {statusLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
