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
  buildUserBoardThemeInlineStyles,
  DEFAULT_USER_BOARD_GENERAL_SETTINGS,
  MONDAY_DEV_BYPASS_TOKEN,
  USER_BOARD_COLOR_THEME_STYLES,
  isEmbeddedMondaySessionToken,
} from "../constants";
import {
  applyMondayThemeClass,
  extractThemeFromContextPayload,
  hasUnsubscribe,
  parseUserBoardGeneralSettings,
  readTokenFromLocation,
  readTokenFromSdkResponse,
} from "../helpers";
import type {
  MondayIdentity,
  MondayMetricsOwnerBreakdown,
  MondayMetricsResponse,
  MondayMetricsSummary,
  MondayMetricsSummaryTotals,
  MondayUserBoardSettingsResponse,
  UserBoardGeneralSettings,
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
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const hiredChartConfig = {
  hiredTotal: {
    label: "Hired",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const ownerChartConfig = {
  allContacts: {
    label: "Contacts",
    color: "var(--chart-3)",
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
  const [boardGeneralSettings, setBoardGeneralSettings] = useState<UserBoardGeneralSettings>({
    ...DEFAULT_USER_BOARD_GENERAL_SETTINGS,
  });
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(getCurrentFiscalYear());
  const effectiveOwnerId = forcedOwnerId?.trim() ?? "";
  const fiscalYearOptions = useMemo(() => buildFiscalYearOptions(), []);
  const settingsScopeOwnerId = useMemo(() => {
    if (effectiveOwnerId.length > 0) return effectiveOwnerId;
    return identity?.userId?.trim() ?? "";
  }, [effectiveOwnerId, identity?.userId]);
  const boardThemeStyles = useMemo(
    () => USER_BOARD_COLOR_THEME_STYLES[boardGeneralSettings.colorTheme],
    [boardGeneralSettings.colorTheme],
  );
  const boardThemeInlineStyles = useMemo(
    () => buildUserBoardThemeInlineStyles(boardGeneralSettings),
    [boardGeneralSettings],
  );

  useEffect(() => {
    const root = document.documentElement;
    const hadLightClass = root.classList.contains("light");
    const hadDarkClass = root.classList.contains("dark");
    let didCleanup = false;
    let unsubscribe: (() => void) | undefined;

    const handleContextPayload = (payload: unknown) => {
      const theme = extractThemeFromContextPayload(payload);
      if (!theme) return;
      applyMondayThemeClass(theme);
    };

    void (monday
      .get("context")
      .then((value: unknown) => {
        if (didCleanup) return;
        handleContextPayload(value);
      })
      .catch(() => {
        // ignore context initialization failures in standalone mode
      }) as Promise<unknown>);

    if (typeof monday.listen === "function") {
      const listenerResult = monday.listen("context", (value: unknown) => {
        if (didCleanup) return;
        handleContextPayload(value);
      }) as unknown;
      if (typeof listenerResult === "function") {
        const unsubscribeFunction = listenerResult as () => void;
        unsubscribe = () => unsubscribeFunction();
      } else if (hasUnsubscribe(listenerResult)) {
        const unsubscribeFromListener = listenerResult.unsubscribe;
        unsubscribe = () => unsubscribeFromListener();
      }
    }

    return () => {
      didCleanup = true;
      unsubscribe?.();
      root.classList.remove("light", "dark");
      if (hadLightClass) root.classList.add("light");
      if (hadDarkClass) root.classList.add("dark");
    };
  }, [monday]);

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
  const userBoardSettingsQuery = useQuery({
    queryKey: ["monday-user-board-settings", sessionToken, settingsScopeOwnerId],
    enabled: !!sessionToken && settingsScopeOwnerId.length > 0,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("ownerId", settingsScopeOwnerId);
      const response = await fetch(`/api/monday/settings/user-board?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
        headers: sessionToken ? { "x-monday-session-token": sessionToken } : undefined,
      });
      const data = (await response.json()) as MondayUserBoardSettingsResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to load board settings");
      }
      return parseUserBoardGeneralSettings(data.settings);
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
  useEffect(() => {
    if (!userBoardSettingsQuery.error) return;
    const message =
      userBoardSettingsQuery.error instanceof Error
        ? userBoardSettingsQuery.error.message
        : "Failed to load board settings";
    toast.error(message);
  }, [userBoardSettingsQuery.error]);
  useEffect(() => {
    setBoardGeneralSettings({ ...DEFAULT_USER_BOARD_GENERAL_SETTINGS });
  }, [settingsScopeOwnerId]);
  useEffect(() => {
    if (!settingsScopeOwnerId) return;
    if (!userBoardSettingsQuery.data) return;
    setBoardGeneralSettings(userBoardSettingsQuery.data);
  }, [settingsScopeOwnerId, userBoardSettingsQuery.data]);

  const summary = metricsQuery.data;
  const isInitialMetricsLoading =
    !!sessionToken && (metricsQuery.isLoading || metricsQuery.isFetching) && !summary;
  const metricsErrorMessage =
    metricsQuery.error instanceof Error
      ? metricsQuery.error.message
      : "Unable to load metrics";

  return (
    <main className="monday-like-page mx-auto max-w-7xl space-y-4 pb-10 pt-6">
      <div
        data-board-filter-bar
        className={`sticky top-0 z-50 rounded-lg border px-2 py-1.5 ${boardThemeStyles.shellCardClassName}`}
        style={boardThemeInlineStyles.shellCardStyle}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <div className="min-w-0 pr-2">
            <h1 className="truncate text-base font-semibold">
              {effectiveOwnerId ? "Employee Metrics" : "Global Metrics"}
            </h1>
            <p className="text-muted-foreground text-xs">
              Computed directly from owner, tags, status, and date columns.
            </p>
          </div>

          <div className="bg-border/60 h-5 w-px shrink-0" />

          <div className="flex items-center gap-1.5">
            <label className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
              Fiscal Year
            </label>
            <select
              value={selectedFiscalYear}
              onChange={(event) => setSelectedFiscalYear(event.target.value)}
              className="bg-background border-input h-8 shrink-0 rounded-md border px-2 text-xs shadow-sm"
            >
              {fiscalYearOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {effectiveOwnerId ? (
            <Badge variant="secondary" className="h-8 shrink-0 rounded-sm px-2.5 text-xs">
              Owner {effectiveOwnerId}
            </Badge>
          ) : null}

          {!effectiveOwnerId ? (
            <Link href="/monday" className="shrink-0">
              <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs">
                Open Records Board
              </Button>
            </Link>
          ) : (
            <Link href="/monday/metrics" className="shrink-0">
              <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs">
                View Combined Metrics
              </Button>
            </Link>
          )}

          <div className="bg-border/60 h-5 w-px shrink-0" />

          <Badge
            variant={isMondayEmbeddedContext ? "default" : "outline"}
            className="h-8 shrink-0 rounded-sm px-2.5 text-xs"
          >
            {isMondayEmbeddedContext ? "Embedded Monday Session" : "Standalone Session"}
          </Badge>
          {identity?.userId ? (
            <Badge variant="outline" className="h-8 shrink-0 rounded-sm px-2.5 text-xs">
              Viewer {identity.userId}
            </Badge>
          ) : null}
          {summary?.boardName ? (
            <Badge variant="outline" className="h-8 shrink-0 rounded-sm px-2.5 text-xs">
              {summary.boardName}
            </Badge>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 shrink-0 px-2.5 text-xs"
            onClick={() => {
              void metricsQuery.refetch();
            }}
            disabled={authLoading || metricsQuery.isFetching}
          >
            {metricsQuery.isFetching ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

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
