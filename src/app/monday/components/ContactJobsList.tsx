"use client";

import { BriefcaseBusiness, RefreshCcw } from "lucide-react";
import type { ColumnDefinition, EntityAction } from "@launchthatapp/ui/entity-list";
import { EntityList } from "@launchthatapp/ui/entity-list";
import { Button } from "@launchthatapp/ui/button";
import { Skeleton } from "~/components/ui/skeleton";

import type { ContactJobRow, ReferredJobHistoryRow } from "../board-local";
import type { MondayJobListing } from "../types";

export const buildContactJobColumns = (): ColumnDefinition<ContactJobRow>[] => [
  {
    id: "title",
    header: "Job",
    accessorKey: "title",
    sortable: true,
    cell: (item) => (
      <div className="px-2 py-2">
        <p className="truncate font-medium">{item.title}</p>
        <p className="text-muted-foreground truncate text-xs">
          {item.location || "Location unavailable"}
        </p>
      </div>
    ),
  },
  {
    id: "district",
    header: "District",
    accessorKey: "district",
    sortable: true,
    cell: (item) => (
      <span className="block truncate px-2 py-2">{item.district || "—"}</span>
    ),
  },
  {
    id: "contractor",
    header: "Contractor",
    accessorKey: "contractor",
    sortable: true,
    cell: (item) => (
      <span className="block truncate px-2 py-2">{item.contractor || "—"}</span>
    ),
  },
  {
    id: "categoriesText",
    header: "Categories",
    accessorKey: "categoriesText",
    sortable: true,
    cell: (item) => (
      <span className="block truncate px-2 py-2">{item.categoriesText || "—"}</span>
    ),
  },
  {
    id: "postedDate",
    header: "Posted",
    accessorKey: "postedDate",
    sortable: true,
    cell: (item) => (
      <span className="block truncate px-2 py-2">{item.postedDate || "—"}</span>
    ),
  },
];

export type BuildContactJobActionsOptions = {
  isCreatingContactUpdate: boolean;
  referringJobId: string | null;
  onRefer: (job: MondayJobListing) => void | Promise<void>;
};

export const buildContactJobActions = ({
  isCreatingContactUpdate,
  referringJobId,
  onRefer,
}: BuildContactJobActionsOptions): EntityAction<ContactJobRow>[] => [
  {
    id: "refer",
    label: (item) => (item.isAlreadyReferred ? "Referred" : "Refer"),
    icon: <BriefcaseBusiness className="h-3.5 w-3.5" />,
    variant: "outline",
    isDisabled: (item) =>
      item.isAlreadyReferred ||
      isCreatingContactUpdate ||
      referringJobId === item.id,
    onClick: (item) => {
      void onRefer(item.rawJob);
    },
  },
];

export type ContactJobsListProps = {
  referredJobsHistory: ReferredJobHistoryRow[];
  formatUpdatedAt: (value: string) => string;
  updatesLoading: boolean;
  jobsFetching: boolean;
  onRefreshJobs: () => void;
  jobsError: unknown;
  jobsLoading: boolean;
  contactJobRows: ContactJobRow[];
  contactJobColumns: ColumnDefinition<ContactJobRow>[];
  contactJobActions: EntityAction<ContactJobRow>[];
};

export const ContactJobsList = ({
  referredJobsHistory,
  formatUpdatedAt,
  updatesLoading,
  jobsFetching,
  onRefreshJobs,
  jobsError,
  jobsLoading,
  contactJobRows,
  contactJobColumns,
  contactJobActions,
}: ContactJobsListProps) => {
  return (
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
  );
};
