import { useMemo, type CSSProperties } from "react";
import { toast } from "@launchthatapp/ui/toast";

import type { OnboardingStepperProps } from "../components/OnboardingStepper";
import type { ContactUpdateType, MondayRecord } from "../types";

type ResumeReferralDialogState = {
  targetRecordId: string;
  selectedContractors: string[];
};

type InterviewingContractorDialogState = {
  targetRecordId: string;
  stepColumnId: string;
  selectedContractors: string[];
  availableContractors: string[];
};

type HiredContractorDialogState = {
  targetRecordId: string;
  stepColumnId: string;
  selectedContractor: string;
  availableContractors: string[];
};

type Params = {
  record: MondayRecord | null;
  approvalSteps: OnboardingStepperProps["approvalSteps"];
  isCreatingContactUpdate: boolean;
  isSendingEmail: boolean;
  pendingOnboardingActionsByTargetId: Record<string, boolean | undefined>;
  resolveContactUpdateTargetRecordId: (record: MondayRecord) => string;
  emailMarketingEnabled: boolean;
  setOnboardingActionPending: (targetRecordId: string, isPending: boolean) => void;
  setContactUpdateType: (value: Exclude<ContactUpdateType, "general">) => void;
  setResumeReferralDialogState: (
    value: ResumeReferralDialogState | ((prev: ResumeReferralDialogState | null) => ResumeReferralDialogState | null) | null,
  ) => void;
  parseContractorValues: (value: string | null | undefined, fallbackOptions: string[]) => string[];
  retentionReferredToContractors: string[];
  openSendEmailDialog: (
    record: MondayRecord,
    options: {
      progressUpdate: {
        updateType: "followup" | "welcome_email";
        body: string;
        internalExternalStatus: "External";
      };
      autoAdvanceToPreview: boolean;
      preferredTemplateType: "followup" | "welcome_email";
    },
  ) => void;
  handleCreateContactUpdate: (opts: {
    updateType: Exclude<ContactUpdateType, "general">;
    body?: string;
    date?: string;
    keepSelectedType?: boolean;
    internalExternalStatus?: "Internal" | "External";
  }) => Promise<void>;
  openQuestionnaireDialogForRecords: (records: MondayRecord[]) => void;
  sessionToken: string | null;
  interviewingStepColumnId: string;
  hiredStepColumnId: string;
  setInterviewingContractorDialogState: (
    value:
      | InterviewingContractorDialogState
      | ((prev: InterviewingContractorDialogState | null) => InterviewingContractorDialogState | null)
      | null,
  ) => void;
  setHiredContractorDialogState: (
    value:
      | HiredContractorDialogState
      | ((prev: HiredContractorDialogState | null) => HiredContractorDialogState | null)
      | null,
  ) => void;
  completeGenericOnboardingStep: (opts: {
    targetRecordId: string;
    body: string;
    stepColumnId: string;
  }) => Promise<void>;
  actionButtonClassName: string;
  actionButtonStyle: CSSProperties | undefined;
  buttonSizeClassName: string;
};

