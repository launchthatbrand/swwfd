"use client";

import type { CSSProperties, ComponentProps, ReactNode } from "react";
import { BriefcaseBusiness, ChevronLeft, ChevronRight, MoreHorizontal, Upload, X } from "lucide-react";
import { Button } from "@launchthatapp/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@launchthatapp/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

import type { CommunicationQuickActionDefinition } from "../../board-local";
import type { MondayRecord } from "../../types";
import { OnboardingStepper } from "../OnboardingStepper";

type ContactHistoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: MondayRecord | null;
  contactDialogIndex: number;
  filteredRecordsLength: number;
  onNavigate: (direction: -1 | 1) => void;
  staticMode: boolean;
  onboardingStepperProps: Omit<ComponentProps<typeof OnboardingStepper>, "record">;
  canOpenRecordUrl: boolean;
  onOpenRecordUrl: () => void;
  showSyncAction: boolean;
  syncActionLabel: string;
  syncActionDisabled: boolean;
  onSync: () => void;
  resumeInputId: string;
  onResumeInputChange: (file: File) => void;
  isContactDialogUploadingResume: boolean;
  canUploadResume: boolean;
  hasResumeFile: boolean;
  onTriggerResumeUpload: () => void;
  communicationQuickActions: CommunicationQuickActionDefinition[];
  quickActionButtonSizeClass: string;
  actionButtonClassName: string;
  actionButtonStyle: CSSProperties | undefined;
  onSelectCommunicationQuickAction: (action: CommunicationQuickActionDefinition) => void;
  communicationActionsDisabled: boolean;
  markAsHiredDisabled: boolean;
  onMarkAsHired: () => void;
  rightPanel: ReactNode;
};

export const ContactHistoryDialog = ({
  open,
  onOpenChange,
  record,
  contactDialogIndex,
  filteredRecordsLength,
  onNavigate,
  staticMode,
  onboardingStepperProps,
  canOpenRecordUrl,
  onOpenRecordUrl,
  showSyncAction,
  syncActionLabel,
  syncActionDisabled,
  onSync,
  resumeInputId,
  onResumeInputChange,
  isContactDialogUploadingResume,
  canUploadResume,
  hasResumeFile,
  onTriggerResumeUpload,
  communicationQuickActions,
  quickActionButtonSizeClass,
  actionButtonClassName,
  actionButtonStyle,
  onSelectCommunicationQuickAction,
  communicationActionsDisabled,
  markAsHiredDisabled,
  onMarkAsHired,
  rightPanel,
}: ContactHistoryDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-tour="contact-dialog"
        className="flex h-[90vh] gap-0 max-h-[90vh] max-w-[90vw] flex-col overflow-hidden p-0"
      >
        <DialogHeader className="z-10 border-b bg-background p-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 shrink-0"
              disabled={contactDialogIndex <= 0}
              onClick={() => onNavigate(-1)}
              title="Previous contact"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 shrink-0"
              disabled={contactDialogIndex < 0 || contactDialogIndex >= filteredRecordsLength - 1}
              onClick={() => onNavigate(1)}
              title="Next contact"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <DialogTitle className="min-w-0 max-w-[300px] shrink-0 truncate">
              {record?.name ?? "Contact"}
            </DialogTitle>
            {!staticMode && record ? (
              <div data-tour="onboarding-stepper" className="mx-2 min-w-0 flex-1">
                <OnboardingStepper record={record} {...onboardingStepperProps} />
              </div>
            ) : null}
            {contactDialogIndex >= 0 ? (
              <span className="text-muted-foreground shrink-0 text-xs">
                {contactDialogIndex + 1} / {filteredRecordsLength}
              </span>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="ml-2 h-8 w-8 shrink-0"
                  title="More actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  disabled={!canOpenRecordUrl}
                  onSelect={(event) => {
                    event.preventDefault();
                    if (!canOpenRecordUrl) return;
                    onOpenRecordUrl();
                  }}
                >
                  Open
                </DropdownMenuItem>
                {showSyncAction ? (
                  <DropdownMenuItem
                    disabled={syncActionDisabled}
                    onSelect={(event) => {
                      event.preventDefault();
                      onSync();
                    }}
                  >
                    {syncActionLabel}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="ml-1 h-8 w-8 shrink-0"
              onClick={() => onOpenChange(false)}
              title="Close contact dialog"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 p-4">
          {record ? (
            <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(320px,1fr)_minmax(0,2fr)]">
              <div
                data-tour="contact-header"
                className="min-h-0 space-y-4 overflow-y-auto rounded-md border bg-muted/20 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold">{record.name ?? "Contact"}</p>
                  <p className="text-muted-foreground truncate text-sm">{record.email ?? "—"}</p>
                  <p className="text-muted-foreground truncate text-sm">{record.phone ?? "—"}</p>
                </div>
                {!staticMode ? (
                  <>
                    <input
                      id={resumeInputId}
                      type="file"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        onResumeInputChange(file);
                        event.currentTarget.value = "";
                      }}
                      disabled={isContactDialogUploadingResume || !canUploadResume}
                    />
                    <div className="space-y-1.5">
                      <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
                        Communication
                      </p>
                      <div className="space-y-1.5">
                        <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                          Resume
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isContactDialogUploadingResume || !canUploadResume}
                            onClick={onTriggerResumeUpload}
                          >
                            <Upload className="mr-1.5 h-3.5 w-3.5" />
                            {isContactDialogUploadingResume
                              ? "Uploading..."
                              : hasResumeFile
                                ? "Add Resume"
                                : "Upload Resume"}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                          Outreach
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          {communicationQuickActions.map((action) => {
                            const Icon = action.icon;
                            return (
                              <Button
                                key={action.id}
                                type="button"
                                size="sm"
                                className={`rounded-md ${quickActionButtonSizeClass} ${actionButtonClassName}`}
                                style={actionButtonStyle}
                                disabled={communicationActionsDisabled}
                                onClick={() => {
                                  onSelectCommunicationQuickAction(action);
                                }}
                              >
                                <Icon className="mr-1.5 h-3.5 w-3.5" />
                                {action.label}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                          Hiring Workflow
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className={`rounded-md ${quickActionButtonSizeClass} ${actionButtonClassName}`}
                            style={actionButtonStyle}
                            disabled={markAsHiredDisabled}
                            onClick={onMarkAsHired}
                          >
                            <BriefcaseBusiness className="mr-1.5 h-3.5 w-3.5" />
                            Mark as Hired
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
              {rightPanel}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};
