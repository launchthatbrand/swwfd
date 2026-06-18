"use client";

import type { ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight, Pencil, RefreshCcw, Upload, X } from "lucide-react";
import type { ColumnDefinition, EntityAction } from "@launchthatapp/ui/entity-list";
import { EntityList } from "@launchthatapp/ui/entity-list";
import { Button } from "@launchthatapp/ui/button";
import { Input } from "@launchthatapp/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@launchthatapp/ui/select";
import { MultiSelect } from "~/components/ui/multi-select";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@launchthatapp/ui/tabs";
import { Textarea } from "@launchthatapp/ui/textarea";

import { ContactUpdates } from "../ContactUpdates";
import type { ContactUpdateType } from "../../constants";
import type { MondaySubitemEntry } from "../../types";
import type { ContactJobRow, ReferredJobHistoryRow } from "../../board-local";

type ContactColumn = {
  id: string;
  title: string;
  text: string;
  type: string;
  options?: string[];
  isEditable?: boolean;
};

type ResumeFile = {
  assetId: string | null;
  name: string;
  url: string | null;
};

type ContactDialogRightPanelProps = {
  tab: string;
  onTabChange: (value: string) => void;
  updates: MondaySubitemEntry[];
  updatesLoading: boolean;
  updatesEmpty: boolean;
  staticMode: boolean;
  updateDraft: string;
  onUpdateDraftChange: (value: string) => void;
  onSubmitUpdate: (payload: { updateType: ContactUpdateType; date?: string }) => void;
  onSubmitInternalNote: (payload: { updateType: ContactUpdateType; date?: string }) => void;
  onDeleteSubitem: (subitemId: string) => Promise<void>;
  onUpdateSubitemDate: (subitemId: string, date: string) => Promise<void>;
  isSubmittingUpdate: boolean;
  currentUserId: string | null;
  columnsLoading: boolean;
  columnsError: unknown;
  columns: ContactColumn[];
  editingColumnId: string | null;
  editingColumnDraft: string;
  onEditingColumnDraftChange: (value: string) => void;
  isSavingColumn: boolean;
  onSaveEditingColumn: () => void;
  onCancelEditingColumn: () => void;
  onStartEditingColumn: (column: ContactColumn) => void;
  resumeFiles: ResumeFile[];
  selectedResumeIndex: number;
  setSelectedResumeKey: (key: string) => void;
  getResumeFileKey: (file: ResumeFile, index: number) => string;
  resumeHref: string | null;
  resumeFileName: string;
  renderResumePreviewContent: (fileName: string, href: string, heightClassName?: string) => ReactNode;
  isUploadingResume: boolean;
  sessionToken: string | null;
  onTriggerResumeUpload: () => void;
  referredJobsHistory: ReferredJobHistoryRow[];
  formatUpdatedAt: (value: string) => string;
  jobsFetching: boolean;
  onRefreshJobs: () => void;
  jobsError: unknown;
  contactJobRows: ContactJobRow[];
  contactJobColumns: ColumnDefinition<ContactJobRow>[];
  contactJobActions: EntityAction<ContactJobRow>[];
  jobsLoading: boolean;
};