export const useContactDialogOnboardingStepperProps = ({
  record,
  approvalSteps,
  isCreatingContactUpdate,
  isSendingEmail,
  pendingOnboardingActionsByTargetId,
  resolveContactUpdateTargetRecordId,
  emailMarketingEnabled,
  setOnboardingActionPending,
  setContactUpdateType,
  setResumeReferralDialogState,
  parseContractorValues,
  retentionReferredToContractors,
  openSendEmailDialog,
  handleCreateContactUpdate,
  openQuestionnaireDialogForRecords,
  sessionToken,
  interviewingStepColumnId,
  hiredStepColumnId,
  setInterviewingContractorDialogState,
  setHiredContractorDialogState,
  completeGenericOnboardingStep,
  actionButtonClassName,
  actionButtonStyle,
  buttonSizeClassName,
}: Params): Omit<OnboardingStepperProps, "record"> => {
  return useMemo(
    () => ({
      approvalSteps,
      isProcessing:
        isCreatingContactUpdate ||
        isSendingEmail ||
        (record ? !!pendingOnboardingActionsByTargetId[resolveContactUpdateTargetRecordId(record)] : false),
      layout: "inline" as const,
      emailMarketingEnabled,
      onQuickAction: ({ updateType, body, method }) => {
        if (!record) return;
        const targetRecordId = resolveContactUpdateTargetRecordId(record);
        if (pendingOnboardingActionsByTargetId[targetRecordId]) return;
        setOnboardingActionPending(targetRecordId, true);
        setContactUpdateType(updateType);
        if (updateType === "resume") {
          setResumeReferralDialogState({
            targetRecordId,
            selectedContractors: parseContractorValues(
              record.referredToContractors,
              retentionReferredToContractors,
            ),
          });
          return;
        }
        if (
          (updateType === "welcome_email" || updateType === "followup") &&
          emailMarketingEnabled &&
          method === "platform"
        ) {
          openSendEmailDialog(record, {
            progressUpdate: {
              updateType,
              body,
              internalExternalStatus: "External",
            },
            autoAdvanceToPreview: true,
            preferredTemplateType: updateType,
          });
          return;
        }
        void (async () => {
          try {
            const internalExternalStatus =
              method === "platform"
                ? "External"
                : updateType === "welcome_email" || updateType === "followup"
                  ? "Internal"
                  : undefined;
            await handleCreateContactUpdate({
              updateType,
              body,
              keepSelectedType: true,
              internalExternalStatus,
            });
          } finally {
            setOnboardingActionPending(targetRecordId, false);
          }
        })();
      },
      onQuestionnaireAction: (selectedRecord) => {
        openQuestionnaireDialogForRecords([selectedRecord]);
      },
      onGenericStepAction: ({ body, stepColumnId }) => {
        if (!record) return;
        void (async () => {
          if (!sessionToken) return;
          const targetRecordId = resolveContactUpdateTargetRecordId(record);
          if (pendingOnboardingActionsByTargetId[targetRecordId]) return;
          setOnboardingActionPending(targetRecordId, true);

          if (stepColumnId === interviewingStepColumnId) {
            const referredContractors = parseContractorValues(
              record.referredToContractors,
              retentionReferredToContractors,
            );
            if (referredContractors.length === 0) {
              toast.error("No referred contractors found. Complete Resume Submitted first.");
              setOnboardingActionPending(targetRecordId, false);
              return;
            }

            const selectedInterviewingContractors = parseContractorValues(
              record.interviewingWithContractors,
              referredContractors,
            ).filter((value) => referredContractors.includes(value));

            setInterviewingContractorDialogState({
              targetRecordId,
              stepColumnId,
              selectedContractors: selectedInterviewingContractors,
              availableContractors: referredContractors,
            });
            return;
          }

          if (stepColumnId === hiredStepColumnId) {
            const interviewingContractors = parseContractorValues(
              record.interviewingWithContractors,
              retentionReferredToContractors,
            );
            if (interviewingContractors.length === 0) {
              toast.error("No interviewing contractors found. Mark Interviewing first.");
              setOnboardingActionPending(targetRecordId, false);
              return;
            }

            const currentHiredContractor = record.hiredWithContractor?.trim() ?? "";
            const selectedContractor = interviewingContractors.includes(currentHiredContractor)
              ? currentHiredContractor
              : interviewingContractors[0] ?? "";

            setHiredContractorDialogState({
              targetRecordId,
              stepColumnId,
              selectedContractor,
              availableContractors: interviewingContractors,
            });
            return;
          }

          try {
            await completeGenericOnboardingStep({
              targetRecordId,
              body,
              stepColumnId,
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to mark step complete";
            toast.error(message);
          } finally {
            setOnboardingActionPending(targetRecordId, false);
          }
        })();
      },
      actionButtonClassName,
      actionButtonStyle,
      buttonSizeClassName,
    }),
    [
      approvalSteps,
      isCreatingContactUpdate,
      isSendingEmail,
      record,
      pendingOnboardingActionsByTargetId,
      resolveContactUpdateTargetRecordId,
      emailMarketingEnabled,
      setOnboardingActionPending,
      setContactUpdateType,
      setResumeReferralDialogState,
      parseContractorValues,
      retentionReferredToContractors,
      openSendEmailDialog,
      handleCreateContactUpdate,
      openQuestionnaireDialogForRecords,
      sessionToken,
      interviewingStepColumnId,
      hiredStepColumnId,
      setInterviewingContractorDialogState,
      setHiredContractorDialogState,
      completeGenericOnboardingStep,
      actionButtonClassName,
      actionButtonStyle,
      buttonSizeClassName,
    ],
  );
};
