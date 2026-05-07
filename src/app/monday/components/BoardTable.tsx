"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Checkbox } from "@launchthatapp/ui/checkbox";
import { ScrollArea, ScrollBar } from "@launchthatapp/ui/scroll-area";
import type { ColumnDefinition, EntityAction } from "@launchthatapp/ui/entity-list";
import type { MondayRecord } from "../types";

interface BoardTableProps {
  data: MondayRecord[];
  columns: ColumnDefinition<MondayRecord>[];
  isLoading?: boolean;
  entityActions?: EntityAction<MondayRecord>[];
  initialSort?: { id: string; direction: "asc" | "desc" };
  getRowId?: (item: MondayRecord) => string;
  bulkActions?: (ctx: {
    selectedItems: MondayRecord[];
    clearSelection: () => void;
  }) => React.ReactNode;
  enableInfiniteScroll?: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
}

const renderCell = (
  column: ColumnDefinition<MondayRecord>,
  row: MondayRecord,
) => {
  if (!column.cell) {
    return column.accessorKey
      ? String(row[column.accessorKey as keyof MondayRecord] ?? "")
      : "";
  }
  try {
    return (column.cell as (item: MondayRecord) => React.ReactNode)(row);
  } catch {
    return (
      column.cell as (ctx: {
        row: { original: MondayRecord };
      }) => React.ReactNode
    )({ row: { original: row } });
  }
};

