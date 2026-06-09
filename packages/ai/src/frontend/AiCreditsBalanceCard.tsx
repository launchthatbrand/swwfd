"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@launchthatapp/ui/card";
import { Button } from "@launchthatapp/ui/button";
import { Badge } from "@launchthatapp/ui/badge";

export type AiCreditsBalance = {
  periodKey: string;
  granted: number;
  spent: number;
  remaining: number;
};

export type AiCreditsBalanceCardProps = {
  title?: string;
  balance?: AiCreditsBalance | null;
  isLoading?: boolean;
  actionLabel?: string;
  actionHref?: string;
};

export const AiCreditsBalanceCard = ({
  title = "AI credits",
  balance,
  isLoading,
  actionLabel = "Buy more credits",
  actionHref = "/platform/billing",
}: AiCreditsBalanceCardProps) => {
  const granted = balance?.granted ?? 0;
  const spent = balance?.spent ?? 0;
  const remaining = balance?.remaining ?? 0;
  const utilizationPct =
    granted > 0 ? Math.min(100, Math.round((spent / granted) * 100)) : 0;

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
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary">
                Remaining: {remaining.toLocaleString()} tokens
              </Badge>
              <Badge variant="outline">
                Used: {spent.toLocaleString()} / {granted.toLocaleString()}
              </Badge>
              <Badge variant="outline">{utilizationPct}% used</Badge>
            </div>
            <div className="text-muted-foreground text-xs">
              Period: {balance?.periodKey ?? "—"}
            </div>
          </>
        )}
        <div>
          <Button asChild size="sm">
            <a href={actionHref}>{actionLabel}</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
