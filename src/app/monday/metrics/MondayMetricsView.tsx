"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";
import mondaySdkInitialize from "monday-sdk-js";
import type { MondayClientSdk } from "monday-sdk-js";

import { Badge } from "@launchthatapp/ui/badge";
import { Button } from "@launchthatapp/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@launchthatapp/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { toast } from "@launchthatapp/ui/toast";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "~/components/ui/chart";

import {
  MONDAY_DEV_BYPASS_TOKEN,
  isEmbeddedMondaySessionToken,
} from "../constants";
import { readTokenFromLocation, readTokenFromSdkResponse } from "../helpers";
import type {
  MondayIdentity,
  MondayMetricsOwnerBreakdown,
  MondayMetricsResponse,
  MondayMetricsSummary,
  MondayMetricsSummaryTotals,
} from "../types";

interface MondayMetricsViewProps {
  forcedOwnerId?: string;
}

const getCurrentFiscalYear = () => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const fiscalYearEnd = month >= 6 ? year + 1 : year;
  return `FY${String(fiscalYearEnd).slice(-2)}`;
};

const buildFiscalYearOptions = () => {
  const current = getCurrentFiscalYear();
  const currentValue = Number(current.slice(2));
  return [currentValue - 1, currentValue, currentValue + 1].map((value) => {
    const normalized = String(value).padStart(2, "0");
    return `FY${normalized}`;
  });
};

const numberFormatter = new Intl.NumberFormat();

const totalsCards: Array<{ key: keyof MondayMetricsSummaryTotals; label: string }> = [
  { key: "allContacts", label: "Total Contacts" },
  { key: "candidatesGroup", label: "Candidates Group / Training" },
  { key: "reentry", label: "Reentry" },
  { key: "veterans", label: "Veterans" },
  { key: "hiredTotal", label: "Hired" },
  { key: "hiredCandidatesGroup", label: "Hired - Candidates Group" },
  { key: "hiredReentry", label: "Hired - Reentry" },
  { key: "hiredVeterans", label: "Hired - Veterans" },
];

