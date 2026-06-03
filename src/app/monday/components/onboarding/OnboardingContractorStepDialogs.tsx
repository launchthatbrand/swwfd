"use client";

import { Button } from "@launchthatapp/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@launchthatapp/ui/dialog";
import { MultiSelect } from "~/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@launchthatapp/ui/select";

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

type OnboardingContractorStepDialogsProps = {
  interviewingState: InterviewingContractorDialogState | null;
  setInterviewingState: (
    value:
      | InterviewingContractorDialogState
      | null
      | ((prev: InterviewingContractorDialogState | null) => InterviewingContractorDialogState | null),
  ) => void;
  closeInterviewingDialog: () => void;
  isSavingInterviewingStep: boolean;
  onConfirmInterviewing: () => void;
  hiredState: HiredContractorDialogState | null;
  setHiredState: (
    value:
      | HiredContractorDialogState
      | null
      | ((prev: HiredContractorDialogState | null) => HiredContractorDialogState | null),
  ) => void;
  closeHiredDialog: () => void;
  isSavingHiredStep: boolean;
  onConfirmHired: () => void;
};

export const OnboardingContractorStepDialogs = ({
  interviewingState,
  setInterviewingState,
  closeInterviewingDialog,
  isSavingInterviewingStep,
  onConfirmInterviewing,
  hiredState,
  setHiredState,
  closeHiredDialog,
  isSavingHiredStep,
  onConfirmHired,
}: OnboardingContractorStepDialogsProps) => {
  return (
    <>
      <Dialog
        open={!!interviewingState}
        onOpenChange={(open) => {
          if (!open) closeInterviewingDialog();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Mark Interviewing</DialogTitle>
            <DialogDescription>
              Select the contractor(s) this contact is interviewing with. Options are limited to
              contractors from Referred to Contractor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Interviewing With Contractor(s)</label>
              <MultiSelect
                key={`${interviewingState?.targetRecordId ?? "no-item"}-${interviewingState?.selectedContractors.join("|") ?? ""}`}
                options={(interviewingState?.availableContractors ?? [])
                  .filter((value) => value.trim().length > 0)
                  .map((value) => ({ label: value, value }))}
                defaultValue={interviewingState?.selectedContractors ?? []}
                onValueChange={(values) => {
                  setInterviewingState((prev) =>
                    prev ? { ...prev, selectedContractors: values } : prev,
                  );
                }}
                placeholder="Select contractor(s)"
                disablePortal
                popoverSide="bottom"
                popoverAvoidCollisions={false}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={closeInterviewingDialog}
                disabled={isSavingInterviewingStep}
              >
                Cancel
              </Button>
              <Button
                onClick={onConfirmInterviewing}
                disabled={isSavingInterviewingStep || (interviewingState?.selectedContractors.length ?? 0) === 0}
              >
                {isSavingInterviewingStep ? "Saving..." : "Save and Continue"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!hiredState}
        onOpenChange={(open) => {
          if (!open) closeHiredDialog();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark as Hired</DialogTitle>
            <DialogDescription>
              Select the contractor this contact was hired with. Options come from Interviewing
              With Contractor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Hired With Contractor</label>
              <Select
                value={hiredState?.selectedContractor || "__none__"}
                onValueChange={(value) => {
                  setHiredState((prev) =>
                    prev ? { ...prev, selectedContractor: value === "__none__" ? "" : value } : prev,
                  );
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contractor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {(hiredState?.availableContractors ?? [])
                    .filter((value) => value.trim().length > 0)
                    .map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeHiredDialog} disabled={isSavingHiredStep}>
                Cancel
              </Button>
              <Button
                onClick={onConfirmHired}
                disabled={isSavingHiredStep || !hiredState?.selectedContractor.trim()}
              >
                {isSavingHiredStep ? "Saving..." : "Save and Continue"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
