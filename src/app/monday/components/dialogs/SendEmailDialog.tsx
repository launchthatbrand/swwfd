"use client";

import { Button } from "@launchthatapp/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@launchthatapp/ui/dialog";

import type {
  MondayEmailTemplate,
  MondayRecord,
  OutlookTeamMailboxesResponse,
} from "../../types";
import { formatUpdatedAt, interpolateTemplateVariables } from "../../helpers";

type SendEmailResolvedTemplate = {
  subject: string;
  html: string;
  text: string;
} | null;

type SendEmailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  record: MondayRecord | null;
  title: string;
  step: 1 | 2 | 3;
  onStepChange: (step: 1 | 2 | 3) => void;
  templates: MondayEmailTemplate[];
  templatesLoading: boolean;
  templateId: string | null;
  onTemplateIdChange: (value: string) => void;
  template: MondayEmailTemplate | null;
  templateVariables: Record<string, string>;
  resolvedTemplate: SendEmailResolvedTemplate;
  mailboxOptions: OutlookTeamMailboxesResponse["mailboxes"];
  mailboxLoading: boolean;
  ownerUserId: string;
  onOwnerUserIdChange: (value: string) => void;
  selectedMailbox: OutlookTeamMailboxesResponse["mailboxes"][number] | null;
  canSubmit: boolean;
  isSending: boolean;
  onConfirmSend: () => void;
};

