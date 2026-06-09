"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@launchthatapp/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@launchthatapp/ui/dialog";

import type { ContactUpdateType, QuickContactActionButton } from "../../constants";
import type { MondayEmailTemplate, MondayRecord } from "../../types";

type BulkQuickActionConfirmation = {
  action: QuickContactActionButton;
  selectedItems: MondayRecord[];
};

type BulkQuestionnaireResolvedTemplate = {
  subject: string;
  html: string;
  text: string;
} | null;

type BulkQuestionnaireDialogsProps = {
  bulkQuickActionConfirmation: BulkQuickActionConfirmation | null;
  setBulkQuickActionConfirmation: (value: BulkQuickActionConfirmation | null) => void;
  bulkQuickActionType: Exclude<ContactUpdateType, "general"> | null;
  isSendingBulkQuestionnaireEmail: boolean;
  openBulkQuickEmailDialog: (action: QuickContactActionButton, selectedItems: MondayRecord[]) => void;
  handleBulkQuickActionUpdates: (
    selectedItems: MondayRecord[],
    clearSelection: () => void,
    actionOverride?: QuickContactActionButton,
  ) => Promise<void>;
  clearBulkSelection: () => void;
  bulkQuestionnaireDialogOpen: boolean;
  closeBulkQuestionnaireEmailDialog: () => void;
  bulkQuickEmailAction: QuickContactActionButton | null;
  bulkQuestionnaireEmailIndex: number;
  setBulkQuestionnaireEmailIndex: (updater: (prev: number) => number) => void;
  bulkQuestionnaireEmailRecords: MondayRecord[];
  bulkQuestionnaireActiveRecord: MondayRecord | null;
  bulkQuestionnaireActiveAlreadySent: boolean;
  bulkQuestionnaireResolvedTemplate: BulkQuestionnaireResolvedTemplate;
  bulkQuestionnaireTemplate: MondayEmailTemplate | null;
  bulkQuestionnaireContactColumnsLoading: boolean;
  emailTemplatesLoading: boolean;
  bulkQuestionnairePendingCount: number;
  bulkQuestionnaireSentCount: number;
  handleSendBulkQuestionnaireToAll: () => Promise<void>;
  handleSendBulkQuestionnaireToActiveRecord: () => Promise<void>;
};

