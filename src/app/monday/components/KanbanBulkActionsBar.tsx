"use client";

import { Button } from "@launchthatapp/ui/button";

export const KanbanBulkActionsBar = ({
  selectedCount,
  selectedStepLabel,
  isMoving,
  onMoveForward,
  onClear,
}: {
  selectedCount: number;
  selectedStepLabel: string;
  isMoving: boolean;
  onMoveForward: () => void;
  onClear: () => void;
}) => {
  if (selectedCount <= 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background/90 px-3 py-2">
      <p className="text-muted-foreground text-xs">
        {selectedCount} selected in {selectedStepLabel}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={isMoving}
          onClick={onMoveForward}
        >
          {isMoving ? "Moving..." : "Move Forward"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onClear}
          disabled={isMoving}
        >
          Clear
        </Button>
      </div>
    </div>
  );
};
