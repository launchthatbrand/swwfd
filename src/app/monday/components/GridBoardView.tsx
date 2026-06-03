"use client";

import type { ApprovalStepConfig, MondayRecord } from "../types";
import { BoardGrid } from "./BoardGrid";

type GridBoardViewProps = {
  records: MondayRecord[];
  approvalSteps: ApprovalStepConfig[];
  isLoading: boolean;
  selectedRecordIds: Set<string>;
  selectedCrossViewRecords: MondayRecord[];
  onRecordClick: (record: MondayRecord) => void;
  onHelpDesk: (record: MondayRecord) => void;
  onToggleGridRecordSelection: (record: MondayRecord) => void;
  onClearCrossViewSelection: () => void;
  renderBulkActionsBar: (selectedItems: MondayRecord[], clearSelection: () => void) => React.ReactNode;
};

export const GridBoardView = ({
  records,
  approvalSteps,
  isLoading,
  selectedRecordIds,
  selectedCrossViewRecords,
  onRecordClick,
  onHelpDesk,
  onToggleGridRecordSelection,
  onClearCrossViewSelection,
  renderBulkActionsBar,
}: GridBoardViewProps) => {
  return (
    <BoardGrid
      records={records}
      approvalSteps={approvalSteps}
      isLoading={isLoading}
      selectedRecordIds={selectedRecordIds}
      onRecordClick={onRecordClick}
      onHelpDesk={onHelpDesk}
      onToggleSelectRecord={onToggleGridRecordSelection}
      bulkActions={
        selectedCrossViewRecords.length > 0
          ? renderBulkActionsBar(selectedCrossViewRecords, onClearCrossViewSelection)
          : null
      }
    />
  );
};
