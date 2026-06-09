"use client";

import type { ApprovalStepConfig, KanbanMoveConfirmation, MondayRecord } from "../types";
import { KanbanBoard } from "./KanbanBoard";
import { KanbanBulkActionsBar } from "./KanbanBulkActionsBar";

type KanbanBoardViewProps = {
  records: MondayRecord[];
  approvalSteps: ApprovalStepConfig[];
  isLoading: boolean;
  selectedCrossViewRecords: MondayRecord[];
  selectedKanbanStepIndex: number | null;
  selectedRecordIds: Set<string>;
  isExecutingKanbanMove: boolean;
  onKanbanBulkMoveForward: () => void;
  onClearCrossViewSelection: () => void;
  onKanbanMoveRequest: (confirmation: KanbanMoveConfirmation) => void;
  onRecordClick: (record: MondayRecord) => void;
  onHelpDesk: (record: MondayRecord) => void;
  onToggleKanbanRecordSelection: (record: MondayRecord) => void;
};

export const KanbanBoardView = ({
  records,
  approvalSteps,
  isLoading,
  selectedCrossViewRecords,
  selectedKanbanStepIndex,
  selectedRecordIds,
  isExecutingKanbanMove,
  onKanbanBulkMoveForward,
  onClearCrossViewSelection,
  onKanbanMoveRequest,
  onRecordClick,
  onHelpDesk,
  onToggleKanbanRecordSelection,
}: KanbanBoardViewProps) => {
  return (
    <>
      <KanbanBulkActionsBar
        selectedCount={selectedCrossViewRecords.length}
        selectedStepLabel={
          selectedKanbanStepIndex === null
            ? "this column"
            : (approvalSteps[selectedKanbanStepIndex - 1]?.title ?? `Step ${selectedKanbanStepIndex}`)
        }
        isMoving={isExecutingKanbanMove}
        onMoveForward={onKanbanBulkMoveForward}
        onClear={onClearCrossViewSelection}
      />
      <KanbanBoard
        records={records}
        approvalSteps={approvalSteps}
        isLoading={isLoading}
        onMoveRequest={onKanbanMoveRequest}
        onRecordClick={onRecordClick}
        onHelpDesk={onHelpDesk}
        selectedRecordIds={selectedRecordIds}
        onToggleSelectRecord={onToggleKanbanRecordSelection}
      />
    </>
  );
};
