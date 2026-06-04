"use client";

import * as React from "react";
import { Badge } from "@launchthatapp/ui/badge";
import { Button } from "@launchthatapp/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@launchthatapp/ui/card";
import { Input } from "@launchthatapp/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@launchthatapp/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@launchthatapp/ui/table";

export interface AiLogEntry {
  id: string;
  eventType: string;
  level: string;
  source?: string;
  message: string;
  userId?: string;
  threadId?: string;
  metadata?: unknown;
  createdAt: number;
}

export interface AiLogsTableProps {
  logs: AiLogEntry[];
  isLoading?: boolean;
  title?: string;
  typeOptions?: Array<{ value: string; label: string }>;
}

const DEFAULT_TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "request.start", label: "Request start" },
  { value: "request.error", label: "Request error" },
  { value: "response.complete", label: "Response complete" },
  { value: "response.fallback", label: "Response fallback" },
  { value: "tool.call", label: "Tool call" },
  { value: "tool.result", label: "Tool result" },
  { value: "tool.error", label: "Tool error" },
  { value: "credits.blocked", label: "Credits blocked" },
  { value: "auth.missing_api_key", label: "Missing API key" },
];

const formatTime = (ms: number) => new Date(ms).toLocaleString();

const levelVariant = (level: string) => {
  switch (level) {
    case "error":
      return "destructive" as const;
    case "warn":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
};

export const AiLogsTable = ({
  logs,
  isLoading,
  title = "AI logs",
  typeOptions = DEFAULT_TYPE_OPTIONS,
}: AiLogsTableProps) => {
  const [type, setType] = React.useState("all");
  const [userId, setUserId] = React.useState("");
  const [threadId, setThreadId] = React.useState("");

  const filtered = React.useMemo(() => {
    let result = logs;
    if (type !== "all") {
      result = result.filter((entry) => entry.eventType === type);
    }
    if (userId.trim()) {
      const q = userId.trim().toLowerCase();
      result = result.filter((entry) =>
        entry.userId?.toLowerCase().includes(q),
      );
    }
    if (threadId.trim()) {
      const q = threadId.trim().toLowerCase();
      result = result.filter((entry) =>
        entry.threadId?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [logs, type, userId, threadId]);

  const clearFilters = () => {
    setType("all");
    setUserId("");
    setThreadId("");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="text-muted-foreground text-sm">
              Events from the AI subsystem.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Filter by user ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
          <Input
            placeholder="Filter by thread ID"
            value={threadId}
            onChange={(e) => setThreadId(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="text-muted-foreground text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-muted-foreground text-sm">
            No logs found for the current filters.
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Thread</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {formatTime(entry.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={levelVariant(entry.level)}>
                        {entry.level}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{entry.eventType}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[100px] truncate font-mono text-xs">
                      {entry.userId ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[100px] truncate font-mono text-xs">
                      {entry.threadId ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[400px]">
                      <div className="text-xs">{entry.message}</div>
                      {entry.metadata ? (
                        <details className="mt-1">
                          <summary className="text-muted-foreground cursor-pointer text-xs">
                            Details
                          </summary>
                          <pre className="text-muted-foreground mt-1 max-h-40 overflow-auto rounded-md bg-muted/60 p-2 text-[11px]">
                            {JSON.stringify(entry.metadata, null, 2)}
                          </pre>
                        </details>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
