"use client";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { MultiSelect } from "~/components/ui/multi-select";
import { Button } from "@launchthatapp/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@launchthatapp/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@launchthatapp/ui/select";

import type { MondayRecord } from "../../types";

type OwnerOption = {
  value: string;
  label: string;
  name: string | null;
  photoThumb: string | null;
};

type StatusOption = {
  value: string;
  label: string;
};

type RecordMetaDialogsProps = {
  statusDialogRecord: MondayRecord | null;
  setStatusDialogRecord: (record: MondayRecord | null) => void;
  statusDraft: string;
  setStatusDraft: (value: string) => void;
  statusOptions: StatusOption[];
  isSavingStatus: boolean;
  onSaveStatus: () => void;
  ownerDialogRecord: MondayRecord | null;
  setOwnerDialogRecord: (record: MondayRecord | null) => void;
  ownerDraft: string;
  setOwnerDraft: (value: string) => void;
  ownerOptions: OwnerOption[];
  isSavingOwner: boolean;
  onSaveOwner: () => void;
  getNameInitials: (value: string) => string;
  tagsDialogRecord: MondayRecord | null;
  setTagsDialogRecord: (record: MondayRecord | null) => void;
  tagsDraft: string[];
  setTagsDraft: (value: string[]) => void;
  retentionTags: string[];
  splitCsvValues: (value: string | null | undefined) => string[];
  sortFiscalYearTagsDesc: (values: string[]) => string[];
  isSavingTags: boolean;
  onSaveTags: () => void;
};

export const RecordMetaDialogs = ({
  statusDialogRecord,
  setStatusDialogRecord,
  statusDraft,
  setStatusDraft,
  statusOptions,
  isSavingStatus,
  onSaveStatus,
  ownerDialogRecord,
  setOwnerDialogRecord,
  ownerDraft,
  setOwnerDraft,
  ownerOptions,
  isSavingOwner,
  onSaveOwner,
  getNameInitials,
  tagsDialogRecord,
  setTagsDialogRecord,
  tagsDraft,
  setTagsDraft,
  retentionTags,
  splitCsvValues,
  sortFiscalYearTagsDesc,
  isSavingTags,
  onSaveTags,
}: RecordMetaDialogsProps) => {
  return (
    <>
      <Dialog
        open={!!statusDialogRecord}
        onOpenChange={(open) => {
          if (!open) setStatusDialogRecord(null);
        }}
      >
        <DialogContent
          className="max-w-lg"
          onInteractOutside={(event) => {
            event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Update Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                value={statusDraft || "__none__"}
                onChange={(event) => {
                  const value = event.target.value;
                  setStatusDraft(value === "__none__" ? "" : value);
                }}
                className="bg-background border-input h-9 w-full rounded-md border px-3 text-sm"
              >
                <option value="__none__">Select value</option>
                {Array.from(new Set([...statusOptions.map((entry) => entry.value), statusDraft]))
                  .filter((value): value is string => !!value && value.trim().length > 0)
                  .map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setStatusDialogRecord(null)}
                disabled={isSavingStatus}
              >
                Cancel
              </Button>
              <Button onClick={onSaveStatus} disabled={isSavingStatus}>
                {isSavingStatus ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!ownerDialogRecord}
        onOpenChange={(open) => {
          if (!open) setOwnerDialogRecord(null);
        }}
      >
        <DialogContent
          className="max-w-lg"
          onInteractOutside={(event) => {
            event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Update Owner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Owner</label>
              <Select
                value={ownerDraft || "__none__"}
                onValueChange={(value) => {
                  setOwnerDraft(value === "__none__" ? "" : value);
                }}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select value</SelectItem>
                  {Array.from(
                    new Map(
                      [
                        ...ownerOptions.map((option) => [option.value, option] as const),
                        ownerDraft.trim().length > 0
                          ? [
                              ownerDraft,
                              {
                                value: ownerDraft,
                                label: `User ${ownerDraft}`,
                                name: null,
                                photoThumb: null,
                              },
                            ]
                          : null,
                      ].filter(
                        (
                          entry,
                        ): entry is readonly [
                          string,
                          {
                            value: string;
                            label: string;
                            name: string | null;
                            photoThumb: string | null;
                          },
                        ] => !!entry,
                      ),
                    ),
                  )
                    .map(([, option]) => option)
                    .map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-5">
                            {option.photoThumb ? (
                              <AvatarImage src={option.photoThumb} alt={option.name ?? option.value} />
                            ) : null}
                            <AvatarFallback className="text-[10px] font-semibold">
                              {getNameInitials(option.name ?? option.value)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{option.name ?? option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setOwnerDialogRecord(null)}
                disabled={isSavingOwner}
              >
                Cancel
              </Button>
              <Button onClick={onSaveOwner} disabled={isSavingOwner}>
                {isSavingOwner ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!tagsDialogRecord}
        onOpenChange={(open) => {
          if (!open) setTagsDialogRecord(null);
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
            <DialogTitle>Update Tags</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tags</label>
              <MultiSelect
                key={`${tagsDialogRecord?.id ?? "no-item"}-${splitCsvValues(tagsDialogRecord?.tags).join("|")}`}
                options={sortFiscalYearTagsDesc(
                  Array.from(new Set([...retentionTags, ...tagsDraft])).filter(
                    (value) => value.trim().length > 0,
                  ),
                ).map((value) => ({ label: value, value }))}
                defaultValue={tagsDraft}
                onValueChange={(values) => setTagsDraft(values)}
                placeholder="Select tags"
                disablePortal
                popoverSide="bottom"
                popoverAvoidCollisions={false}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setTagsDialogRecord(null)}
                disabled={isSavingTags}
              >
                Cancel
              </Button>
              <Button onClick={onSaveTags} disabled={isSavingTags}>
                {isSavingTags ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
