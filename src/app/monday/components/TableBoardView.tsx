"use client";

import type { ColumnDefinition, EntityAction } from "@launchthatapp/ui/entity-list";
import type { CSSProperties } from "react";

import type { MondayRecord } from "../types";
import { BoardTable } from "./BoardTable";

type TableBoardViewProps = {
  records: MondayRecord[];
  columns: ColumnDefinition<MondayRecord>[];
  isLoading: boolean;
  entityActions: EntityAction<MondayRecord>[];
  initialSortId?: "createdAt" | "lastTouchpointAt";
  placeholderRowCount?: number;
  shouldAutoLoadMore: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  fillHeight?: boolean;
  scrollbarStyle?: CSSProperties;
  renderBulkActionsBar: (selectedItems: MondayRecord[], clearSelection: () => void) => React.ReactNode;
};

export const TableBoardView = ({
  records,
  columns,
  isLoading,
  entityActions,
  initialSortId = "createdAt",
  placeholderRowCount = 0,
  shouldAutoLoadMore,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  fillHeight = false,
  scrollbarStyle,
  renderBulkActionsBar,
}: TableBoardViewProps) => {
  return (
    <BoardTable
      data={records}
      columns={columns}
      isLoading={isLoading}
      placeholderRowCount={placeholderRowCount}
      initialSort={{ id: initialSortId, direction: "desc" }}
      getRowId={(item) => item.id}
      entityActions={entityActions}
      enableInfiniteScroll={shouldAutoLoadMore}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={onLoadMore}
      fillHeight={fillHeight}
      scrollbarStyle={scrollbarStyle}
      bulkActions={({ selectedItems, clearSelection }) => {
        return renderBulkActionsBar(selectedItems, clearSelection);
      }}
    />
  );
};
