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

type ResumeReferralDialogState = {
  targetRecordId: string;
  selectedContractors: string[];
};

type ResumeReferralStepDialogProps = {
  state: ResumeReferralDialogState | null;
  onClose: () => void;
  onStateChange: (next: ResumeReferralDialogState | null) => void;
  contractorOptions: string[];
  isSaving: boolean;
  onConfirm: () => void;
};

export const ResumeReferralStepDialog = ({
  state,
  onClose,
  onStateChange,
  contractorOptions,
  isSaving,
  onConfirm,
}: ResumeReferralStepDialogProps) => {
  return (
    <Dialog
      open={!!state}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Resume Submitted to Contractor</DialogTitle>
          <DialogDescription>
            Choose which contractor(s) this contact was referred to. This updates the API board
            referral column before completing the onboarding step.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Referred To Contractor(s)</label>
            <MultiSelect
              key={`${state?.targetRecordId ?? "no-item"}-${state?.selectedContractors.join("|") ?? ""}`}
              options={Array.from(
                new Set([...contractorOptions, ...(state?.selectedContractors ?? [])]),
              )
                .filter((value) => value.trim().length > 0)
                .map((value) => ({ label: value, value }))}
              defaultValue={state?.selectedContractors ?? []}
              onValueChange={(values) => {
                onStateChange(state ? { ...state, selectedContractors: values } : state);
              }}
              placeholder="Select contractor(s)"
              disablePortal
              popoverSide="bottom"
              popoverAvoidCollisions={false}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isSaving || (state?.selectedContractors.length ?? 0) === 0}
            >
              {isSaving ? "Saving..." : "Save and Continue"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