const contactsChartConfig = {
  allContacts: {
    label: "All Contacts",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

const hiredChartConfig = {
  hiredTotal: {
    label: "Hired",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const ownerChartConfig = {
  allContacts: {
    label: "Contacts",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

const MetricsCardGrid = ({ summary }: { summary: MondayMetricsSummary }) => {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {totalsCards.map((card) => (
        <Card key={card.key}>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              {summary.fiscalYear} - {card.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {numberFormatter.format(summary.totals[card.key])}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const OwnerBreakdownChart = ({ rows }: { rows: MondayMetricsOwnerBreakdown[] }) => {
  const topRows = rows.slice(0, 10);
  if (topRows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Owner Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          No owner-level records found for this period.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top Owners by Contacts</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={ownerChartConfig} className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topRows}
              layout="vertical"
              margin={{ top: 8, right: 12, bottom: 8, left: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="ownerLabel"
                width={140}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    label="Owner"
                    hideLabel
                    valueFormatter={(value) => numberFormatter.format(Number(value ?? 0))}
                  />
                }
              />
              <Bar dataKey="allContacts" fill="var(--color-allContacts)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export function MondayMetricsView({ forcedOwnerId }: MondayMetricsViewProps) {
  const monday: MondayClientSdk = useMemo(() => mondaySdkInitialize(), []);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [identity, setIdentity] = useState<MondayIdentity | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isMondayEmbeddedContext, setIsMondayEmbeddedContext] = useState(false);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(getCurrentFiscalYear());
  const effectiveOwnerId = forcedOwnerId?.trim() ?? "";
  const fiscalYearOptions = useMemo(() => buildFiscalYearOptions(), []);

  useEffect(() => {
    const initEmbeddedSession = async () => {
      setAuthLoading(true);
      setIdentity(null);
      setIsMondayEmbeddedContext(false);

      try {
        let maybeToken = readTokenFromLocation();

        if (!maybeToken) {
          const tokenResponse = await monday.get("sessionToken");
          maybeToken = readTokenFromSdkResponse(tokenResponse);
        }

        if (!maybeToken) {
          const devAuthResponse = await fetch("/api/monday/auth/session", {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({}),
            cache: "no-store",
          });
          const devAuthData = (await devAuthResponse.json()) as {
            ok?: boolean;
            error?: string;
            identity?: MondayIdentity;
            sessionToken?: string;
          };
          if (devAuthResponse.ok && devAuthData.ok && devAuthData.identity) {
            setSessionToken(devAuthData.sessionToken ?? MONDAY_DEV_BYPASS_TOKEN);
            setIdentity(devAuthData.identity);
            setIsMondayEmbeddedContext(false);
            return;
          }
          throw new Error(
            devAuthData.error ?? "Missing Monday session token from SDK/query string",
          );
        }

        const authResponse = await fetch("/api/monday/auth/session", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-monday-session-token": maybeToken,
          },
          body: JSON.stringify({ sessionToken: maybeToken }),
          cache: "no-store",
        });
        const authData = (await authResponse.json()) as {
          ok: boolean;
          error?: string;
          identity?: MondayIdentity;
          sessionToken?: string;
        };
        if (!authResponse.ok || !authData.ok || !authData.identity) {
          throw new Error(authData.error ?? "Unable to verify Monday session");
        }

        setSessionToken(authData.sessionToken ?? maybeToken);
        setIdentity(authData.identity);
        setIsMondayEmbeddedContext(isEmbeddedMondaySessionToken(maybeToken));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to initialize Monday embed session";
        toast.error(message);
        setIsMondayEmbeddedContext(false);
      } finally {
        setAuthLoading(false);
      }
    };

    void initEmbeddedSession();
  }, [monday]);

  const metricsQuery = useQuery({
    queryKey: ["monday-metrics", sessionToken, selectedFiscalYear, effectiveOwnerId],
    enabled: !!sessionToken,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("fiscalYear", selectedFiscalYear);
      if (effectiveOwnerId) {
        params.set("ownerId", effectiveOwnerId);
      }

      const response = await fetch(`/api/monday/metrics?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
        headers: sessionToken ? { "x-monday-session-token": sessionToken } : undefined,
      });
      const data = (await response.json()) as MondayMetricsResponse;
      if (!response.ok || !data.ok || !data.summary) {
        throw new Error(data.error ?? "Failed to load metrics");
      }
      return data.summary;
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!metricsQuery.error) return;
    const message =
      metricsQuery.error instanceof Error
        ? metricsQuery.error.message
        : "Failed to load Monday metrics";
    toast.error(message);
  }, [metricsQuery.error]);

  const summary = metricsQuery.data;
  const isInitialMetricsLoading =
    !!sessionToken && (metricsQuery.isLoading || metricsQuery.isFetching) && !summary;
  const metricsErrorMessage =
    metricsQuery.error instanceof Error
      ? metricsQuery.error.message
      : "Unable to load metrics";

  return (
    <main className="container mx-auto max-w-7xl space-y-4 py-6">
      <Card>
        <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-semibold">
              {effectiveOwnerId ? "Employee Metrics" : "Global Metrics"}
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Computed directly from owner, tags, status, and date columns.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Fiscal Year
            </label>
            <select
              value={selectedFiscalYear}
              onChange={(event) => setSelectedFiscalYear(event.target.value)}
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            >
              {fiscalYearOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {effectiveOwnerId ? (
              <Badge variant="secondary">Owner {effectiveOwnerId}</Badge>
            ) : null}
            {!effectiveOwnerId ? (
              <Link href="/monday">
                <Button variant="outline" size="sm">
                  Open Records Board
                </Button>
              </Link>
            ) : (
              <Link href="/monday/metrics">
                <Button variant="outline" size="sm">
                  View Combined Metrics
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 text-xs">
          <Badge variant={isMondayEmbeddedContext ? "default" : "outline"}>
            {isMondayEmbeddedContext ? "Embedded Monday Session" : "Standalone Session"}
          </Badge>
          {identity?.userId ? (
            <Badge variant="outline">Viewer {identity.userId}</Badge>
          ) : null}
          {summary?.boardName ? <Badge variant="outline">{summary.boardName}</Badge> : null}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              void metricsQuery.refetch();
            }}
            disabled={authLoading || metricsQuery.isFetching}
          >
            {metricsQuery.isFetching ? "Refreshing..." : "Refresh"}
          </Button>
        </CardContent>
      </Card>

      {authLoading || isInitialMetricsLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <Card key={`metrics-skeleton-${idx}`}>
              <CardHeader>
                <Skeleton className="h-4 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : summary ? (
        <>
          <MetricsCardGrid summary={summary} />

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {summary.fiscalYear} - Contacts Per Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={contactsChartConfig}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={summary.monthly}
                      margin={{ top: 8, right: 12, bottom: 4, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="monthLabel"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            valueFormatter={(value) =>
                              numberFormatter.format(Number(value ?? 0))
                            }
                          />
                        }
                      />
                      <Bar
                        dataKey="allContacts"
                        fill="var(--color-allContacts)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {summary.fiscalYear} - Hires Per Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={hiredChartConfig}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={summary.monthly}
                      margin={{ top: 8, right: 12, bottom: 4, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="monthLabel"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            valueFormatter={(value) =>
                              numberFormatter.format(Number(value ?? 0))
                            }
                          />
                        }
                      />
                      <Bar
                        dataKey="hiredTotal"
                        fill="var(--color-hiredTotal)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {!effectiveOwnerId ? (
            <OwnerBreakdownChart rows={summary.ownerBreakdown} />
          ) : null}
        </>
      ) : metricsQuery.isError ? (
        <Card>
          <CardContent className="py-8 text-sm">
            <p className="text-destructive font-medium">Metrics request failed.</p>
            <p className="text-muted-foreground mt-1">{metricsErrorMessage}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-sm">
            Metrics are unavailable for this session.
          </CardContent>
        </Card>
      )}
    </main>
  );
}
