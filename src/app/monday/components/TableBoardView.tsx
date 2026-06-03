"use client";

import type { ColumnDefinition, EntityAction } from "@launchthatapp/ui/entity-list";

import type { MondayRecord } from "../types";
import { BoardTable } from "./BoardTable";

type TableBoardViewProps = {
  records: MondayRecord[];
  columns: ColumnDefinition<MondayRecord>[];
  isLoading: boolean;
  entityActions: EntityAction<MondayRecord>[];
  shouldAutoLoadMore: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  renderBulkActionsBar: (selectedItems: MondayRecord[], clearSelection: () => void) => React.ReactNode;
};

export const TableBoardView = ({
  records,
  columns,
  isLoading,
  entityActions,
  shouldAutoLoadMore,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  renderBulkActionsBar,
}: TableBoardViewProps) => {
  return (
    <BoardTable
      data={records}
      columns={columns}
      isLoading={isLoading}
      initialSort={{ id: "createdAt", direction: "desc" }}
      getRowId={(item) => item.id}
      entityActions={entityActions}
      enableInfiniteScroll={shouldAutoLoadMore}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={onLoadMore}
      bulkActions={({ selectedItems, clearSelection }) => {
        return renderBulkActionsBar(selectedItems, clearSelection);
      }}
    />
  );
};
