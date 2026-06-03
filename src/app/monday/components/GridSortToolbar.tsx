"use client";

import type { GridSortField, GridSortState } from "../types";

export const GridSortToolbar = ({
  gridSort,
  options,
  onFieldChange,
  onToggleDirection,
}: {
  gridSort: GridSortState;
  options: Array<{ value: GridSortField; label: string }>;
  onFieldChange: (field: GridSortField) => void;
  onToggleDirection: () => void;
}) => {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-background/80 px-2 py-1.5">
      <span className="text-muted-foreground shrink-0 text-[11px] font-medium tracking-wide uppercase">
        Grid Sort
      </span>
      <select
        value={gridSort.field}
        onChange={(event) => {
          onFieldChange(event.target.value as GridSortField);
        }}
        className="bg-background border-input h-7 rounded-md border px-2 text-xs shadow-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="bg-background border-input hover:bg-accent h-7 rounded-md border px-2 text-xs font-medium transition-colors"
        onClick={onToggleDirection}
        title="Toggle sort direction"
      >
        {gridSort.direction === "asc" ? "Asc" : "Desc"}
      </button>
    </div>
  );
};
