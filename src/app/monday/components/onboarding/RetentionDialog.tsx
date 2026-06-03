"use client";

import { Button } from "@launchthatapp/ui/button";
import { Calendar } from "@launchthatapp/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@launchthatapp/ui/dialog";
import { MultiSelect } from "~/components/ui/multi-select";
import { Popover, PopoverContent, PopoverTrigger } from "@launchthatapp/ui/popover";

import type { MondayRecord } from "../../types";

type RetentionDraft = {
  referredToContractors: string[];
  hiredWithContractor: string;
  hireDate: string;
  retentionPeriod: string;
};

type RetentionOptions = {
  referredToContractors: string[];
  hiredWithContractor: string[];
  retentionPeriod: string[];
};

type RetentionDialogProps = {
  record: MondayRecord | null;
  onClose: () => void;
  draft: RetentionDraft;
  setDraft: (value: RetentionDraft | ((prev: RetentionDraft) => RetentionDraft)) => void;
  options: RetentionOptions;
  hireDatePopoverOpen: boolean;
  setHireDatePopoverOpen: (open: boolean) => void;
  toDateOnlyLocal: (date: Date) => string;
  isSaving: boolean;
  onSave: () => void;
};

export const RetentionDialog = ({
  record,
  onClose,
  draft,
  setDraft,
  options,
  hireDatePopoverOpen,
  setHireDatePopoverOpen,
  toDateOnlyLocal,
  isSaving,
  onSave,
}: RetentionDialogProps) => {
  return (
    <Dialog
      open={!!record}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="max-w-lg overflow-visible"
        onInteractOutside={(event) => {
          event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Update Retention</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Referred To Contractor(s)</label>
            <MultiSelect
              key={`${record?.id ?? "no-item"}-${draft.referredToContractors.join("|")}`}
              options={Array.from(
                new Set([...options.referredToContractors, ...draft.referredToContractors]),
              )
                .filter((value) => value.trim().length > 0)
                .map((value) => ({ label: value, value }))}
              defaultValue={draft.referredToContractors}
              onValueChange={(values) => {
                setDraft((prev) => ({
                  ...prev,
                  referredToContractors: values,
                }));
              }}
              placeholder="Select contractor(s)"
              disablePortal
              popoverSide="bottom"
              popoverAvoidCollisions={false}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Hired With Contractor</label>
            <select
              value={draft.hiredWithContractor || "__none__"}
              onChange={(event) => {
                const value = event.target.value;
                setDraft((prev) => ({
                  ...prev,
                  hiredWithContractor: value === "__none__" ? "" : value,
                }));
              }}
              className="bg-background border-input h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="__none__">Select value</option>
              {Array.from(new Set([...options.hiredWithContractor, draft.hiredWithContractor]))
                .filter((value): value is string => !!value && value.trim().length > 0)
                .map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Hire Date</label>
            <div className="flex items-center gap-2">
              <Popover open={hireDatePopoverOpen} onOpenChange={setHireDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="h-9 flex-1 justify-start font-normal">
                    {draft.hireDate || "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start" portal={false}>
                  <Calendar
                    mode="single"
                    selected={draft.hireDate ? new Date(`${draft.hireDate}T00:00:00`) : undefined}
                    onSelect={(date) => {
                      if (!date) return;
                      setDraft((prev) => ({
                        ...prev,
                        hireDate: toDateOnlyLocal(date),
                      }));
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
                  setDraft((prev) => ({ ...prev, hireDate: "" }));
                }}
                disabled={!draft.hireDate}
              >
                Clear
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Retention Period</label>
            <select
              value={draft.retentionPeriod || "__none__"}
              onChange={(event) => {
                const value = event.target.value;
                setDraft((prev) => ({
                  ...prev,
                  retentionPeriod: value === "__none__" ? "" : value,
                }));
              }}
              className="bg-background border-input h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="__none__">Select value</option>
              {Array.from(new Set([...options.retentionPeriod, draft.retentionPeriod]))
                .filter((value): value is string => !!value && value.trim().length > 0)
                .map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
