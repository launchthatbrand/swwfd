"use client";

import { Check, Lock, Loader2, ChevronDown, ChevronUp, Circle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@launchthatapp/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { cn } from "~/lib/utils";
import type { ApprovalStepConfig, MondayRecord } from "../types";
import type { ContactUpdateType, StepActionConfig } from "../constants";
import { STEP_ACTION_CONFIG } from "../constants";
import { getRecordStepIndex } from "../helpers";

export interface OnboardingStepperProps {
  record: MondayRecord;
  approvalSteps: ApprovalStepConfig[];
  isProcessing: boolean;
  onQuickAction: (opts: {
    updateType: Exclude<ContactUpdateType, "general">;
    body: string;
  }) => void;
  onQuestionnaireAction: (record: MondayRecord) => void;
  onGenericStepAction: (opts: { body: string; stepColumnId: string }) => void;
  isAdmin?: boolean;
  isSyncing?: boolean;
  onSyncUser?: (record: MondayRecord) => void;
  actionButtonClassName?: string;
  buttonSizeClassName?: string;
}

export const OnboardingStepper = ({
  record,
  approvalSteps,
  isProcessing,
  onQuickAction,
  onQuestionnaireAction,
  onGenericStepAction,
  isAdmin = false,
  isSyncing = false,
  onSyncUser,
  actionButtonClassName = "",
  buttonSizeClassName = "",
}: OnboardingStepperProps) => {
  const [expanded, setExpanded] = useState(false);
  const [welcomeEmailConfirmOpen, setWelcomeEmailConfirmOpen] = useState(false);
  const [pendingWelcomeStep, setPendingWelcomeStep] = useState<(typeof steps)[number] | null>(null);

  const stepCount = approvalSteps.length;
  const currentStepIndex = getRecordStepIndex(record.batteryProgress, stepCount);
  const allComplete = currentStepIndex >= stepCount;

  type StepWithState = StepActionConfig & { title: string; completed: boolean; isCurrent: boolean };

  const allSteps: StepWithState[] =
    STEP_ACTION_CONFIG.map((config, i) => ({
      ...config,
      title: approvalSteps[i]?.title ?? config.defaultBody,
      completed: i < currentStepIndex,
      isCurrent: i === currentStepIndex,
    }));

  const steps = allSteps.filter((s) => !s.hiddenFromStepper);

  // If the current step is hidden, advance to the next visible one
  const currentStep = steps.find((s) => s.isCurrent)
    ?? steps.find((s) => !s.completed);

  const executeAction = (step: StepWithState) => {
    if (step.actionVariant === "questionnaire") {
      onQuestionnaireAction(record);
    } else if (step.updateType) {
      onQuickAction({ updateType: step.updateType, body: step.defaultBody });
    } else {
      onGenericStepAction({ body: step.defaultBody, stepColumnId: step.columnId });
    }
  };

  const handleAction = (step: StepWithState) => {
    if (step.updateType === "welcome_email") {
      setPendingWelcomeStep(step);
      setWelcomeEmailConfirmOpen(true);
      return;
    }
    executeAction(step);
  };

  return (
    <>
    <Dialog
      open={welcomeEmailConfirmOpen}
      onOpenChange={(open) => {
        if (!open) {
          setWelcomeEmailConfirmOpen(false);
          setPendingWelcomeStep(null);
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Welcome Email</DialogTitle>
          <DialogDescription>
            Automated emails are not currently enabled. Please confirm that you have sent this email manually.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setWelcomeEmailConfirmOpen(false);
              setPendingWelcomeStep(null);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              setWelcomeEmailConfirmOpen(false);
              if (pendingWelcomeStep) {
                executeAction(pendingWelcomeStep);
              }
              setPendingWelcomeStep(null);
            }}
          >
            I sent it manually
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    <section className="space-y-2 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Onboarding Progress
          <span className="text-muted-foreground/70 ml-1.5 font-normal normal-case">
            {steps.filter((s) => s.completed).length}/{steps.length}
          </span>
        </p>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[10px] transition-colors"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? "Collapse" : "All steps"}
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* Mini progress segments */}
      {!expanded && (
        <div className="flex gap-0.5">
          {steps.map((step) => (
            <div
              key={step.columnId}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                step.completed
                  ? "bg-emerald-500"
                  : step.isCurrent
                    ? "bg-border"
                    : "bg-muted",
              )}
            />
          ))}
        </div>
      )}

      {/* Current step card (collapsed) */}
      {!expanded && currentStep && (
        <div className="flex items-center gap-3 rounded-md border border-dashed border-primary/40 bg-transparent p-3">
          <div className="text-muted-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-primary/40 text-xs font-bold">
            {currentStep.stepIndex + 1}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{currentStep.title}</p>
            <p className="text-muted-foreground text-[11px]">Next step</p>
          </div>
          <Button
            type="button"
            size="sm"
            className={cn("cursor-pointer shrink-0 rounded-md", buttonSizeClassName, actionButtonClassName)}
            disabled={isProcessing}
            onClick={() => handleAction(currentStep)}
          >
            {isProcessing ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing...
              </span>
            ) : (
              currentStep.actionLabel
            )}
          </Button>
        </div>
      )}

      {/* All complete state (collapsed) */}
      {!expanded && !currentStep && allComplete && (
        <div className="flex items-center gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
            <Check className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">All steps completed</p>
            <p className="text-muted-foreground text-[11px]">
              {steps.length}/{steps.length} onboarding steps done
            </p>
          </div>
        </div>
      )}

      {/* Admin: Sync User */}
      {isAdmin && onSyncUser && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full cursor-pointer gap-1.5"
          disabled={isSyncing || isProcessing}
          onClick={() => onSyncUser(record)}
        >
          {isSyncing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="h-3.5 w-3.5" /> Sync User
            </>
          )}
        </Button>
      )}

      {/* Expanded timeline */}
      {expanded && (
        <div className="relative space-y-0">
          {steps.map((step, i) => (
            <div key={step.columnId} className="relative flex gap-3 pb-3 last:pb-0">
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "absolute left-[13px] top-7 h-[calc(100%-12px)] w-0.5",
                    step.completed ? "bg-emerald-500/40" : "bg-border",
                  )}
                />
              )}

              <div className="relative z-10 shrink-0">
                {step.completed ? (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                ) : step.isCurrent ? (
                  <div className="text-muted-foreground flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-primary/40">
                    <Circle className="h-2.5 w-2.5 text-primary/50" />
                  </div>
                ) : (
                  <div className="text-muted-foreground flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                    <Lock className="h-3 w-3" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={cn(
                      "text-sm",
                      step.completed && "text-muted-foreground line-through decoration-muted-foreground/40",
                      step.isCurrent && "font-medium",
                      !step.completed && !step.isCurrent && "text-muted-foreground/60",
                    )}
                  >
                    {step.title}
                  </p>
                  {step.completed && (
                    <span className="shrink-0 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                      Done
                    </span>
                  )}
                  {step.isCurrent && (
                    <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      Next
                    </span>
                  )}
                </div>
                {step.isCurrent && (
                  <div className="mt-1.5">
                    <Button
                      type="button"
                      size="sm"
                      className={cn("cursor-pointer rounded-md", buttonSizeClassName, actionButtonClassName)}
                      disabled={isProcessing}
                      onClick={() => handleAction(step)}
                    >
                      {isProcessing ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing...
                        </span>
                      ) : (
                        step.actionLabel
                      )}
                    </Button>
                  </div>
                )}
                {!step.completed && !step.isCurrent && (
                  <p className="text-muted-foreground/50 text-[11px]">
                    Complete previous step first
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
    </>
  );
};
