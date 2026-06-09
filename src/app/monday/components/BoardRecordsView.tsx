"use client";

import type { ColumnDefinition, EntityAction } from "@launchthatapp/ui/entity-list";
import type { ReactNode } from "react";

import type { ApprovalStepConfig, KanbanMoveConfirmation, MondayRecord, UserBoardDisplayMode } from "../types";
import { GridBoardView } from "./GridBoardView";
import { KanbanBoardView } from "./KanbanBoardView";
import { TableBoardView } from "./TableBoardView";

export const BoardRecordsView = ({
  displayMode,
  isTouchScopedView,
  filteredRecords,
  sortedGridRecords,
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
  onToggleGridRecordSelection,
  renderBulkActionsBar,
  columns,
  entityActions,
  shouldAutoLoadMore,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: {
  displayMode: UserBoardDisplayMode;
  isTouchScopedView: boolean;
  filteredRecords: MondayRecord[];
  sortedGridRecords: MondayRecord[];
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
  onToggleGridRecordSelection: (record: MondayRecord) => void;
  renderBulkActionsBar: (selectedItems: MondayRecord[], clearSelection: () => void) => ReactNode;
  columns: ColumnDefinition<MondayRecord>[];
  entityActions: EntityAction<MondayRecord>[];
  shouldAutoLoadMore: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}) => {
  if (displayMode === "kanban") {
    return (
      <KanbanBoardView
        records={filteredRecords}
        approvalSteps={approvalSteps}
        isLoading={isLoading}
        selectedCrossViewRecords={selectedCrossViewRecords}
        selectedKanbanStepIndex={selectedKanbanStepIndex}
        selectedRecordIds={selectedRecordIds}
        isExecutingKanbanMove={isExecutingKanbanMove}
        onKanbanBulkMoveForward={onKanbanBulkMoveForward}
        onClearCrossViewSelection={onClearCrossViewSelection}
        onKanbanMoveRequest={onKanbanMoveRequest}
        onRecordClick={onRecordClick}
        onHelpDesk={onHelpDesk}
        onToggleKanbanRecordSelection={onToggleKanbanRecordSelection}
      />
    );
  }

  if (isTouchScopedView && displayMode === "grid") {
    return (
      <GridBoardView
        records={sortedGridRecords}
        approvalSteps={approvalSteps}
        isLoading={isLoading}
        selectedRecordIds={selectedRecordIds}
        selectedCrossViewRecords={selectedCrossViewRecords}
        onRecordClick={onRecordClick}
        onHelpDesk={onHelpDesk}
        onToggleGridRecordSelection={onToggleGridRecordSelection}
        onClearCrossViewSelection={onClearCrossViewSelection}
        renderBulkActionsBar={renderBulkActionsBar}
      />
    );
  }

  return (
    <TableBoardView
      records={filteredRecords}
      columns={columns}
      isLoading={isLoading}
      entityActions={entityActions}
      shouldAutoLoadMore={shouldAutoLoadMore}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={onLoadMore}
      renderBulkActionsBar={renderBulkActionsBar}
    />
  );
};