export const BoardTable = ({
  data,
  columns,
  isLoading,
  entityActions,
  initialSort,
  getRowId,
  bulkActions,
  enableInfiniteScroll = false,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
}: BoardTableProps) => {
  const [sort, setSort] = React.useState(initialSort ?? null);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const scrollViewportRef = React.useRef<HTMLElement | null>(null);
  const [scrollHeight, setScrollHeight] = React.useState("70vh");

  const rowId = React.useCallback(
    (item: MondayRecord) => (getRowId ? getRowId(item) : item.id),
    [getRowId],
  );

  // Measure available height: from the top of this component to the bottom of the viewport
  React.useEffect(() => {
    const measure = () => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const available = window.innerHeight - rect.top - 16;
      setScrollHeight(`${Math.max(available, 200)}px`);
    };
    measure();
    window.addEventListener("resize", measure);
    // Re-measure after a short delay to account for layout shifts
    const timer = setTimeout(measure, 100);
    return () => {
      window.removeEventListener("resize", measure);
      clearTimeout(timer);
    };
  }, []);

  const maybeLoadMore = React.useCallback(() => {
    if (!enableInfiniteScroll || !hasNextPage || isFetchingNextPage || !onLoadMore) return;
    const viewport = scrollViewportRef.current;
    if (!viewport) return;
    const distanceFromBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    if (distanceFromBottom > 160) return;
    onLoadMore();
  }, [enableInfiniteScroll, hasNextPage, isFetchingNextPage, onLoadMore]);

  React.useEffect(() => {
    const root = wrapperRef.current;
    if (!root || !enableInfiniteScroll || !onLoadMore) return;
    const viewport = root.querySelector(
      "[data-radix-scroll-area-viewport]",
    ) as HTMLElement | null;
    if (!viewport) return;
    scrollViewportRef.current = viewport;
    const handleScroll = () => maybeLoadMore();
    viewport.addEventListener("scroll", handleScroll, { passive: true });
    const initialCheckTimer = window.setTimeout(maybeLoadMore, 0);

    return () => {
      window.clearTimeout(initialCheckTimer);
      viewport.removeEventListener("scroll", handleScroll);
      if (scrollViewportRef.current === viewport) {
        scrollViewportRef.current = null;
      }
    };
  }, [enableInfiniteScroll, maybeLoadMore, onLoadMore, data.length]);

  const sortedData = React.useMemo(() => {
    if (!sort) return data;
    const col = columns.find((c) => c.id === sort.id);
    if (!col?.accessorKey) return data;
    const key = col.accessorKey as keyof MondayRecord;
    return [...data].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (av === bv) return 0;
      const cmp =
        av == null
          ? -1
          : bv == null
            ? 1
            : typeof av === "string"
              ? av.localeCompare(String(bv))
              : Number(av) - Number(bv);
      return sort.direction === "asc" ? cmp : -cmp;
    });
  }, [data, columns, sort]);

  const selectedItems = React.useMemo(
    () => data.filter((item) => selectedIds.has(rowId(item))),
    [data, selectedIds, rowId],
  );

  const allSelected =
    data.length > 0 && data.every((item) => selectedIds.has(rowId(item)));
  const someSelected = !allSelected && selectedIds.size > 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map(rowId)));
    }
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = React.useCallback(() => setSelectedIds(new Set()), []);

  const handleSort = (colId: string) => {
    const col = columns.find((c) => c.id === colId);
    if (!col?.sortable) return;
    setSort((prev) => {
      if (prev?.id === colId) {
        return { id: colId, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { id: colId, direction: "asc" };
    });
  };

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="h-10 w-11 px-2" />
              {columns.map((col) => (
                <th key={col.id} className="h-10 px-2 text-left font-medium">
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b">
                <td className="px-2 py-3"><div className="h-4 w-4 animate-pulse rounded bg-muted" /></td>
                {columns.map((col) => (
                  <td key={col.id} className="px-2 py-3">
                    <div className="h-5 w-full animate-pulse rounded bg-muted" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const totalCols = 1 + columns.length + (entityActions?.length ? 1 : 0);

  return (
    <div ref={wrapperRef}>
      {bulkActions && selectedItems.length > 0 && (
        <div className="bg-muted/40 border-input mb-2 flex items-center justify-between gap-3 rounded-md border px-3 py-2">
          {bulkActions({ selectedItems, clearSelection })}
        </div>
      )}

      <ScrollArea className="rounded-md border" style={{ height: scrollHeight }}>
        <table className="w-full min-w-max border-collapse text-sm">
          <thead className="bg-background sticky top-0 z-20">
            <tr className="border-b">
              <th className="bg-background h-10 w-11 border-r border-border px-2 text-center shadow-[0_1px_3px_-2px_rgba(0,0,0,0.12)]">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </th>
              {columns.map((col, ci) => {
                const isLast = ci === columns.length - 1;
                return (
                  <th
                    key={col.id}
                    className={`bg-background h-10 px-2 text-left align-middle font-medium whitespace-nowrap shadow-[0_1px_3px_-2px_rgba(0,0,0,0.12)] ${isLast ? "" : "border-r border-border"}`}
                    style={col.minWidth ? { minWidth: col.minWidth } : undefined}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        onClick={() => handleSort(col.id)}
                      >
                        <span>{col.header}</span>
                        {sort?.id === col.id ? (
                          sort.direction === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
              {entityActions && entityActions.length > 0 && (
                <th className="bg-background h-10 px-2 text-right font-medium shadow-[0_1px_3px_-2px_rgba(0,0,0,0.12)]">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={totalCols}
                  className="h-24 text-center text-muted-foreground"
                >
                  No results.
                </td>
              </tr>
            ) : (
              sortedData.map((row) => {
                const id = rowId(row);
                const selected = selectedIds.has(id);
                return (
                  <tr
                    key={id}
                    data-record-id={id}
                    data-state={selected ? "selected" : undefined}
                    className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                  >
                    <td className="w-11 border-r border-border px-2 text-center">
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() => toggleRow(id)}
                        aria-label={`Select row ${id}`}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      />
                    </td>
                    {columns.map((col, ci) => {
                      const isLast = ci === columns.length - 1;
                      return (
                        <td
                          key={col.id}
                          className={`p-0 align-middle ${isLast ? "" : "border-r border-border"}`}
                          style={col.minWidth ? { minWidth: col.minWidth } : undefined}
                        >
                          {renderCell(col, row)}
                        </td>
                      );
                    })}
                    {entityActions && entityActions.length > 0 && (
                      <td className="px-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {entityActions.map((action) => {
                            const disabled =
                              typeof action.isDisabled === "function"
                                ? action.isDisabled(row)
                                : action.isDisabled;
                            return (
                              <button
                                key={action.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  action.onClick(row);
                                }}
                                disabled={disabled}
                                className="rounded p-1 hover:bg-muted disabled:opacity-40"
                                title={
                                  typeof action.label === "function"
                                    ? action.label(row)
                                    : action.label
                                }
                              >
                                {action.icon}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