export const BulkQuestionnaireDialogs = ({
  bulkQuickActionConfirmation,
  setBulkQuickActionConfirmation,
  bulkQuickActionType,
  isSendingBulkQuestionnaireEmail,
  openBulkQuickEmailDialog,
  handleBulkQuickActionUpdates,
  clearBulkSelection,
  bulkQuestionnaireDialogOpen,
  closeBulkQuestionnaireEmailDialog,
  bulkQuickEmailAction,
  bulkQuestionnaireEmailIndex,
  setBulkQuestionnaireEmailIndex,
  bulkQuestionnaireEmailRecords,
  bulkQuestionnaireActiveRecord,
  bulkQuestionnaireActiveAlreadySent,
  bulkQuestionnaireResolvedTemplate,
  bulkQuestionnaireTemplate,
  bulkQuestionnaireContactColumnsLoading,
  emailTemplatesLoading,
  bulkQuestionnairePendingCount,
  bulkQuestionnaireSentCount,
  handleSendBulkQuestionnaireToAll,
  handleSendBulkQuestionnaireToActiveRecord,
}: BulkQuestionnaireDialogsProps) => {
  return (
    <>
      <Dialog
        open={!!bulkQuickActionConfirmation}
        onOpenChange={(open) => {
          if (open) return;
          if (bulkQuickActionType) return;
          setBulkQuickActionConfirmation(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Bulk Quick Action</DialogTitle>
            <DialogDescription>
              {bulkQuickActionConfirmation
                ? `Apply "${bulkQuickActionConfirmation.action.label}" to ${bulkQuickActionConfirmation.selectedItems.length} selected record${bulkQuickActionConfirmation.selectedItems.length === 1 ? "" : "s"}?`
                : "Confirm this bulk action."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setBulkQuickActionConfirmation(null)}
              disabled={!!bulkQuickActionType}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                const confirmation = bulkQuickActionConfirmation;
                if (!confirmation) return;
                setBulkQuickActionConfirmation(null);
                if (
                  confirmation.action.type === "followup" ||
                  confirmation.action.type === "welcome_email"
                ) {
                  openBulkQuickEmailDialog(confirmation.action, confirmation.selectedItems);
                  return;
                }
                void handleBulkQuickActionUpdates(
                  confirmation.selectedItems,
                  clearBulkSelection,
                  confirmation.action,
                );
              }}
              disabled={!!bulkQuickActionType || isSendingBulkQuestionnaireEmail}
            >
              {bulkQuickActionType ? "Applying..." : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={bulkQuestionnaireDialogOpen}
        onOpenChange={(open) => {
          if (open) return;
          closeBulkQuestionnaireEmailDialog();
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-scroll border-slate-200 bg-[#f8faff]">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <DialogTitle>
                  {bulkQuickEmailAction?.type === "welcome_email"
                    ? "Bulk Welcome Email Preview"
                    : "Bulk Questionnaire Email Preview"}
                </DialogTitle>
                <DialogDescription>
                  Review and send questionnaire emails one-by-one or all at once.
                </DialogDescription>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setBulkQuestionnaireEmailIndex((prev) => (prev > 0 ? prev - 1 : prev))
                  }
                  disabled={isSendingBulkQuestionnaireEmail || bulkQuestionnaireEmailIndex <= 0}
                  aria-label="Previous contact preview"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-muted-foreground min-w-[120px] text-center text-xs font-medium">
                  {bulkQuestionnaireEmailRecords.length === 0
                    ? "0 / 0"
                    : `${bulkQuestionnaireEmailIndex + 1} / ${bulkQuestionnaireEmailRecords.length}`}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setBulkQuestionnaireEmailIndex((prev) =>
                      prev < bulkQuestionnaireEmailRecords.length - 1 ? prev + 1 : prev,
                    )
                  }
                  disabled={
                    isSendingBulkQuestionnaireEmail ||
                    bulkQuestionnaireEmailIndex >= bulkQuestionnaireEmailRecords.length - 1
                  }
                  aria-label="Next contact preview"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {bulkQuestionnaireActiveRecord ? (
            <div className="space-y-4">
              <div className="rounded-md border border-blue-100 bg-[#eef4ff] px-3 py-2 text-sm text-slate-700">
                Recipient:{" "}
                <span className="font-medium text-slate-900">
                  {bulkQuestionnaireActiveRecord.name}
                  {" · "}
                  {bulkQuestionnaireActiveRecord.email ?? "No email"}
                </span>
                {bulkQuestionnaireActiveAlreadySent ? (
                  <span className="ml-2 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    Sent
                  </span>
                ) : null}
              </div>

              <div className="rounded-md border p-4">
                <p className="text-xs font-semibold tracking-wide uppercase">Subject</p>
                <p className="mt-1 text-base font-medium">
                  {bulkQuestionnaireResolvedTemplate?.subject ??
                    bulkQuestionnaireTemplate?.name ??
                    "No template selected"}
                </p>
                <p className="mt-3 text-xs font-semibold tracking-wide uppercase">
                  Email Preview (Lead View)
                </p>
                <div className="bg-card mt-2 rounded-md border p-4">
                  {bulkQuestionnaireContactColumnsLoading ? (
                    <p className="text-muted-foreground text-sm">Loading contact values…</p>
                  ) : !bulkQuestionnaireTemplate ? (
                    <p className="text-muted-foreground text-sm">
                      {emailTemplatesLoading
                        ? "Loading templates…"
                        : "No matching template found. Using first available template once loaded."}
                    </p>
                  ) : (bulkQuestionnaireResolvedTemplate?.text ?? "").trim().length === 0 ? (
                    <p className="text-muted-foreground text-sm">No content found in template.</p>
                  ) : (bulkQuestionnaireResolvedTemplate?.html ?? "").trim().length > 0 ? (
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none **:wrap-break-word"
                      style={{ whiteSpace: "pre-wrap" }}
                      dangerouslySetInnerHTML={{
                        __html: bulkQuestionnaireResolvedTemplate?.html ?? "",
                      }}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {bulkQuestionnaireResolvedTemplate?.text ?? ""}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <p className="text-muted-foreground text-xs">
                  {bulkQuestionnairePendingCount} pending • {bulkQuestionnaireSentCount} sent
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={closeBulkQuestionnaireEmailDialog}
                    disabled={isSendingBulkQuestionnaireEmail}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      void handleSendBulkQuestionnaireToAll();
                    }}
                    disabled={
                      isSendingBulkQuestionnaireEmail ||
                      !bulkQuestionnaireTemplate ||
                      bulkQuestionnairePendingCount === 0
                    }
                  >
                    {isSendingBulkQuestionnaireEmail ? "Sending..." : "Send All"}
                  </Button>
                  <Button
                    onClick={() => {
                      void handleSendBulkQuestionnaireToActiveRecord();
                    }}
                    disabled={
                      isSendingBulkQuestionnaireEmail ||
                      !bulkQuestionnaireTemplate ||
                      bulkQuestionnaireActiveAlreadySent
                    }
                  >
                    {bulkQuestionnaireActiveAlreadySent
                      ? "Already Sent"
                      : isSendingBulkQuestionnaireEmail
                        ? "Sending..."
                        : "Send to this contact"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No contacts selected.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
