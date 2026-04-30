"use client";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import type { ApprovalStepConfig, MondayRecord } from "../types";
import { getAddressDisplayParts, getDistrictChipClassName, getNameInitials } from "../helpers";
import { ApprovalProgressIndicator } from "./ApprovalProgressIndicator";

export const ContactCard = ({
  record,
  approvalSteps,
  onClick,
}: {
  record: MondayRecord;
  approvalSteps: ApprovalStepConfig[];
  onClick: (record: MondayRecord) => void;
}) => {
  const addressDisplay = getAddressDisplayParts(record.address);
  const owner = record.ownerProfiles[0];
  return (
    <button
      type="button"
      onClick={() => onClick(record)}
      className="hover:border-primary/50 hover:shadow-primary/5 group flex w-full cursor-pointer flex-col gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition-all duration-150 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
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
        {record.statusText ? (
          <span
            className={`inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-xs font-medium ${getDistrictChipClassName(record.statusText)}`}
          >
            {record.statusText}
          </span>
        ) : null}
      </div>

      <ApprovalProgressIndicator
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
    </button>
  );
};
