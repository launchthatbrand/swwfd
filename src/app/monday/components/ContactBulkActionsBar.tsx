"use client";

import type { CSSProperties } from "react";

import { Button } from "@launchthatapp/ui/button";
import type { MondayBulkSyncJob, MondayRecord } from "../types";
import {
  CONTACT_UPDATE_ACTION_BUTTONS,
  QUESTIONNAIRE_UPDATE_ACTION,
  STEP_ACTION_CONFIG,
  type QuickContactActionButton,
} from "../constants";
import { getRecordStepIndexFromApprovalSteps } from "../helpers";
import {
  COMMUNICATION_QUICK_ACTIONS,
  type CommunicationQuickActionDefinition,
} from "../board-local";

export const ContactBulkActionsBar = ({
  selectedItems,
  clearSelection,
  approvalSteps,
  getMergeTargetRecordId,
  bulkQuickActionType,
  isCreatingBulkCommunicationUpdate,
  isMergingRecords,
  syncingContactIds,
  latestBulkSyncJob,
  activeAndFailedBulkSyncJobs,
  quickActionButtonSizeClass,
  actionButtonClassName,
  actionButtonStyle,
  onOpenMergeDialog,
  onStartBulkSync,
  onConfirmQuickAction,
  onOpenQuestionnaire,
  onOpenBulkCommunicationPrompt,
  onCancelBulkSync,
  onRetryFailedBulkSync,
  onDismissFailedBulkSync,
}: {
  selectedItems: MondayRecord[];
  clearSelection: () => void;
  approvalSteps: Array<{ id: string; title: string }>;
  getMergeTargetRecordId: (record: MondayRecord) => string | null;
  bulkQuickActionType: string | null;
  isCreatingBulkCommunicationUpdate: boolean;
  isMergingRecords: boolean;
  syncingContactIds: Set<string>;
  latestBulkSyncJob: MondayBulkSyncJob | null;
  activeAndFailedBulkSyncJobs: MondayBulkSyncJob[];
  quickActionButtonSizeClass: string;
  actionButtonClassName: string;
  actionButtonStyle?: CSSProperties;
  onOpenMergeDialog: (records: MondayRecord[], clearSelection: () => void) => void;
  onStartBulkSync: (records: MondayRecord[], clearSelection: () => Promise<void> | void) => void;
  onConfirmQuickAction: (
    action: QuickContactActionButton,
    records: MondayRecord[],
    clearSelection: () => void,
  ) => void;
  onOpenQuestionnaire: (records: MondayRecord[]) => void;
  onOpenBulkCommunicationPrompt: (
    action: CommunicationQuickActionDefinition,
    records: MondayRecord[],
    clearSelection: () => void,
  ) => void;
  onCancelBulkSync: (jobId: string) => void;
  onRetryFailedBulkSync: (jobId: string) => void;
  onDismissFailedBulkSync: (jobId: string) => void;
}) => {
  const eligibleByAction = new Map<string, MondayRecord[]>();
  for (const action of CONTACT_UPDATE_ACTION_BUTTONS) {
    const stepConfig = STEP_ACTION_CONFIG.find((s) => s.updateType === action.type);
    if (!stepConfig) {
      eligibleByAction.set(action.type, [...selectedItems]);
      continue;
    }
    eligibleByAction.set(
      action.type,
      selectedItems.filter((item) => {
        const currentStep = getRecordStepIndexFromApprovalSteps(item, approvalSteps);
        return currentStep === stepConfig.stepIndex;
      }),
    );
  }
  const questionnaireStepIndex =
    STEP_ACTION_CONFIG.find((s) => s.actionVariant === "questionnaire")?.stepIndex ?? -1;
  const questionnaireEligible = selectedItems.filter((item) => {
    const currentStep = getRecordStepIndexFromApprovalSteps(item, approvalSteps);
    return currentStep === questionnaireStepIndex;
  });
  const onboardingActions = CONTACT_UPDATE_ACTION_BUTTONS.filter((action) => {
    const eligible = eligibleByAction.get(action.type) ?? [];
    return eligible.length === selectedItems.length && selectedItems.length > 0;
  });
  const showQuestionnaireOnboardingAction =
    questionnaireEligible.length === selectedItems.length && selectedItems.length > 0;

  const mergeCandidatesByTargetId = new Map<string, MondayRecord>();
  for (const item of selectedItems) {
    const targetRecordId = getMergeTargetRecordId(item);
    if (!targetRecordId) continue;
    if (!mergeCandidatesByTargetId.has(targetRecordId)) {
      mergeCandidatesByTargetId.set(targetRecordId, item);
    }
  }
  const mergeEligibleRecords = Array.from(mergeCandidatesByTargetId.values());
  const canMergeSelection =
    mergeEligibleRecords.length >= 2 && mergeEligibleRecords.length <= 4;
  const runningBulkSyncJobs = activeAndFailedBulkSyncJobs.filter(
    (job) => job.status === "running",
  );
  const failedBulkSyncJobs = activeAndFailedBulkSyncJobs.filter(
    (job) => job.status !== "running" && job.failedContacts > 0,
  );
  const visibleBulkSyncJobs = [...runningBulkSyncJobs, ...failedBulkSyncJobs].slice(0, 8);

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">{selectedItems.length} selected</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="justify-start rounded-md"
            disabled={
              !!bulkQuickActionType || isCreatingBulkCommunicationUpdate || isMergingRecords || !canMergeSelection
            }
            onClick={() => {
              onOpenMergeDialog(mergeEligibleRecords, clearSelection);
            }}
          >
            {isMergingRecords
              ? "Merging..."
              : `Merge / De-duplicate (${mergeEligibleRecords.length})`}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="justify-start rounded-md"
            disabled={
              !!bulkQuickActionType ||
              isCreatingBulkCommunicationUpdate ||
              selectedItems.length === 0
            }
            onClick={() => {
              onStartBulkSync(selectedItems, clearSelection);
            }}
          >
            {syncingContactIds.has("__bulk_sync__")
              ? latestBulkSyncJob
                ? `Syncing ${latestBulkSyncJob.processedContacts}/${latestBulkSyncJob.totalContacts}...`
                : "Syncing..."
              : `Sync Users (${selectedItems.length})`}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={clearSelection}
            disabled={!!bulkQuickActionType || isCreatingBulkCommunicationUpdate}
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
          Onboarding Steps
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {onboardingActions.map((action) => (
            <Button
              key={action.type}
              type="button"
              size="sm"
              variant="secondary"
              className={`justify-start rounded-md ${quickActionButtonSizeClass} ${actionButtonClassName}`}
              style={actionButtonStyle}
              disabled={!!bulkQuickActionType || isCreatingBulkCommunicationUpdate}
              onClick={() => {
                onConfirmQuickAction(action, selectedItems, clearSelection);
              }}
            >
              {bulkQuickActionType === action.type ? "Applying..." : action.label}
            </Button>
          ))}
          {showQuestionnaireOnboardingAction ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className={`justify-start rounded-md ${quickActionButtonSizeClass} ${actionButtonClassName}`}
              style={actionButtonStyle}
              disabled={!!bulkQuickActionType || isCreatingBulkCommunicationUpdate}
              onClick={() => {
                onOpenQuestionnaire([...selectedItems]);
              }}
            >
              {QUESTIONNAIRE_UPDATE_ACTION.label}
            </Button>
          ) : null}
          {onboardingActions.length === 0 && !showQuestionnaireOnboardingAction ? (
            <p className="text-muted-foreground text-xs">
              No common onboarding action for this selection.
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
          Outreach Steps
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {COMMUNICATION_QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                type="button"
                size="sm"
                className={`rounded-md ${quickActionButtonSizeClass} ${actionButtonClassName}`}
                style={actionButtonStyle}
                disabled={!!bulkQuickActionType || isCreatingBulkCommunicationUpdate}
                onClick={() => {
                  onOpenBulkCommunicationPrompt(action, selectedItems, clearSelection);
                }}
              >
                <Icon className="mr-1.5 h-3.5 w-3.5" />
                {action.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {runningBulkSyncJobs[0] ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={`justify-start rounded-md ${quickActionButtonSizeClass}`}
            onClick={() => {
              onCancelBulkSync(runningBulkSyncJobs[0]!.jobId);
            }}
          >
            Cancel Current Run
          </Button>
        ) : null}
        {failedBulkSyncJobs[0] ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={`justify-start rounded-md ${quickActionButtonSizeClass}`}
            disabled={syncingContactIds.has("__bulk_sync__")}
            onClick={() => {
              onRetryFailedBulkSync(failedBulkSyncJobs[0]!.jobId);
            }}
          >
            Retry Failed ({failedBulkSyncJobs[0]!.failedContacts})
          </Button>
        ) : null}
      </div>
      {runningBulkSyncJobs.length > 1 ? (
        <p className="text-muted-foreground text-[11px]">
          {runningBulkSyncJobs.length} runs active. You can cancel each run independently below.
        </p>
      ) : null}
      {visibleBulkSyncJobs.length > 0 ? (
        <div className="space-y-2">
          {visibleBulkSyncJobs.map((job) => {
            const progressPercent =
              job.totalContacts > 0
                ? Math.round((job.processedContacts / job.totalContacts) * 100)
                : 0;
            return (
              <div key={job.jobId} className="w-full rounded-md border px-2 py-1">
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">
                    Sync {job.jobId.slice(0, 8)} {job.status}
                  </span>
                  <span className="text-muted-foreground">
                    {job.processedContacts}/{job.totalContacts}
                  </span>
                </div>
                <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full transition-[width] duration-300 ease-out"
                    style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {job.status === "running" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className={`justify-start rounded-md ${quickActionButtonSizeClass}`}
                      onClick={() => {
                        onCancelBulkSync(job.jobId);
                      }}
                    >
                      Cancel run
                    </Button>
                  ) : null}
                  {job.status !== "running" && job.failedContacts > 0 ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className={`justify-start rounded-md ${quickActionButtonSizeClass}`}
                        onClick={() => {
                          onRetryFailedBulkSync(job.jobId);
                        }}
                      >
                        Retry Failed ({job.failedContacts})
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className={`justify-start rounded-md ${quickActionButtonSizeClass}`}
                        onClick={() => {
                          onDismissFailedBulkSync(job.jobId);
                        }}
                      >
                        Dismiss
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
