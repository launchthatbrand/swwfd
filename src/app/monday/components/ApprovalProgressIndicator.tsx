"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@launchthatapp/ui/popover";
import type { ApprovalStepConfig } from "../types";
import { cn } from "~/lib/utils";

export const ApprovalProgressIndicator = (props: {
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
  const safeProgress = Math.max(0, Math.min(100, Math.round(props.progressValue ?? 0)));
  const stepCount = Math.max(props.steps.length, 1);
  const stepSize = 100 / stepCount;
  const completedSteps = Math.floor(safeProgress / stepSize);
  const shouldShowRaw = props.rawProgressValue != null && hoverPopoversEnabled;
  const indicator = (
    <div className={cn("mt-1 space-y-1", props.className)}>
      <div className="text-muted-foreground flex items-center justify-end text-[10px]">
        <span>{props.progressValue !== null ? `${safeProgress}%` : "—"}</span>
      </div>
      <div
        className="relative h-2 cursor-default overflow-hidden rounded-full bg-muted/80"
        onMouseEnter={hoverPopoversEnabled ? () => updateOpen(true) : undefined}
        onMouseLeave={hoverPopoversEnabled ? () => updateOpen(false) : undefined}
      >
        <div
          className="bg-primary h-full transition-all"
          style={{ width: `${safeProgress}%` }}
        />
        {props.steps.map((step, index) => {
          const left =
            props.steps.length === 1
              ? 0
              : (index / (props.steps.length - 1)) * 100;
          const completed = safeProgress >= (index + 1) * stepSize;
          return (
            <span
              key={step.id}
              className={`absolute top-0 z-10 h-full w-0.5 -translate-x-1/2 ${completed ? "bg-foreground/60" : "bg-border/70"
                }`}
              style={{ left: `${left}%` }}
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
              {completedSteps}/{props.steps.length} steps
            </span>
          </div>
          <div className="space-y-1">
            {props.steps.map((step, index) => {
              const completed = safeProgress >= (index + 1) * stepSize;
              return (
                <div
                  key={step.id}
                  className="flex items-center justify-between gap-2 rounded-sm px-1 py-0.5 text-xs"
                >
                  <span className="truncate">
                    {index + 1}. {step.title}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${completed
                      ? "bg-emerald-500/15 text-emerald-700"
                      : "bg-muted text-muted-foreground"
                      }`}
                  >
                    {completed ? "Done" : "Pending"}
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
