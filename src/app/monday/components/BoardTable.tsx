"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Check, Minus } from "lucide-react";
import { ScrollArea, ScrollBar } from "@launchthatapp/ui/scroll-area";
import type { ColumnDefinition, EntityAction } from "@launchthatapp/ui/entity-list";
import type { MondayRecord } from "../types";

interface BoardTableProps {
  data: MondayRecord[];
  columns: ColumnDefinition<MondayRecord>[];
  isLoading?: boolean;
  placeholderRowCount?: number;
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
  fillHeight?: boolean;
  scrollbarStyle?: React.CSSProperties;
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
  placeholderRowCount = 0,
  entityActions,
  initialSort,
  getRowId,
  bulkActions,
  enableInfiniteScroll = false,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
  fillHeight = false,
  scrollbarStyle,
}: BoardTableProps) => {
  const [sort, setSort] = React.useState(initialSort ?? null);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const tableViewportRef = React.useRef<HTMLDivElement | null>(null);
  const tableRef = React.useRef<HTMLTableElement | null>(null);
  const scrollViewportRef = React.useRef<HTMLElement | null>(null);

  const rowId = React.useCallback(
    (item: MondayRecord) => (getRowId ? getRowId(item) : item.id),
    [getRowId],
  );

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
    const viewport =
      tableViewportRef.current ??
      ((wrapperRef.current?.querySelector(
        "[data-radix-scroll-area-viewport]",
      ) as HTMLDivElement | null) ??
        null);
    if (!viewport || !enableInfiniteScroll || !onLoadMore) return;
    tableViewportRef.current = viewport;
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
    const toComparableValue = (value: unknown): number | string | null => {
      if (value == null) return null;
      if (Array.isArray(value)) {
        if (value.length === 0) return "";
        const [first] = value;
        if (typeof first === "string" || typeof first === "number") return first;
        if (
          typeof first === "object" &&
          first &&
          "name" in first &&
          typeof (first as { name?: unknown }).name === "string"
        ) {
          return (first as { name: string }).name;
        }
        return JSON.stringify(first);
      }
      if (typeof value === "number") return value;
      if (typeof value === "boolean") return value ? 1 : 0;
      if (typeof value === "string") return value;
      if (value instanceof Date) return value.getTime();
      return String(value);
    };
    return [...data].sort((a, b) => {
      const av = toComparableValue(a[key]);
      const bv = toComparableValue(b[key]);
      if (av === bv) return 0;
      const cmp =
        av == null
          ? -1
          : bv == null
            ? 1
            : typeof av === "string" && typeof bv === "string"
              ? (() => {
                  const parsedAv = Date.parse(av);
                  const parsedBv = Date.parse(bv);
                  if (!Number.isNaN(parsedAv) && !Number.isNaN(parsedBv)) {
                    return parsedAv - parsedBv;
                  }
                  return av.localeCompare(bv, undefined, { sensitivity: "base" });
                })()
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

  const totalCols = 1 + columns.length + (entityActions?.length ? 1 : 0);
  const selectionCheckboxClassName =
    "inline-flex appearance-none items-center justify-center rounded-[4px] border border-input bg-background p-0 text-foreground leading-none shadow-xs transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";
  const selectionCheckboxStyle: React.CSSProperties = {
    width: 20,
    height: 20,
    minWidth: 20,
    minHeight: 20,
    maxWidth: 20,
    maxHeight: 20,
    aspectRatio: "1 / 1",
    padding: 0,
    lineHeight: 1,
    flex: "0 0 20px",
    boxSizing: "border-box",
  };

  return (
    <div
      ref={wrapperRef}
      className={`flex min-h-0 flex-col ${fillHeight ? "h-full" : ""}`}
    >
      {isLoading ? (
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
              {Array.from({ length: Math.max(5, placeholderRowCount) }).map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="px-2 py-3">
                    <div className="h-4 w-4 animate-pulse rounded bg-muted" />
                  </td>
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
      ) : (
        <>
          {bulkActions && selectedItems.length > 0 && (
            <div className="bg-muted/40 border-input mb-2 flex items-center justify-between gap-3 rounded-md border px-3 py-2">
              {bulkActions({ selectedItems, clearSelection })}
            </div>
          )}

          <ScrollArea
            type="always"
            className="min-h-0 flex-1 rounded-md border [&_[data-slot=scroll-area-thumb]]:bg-[var(--table-scrollbar-color)] [&_[data-slot=scroll-area-scrollbar][data-orientation=vertical]]:w-3 [&_[data-slot=scroll-area-scrollbar][data-orientation=horizontal]]:h-3"
            style={scrollbarStyle}
          >
            <div data-board-table-viewport className="min-h-0">
              <table ref={tableRef} className="w-full min-w-max border-collapse text-sm">
              <thead className="bg-muted sticky top-0 z-20">
                <tr className="border-b">
                  <th className="bg-muted h-10 w-11 border-r border-border px-2 text-center shadow-[0_1px_3px_-2px_rgba(0,0,0,0.12)]">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={allSelected ? "true" : someSelected ? "mixed" : "false"}
                      aria-label="Select all"
                      className={selectionCheckboxClassName}
                      style={selectionCheckboxStyle}
                      onClick={toggleAll}
                    >
                      {allSelected ? (
                        <Check className="size-3.5" />
                      ) : someSelected ? (
                        <Minus className="size-3.5" />
                      ) : null}
                    </button>
                  </th>
                  {columns.map((col, ci) => {
                    const isLast = ci === columns.length - 1;
                    return (
                      <th
                        key={col.id}
                        className={`bg-muted h-10 px-2 text-left align-middle font-medium whitespace-nowrap shadow-[0_1px_3px_-2px_rgba(0,0,0,0.12)] ${isLast ? "" : "border-r border-border"}`}
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
                    <th className="bg-muted h-10 px-2 text-right font-medium shadow-[0_1px_3px_-2px_rgba(0,0,0,0.12)]">
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
                  <>
                    {sortedData.map((row) => {
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
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked={selected ? "true" : "false"}
                              aria-label={`Select row ${id}`}
                              className={selectionCheckboxClassName}
                              style={selectionCheckboxStyle}
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                toggleRow(id);
                              }}
                            >
                              {selected ? <Check className="size-3.5" /> : null}
                            </button>
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
                    })}
                    {placeholderRowCount > 0
                      ? Array.from({ length: placeholderRowCount }).map((_, index) => (
                          <tr key={`placeholder-${index}`} className="border-b" aria-hidden="true">
                            <td className="w-11 border-r border-border px-2 py-3">
                              <div className="h-4 w-4 animate-pulse rounded bg-muted" />
                            </td>
                            {columns.map((col, ci) => {
                              const isLast = ci === columns.length - 1;
                              return (
                                <td
                                  key={`${col.id}-placeholder-${index}`}
                                  className={`px-2 py-3 align-middle ${isLast ? "" : "border-r border-border"}`}
                                  style={col.minWidth ? { minWidth: col.minWidth } : undefined}
                                >
                                  <div className="h-5 w-full animate-pulse rounded bg-muted" />
                                </td>
                              );
                            })}
                            {entityActions && entityActions.length > 0 ? (
                              <td className="px-2 py-3 text-right">
                                <div className="ml-auto h-5 w-16 animate-pulse rounded bg-muted" />
                              </td>
                            ) : null}
                          </tr>
                        ))
                      : null}
                  </>
                )}
              </tbody>
              </table>
            </div>
            <ScrollBar
              orientation="horizontal"
              className="h-3 [--scrollbar-size:1rem]"
            />
          </ScrollArea>
        </>
      )}
    </div>
  );
};
