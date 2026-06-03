"use client";

import { CircleHelp, ExternalLink, Mail } from "lucide-react";
import type { ColumnDefinition, EntityAction } from "@launchthatapp/ui/entity-list";
import { Badge } from "@launchthatapp/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@launchthatapp/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";

import { BusinessInfoHoverCard } from "./BusinessInfoHoverCard";
import { NameCellContent } from "./NameCellContent";
import {
  formatDateTimeParts,
  formatUpdatedAt,
  getDistrictChipClassName,
  getLastTouchpointBadgeClassName,
  getLastTouchpointRecency,
  getNameInitials,
  splitCsvValues,
} from "../helpers";
import type {
  ApprovalStepConfig,
  MondayFeatureFlags,
  MondayRecord,
  UserBoardTableDensity,
} from "../types";

interface BuildBoardTableColumnsArgs {
  tableDensity: UserBoardTableDensity;
  approvalSteps: ApprovalStepConfig[];
  hoverPopoversEnabled: boolean;
  uploadingResumeByRecordId: Record<string, boolean>;
  staticMode: boolean;
  onHelpDesk: (record: MondayRecord) => void;
  onOpenContact: (record: MondayRecord) => void;
  onOpenStatus: (record: MondayRecord) => void;
  onOpenOwner: (record: MondayRecord) => void;
  onOpenRetention: (record: MondayRecord) => void;
  onOpenTags: (record: MondayRecord) => void;
  onUploadResume: (record: MondayRecord, file: File) => Promise<void> | void;
  getResumeFileHref: (
    file: { assetId: string | null; name: string; url: string | null },
  ) => string | null;
  onPreviewResume: (
    args: { record: MondayRecord; file: { assetId: string | null; name: string; url: string | null }; href: string | null },
  ) => void;
}

