"use client";

import type { Dispatch, SetStateAction } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@launchthatapp/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@launchthatapp/ui/dialog";
import { Input } from "@launchthatapp/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@launchthatapp/ui/select";
import { Textarea } from "@launchthatapp/ui/textarea";
import { CommunicationQuickActionDialog } from "./CommunicationQuickActionDialog";
import { QuestionnaireFormDialog } from "./QuestionnaireFormDialog";
import type { QuestionnaireFieldOptions } from "~/components/forms/questionaire-form";
import type {
  BulkCommunicationQuickActionState,
  BulkUniqueCommunicationSession,
  CommunicationQuickActionDefinition,
  CommunicationQuickActionMethod,
} from "../board-local";
import type { MondayRecord } from "../types";

interface CommunicationDialogsProps {
  communicationQuickAction: CommunicationQuickActionDefinition | null;
  setCommunicationQuickAction: Dispatch<SetStateAction<CommunicationQuickActionDefinition | null>>;
  isCreatingContactUpdate: boolean;
  handleSubmitCommunicationQuickAction: (values: {
    body: string;
    methodOfCommunication: CommunicationQuickActionMethod;
    date: string;
    time: string;
  }) => Promise<void>;
  bulkCommunicationModePrompt: BulkCommunicationQuickActionState | null;
  setBulkCommunicationModePrompt: Dispatch<SetStateAction<BulkCommunicationQuickActionState | null>>;
  setBulkCommunicationQuickAction: Dispatch<SetStateAction<BulkCommunicationQuickActionState | null>>;
  openBulkUniqueCommunicationSession: (value: BulkCommunicationQuickActionState) => void;
  bulkCommunicationQuickAction: BulkCommunicationQuickActionState | null;
  isCreatingBulkCommunicationUpdate: boolean;
  handleSubmitBulkCommunicationQuickAction: (values: {
    body: string;
    methodOfCommunication: CommunicationQuickActionMethod;
    date: string;
    time: string;
  }) => Promise<void>;
  bulkUniqueCommunicationSession: BulkUniqueCommunicationSession | null;
  closeBulkUniqueCommunicationSession: () => void;
  bulkUniqueActiveTarget: BulkUniqueCommunicationSession["targets"][number] | null;
  bulkUniqueCommunicationIndex: number;
  navigateBulkUniqueCommunication: (index: number) => void;
  bulkUniqueCommunicationMethod: CommunicationQuickActionMethod;
  setBulkUniqueCommunicationMethod: (value: CommunicationQuickActionMethod) => void;
  bulkUniqueCommunicationDate: string;
  setBulkUniqueCommunicationDate: (value: string) => void;
  toDateOnly: (value: Date) => string;
  bulkUniqueCommunicationTime: string;
  setBulkUniqueCommunicationTime: (value: string) => void;
  bulkUniqueCommunicationBody: string;
  setBulkUniqueCommunicationBody: (value: string) => void;
  bulkUniqueCommunicationSubmittedTargetIds: Set<string>;
  submitBulkUniqueCommunicationForActiveTarget: () => Promise<void> | void;
  syncContactBoardPickerRecord: MondayRecord | null;
  setSyncContactBoardPickerRecord: Dispatch<SetStateAction<MondayRecord | null>>;
  setSyncContactBoardSelection: (value: string) => void;
  syncContactBoardSelection: string;
  confirmSyncContactFromSelectedBoard: () => void;
  syncingContactIds: Set<string>;
  syncMonthlyBoardOptions: Array<{ value: string; label: string; boardId: string }>;
  questionnaireDialogRecords: MondayRecord[];
  setQuestionnaireDialogRecords: Dispatch<SetStateAction<MondayRecord[]>>;
  sessionToken: string | null;
  staticMode: boolean;
  resolveContactUpdateTargetRecordId: (record: MondayRecord) => string;
  handleQuestionnaireSaved: () => Promise<void>;
  questionnaireFieldOptions: QuestionnaireFieldOptions;
}