export const ContactDialogRightPanel = ({
  tab,
  onTabChange,
  updates,
  updatesLoading,
  updatesEmpty,
  staticMode,
  updateDraft,
  onUpdateDraftChange,
  onSubmitUpdate,
  onSubmitInternalNote,
  onDeleteSubitem,
  onUpdateSubitemDate,
  isSubmittingUpdate,
  currentUserId,
  columnsLoading,
  columnsError,
  columns,
  editingColumnId,
  editingColumnDraft,
  onEditingColumnDraftChange,
  isSavingColumn,
  onSaveEditingColumn,
  onCancelEditingColumn,
  onStartEditingColumn,
  resumeFiles,
  selectedResumeIndex,
  setSelectedResumeKey,
  getResumeFileKey,
  resumeHref,
  resumeFileName,
  renderResumePreviewContent,
  isUploadingResume,
  sessionToken,
  onTriggerResumeUpload,
  referredJobsHistory,
  formatUpdatedAt,
  jobsFetching,
  onRefreshJobs,
  jobsError,
  contactJobRows,
  contactJobColumns,
  contactJobActions,
  jobsLoading,
}: ContactDialogRightPanelProps) => {
  const internalNotes = updates.filter((subitem) => {
    const status = subitem.internalExternalStatus?.trim().toLowerCase() ?? "";
    return status === "internal" || subitem.intent === "internal_note";
  });
  return (
    <div className="flex min-h-0 flex-col">
      <Tabs value={tab} onValueChange={onTabChange} className="flex min-h-0 flex-1 flex-col">
        <TabsList data-tour="contact-tabs">
          <TabsTrigger value="updates">Updates</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="info">Additional Information</TabsTrigger>
          <TabsTrigger value="resume">Resume</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="updates" className="mt-3 flex min-h-0 flex-1 flex-col">
          <ContactUpdates
            subitems={updates}
            isLoading={updatesLoading}
            isEmpty={updatesEmpty}
            isStaticMode={staticMode}
            draft={updateDraft}
            onDraftChange={onUpdateDraftChange}
            onSubmit={onSubmitUpdate}
            onDeleteSubitem={onDeleteSubitem}
            onUpdateSubitemDate={onUpdateSubitemDate}
            isSubmitting={isSubmittingUpdate}
            currentUserId={currentUserId}
          />
        </TabsContent>

        <TabsContent value="notes" className="mt-3 flex min-h-0 flex-1 flex-col">
          <ContactUpdates
            subitems={internalNotes}
            isLoading={updatesLoading}
            isEmpty={internalNotes.length === 0}
            isStaticMode={staticMode}
            draft={updateDraft}
            onDraftChange={onUpdateDraftChange}
            onSubmit={onSubmitInternalNote}
            onDeleteSubitem={onDeleteSubitem}
            onUpdateSubitemDate={onUpdateSubitemDate}
            isSubmitting={isSubmittingUpdate}
            alignmentOwnerUserId={currentUserId}
            composerMode="internal_notes"
          />
        </TabsContent>

        <TabsContent value="info" className="mt-3 min-h-0 flex-1">
          {columnsLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[140px_1fr] gap-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : columnsError ? (
            <div className="rounded-md border p-3">
              <p className="text-destructive text-sm">
                {columnsError instanceof Error ? columnsError.message : "Failed to load contact details"}
              </p>
            </div>
          ) : (
            <div className="h-full max-w-full overflow-x-hidden overflow-y-auto rounded-md border">
              <table className="w-full table-fixed text-sm">
                <tbody>
                  {columns.map((col) => (
                    <tr key={col.id} className="border-b last:border-b-0">
                      <td className="text-muted-foreground bg-muted/30 w-[180px] max-w-[180px] border-r px-3 py-2 text-xs font-medium align-top truncate">
                        {col.title}
                      </td>
                      <td className="group relative min-w-0 max-w-0 overflow-hidden px-3 py-2 pr-10 text-xs align-top">
                        {editingColumnId === col.id ? (
                          <div className="space-y-2">
                            {(() => {
                              const normalizedType = col.type.toLowerCase();
                              if (normalizedType === "status") {
                                const options = Array.from(new Set((col.options ?? []).filter(Boolean)));
                                return (
                                  <Select
                                    value={editingColumnDraft.length > 0 ? editingColumnDraft : "__clear__"}
                                    onValueChange={(value) => {
                                      onEditingColumnDraftChange(value === "__clear__" ? "" : value);
                                    }}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue placeholder="Select value" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__clear__">Clear</SelectItem>
                                      {options.map((option) => (
                                        <SelectItem key={option} value={option}>
                                          {option}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                );
                              }
                              if (normalizedType === "dropdown") {
                                const options = Array.from(new Set((col.options ?? []).filter(Boolean)));
                                const selectedValues = editingColumnDraft
                                  .split(",")
                                  .map((entry) => entry.trim())
                                  .filter((entry) => entry.length > 0);
                                return (
                                  <MultiSelect
                                    options={options.map((option) => ({ label: option, value: option }))}
                                    defaultValue={selectedValues}
                                    placeholder="Select values"
                                    onValueChange={(values) => {
                                      onEditingColumnDraftChange(values.join(", "));
                                    }}
                                  />
                                );
                              }
                              if (normalizedType === "date") {
                                return (
                                  <Input
                                    type="date"
                                    className="h-8 text-xs"
                                    value={editingColumnDraft}
                                    onChange={(event) => onEditingColumnDraftChange(event.target.value)}
                                  />
                                );
                              }
                              if (normalizedType === "long_text" || normalizedType === "long-text") {
                                return (
                                  <Textarea
                                    className="min-h-[72px] text-xs"
                                    value={editingColumnDraft}
                                    onChange={(event) => onEditingColumnDraftChange(event.target.value)}
                                  />
                                );
                              }
                              if (normalizedType === "numbers" || normalizedType === "numeric") {
                                return (
                                  <Input
                                    type="number"
                                    className="h-8 text-xs"
                                    value={editingColumnDraft}
                                    onChange={(event) => onEditingColumnDraftChange(event.target.value)}
                                  />
                                );
                              }
                              return (
                                <Input
                                  type="text"
                                  className="h-8 text-xs"
                                  value={editingColumnDraft}
                                  onChange={(event) => onEditingColumnDraftChange(event.target.value)}
                                />
                              );
                            })()}
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="h-6 w-6"
                                onClick={onSaveEditingColumn}
                                disabled={isSavingColumn}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={onCancelEditingColumn}
                                disabled={isSavingColumn}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {col.text ? (
                              <span className="block max-w-full truncate" title={col.text}>
                                {col.text}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                            {col.isEditable ? (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2"
                                onClick={() => {
                                  onStartEditingColumn(col);
                                }}
                                title={`Edit ${col.title}`}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            ) : null}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="resume" className="mt-3 min-h-0 flex-1">
          {resumeFiles.length > 0 ? (
            <div className="flex h-full min-h-0 flex-col gap-3">
              <div className="bg-muted/10 flex flex-wrap items-center justify-between gap-2 rounded-md border p-2">
                <p className="text-muted-foreground text-xs">
                  Resume {selectedResumeIndex + 1} of {resumeFiles.length}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    disabled={selectedResumeIndex <= 0}
                    onClick={() => {
                      const previousIndex = selectedResumeIndex - 1;
                      const previousFile = resumeFiles[previousIndex];
                      if (!previousFile) return;
                      setSelectedResumeKey(getResumeFileKey(previousFile, previousIndex));
                    }}
                  >
                    <ChevronLeft className="mr-1.5 h-3.5 w-3.5" />
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    disabled={selectedResumeIndex < 0 || selectedResumeIndex >= resumeFiles.length - 1}
                    onClick={() => {
                      const nextIndex = selectedResumeIndex + 1;
                      const nextFile = resumeFiles[nextIndex];
                      if (!nextFile) return;
                      setSelectedResumeKey(getResumeFileKey(nextFile, nextIndex));
                    }}
                  >
                    Next
                    <ChevronRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                  {!staticMode ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8"
                      disabled={isUploadingResume || !sessionToken}
                      onClick={onTriggerResumeUpload}
                    >
                      <Upload className="mr-1.5 h-3.5 w-3.5" />
                      {isUploadingResume ? "Uploading..." : "Add Resume"}
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 rounded-md border p-2">
                {resumeFiles.map((file, index) => {
                  const optionLabel =
                    file.name?.trim().length > 0 ? file.name.trim() : `Resume ${index + 1}`;
                  const isSelected = index === selectedResumeIndex;
                  return (
                    <Button
                      key={getResumeFileKey(file, index)}
                      type="button"
                      variant={isSelected ? "secondary" : "ghost"}
                      size="sm"
                      className="max-w-[240px] justify-start truncate"
                      title={optionLabel}
                      onClick={() => {
                        setSelectedResumeKey(getResumeFileKey(file, index));
                      }}
                    >
                      <span className="truncate">{optionLabel}</span>
                    </Button>
                  );
                })}
              </div>
              {resumeHref ? (
                renderResumePreviewContent(resumeFileName, resumeHref, "h-[60vh]")
              ) : (
                <div className="bg-muted/10 flex h-full flex-col items-center justify-center rounded-md border border-dashed p-6 text-center">
                  <p className="text-sm font-medium">This resume is attached but could not be previewed.</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Try opening it in a new tab from the selected resume card.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-muted/10 flex h-full flex-col items-center justify-center rounded-md border border-dashed p-6 text-center">
              <p className="text-sm font-medium">No resume attached yet.</p>
              {!staticMode ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  disabled={isUploadingResume || !sessionToken}
                  onClick={onTriggerResumeUpload}
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Upload Resume
                </Button>
              ) : null}
            </div>
          )}
        </TabsContent>

        <TabsContent value="jobs" className="mt-3 min-h-0 flex-1">
          <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
            <div className="rounded-md border p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Referred Jobs ({referredJobsHistory.length})</p>
              </div>
              {updatesLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <Skeleton key={index} className="h-8 w-full" />
                  ))}
                </div>
              ) : referredJobsHistory.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  No job referrals logged for this contact yet.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {referredJobsHistory.slice(0, 6).map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-muted/20 flex items-center justify-between gap-2 rounded-md px-2 py-1.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">{entry.title}</p>
                        <p className="text-muted-foreground text-[11px]">
                          {entry.jobId ? `Job ID ${entry.jobId}` : "Job ID unavailable"}
                        </p>
                      </div>
                      <span className="text-muted-foreground shrink-0 text-[11px]">
                        {entry.referredAt ? formatUpdatedAt(entry.referredAt) : "—"}
                      </span>
                    </div>
                  ))}
                  {referredJobsHistory.length > 6 ? (
                    <p className="text-muted-foreground text-[11px]">
                      +{referredJobsHistory.length - 6} more referrals
                    </p>
                  ) : null}
                </div>
              )}
            </div>
            <div className="bg-muted/10 flex flex-wrap items-center justify-between gap-2 rounded-md border p-2">
              <div>
                <p className="text-sm font-medium">Available Jobs</p>
                <p className="text-muted-foreground text-xs">
                  Search and switch list/grid view. Referred jobs are automatically disabled.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={jobsFetching}
                onClick={onRefreshJobs}
              >
                <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
                Refresh
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {jobsError ? (
                <div className="rounded-md border p-3">
                  <p className="text-destructive text-sm">
                    {jobsError instanceof Error ? jobsError.message : "Failed to load jobs"}
                  </p>
                </div>
              ) : (
                <EntityList
                  data={contactJobRows}
                  columns={contactJobColumns}
                  entityActions={contactJobActions}
                  getRowId={(item) => item.id}
                  isLoading={jobsLoading}
                  enableSearch
                  viewModes={["list", "grid"]}
                  defaultViewMode="list"
                  enableFooter={false}
                  showRowCount={false}
                  hideFilters
                  emptyState={
                    <div className="text-muted-foreground py-6 text-sm">No available jobs found.</div>
                  }
                />
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
