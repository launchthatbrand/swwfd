"use client";

import type { ReactNode } from "react";

import type { ApprovalStepConfig, MondayRecord } from "../types";
import { ContactCard } from "./ContactCard";

export const BoardGrid = ({
  records,
  approvalSteps,
  isLoading,
  selectedRecordIds,
  onRecordClick,
  onHelpDesk,
  onToggleSelectRecord,
  bulkActions,
}: {
  records: MondayRecord[];
  approvalSteps: ApprovalStepConfig[];
  isLoading: boolean;
  selectedRecordIds: Set<string>;
  onRecordClick: (record: MondayRecord) => void;
  onHelpDesk: (record: MondayRecord) => void;
  onToggleSelectRecord: (record: MondayRecord) => void;
  bulkActions?: ReactNode;
}) => {
  return (
    <>
      {bulkActions ? (
        <div className="bg-muted/40 border-input mb-2 flex items-center justify-between gap-3 rounded-md border px-3 py-2">
          {bulkActions}
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-xl border bg-muted" />
            ))
          : records.map((record) => (
              <ContactCard
                key={record.id}
                record={record}
                approvalSteps={approvalSteps}
                onClick={onRecordClick}
                onHelpDesk={onHelpDesk}
                selectable
                selected={selectedRecordIds.has(record.id)}
                onToggleSelect={onToggleSelectRecord}
              />
            ))}
      </div>
    </>
  );
};
