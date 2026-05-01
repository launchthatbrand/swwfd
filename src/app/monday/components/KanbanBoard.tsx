"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BuilderDndProvider,
  DraggableItem,
  DroppableArea,
  DragOverlayPreview,
} from "@launchthatapp/dnd";
import { DragOverlay } from "@dnd-kit/core";
import type { Active, DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import type { ApprovalStepConfig, KanbanMoveConfirmation, MondayRecord } from "../types";
import { buildKanbanColumns, getNameInitials } from "../helpers";
import { ContactCard } from "./ContactCard";

export const KanbanBoard = ({
  records,
  approvalSteps,
  isLoading,
  onMoveRequest,
  onRecordClick,
  onHelpDesk,
}: {
  records: MondayRecord[];
  approvalSteps: ApprovalStepConfig[];
  isLoading: boolean;
  onMoveRequest: (confirmation: KanbanMoveConfirmation) => void;
  onRecordClick: (record: MondayRecord) => void;
  onHelpDesk?: (record: MondayRecord) => void;
}) => {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [columnHeight, setColumnHeight] = useState("calc(100vh - 200px)");

  useEffect(() => {
    const measure = () => {
      if (!boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      const available = window.innerHeight - rect.top - 16;
      setColumnHeight(`${Math.max(available, 200)}px`);
    };
    measure();
    window.addEventListener("resize", measure);
    const timer = setTimeout(measure, 100);
    return () => {
      window.removeEventListener("resize", measure);
      clearTimeout(timer);
    };
  }, []);

  const columns = useMemo(
    () => buildKanbanColumns(records, approvalSteps),
    [records, approvalSteps],
  );

  const recordById = useMemo(() => {
    const map = new Map<string, MondayRecord>();
    for (const record of records) map.set(record.id, record);
    return map;
  }, [records]);

  const columnIndexById = useMemo(() => {
    const map = new Map<string, number>();
    for (const col of columns) map.set(col.id, col.index);
    return map;
  }, [columns]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null);
      const { active, over } = event;
      if (!over) return;

      const record = recordById.get(String(active.id));
      if (!record) return;

      const sourceColumnIndex =
        (active.data.current as { columnIndex?: number } | undefined)?.columnIndex ?? -1;
      const targetColumnId = String(over.id);
      const targetColumnIndex = columnIndexById.get(targetColumnId);

      if (targetColumnIndex === undefined || sourceColumnIndex === targetColumnIndex) return;

      const diff = targetColumnIndex - sourceColumnIndex;
      if (Math.abs(diff) !== 1) return;

      onMoveRequest({
        record,
        fromStepIndex: sourceColumnIndex,
        toStepIndex: targetColumnIndex,
        direction: diff > 0 ? "forward" : "backward",
      });
    },
    [recordById, columnIndexById, onMoveRequest],
  );

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);
  }, []);

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-72 shrink-0 space-y-2 rounded-xl border bg-muted/30 p-3">
            <div className="h-5 w-24 animate-pulse rounded bg-muted" />
            <div className="h-36 animate-pulse rounded-lg bg-muted" />
            <div className="h-36 animate-pulse rounded-lg bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <BuilderDndProvider
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div ref={boardRef} className="flex gap-3 overflow-x-auto pb-4" style={{ height: columnHeight }}>
        {columns.map((column) => (
          <DroppableArea
            key={column.id}
            id={column.id}
            type="kanban-column"
            className="flex w-72 shrink-0 flex-col rounded-xl border bg-muted/20 p-2"
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {column.title}
              </h3>
              <span className="ml-1 shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {column.records.length}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
              {column.records.length === 0 ? (
                <div className="flex h-20 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
                  No records
                </div>
              ) : (
                column.records.map((record) => (
                  <DraggableItem
                    key={record.id}
                    id={record.id}
                    type="kanban-card"
                    data={{ columnIndex: column.index }}
                  >
                    <ContactCard
                      record={record}
                      approvalSteps={approvalSteps}
                      onClick={onRecordClick}
                      onHelpDesk={onHelpDesk}
                    />
                  </DraggableItem>
                ))
              )}
            </div>
          </DroppableArea>
        ))}
      </div>
      <DragOverlay>
        <DragOverlayPreview
          active={activeDragId ? ({ id: activeDragId } as Active) : null}
          resolveItem={(active) => {
            const record = recordById.get(String(active.id));
            if (!record) return null;
            return { id: record.id, label: record.name };
          }}
          renderItem={(item) => (
            <div className="w-68 rounded-lg border bg-card p-3 shadow-lg">
              <p className="truncate text-sm font-medium">{item.label}</p>
            </div>
          )}
        />
      </DragOverlay>
    </BuilderDndProvider>
  );
};
