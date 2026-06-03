"use client";

import type { ReactNode } from "react";
import { Button } from "@launchthatapp/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

import type { MondayRecord, ResumePreviewState, KanbanMoveConfirmation } from "../../types";
import { MERGE_FIELD_CONFIG, type MergeFieldKey } from "../../board-local";

type MergeDialogState = {
  records: MondayRecord[];
  masterRecordId: string;
  fieldSourceByKey: Record<MergeFieldKey, string>;
};

type BoardAuxDialogsProps = {
  mergeDialogState: MergeDialogState | null;
  setMergeDialogState: (value: MergeDialogState | null) => void;
  isMergingRecords: boolean;
  handleConfirmMergeRecords: () => Promise<void>;
  getMergeTargetRecordId: (record: MondayRecord) => string;
  getMergeFieldDisplayValue: (record: MondayRecord, key: MergeFieldKey) => string;
  kanbanMoveConfirmation: KanbanMoveConfirmation | null;
  setKanbanMoveConfirmation: (value: KanbanMoveConfirmation | null) => void;
  isExecutingKanbanMove: boolean;
  approvalSteps: Array<{ title: string }>;
  handleKanbanStepMove: (confirmation: KanbanMoveConfirmation) => Promise<void>;
  resumePreview: ResumePreviewState | null;
  setResumePreview: (value: ResumePreviewState | null) => void;
  renderResumePreviewContent: (fileName: string, href: string) => ReactNode;
};

export const BoardAuxDialogs = ({
  mergeDialogState,
  setMergeDialogState,
  isMergingRecords,
  handleConfirmMergeRecords,
  getMergeTargetRecordId,
  getMergeFieldDisplayValue,
  kanbanMoveConfirmation,
  setKanbanMoveConfirmation,
  isExecutingKanbanMove,
  approvalSteps,
  handleKanbanStepMove,
  resumePreview,
  setResumePreview,
  renderResumePreviewContent,
}: BoardAuxDialogsProps) => {
  return (
    <>
      <Dialog
        open={!!mergeDialogState}
        onOpenChange={(open) => {
          if (open) return;
          if (isMergingRecords) return;
          setMergeDialogState(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>Merge / De-duplicate Contacts</DialogTitle>
            <DialogDescription>
              Choose a master contact, pick field sources, then merge updates from duplicate
              contacts. Exact same action on the same day is kept once.
            </DialogDescription>
          </DialogHeader>
          {mergeDialogState ? (
            <div className="space-y-4">
              <div className="grid gap-2">
                <p className="text-xs font-medium">Master contact</p>
                <Select
                  value={mergeDialogState.masterRecordId}
                  onValueChange={(value) => {
                    const nextFieldSourceByKey = MERGE_FIELD_CONFIG.reduce(
                      (acc, field) => {
                        acc[field.key] = value;
                        return acc;
                      },
                      {} as Record<MergeFieldKey, string>,
                    );
                    setMergeDialogState({
                      ...mergeDialogState,
                      masterRecordId: value,
                      fieldSourceByKey: nextFieldSourceByKey,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select master contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {mergeDialogState.records.map((record) => {
                      const targetRecordId = getMergeTargetRecordId(record);
                      return (
                        <SelectItem key={targetRecordId} value={targetRecordId}>
                          {record.name} · {record.email ?? "No email"}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border bg-amber-50/40 p-3 text-xs text-amber-900">
                Source contacts will be deleted after merge. Name and email stay from the selected
                master contact.
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium">Choose source record for each mergeable field</p>
                <div className="max-h-[42vh] space-y-3 overflow-y-auto rounded-md border p-3">
                  {MERGE_FIELD_CONFIG.map((field) => (
                    <div
                      key={field.key}
                      className="grid gap-2 rounded-md border p-2 md:grid-cols-[220px_1fr]"
                    >
                      <div>
                        <p className="text-sm font-medium">{field.label}</p>
                      </div>
                      <Select
                        value={mergeDialogState.fieldSourceByKey[field.key]}
                        onValueChange={(value) => {
                          setMergeDialogState({
                            ...mergeDialogState,
                            fieldSourceByKey: {
                              ...mergeDialogState.fieldSourceByKey,
                              [field.key]: value,
                            },
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {mergeDialogState.records.map((record) => {
                            const targetRecordId = getMergeTargetRecordId(record);
                            return (
                              <SelectItem key={targetRecordId} value={targetRecordId}>
                                {record.name} · {getMergeFieldDisplayValue(record, field.key)}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setMergeDialogState(null)}
              disabled={isMergingRecords}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleConfirmMergeRecords()} disabled={isMergingRecords}>
              {isMergingRecords ? "Merging..." : "Merge Contacts"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!kanbanMoveConfirmation}
        onOpenChange={(open) => {
          if (open) return;
          if (isExecutingKanbanMove) return;
          setKanbanMoveConfirmation(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Move</DialogTitle>
            <DialogDescription>
              {kanbanMoveConfirmation
                ? `Move "${kanbanMoveConfirmation.record.name}" ${kanbanMoveConfirmation.direction === "forward" ? "forward to" : "back to"} "${kanbanMoveConfirmation.toStepIndex === 0
                    ? "Not Started"
                    : approvalSteps[kanbanMoveConfirmation.toStepIndex - 1]?.title ?? `Step ${kanbanMoveConfirmation.toStepIndex}`
                  }"?`
                : "Confirm this move."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setKanbanMoveConfirmation(null)}
              disabled={isExecutingKanbanMove}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!kanbanMoveConfirmation) return;
                void handleKanbanStepMove(kanbanMoveConfirmation);
              }}
              disabled={isExecutingKanbanMove}
            >
              {isExecutingKanbanMove ? "Moving..." : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!resumePreview}
        onOpenChange={(open) => {
          if (!open) setResumePreview(null);
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>Resume · {resumePreview?.recordName ?? "Contact"}</DialogTitle>
            <DialogDescription className="sr-only">
              Resume preview dialog with open in new tab fallback.
            </DialogDescription>
          </DialogHeader>
          {resumePreview ? renderResumePreviewContent(resumePreview.fileName, resumePreview.href) : null}
        </DialogContent>
      </Dialog>
    </>
  );
};
