"use client";

import * as React from "react";
import type { ColumnDefinition } from "@launchthatapp/ui/entity-list";
import { EntityList } from "@launchthatapp/ui/entity-list";
import { Card, CardContent, CardHeader, CardTitle } from "@launchthatapp/ui/card";

export interface AiThreadRow extends Record<string, unknown> {
  id: string;
  userId: string;
  threadId: string;
  lastMessageSnippet?: string;
  lastMessageRole?: "user" | "assistant";
  totalMessages: number;
  lastMessageAt: number;
  createdAt: number;
}

export interface AiThreadsTableProps {
  threads: AiThreadRow[];
  isLoading?: boolean;
  title?: string;
}

const formatTime = (ms: number) => new Date(ms).toLocaleString();

export const AiThreadsTable = ({
  threads,
  isLoading,
  title = "Conversation threads",
}: AiThreadsTableProps) => {
  const columns = React.useMemo<ColumnDefinition<AiThreadRow>[]>(
    () => [
      {
        id: "userId",
        header: "User / Visitor",
        accessorKey: "userId",
        cell: (row: AiThreadRow) => (
          <span className="font-mono text-xs">{row.userId}</span>
        ),
      },
      {
        id: "threadId",
        header: "Thread",
        accessorKey: "threadId",
        cell: (row: AiThreadRow) => (
          <span className="font-mono text-xs">{row.threadId}</span>
        ),
      },
      {
        id: "lastMessage",
        header: "Last Message",
        accessorKey: "lastMessageSnippet",
        cell: (row: AiThreadRow) => (
          <div className="max-w-[280px] space-y-0.5">
            <span className="text-muted-foreground text-[10px] uppercase">
              {row.lastMessageRole ?? "—"}
            </span>
            <p className="truncate text-xs">
              {row.lastMessageSnippet || "—"}
            </p>
          </div>
        ),
      },
      {
        id: "totalMessages",
        header: "Messages",
        accessorKey: "totalMessages",
        cell: (row: AiThreadRow) => row.totalMessages.toLocaleString(),
      },
      {
        id: "lastMessageAt",
        header: "Last Activity",
        accessorKey: "lastMessageAt",
        cell: (row: AiThreadRow) => (
          <span className="text-muted-foreground text-xs">
            {formatTime(row.lastMessageAt)}
          </span>
        ),
      },
      {
        id: "createdAt",
        header: "Created",
        accessorKey: "createdAt",
        cell: (row: AiThreadRow) => (
          <span className="text-muted-foreground text-xs">
            {formatTime(row.createdAt)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b p-4">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <EntityList<AiThreadRow>
          data={threads}
          columns={columns}
          isLoading={isLoading}
          defaultViewMode="list"
          viewModes={[]}
          enableSearch
          getRowId={(row) => row.id}
          emptyState={
            <div className="text-muted-foreground text-sm">
              No conversation threads yet.
            </div>
          }
        />
      </CardContent>
    </Card>
  );
};
