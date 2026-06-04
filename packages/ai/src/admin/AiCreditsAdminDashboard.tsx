"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@launchthatapp/ui/card";
import { Badge } from "@launchthatapp/ui/badge";
import { Separator } from "@launchthatapp/ui/separator";

export type AiCreditsAdminSummary = {
  periodKey: string;
  totalGranted: number;
  totalSpent: number;
  totalRemaining: number;
  usersTracked: number;
  usersAtLimit: number;
  usersNearLimit: number;
  totalCostUsd?: number;
  totalUserCostUsd?: number;
};

export type AiCreditsAdminDashboardProps = {
  summary?: AiCreditsAdminSummary | null;
  isLoading?: boolean;
  title?: string;
};

export const AiCreditsAdminDashboard = ({
  summary,
  isLoading,
  title = "AI usage",
}: AiCreditsAdminDashboardProps) => {
  const granted = summary?.totalGranted ?? 0;
  const spent = summary?.totalSpent ?? 0;
  const remaining = summary?.totalRemaining ?? 0;
  const utilizationPct =
    granted > 0 ? Math.min(100, Math.round((spent / granted) * 100)) : 0;
  const costUsd =
    typeof summary?.totalCostUsd === "number" ? summary.totalCostUsd : null;
  const userCostUsd =
    typeof summary?.totalUserCostUsd === "number" ? summary.totalUserCostUsd : null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b p-4">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {isLoading ? (
          <div className="text-muted-foreground text-sm">Loading…</div>
        ) : (
          <>
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline">
                Period: {summary?.periodKey ?? "—"}
              </Badge>
              <Badge variant="secondary">
                Users tracked: {summary?.usersTracked ?? 0}
              </Badge>
              <Badge variant="outline">
                At limit: {summary?.usersAtLimit ?? 0}
              </Badge>
              <Badge variant="outline">
                Near limit: {summary?.usersNearLimit ?? 0}
              </Badge>
            </div>

            <Separator />

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground text-xs">
                  Total granted
                </div>
                <div className="text-lg font-semibold">
                  {granted.toLocaleString()}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground text-xs">
                  Total spent
                </div>
                <div className="text-lg font-semibold">
                  {spent.toLocaleString()}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground text-xs">
                  Remaining
                </div>
                <div className="text-lg font-semibold">
                  {remaining.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="text-muted-foreground text-xs">
              Utilization: {utilizationPct}%
            </div>

            {(costUsd !== null || userCostUsd !== null) && (
              <>
                <Separator />
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-md border p-3">
                    <div className="text-muted-foreground text-xs">
                      Total cost (USD)
                    </div>
                    <div className="text-lg font-semibold">
                      {costUsd?.toFixed(6) ?? "—"}
                    </div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-muted-foreground text-xs">
                      Total user cost (USD)
                    </div>
                    <div className="text-lg font-semibold">
                      {userCostUsd?.toFixed(6) ?? "—"}
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
