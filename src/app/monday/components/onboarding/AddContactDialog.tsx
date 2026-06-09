"use client";

import { Button } from "@launchthatapp/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@launchthatapp/ui/dialog";
import { toast } from "@launchthatapp/ui/toast";

import type { AddNewContactValues, MondayContactCandidate } from "../../types";
import { AddNewContactForm } from "../AddNewContactForm";
import { formatUpdatedAt } from "../../helpers";

type AddContactDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReset: () => void;
  step: 1 | 2;
  values: AddNewContactValues;
  ownerOptions: Array<{ value: string; label: string }>;
  isCheckingDuplicates: boolean;
  isCreatingContact: boolean;
  onChange: <K extends keyof AddNewContactValues>(key: K, value: AddNewContactValues[K]) => void;
  onCheckDuplicatesAndContinue: () => void;
  existingContactsByEmail: MondayContactCandidate[];
  onBackToForm: () => void;
  onCreateNewAnyway: () => void;
};

export const AddContactDialog = ({
  open,
  onOpenChange,
  onReset,
  step,
  values,
  ownerOptions,
  isCheckingDuplicates,
  isCreatingContact,
  onChange,
  onCheckDuplicatesAndContinue,
  existingContactsByEmail,
  onBackToForm,
  onCreateNewAnyway,
}: AddContactDialogProps) => {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) onReset();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Contact</DialogTitle>
        </DialogHeader>
        {step === 1 ? (
          <AddNewContactForm
            values={values}
            ownerOptions={ownerOptions}
            isSubmitting={isCheckingDuplicates || isCreatingContact}
            onChange={onChange}
            onSubmit={() => {
              onCheckDuplicatesAndContinue();
            }}
          />
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Before we create, we found these records with the same email.
              </p>
              <p className="text-muted-foreground text-sm">
                Do you want to use one of these existing records?
              </p>
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border p-2">
              {existingContactsByEmail.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{record.name || record.id}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {record.email ?? "No email"} · {record.owner ?? "No owner"}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Updated: {record.updatedAt ? formatUpdatedAt(record.updatedAt) : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {record.url ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(record.url ?? "", "_blank", "noopener,noreferrer")}
                      >
                        Open
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      onClick={() => {
                        toast.success("Using existing contact");
                        onOpenChange(false);
                        onReset();
                      }}
                    >
                      Use Existing
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={onBackToForm} disabled={isCreatingContact}>
                Back
              </Button>
              <Button
                onClick={() => {
                  onCreateNewAnyway();
                }}
                disabled={isCreatingContact}
              >
                {isCreatingContact ? "Creating..." : "Create New Anyway"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
