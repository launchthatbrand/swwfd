"use client";

import { Button } from "@launchthatapp/ui/button";
import { Input } from "@launchthatapp/ui/input";

import type { MondayRoutingStatus } from "../../../types";

export type RoutingTabProps = {
  routingStatus: MondayRoutingStatus | undefined;
  isLoadingRoutingStatus: boolean;
  isFetchingRoutingStatus: boolean;
  routingStatusError: Error | null;
  routingRerunItemId: string;
  onRoutingRerunItemIdChange: (value: string) => void;
  isRunningRoutingRerun: boolean;
  onRefreshRoutingStatus: () => void | Promise<void>;
  onRunRoutingRerun: () => void | Promise<void>;
};

export const RoutingTab = ({
  routingStatus,
  isLoadingRoutingStatus,
  isFetchingRoutingStatus,
  routingStatusError,
  routingRerunItemId,
  onRoutingRerunItemIdChange,
  isRunningRoutingRerun,
  onRefreshRoutingStatus,
  onRunRoutingRerun,
}: RoutingTabProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">User {"<->"} Zipcode map</p>
        <p className="text-muted-foreground text-sm">
          Configure and monitor district routing for newly created contact
          records.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-md border-2 border-border/70 bg-card/60 p-3 shadow-sm">
          <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
            Routing Status
          </p>
          <p className="mt-1 text-sm font-medium">
            {isLoadingRoutingStatus
              ? "Loading..."
              : routingStatus?.enabled
                ? routingStatus.ok
                  ? "Configured"
                  : "Configured with issues"
                : "Not configured"}
          </p>
        </div>
        <div className="rounded-md border-2 border-border/70 bg-card/60 p-3 shadow-sm">
          <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
            County Mappings
          </p>
          <p className="mt-1 text-sm font-medium">
            {routingStatus?.countyMappingsCount ?? 0}
          </p>
        </div>
        <div className="rounded-md border-2 border-border/70 bg-card/60 p-3 shadow-sm">
          <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
            District Owner Mappings
          </p>
          <p className="mt-1 text-sm font-medium">
            {routingStatus?.districtOwnerMappingsCount ?? 0}
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-md border-2 border-border/70 bg-muted/20 p-4 shadow-sm">
        <p className="text-sm font-medium">Routing boards</p>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-md border border-border/60 bg-background/80 p-3">
            <p className="text-xs font-semibold uppercase">Contact board</p>
            <p className="text-muted-foreground mt-1 break-all text-xs">
              {routingStatus?.contactBoardId ?? "Not configured"}
            </p>
            {routingStatus?.contactBoardUrl ? (
              <Button asChild size="sm" variant="outline" className="mt-2 h-7 text-xs">
                <a
                  href={routingStatus.contactBoardUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open board
                </a>
              </Button>
            ) : null}
          </div>
          <div className="rounded-md border border-border/60 bg-background/80 p-3">
            <p className="text-xs font-semibold uppercase">
              County {"->"} District board
            </p>
            <p className="text-muted-foreground mt-1 break-all text-xs">
              {routingStatus?.countyBoardId ?? "Not configured"}
            </p>
            {routingStatus?.countyBoardUrl ? (
              <Button asChild size="sm" variant="outline" className="mt-2 h-7 text-xs">
                <a
                  href={routingStatus.countyBoardUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open board
                </a>
              </Button>
            ) : null}
          </div>
          <div className="rounded-md border border-border/60 bg-background/80 p-3">
            <p className="text-xs font-semibold uppercase">
              District {"->"} Owner board
            </p>
            <p className="text-muted-foreground mt-1 break-all text-xs">
              {routingStatus?.districtBoardId ?? "Not configured"}
            </p>
            {routingStatus?.districtBoardUrl ? (
              <Button asChild size="sm" variant="outline" className="mt-2 h-7 text-xs">
                <a
                  href={routingStatus.districtBoardUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open board
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-2 rounded-md border-2 border-border/70 bg-background/80 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Routing diagnostics</p>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => {
              void onRefreshRoutingStatus();
            }}
            disabled={isFetchingRoutingStatus}
          >
            {isFetchingRoutingStatus ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
        {routingStatusError ? (
          <p className="text-destructive text-xs">
            {routingStatusError.message}
          </p>
        ) : null}
        {(routingStatus?.issues ?? []).length > 0 ? (
          <ul className="list-disc space-y-1 pl-4 text-xs">
            {(routingStatus?.issues ?? []).map((issue) => (
              <li key={issue} className="text-destructive">
                {issue}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-xs">
            No routing issues detected.
          </p>
        )}
      </div>

      <div className="space-y-3 rounded-md border-2 border-primary/30 bg-primary/5 p-4 shadow-sm">
        <div className="space-y-1">
          <p className="text-sm font-medium">Manual rerun</p>
          <p className="text-muted-foreground text-xs">
            Re-run owner assignment for one contact item id.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={routingRerunItemId}
            onChange={(event) => onRoutingRerunItemIdChange(event.target.value)}
            placeholder="Item ID"
            className="h-8 w-full max-w-xs border-2 bg-background/95 text-sm shadow-sm"
          />
          <Button
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={() => {
              void onRunRoutingRerun();
            }}
            disabled={isRunningRoutingRerun}
          >
            {isRunningRoutingRerun ? "Running..." : "Run assignment"}
          </Button>
        </div>
      </div>
    </div>
  );
};