export const CommunicationDialogs = (props: CommunicationDialogsProps) => {
  const {
    communicationQuickAction,
    setCommunicationQuickAction,
    isCreatingContactUpdate,
    handleSubmitCommunicationQuickAction,
    bulkCommunicationModePrompt,
    setBulkCommunicationModePrompt,
    setBulkCommunicationQuickAction,
    openBulkUniqueCommunicationSession,
    bulkCommunicationQuickAction,
    isCreatingBulkCommunicationUpdate,
    handleSubmitBulkCommunicationQuickAction,
    bulkUniqueCommunicationSession,
    closeBulkUniqueCommunicationSession,
    bulkUniqueActiveTarget,
    bulkUniqueCommunicationIndex,
    navigateBulkUniqueCommunication,
    bulkUniqueCommunicationMethod,
    setBulkUniqueCommunicationMethod,
    bulkUniqueCommunicationDate,
    setBulkUniqueCommunicationDate,
    toDateOnly,
    bulkUniqueCommunicationTime,
    setBulkUniqueCommunicationTime,
    bulkUniqueCommunicationBody,
    setBulkUniqueCommunicationBody,
    bulkUniqueCommunicationSubmittedTargetIds,
    submitBulkUniqueCommunicationForActiveTarget,
    syncContactBoardPickerRecord,
    setSyncContactBoardPickerRecord,
    setSyncContactBoardSelection,
    syncContactBoardSelection,
    confirmSyncContactFromSelectedBoard,
    syncingContactIds,
    syncMonthlyBoardOptions,
    questionnaireDialogRecords,
    setQuestionnaireDialogRecords,
    sessionToken,
    staticMode,
    resolveContactUpdateTargetRecordId,
    handleQuestionnaireSaved,
    questionnaireFieldOptions,
  } = props;

  return (
    <>
      <CommunicationQuickActionDialog
        open={!!communicationQuickAction}
        onOpenChange={(open) => {
          if (!open) setCommunicationQuickAction(null);
        }}
        actionLabel={communicationQuickAction?.label ?? "Communication Update"}
        defaultMethod={communicationQuickAction?.method ?? "Email"}
        isSubmitting={isCreatingContactUpdate}
        onSubmit={handleSubmitCommunicationQuickAction}
      />
      <Dialog
        open={!!bulkCommunicationModePrompt}
        onOpenChange={(open) => {
          if (!open) setBulkCommunicationModePrompt(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Outreach Update</DialogTitle>
            <DialogDescription>
              Apply one message to all selected contacts, or write a unique message per
              contact.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Button
              type="button"
              onClick={() => {
                if (!bulkCommunicationModePrompt) return;
                setBulkCommunicationQuickAction(bulkCommunicationModePrompt);
                setBulkCommunicationModePrompt(null);
              }}
            >
              Same message for all
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!bulkCommunicationModePrompt) return;
                openBulkUniqueCommunicationSession(bulkCommunicationModePrompt);
                setBulkCommunicationModePrompt(null);
              }}
            >
              Unique message per contact
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <CommunicationQuickActionDialog
        open={!!bulkCommunicationQuickAction}
        onOpenChange={(open) => {
          if (!open) setBulkCommunicationQuickAction(null);
        }}
        actionLabel={bulkCommunicationQuickAction?.action.label ?? "Bulk Communication Update"}
        defaultMethod={bulkCommunicationQuickAction?.action.method ?? "Email"}
        isSubmitting={isCreatingBulkCommunicationUpdate}
        onSubmit={handleSubmitBulkCommunicationQuickAction}
      />
      <Dialog
        open={!!bulkUniqueCommunicationSession}
        onOpenChange={(open) => {
          if (!open) closeBulkUniqueCommunicationSession();
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader className="border-b bg-background pb-3">
            {bulkUniqueCommunicationSession && bulkUniqueActiveTarget ? (
              <>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-7 w-7 shrink-0"
                    disabled={bulkUniqueCommunicationIndex <= 0 || isCreatingBulkCommunicationUpdate}
                    onClick={() => navigateBulkUniqueCommunication(bulkUniqueCommunicationIndex - 1)}
                    title="Previous contact"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-7 w-7 shrink-0"
                    disabled={
                      bulkUniqueCommunicationIndex >= bulkUniqueCommunicationSession.targets.length - 1 ||
                      isCreatingBulkCommunicationUpdate
                    }
                    onClick={() => navigateBulkUniqueCommunication(bulkUniqueCommunicationIndex + 1)}
                    title="Next contact"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <DialogTitle className="min-w-0 truncate">
                    {bulkUniqueActiveTarget.record.name}
                  </DialogTitle>
                </div>
                <DialogDescription>
                  Contact {bulkUniqueCommunicationIndex + 1} of {bulkUniqueCommunicationSession.targets.length}
                </DialogDescription>
              </>
            ) : (
              <>
                <DialogTitle>
                  {bulkUniqueCommunicationSession?.action.label ?? "Bulk Communication Update"}
                </DialogTitle>
                <DialogDescription>
                  Submit separate updates per contact and move through the selection.
                </DialogDescription>
              </>
            )}
          </DialogHeader>
          {bulkUniqueCommunicationSession && bulkUniqueActiveTarget ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Method</label>
                <Select
                  value={bulkUniqueCommunicationMethod}
                  onValueChange={(value) =>
                    setBulkUniqueCommunicationMethod(value as CommunicationQuickActionMethod)}
                  disabled={isCreatingBulkCommunicationUpdate}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Email">Email</SelectItem>
                    <SelectItem value="Text">Text</SelectItem>
                    <SelectItem value="Phone Call">Phone Call</SelectItem>
                    <SelectItem value="In Person">In Person</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Date</label>
                  <Input
                    type="date"
                    value={bulkUniqueCommunicationDate}
                    max={toDateOnly(new Date())}
                    onChange={(event) => setBulkUniqueCommunicationDate(event.target.value)}
                    disabled={isCreatingBulkCommunicationUpdate}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Time</label>
                  <Input
                    type="time"
                    value={bulkUniqueCommunicationTime}
                    onChange={(event) => setBulkUniqueCommunicationTime(event.target.value)}
                    disabled={isCreatingBulkCommunicationUpdate}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Comments</label>
                <Textarea
                  rows={4}
                  value={bulkUniqueCommunicationBody}
                  onChange={(event) => setBulkUniqueCommunicationBody(event.target.value)}
                  placeholder="Add notes about this communication..."
                  disabled={isCreatingBulkCommunicationUpdate}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="text-muted-foreground text-xs">
                  {bulkUniqueCommunicationSubmittedTargetIds.has(
                    bulkUniqueActiveTarget.targetRecordId,
                  ) ? (
                    <span className="inline-flex items-center gap-1">
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      Already submitted
                    </span>
                  ) : (
                    "Not submitted yet"
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeBulkUniqueCommunicationSession}
                    disabled={isCreatingBulkCommunicationUpdate}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      void submitBulkUniqueCommunicationForActiveTarget();
                    }}
                    disabled={
                      isCreatingBulkCommunicationUpdate ||
                      bulkUniqueCommunicationBody.trim().length === 0
                    }
                  >
                    {isCreatingBulkCommunicationUpdate ? "Saving..." : "Save & Next"}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!syncContactBoardPickerRecord}
        onOpenChange={(open) => {
          if (!open) {
            setSyncContactBoardPickerRecord(null);
            setSyncContactBoardSelection("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sync User</DialogTitle>
            <DialogDescription>
              Choose which monthly board to scrape for{" "}
              {syncContactBoardPickerRecord?.name ?? "this contact"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select
              value={syncContactBoardSelection}
              onValueChange={setSyncContactBoardSelection}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select monthly board" />
              </SelectTrigger>
              <SelectContent>
                {syncMonthlyBoardOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label} · {option.boardId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {syncMonthlyBoardOptions.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                No monthly board mappings are configured in platform settings.
              </p>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSyncContactBoardPickerRecord(null);
                setSyncContactBoardSelection("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmSyncContactFromSelectedBoard}
              disabled={
                !syncContactBoardSelection ||
                !syncContactBoardPickerRecord ||
                syncingContactIds.has(syncContactBoardPickerRecord?.id ?? "")
              }
            >
              {syncContactBoardPickerRecord &&
              syncingContactIds.has(syncContactBoardPickerRecord.id)
                ? "Syncing..."
                : "Start Sync"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <QuestionnaireFormDialog
        open={questionnaireDialogRecords.length > 0}
        onOpenChange={(next) => {
          if (!next) setQuestionnaireDialogRecords([]);
        }}
        records={questionnaireDialogRecords}
        sessionToken={sessionToken ?? ""}
        staticMode={staticMode}
        resolveItemId={resolveContactUpdateTargetRecordId}
        onSaved={handleQuestionnaireSaved}
        fieldOptions={questionnaireFieldOptions}
      />
    </>
  );
};
