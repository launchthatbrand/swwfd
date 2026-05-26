"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@launchthatapp/ui/tooltip";
import { ApprovalProgressIndicator } from "./ApprovalProgressIndicator";
import { getAddressDisplayParts, getContactTooltipDetails, getNameInitials } from "../helpers";
import type { ApprovalStepConfig, MondayRecord, UserBoardTableDensity } from "../types";

export const NameCellContent = (props: {
  item: MondayRecord;
  tableDensity: UserBoardTableDensity;
  approvalSteps: ApprovalStepConfig[];
  onOpen: () => void;
  hoverPopoversEnabled: boolean;
}) => {
  const { item, tableDensity, approvalSteps, onOpen, hoverPopoversEnabled } = props;
  const [progressHovered, setProgressHovered] = useState(false);
  const details = getContactTooltipDetails(item);
  const addressDisplay = getAddressDisplayParts(item.address);
  const isCompact = tableDensity === "compact";

  const content = (
    <button
      type="button"
      onClick={onOpen}
      className={`hover:bg-accent/40 flex w-full cursor-pointer gap-2.5 rounded-md text-left ${isCompact ? "items-center p-1.5" : "p-2"}`}
    >
      <Avatar className={isCompact ? "size-7 shrink-0" : "mt-0.5 size-9 shrink-0"}>
        <AvatarFallback className="text-xs font-semibold">
          {getNameInitials(item.name)}
        </AvatarFallback>
      </Avatar>
      {isCompact ? (
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex min-w-0 items-baseline gap-1.5 overflow-hidden">
            <span className="shrink-0 truncate font-medium">{item.name}</span>
            <span className="text-muted-foreground truncate text-xs">
              {item.email ?? "—"}
            </span>
          </div>
          <ApprovalProgressIndicator
            progressValue={item.batteryProgress}
            steps={approvalSteps}
            rawProgressValue={item.batteryRawValue}
            className="-mt-2"
            onHoverChange={setProgressHovered}
            hoverPopoversEnabled={hoverPopoversEnabled}
          />
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="space-y-1">
            <span className="block font-medium">{item.name}</span>
            <span className="block truncate text-xs">
              {item.email ?? "No email"}
            </span>
            {addressDisplay.localityLine ? (
              <span className="block text-sm font-semibold text-foreground">
                {addressDisplay.localityLine}
              </span>
            ) : (
              <span className="text-muted-foreground block text-xs">No address</span>
            )}
            <span className="text-muted-foreground block text-xs">
              {item.phone ?? "No phone"}
            </span>
          </div>
          <ApprovalProgressIndicator
            progressValue={item.batteryProgress}
            steps={approvalSteps}
            rawProgressValue={item.batteryRawValue}
            className="-mt-2"
            onHoverChange={setProgressHovered}
            hoverPopoversEnabled={hoverPopoversEnabled}
          />
        </div>
      )}
    </button>
  );

  if (!hoverPopoversEnabled) {
    return content;
  }

  return (
    <Tooltip open={progressHovered ? false : undefined}>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent
        side="right"
        align="start"
        sideOffset={8}
        className="max-w-md border border-slate-200 bg-white p-3 text-slate-900 shadow-lg dark:border-slate-200 dark:bg-white dark:text-slate-900"
      >
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-wide uppercase">
            Contact details
          </p>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {details.map((detail) => (
              <div
                key={`${detail.label}-${detail.value}`}
                className="grid grid-cols-[100px_1fr] gap-2 text-xs"
              >
                <span className="font-bold">{detail.label}</span>
                <span className="wrap-break-word">{detail.value}</span>
              </div>
            ))}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
