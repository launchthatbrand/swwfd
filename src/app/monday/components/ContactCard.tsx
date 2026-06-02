"use client";

import { CircleHelp } from "lucide-react";
import { Badge } from "@launchthatapp/ui/badge";
import { Checkbox } from "@launchthatapp/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import type { ApprovalStepConfig, MondayRecord } from "../types";
import {
  formatDateTimeParts,
  getAddressDisplayParts,
  getDistrictChipClassName,
  getLastTouchpointBadgeClassName,
  getLastTouchpointRecency,
  getNameInitials,
} from "../helpers";
import { ApprovalProgressIndicator } from "./ApprovalProgressIndicator";

export const ContactCard = ({
  record,
  approvalSteps,
  onClick,
  onHelpDesk,
  selectable,
  selected,
  onToggleSelect,
}: {
  record: MondayRecord;
  approvalSteps: ApprovalStepConfig[];
  onClick: (record: MondayRecord) => void;
  onHelpDesk?: (record: MondayRecord) => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (record: MondayRecord) => void;
}) => {
  const addressDisplay = getAddressDisplayParts(record.address);
  const owner = record.ownerProfiles[0];
  const hasResumeAttached = record.resumeFiles.length > 0;
  const lastTouchpointRecency = getLastTouchpointRecency(record.lastTouchpointAt ?? null);
  const lastTouchpointParts = formatDateTimeParts(lastTouchpointRecency.parsedAt);
  return (
    <div
      role="button"
      tabIndex={0}
      data-record-id={record.id}
      onClick={() => onClick(record)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick(record);
        }
      }}
      className={`hover:border-primary/50 hover:shadow-primary/5 group flex w-full cursor-pointer flex-col gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition-all duration-150 hover:shadow-md ${selected ? "ring-primary border-primary/60 ring-2" : ""}`}
    >
      <div className="flex items-start gap-3">
        {selectable ? (
          <div
            className="mr-1 mt-0.5"
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <Checkbox
              checked={!!selected}
              onCheckedChange={() => onToggleSelect?.(record)}
              aria-label={`Select ${record.name}`}
            />
          </div>
        ) : null}
        <Avatar className="size-10 shrink-0">
          <AvatarFallback className="text-sm font-semibold">
            {getNameInitials(record.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">{record.name}</p>
          {record.email ? (
            <p className="text-muted-foreground truncate text-xs">{record.email}</p>
          ) : null}
          {addressDisplay.localityLine ? (
            <p className="truncate text-xs font-medium">{addressDisplay.localityLine}</p>
          ) : null}
        </div>
        {onHelpDesk && (
          <span
            role="button"
            tabIndex={0}
            title="Submit support ticket"
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-primary group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onHelpDesk(record);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                onHelpDesk(record);
              }
            }}
          >
            <CircleHelp className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <div className="flex min-h-6 flex-wrap items-center justify-end gap-1">
          {hasResumeAttached ? (
            <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
              Resume Attached
            </span>
          ) : null}
          {record.statusText ? (
            <span
              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${getDistrictChipClassName(record.statusText)}`}
            >
              {record.statusText}
            </span>
          ) : null}
          <Badge
            variant="outline"
            className={getLastTouchpointBadgeClassName(lastTouchpointRecency.tone)}
            title={
              lastTouchpointRecency.hasTouchpoint
                ? `Last touchpoint: ${lastTouchpointParts.date}${lastTouchpointParts.time ? ` ${lastTouchpointParts.time}` : ""}`
                : "No last touchpoint recorded"
            }
          >
            Last Touch {lastTouchpointRecency.label}
          </Badge>
        </div>

      <ApprovalProgressIndicator
        record={record}
        progressValue={record.batteryProgress}
        steps={approvalSteps}
        rawProgressValue={record.batteryRawValue}
      />

      <div className="flex items-center justify-between gap-2">
        {owner ? (
          <div className="flex items-center gap-1.5">
            <Avatar className="size-5 shrink-0">
              {owner.photoThumb ? (
                <AvatarImage src={owner.photoThumb} alt={owner.name ?? ""} />
              ) : null}
              <AvatarFallback className="text-[10px]">
                {getNameInitials(owner.name ?? owner.id)}
              </AvatarFallback>
            </Avatar>
            <span className="text-muted-foreground truncate text-xs">
              {owner.name ?? owner.id}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">No owner</span>
        )}
        {record.createdAt ? (
          <span className="text-muted-foreground shrink-0 text-xs">
            {new Date(record.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" })}
          </span>
        ) : null}
      </div>
    </div>
  );
};