export const SendEmailDialog = ({
  open,
  onOpenChange,
  onClose,
  record,
  title,
  step,
  onStepChange,
  templates,
  templatesLoading,
  templateId,
  onTemplateIdChange,
  template,
  templateVariables,
  resolvedTemplate,
  mailboxOptions,
  mailboxLoading,
  ownerUserId,
  onOwnerUserIdChange,
  selectedMailbox,
  canSubmit,
  isSending,
  onConfirmSend,
}: SendEmailDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-scroll border-slate-200 bg-[#f8faff]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {record ? (
          <div className="space-y-4">
            <div className="rounded-md border border-blue-100 bg-[#eef4ff] px-3 py-2 text-sm text-slate-700">
              Recipient:{" "}
              <span className="font-medium text-slate-900">
                {record.name}
                {" · "}
                {record.email ?? "No email"}
              </span>
            </div>
            {step === 1 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Step 1: Choose an email template</p>
                <div className="max-h-[420px] overflow-y-auto rounded-md border border-blue-100 bg-[#f3f7ff] p-2">
                  <div className="grid gap-2 md:grid-cols-2">
                    {templates.map((entry) => {
                      const isActive = entry.id === templateId;
                      const resolvedTemplateName = interpolateTemplateVariables(
                        entry.name,
                        templateVariables,
                      );
                      const resolvedRenderedHtml = interpolateTemplateVariables(
                        entry.renderedHtml,
                        templateVariables,
                      );
                      const resolvedContent = interpolateTemplateVariables(
                        entry.content,
                        templateVariables,
                      );
                      const hasRenderedHtml = resolvedRenderedHtml.trim().length > 0;
                      const hasPlainContent = resolvedContent.trim().length > 0;
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          className={[
                            "w-full rounded-md border p-3 text-left text-sm shadow-sm transition-all",
                            isActive
                              ? "border-blue-400 bg-blue-50 ring-2 ring-blue-200"
                              : "border-blue-100 bg-white hover:border-blue-300 hover:bg-blue-50/60",
                          ].join(" ")}
                          onClick={() => {
                            onTemplateIdChange(entry.id);
                          }}
                        >
                          <p className="line-clamp-1 font-medium text-slate-900">
                            {resolvedTemplateName}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Updated {formatUpdatedAt(entry.updatedAt)}
                          </p>
                          <div className="mt-2 h-28 overflow-hidden rounded-md border border-slate-200 bg-[#fcfdff] p-2">
                            {hasRenderedHtml ? (
                              <div
                                className="prose prose-sm max-w-none scale-[0.92] origin-top-left **:wrap-break-word"
                                style={{ whiteSpace: "pre-wrap" }}
                                dangerouslySetInnerHTML={{
                                  __html: resolvedRenderedHtml,
                                }}
                              />
                            ) : hasPlainContent ? (
                              <p className="line-clamp-6 whitespace-pre-wrap text-xs leading-snug text-slate-600">
                                {resolvedContent}
                              </p>
                            ) : (
                              <p className="text-xs text-slate-500">No preview content.</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {templates.length === 0 && !templatesLoading ? (
                    <p className="text-muted-foreground text-sm">No templates found.</p>
                  ) : null}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button onClick={() => onStepChange(2)} disabled={!template}>
                    Next
                  </Button>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-3">
                <p className="text-sm font-medium">Step 2: Preview template</p>
                <div className="rounded-md border p-4">
                  {template ? (
                    <>
                      <p className="text-xs font-semibold tracking-wide uppercase">Subject</p>
                      <p className="mt-1 text-base font-medium">
                        {resolvedTemplate?.subject ?? template.name}
                      </p>
                      <p className="mt-3 text-xs font-semibold tracking-wide uppercase">
                        Email Preview (Lead View)
                      </p>
                      <div className="bg-card mt-2 rounded-md border p-4">
                        {(resolvedTemplate?.text ?? "").trim().length === 0 ? (
                          <p className="text-muted-foreground text-sm">
                            No content found in template.
                          </p>
                        ) : (resolvedTemplate?.html ?? "").trim().length > 0 ? (
                          <div
                            className="prose prose-sm dark:prose-invert max-w-none **:wrap-break-word"
                            style={{ whiteSpace: "pre-wrap" }}
                            dangerouslySetInnerHTML={{
                              __html: resolvedTemplate?.html ?? "",
                            }}
                          />
                        ) : (
                          <div className="whitespace-pre-wrap text-sm leading-relaxed">
                            {resolvedTemplate?.text ?? ""}
                          </div>
                        )}
                      </div>
                    </>
                  ) : templatesLoading ? (
                    <p className="text-muted-foreground text-sm">Loading templates…</p>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      No templates found. Choose another action or add templates in settings.
                    </p>
                  )}
                </div>
                <div className="flex justify-between gap-2">
                  <Button variant="outline" onClick={() => onStepChange(1)}>
                    Back
                  </Button>
                  <Button onClick={() => onStepChange(3)} disabled={!template}>
                    Next
                  </Button>
                </div>
              </div>
            ) : null}

            {step === 3 && template ? (
              <div className="space-y-3">
                <p className="text-sm font-medium">Step 3: Confirm send</p>
                <div className="space-y-3 rounded-md border p-4 text-sm">
                  <p>Are you sure you want to send this email?</p>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold tracking-wide uppercase">From mailbox</p>
                    {mailboxLoading ? (
                      <p className="text-muted-foreground text-xs">Loading mailbox options…</p>
                    ) : mailboxOptions.length === 0 ? (
                      <p className="text-muted-foreground text-xs">
                        No team sender mailboxes are configured for this workspace.
                      </p>
                    ) : (
                      <select
                        value={ownerUserId}
                        onChange={(event) => {
                          onOwnerUserIdChange(event.target.value);
                        }}
                        className="bg-background border-input h-9 w-full rounded-md border px-2 text-xs shadow-sm"
                        disabled={isSending || mailboxLoading}
                      >
                        <option value="">Select sender mailbox</option>
                        {mailboxOptions.map((mailbox) => {
                          const displayName =
                            mailbox.name?.trim() ||
                            mailbox.mailboxDisplayName?.trim() ||
                            mailbox.userEmail?.trim() ||
                            mailbox.mondayUserId;
                          const mailboxEmail =
                            mailbox.mailboxEmail?.trim() ||
                            mailbox.userEmail?.trim() ||
                            "no mailbox email";
                          return (
                            <option key={mailbox.mondayUserId} value={mailbox.mondayUserId}>
                              {`${displayName} • ${mailboxEmail} • ${mailbox.connected ? "connected" : "not connected"}`}
                            </option>
                          );
                        })}
                      </select>
                    )}
                    {selectedMailbox ? (
                      <p
                        className={`text-xs ${selectedMailbox.connected ? "text-emerald-700" : "text-rose-600"}`}
                      >
                        {selectedMailbox.connected
                          ? "Selected mailbox is connected and ready."
                          : "Selected mailbox is not connected. Connect Outlook before sending."}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex justify-between gap-2">
                  <Button variant="outline" onClick={() => onStepChange(2)}>
                    Back
                  </Button>
                  <Button onClick={onConfirmSend} disabled={!canSubmit}>
                    {isSending ? "Sending..." : "Send Email"}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
