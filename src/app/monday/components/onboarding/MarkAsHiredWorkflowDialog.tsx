"use client";

import { Button } from "@launchthatapp/ui/button";
import { Calendar } from "@launchthatapp/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@launchthatapp/ui/dialog";
import { MultiSelect } from "~/components/ui/multi-select";
import { Popover, PopoverContent, PopoverTrigger } from "@launchthatapp/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@launchthatapp/ui/select";

type MarkAsHiredWorkflowDialogState = {
  targetRecordId: string;
  referredToContractors: string[];
  hiredWithContractor: string;
  hireDate: string;
  availableContractors: string[];
};

type MarkAsHiredWorkflowDialogProps = {
  state: MarkAsHiredWorkflowDialogState | null;
  onClose: () => void;
  setState: (
    value:
      | MarkAsHiredWorkflowDialogState
      | null
      | ((prev: MarkAsHiredWorkflowDialogState | null) => MarkAsHiredWorkflowDialogState | null),
  ) => void;
  hireDatePopoverOpen: boolean;
  setHireDatePopoverOpen: (open: boolean) => void;
  toDateOnlyLocal: (date: Date) => string;
  isSaving: boolean;
  onConfirm: () => void;
};

export const MarkAsHiredWorkflowDialog = ({
  state,
  onClose,
  setState,
  hireDatePopoverOpen,
  setHireDatePopoverOpen,
  toDateOnlyLocal,
  isSaving,
  onConfirm,
}: MarkAsHiredWorkflowDialogProps) => {
  return (
    <Dialog
      open={!!state}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Mark as Hired Workflow</DialogTitle>
          <DialogDescription>
            Enter referred contractor(s), hired-with contractor, and hire date. This workflow marks
            Resume Submitted, Interviewing, and Hired as done, and marks Screening Complete as
            skipped when it is still incomplete.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Referred To Contractor(s)</label>
            <MultiSelect
              key={`${state?.targetRecordId ?? "no-item"}-${state?.referredToContractors.join("|") ?? ""}`}
              options={Array.from(
                new Set([
                  ...(state?.availableContractors ?? []),
                  ...(state?.referredToContractors ?? []),
                  state?.hiredWithContractor ?? "",
                ]),
              )
                .filter((value) => value.trim().length > 0)
                .map((value) => ({ label: value, value }))}
              defaultValue={state?.referredToContractors ?? []}
              onValueChange={(values) => {
                setState((prev) => (prev ? { ...prev, referredToContractors: values } : prev));
              }}
              placeholder="Select contractor(s)"
              disablePortal
              popoverSide="bottom"
              popoverAvoidCollisions={false}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Hired With Contractor</label>
            <Select
              value={state?.hiredWithContractor || "__none__"}
              onValueChange={(value) => {
                setState((prev) =>
                  prev ? { ...prev, hiredWithContractor: value === "__none__" ? "" : value } : prev,
                );
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select contractor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Select contractor</SelectItem>
                {Array.from(
                  new Set([
                    ...(state?.referredToContractors ?? []),
                    ...(state?.availableContractors ?? []),
                    state?.hiredWithContractor ?? "",
                  ]),
                )
                  .filter((value): value is string => !!value && value.trim().length > 0)
                  .map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Hire Date</label>
            <div className="flex items-center gap-2">
              <Popover open={hireDatePopoverOpen} onOpenChange={setHireDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="h-9 flex-1 justify-start font-normal">
                    {state?.hireDate || "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start" portal={false}>
                  <Calendar
                    mode="single"
                    selected={state?.hireDate ? new Date(`${state.hireDate}T00:00:00`) : undefined}
                    onSelect={(date) => {
                      if (!date) return;
                      setState((prev) => (prev ? { ...prev, hireDate: toDateOnlyLocal(date) } : prev));
                      setHireDatePopoverOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setState((prev) => (prev ? { ...prev, hireDate: "" } : prev));
                }}
                disabled={!state?.hireDate}
              >
                Clear
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={
                isSaving ||
                (state?.referredToContractors.length ?? 0) === 0 ||
                !state?.hiredWithContractor.trim() ||
                !state?.hireDate.trim()
              }
            >
              {isSaving ? "Saving..." : "Save and Advance"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
