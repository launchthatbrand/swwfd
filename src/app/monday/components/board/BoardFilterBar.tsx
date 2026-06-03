"use client";

import { Input } from "@launchthatapp/ui/input";

import {
  AdvancedFiltersDialog,
  type AdvancedFiltersDialogProps,
  type BoardFilterSelectOption,
} from "./AdvancedFiltersDialog";

export type { BoardFilterSelectOption };

export type BoardFilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  ownerFilter: string;
  onOwnerFilterChange: (value: string) => void;
  isOwnerFilterEditable: boolean;
  forcedOwnerId: string;
  lockedOwnerLabel: string;
  ownerOptionHasSelectedValue: boolean;
  ownerOptions: BoardFilterSelectOption[];
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  statusOptions: BoardFilterSelectOption[];
  advancedFilters: AdvancedFiltersDialogProps;
};

export const BoardFilterBar = ({
  search,
  onSearchChange,
  ownerFilter,
  onOwnerFilterChange,
  isOwnerFilterEditable,
  forcedOwnerId,
  lockedOwnerLabel,
  ownerOptionHasSelectedValue,
  ownerOptions,
  statusFilter,
  onStatusFilterChange,
  statusOptions,
  advancedFilters,
}: BoardFilterBarProps) => {
  return (
    <>
      <div data-tour="search" className="relative min-w-0 flex-1">
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search (2+ chars)…"
          className="bg-background h-8 w-full text-xs shadow-sm"
        />
        {search.trim().length > 0 && search.trim().length < 2 ? (
          <p className="text-muted-foreground absolute -bottom-4 left-0 text-[10px]">
            2+ chars needed
          </p>
        ) : null}
      </div>

      <div className="bg-border/60 h-5 w-px shrink-0" />

      <div data-tour="filters" className="flex items-center gap-1.5">
        <select
          value={ownerFilter || "__all_owner__"}
          onChange={(event) => {
            if (!isOwnerFilterEditable) return;
            const value = event.target.value;
            onOwnerFilterChange(value === "__all_owner__" ? "" : value);
          }}
          className="bg-background border-input h-8 shrink-0 rounded-md border px-2 text-xs shadow-sm"
          style={{ maxWidth: "160px" }}
          disabled={!isOwnerFilterEditable}
        >
          {isOwnerFilterEditable ? (
            <option value="__all_owner__">Owner: all</option>
          ) : (
            <option value={ownerFilter || forcedOwnerId || "__all_owner__"}>
              {lockedOwnerLabel}
            </option>
          )}
          {!ownerOptionHasSelectedValue && ownerFilter.trim().length > 0 ? (
            <option value={ownerFilter}>{`Owner ${ownerFilter} (selected)`}</option>
          ) : null}
          {ownerOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={statusFilter || "__all_status__"}
          onChange={(event) => {
            const value = event.target.value;
            onStatusFilterChange(value === "__all_status__" ? "" : value);
          }}
          className="bg-background border-input h-8 shrink-0 rounded-md border px-2 text-xs shadow-sm"
          style={{ maxWidth: "150px" }}
        >
          <option value="__all_status__">District: all</option>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <AdvancedFiltersDialog {...advancedFilters} />
    </>
  );
};