export const buildBoardTableColumns = ({
  tableDensity,
  approvalSteps,
  hoverPopoversEnabled,
  uploadingResumeByRecordId,
  staticMode,
  onHelpDesk,
  onOpenContact,
  onOpenStatus,
  onOpenOwner,
  onOpenRetention,
  onOpenTags,
  onUploadResume,
  getResumeFileHref,
  onPreviewResume,
}: BuildBoardTableColumnsArgs): ColumnDefinition<MondayRecord>[] => [
  {
    id: "helpdesk",
    header: "",
    accessorKey: "id",
    minWidth: "36",
    cell: (item: MondayRecord) => (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="flex h-full w-full items-center justify-center p-1 text-muted-foreground transition-colors hover:text-primary"
            onClick={(e) => {
              e.stopPropagation();
              onHelpDesk(item);
            }}
          >
            <CircleHelp className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          Submit a support ticket for {item.name}
        </TooltipContent>
      </Tooltip>
    ),
  },
  {
    id: "name",
    header: "Item",
    accessorKey: "name",
    sortable: true,
    cell: (item: MondayRecord) => (
      <NameCellContent
        item={item}
        tableDensity={tableDensity}
        approvalSteps={approvalSteps}
        hoverPopoversEnabled={hoverPopoversEnabled}
        onOpen={() => onOpenContact(item)}
      />
    ),
  },
  {
    id: "statusText",
    header: "District",
    accessorKey: "statusText",
    cell: (item: MondayRecord) => (
      <button
        type="button"
        onClick={() => onOpenStatus(item)}
        className="hover:bg-accent/40 w-full cursor-pointer rounded-md p-2 text-left"
      >
        {item.statusText ? (
          <span
            className={`inline-flex min-w-[86px] items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium ${getDistrictChipClassName(item.statusText)}`}
          >
            {item.statusText}
          </span>
        ) : (
          "—"
        )}
      </button>
    ),
  },
  {
    id: "peopleText",
    header: "Owner",
    accessorKey: "peopleText",
    cell: (item: MondayRecord) => {
      const isCompactOwner = tableDensity === "compact";
      return (
        <button
          type="button"
          onClick={() => onOpenOwner(item)}
          className={`hover:bg-accent/40 flex w-full cursor-pointer items-center rounded-md text-center ${isCompactOwner ? "justify-start gap-1.5 px-2 py-1" : "justify-center p-2"}`}
        >
          {item.ownerProfiles.length > 0 ? (
            isCompactOwner ? (
              <div className="flex items-center gap-1.5">
                <div className="flex items-center -space-x-1.5">
                  {item.ownerProfiles.slice(0, 3).map((owner) => (
                    <Avatar
                      key={owner.id}
                      className="size-5 border border-background"
                    >
                      {owner.photoThumb ? (
                        <AvatarImage src={owner.photoThumb} alt={owner.name ?? owner.id} />
                      ) : null}
                      <AvatarFallback className="text-[8px] font-semibold">
                        {getNameInitials(owner.name ?? owner.id)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <span className="truncate text-xs">
                  {item.ownerProfiles
                    .map((owner) => owner.name?.trim() ?? owner.id)
                    .join(", ")}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center justify-center -space-x-2">
                  {item.ownerProfiles.slice(0, 3).map((owner) => (
                    <Avatar
                      key={owner.id}
                      className="size-8 border-2 border-background shadow-sm"
                    >
                      {owner.photoThumb ? (
                        <AvatarImage src={owner.photoThumb} alt={owner.name ?? owner.id} />
                      ) : null}
                      <AvatarFallback className="text-xs font-semibold">
                        {getNameInitials(owner.name ?? owner.id)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <span className="line-clamp-2 max-w-[180px] text-[11px] leading-tight">
                  {item.ownerProfiles
                    .map((owner) => owner.name?.trim() ?? owner.id)
                    .join(", ")}
                </span>
              </div>
            )
          ) : (
            <span className="text-xs">{item.peopleText ?? "—"}</span>
          )}
        </button>
      );
    },
  },
  {
    id: "lastTouchpointAt",
    header: "Last Touchpoint",
    accessorKey: "lastTouchpointAt",
    sortable: true,
    cell: (item: MondayRecord) => {
      const recency = getLastTouchpointRecency(item.lastTouchpointAt ?? null);
      const formatted = formatDateTimeParts(recency.parsedAt);
      return (
        <div className="flex min-w-[140px] flex-col gap-1 px-2 py-1.5">
          <div className="leading-tight">
            <div>{formatted.date}</div>
            {formatted.time ? (
              <div className="text-muted-foreground text-xs">{formatted.time}</div>
            ) : null}
          </div>
          <Badge
            variant="outline"
            className={`w-fit text-[10px] ${getLastTouchpointBadgeClassName(recency.tone)}`}
          >
            {recency.label}
          </Badge>
        </div>
      );
    },
  },
  {
    id: "retention",
    header: "Retention",
    accessorKey: "referredToContractors",
    cell: (item: MondayRecord) => {
      const referredValues = splitCsvValues(item.referredToContractors);
      const MAX_VISIBLE = 2;
      const visibleReferred = referredValues.slice(0, MAX_VISIBLE);
      const extraReferred = referredValues.length - MAX_VISIBLE;
      const isCompact = tableDensity === "compact";

      if (isCompact) {
        return (
          <button
            type="button"
            onClick={() => onOpenRetention(item)}
            title={[
              referredValues.length > 0 ? `Referred: ${referredValues.join(", ")}` : null,
              item.hiredWithContractor?.trim() ? `Hired: ${item.hiredWithContractor.trim()}` : null,
              item.hireDate ? `Date: ${formatUpdatedAt(item.hireDate)}` : null,
              item.retentionPeriod?.trim() ? `Period: ${item.retentionPeriod.trim()}` : null,
            ].filter(Boolean).join(" · ")}
            className="hover:bg-accent/40 flex w-full min-w-[280px] max-w-[520px] cursor-pointer items-center gap-x-3 overflow-hidden rounded-md px-2 py-1 text-left"
          >
            <span className="flex min-w-0 items-center gap-1 overflow-hidden text-xs">
              <span className="shrink-0 font-medium">Referred:</span>
              <span className={`truncate ${referredValues.length > 0 ? "" : "text-muted-foreground"}`}>
                {referredValues.length > 0 ? referredValues.join(", ") : "—"}
              </span>
            </span>
            <span className="flex min-w-0 items-center gap-1 overflow-hidden text-xs">
              <span className="shrink-0 font-medium">Hired:</span>
              <span className={`truncate ${item.hiredWithContractor?.trim() ? "" : "text-muted-foreground"}`}>
                {item.hiredWithContractor?.trim() || "—"}
              </span>
            </span>
            <span className="flex min-w-0 items-center gap-1 overflow-hidden text-xs">
              <span className="shrink-0 font-medium">Date:</span>
              <span className={`truncate ${item.hireDate ? "" : "text-muted-foreground"}`}>
                {item.hireDate ? formatUpdatedAt(item.hireDate) : "—"}
              </span>
            </span>
            <span className="flex min-w-0 items-center gap-1 overflow-hidden text-xs">
              <span className="shrink-0 font-medium">Period:</span>
              <span className={`truncate ${item.retentionPeriod?.trim() ? "" : "text-muted-foreground"}`}>
                {item.retentionPeriod?.trim() || "—"}
              </span>
            </span>
          </button>
        );
      }

      return (
        <button
          type="button"
          onClick={() => onOpenRetention(item)}
          className="hover:bg-accent/40 flex w-full min-w-[100px] max-w-[340px] cursor-pointer flex-col items-start gap-1 rounded-md p-2 text-left"
        >
          <div className="flex w-full min-w-0 items-center gap-1 overflow-hidden">
            <span className="shrink-0 text-xs font-medium">Referred:</span>
            {referredValues.length > 0 ? (
              <>
                {visibleReferred.map((value) => (
                  <BusinessInfoHoverCard key={value} companyName={value}>
                    <Badge
                      variant="secondary"
                      className="max-w-[100px] shrink-0 cursor-help truncate text-[10px]"
                      title={value}
                    >
                      {value}
                    </Badge>
                  </BusinessInfoHoverCard>
                ))}
                {extraReferred > 0 && (
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    +{extraReferred}
                  </Badge>
                )}
              </>
            ) : (
              <span className="text-muted-foreground text-xs">—</span>
            )}
          </div>
          <div className="flex w-full min-w-0 items-center gap-1 overflow-hidden">
            <span className="shrink-0 text-xs font-medium">Hired With:</span>
            {item.hiredWithContractor?.trim() ? (
              <BusinessInfoHoverCard companyName={item.hiredWithContractor}>
                <Badge
                  variant="secondary"
                  className="max-w-[120px] shrink-0 cursor-help truncate text-[10px]"
                  title={item.hiredWithContractor}
                >
                  {item.hiredWithContractor}
                </Badge>
              </BusinessInfoHoverCard>
            ) : (
              <span className="text-muted-foreground text-xs">—</span>
            )}
          </div>
          <div className="flex w-full min-w-0 items-center gap-1 overflow-hidden">
            <span className="shrink-0 text-xs font-medium">Hire Date:</span>
            <span className="truncate text-xs">
              {item.hireDate ? formatUpdatedAt(item.hireDate) : "—"}
            </span>
          </div>
          <div className="flex w-full min-w-0 items-center gap-1 overflow-hidden">
            <span className="shrink-0 text-xs font-medium">Period:</span>
            <span className="truncate text-xs">{item.retentionPeriod ?? "—"}</span>
          </div>
        </button>
      );
    },
  },
  {
    id: "tags",
    header: "Tags",
    accessorKey: "tags",
    sortable: true,
    cell: (item: MondayRecord) => {
      const tagValues = splitCsvValues(item.tags);
      const isCompactTags = tableDensity === "compact";
      return (
        <button
          type="button"
          onClick={() => onOpenTags(item)}
          title={item.tags ?? ""}
          className={`hover:bg-accent/40 w-full cursor-pointer rounded-md text-left ${isCompactTags ? "px-2 py-1" : "p-2"}`}
        >
          {tagValues.length > 0 ? (
            <div className={`flex gap-1 ${isCompactTags ? "min-w-[200px] max-w-[400px] flex-nowrap overflow-hidden" : "max-w-[260px] flex-wrap"}`}>
              {tagValues.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="max-w-full shrink-0 truncate text-[10px]"
                  title={tag}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </button>
      );
    },
  },
  {
    id: "resume",
    header: "Resume",
    accessorKey: "resumeFiles",
    sortable: true,
    cell: (item: MondayRecord) => {
      const firstFile = item.resumeFiles[0] ?? null;
      const isUploading = uploadingResumeByRecordId[item.id] === true;
      const fileHref = firstFile ? getResumeFileHref(firstFile) : null;
      const fileInputId = `resume-upload-${item.id}`;
      return (
        <div className="flex items-center gap-2 px-2 py-1">
          {firstFile ? (
            <button
              type="button"
              onClick={() => {
                onPreviewResume({ record: item, file: firstFile, href: fileHref });
              }}
              className="text-primary hover:text-primary/80 min-w-0 truncate text-xs underline underline-offset-2"
              title={firstFile.name}
            >
              {firstFile.name}
            </button>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
          <input
            id={fileInputId}
            type="file"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void onUploadResume(item, file);
              event.currentTarget.value = "";
            }}
            disabled={isUploading || staticMode}
          />
          {isUploading ? (
            <span className="text-muted-foreground shrink-0 text-[10px]">Uploading…</span>
          ) : (
            <label
              htmlFor={fileInputId}
              className="bg-muted hover:bg-accent text-muted-foreground hover:text-foreground inline-flex shrink-0 cursor-pointer items-center rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors"
            >
              {firstFile ? "Replace" : "Upload"}
            </label>
          )}
        </div>
      );
    },
  },
  {
    id: "createdAt",
    header: "Created at",
    accessorKey: "createdAt",
    sortable: true,
    cell: (item: MondayRecord) => {
      const formatted = formatDateTimeParts(item.createdAt);
      return (
        <div className="leading-tight">
          <div>{formatted.date}</div>
          {formatted.time ? (
            <div className="text-muted-foreground text-xs">{formatted.time}</div>
          ) : null}
        </div>
      );
    },
  },
  {
    id: "updatedAt",
    header: "Updated",
    accessorKey: "updatedAt",
    sortable: true,
    cell: (item: MondayRecord) => {
      const formatted = formatDateTimeParts(item.updatedAt);
      return (
        <div className="leading-tight">
          <div>{formatted.date}</div>
          {formatted.time ? (
            <div className="text-muted-foreground text-xs">{formatted.time}</div>
          ) : null}
        </div>
      );
    },
  },
];

export const buildBoardEntityActions = ({
  featureFlags,
  openSendEmailDialog,
  sessionToken,
  staticMode,
}: {
  featureFlags: MondayFeatureFlags;
  openSendEmailDialog: (record: MondayRecord) => void;
  sessionToken: string | null;
  staticMode: boolean;
}): EntityAction<MondayRecord>[] => [
  {
    id: "open",
    label: "Open",
    icon: <ExternalLink className="h-4 w-4" />,
    variant: "outline",
    onClick: (record) => {
      if (!record.url) return;
      window.open(record.url, "_blank", "noopener,noreferrer");
    },
    isDisabled: (record) => !record.url,
  },
  ...(featureFlags.emailMarketingEnabled
    ? ([
        {
          id: "send-email",
          label: "Send Email",
          icon: <Mail className="h-4 w-4" />,
          variant: "secondary",
          onClick: (record: MondayRecord) => {
            openSendEmailDialog(record);
          },
          isDisabled: (record: MondayRecord) =>
            !record.email || !sessionToken || staticMode,
        },
      ] satisfies EntityAction<MondayRecord>[])
    : []),
];
