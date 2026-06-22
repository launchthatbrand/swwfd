"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";
import mondaySdkInitialize from "monday-sdk-js";
import type { MondayClientSdk } from "monday-sdk-js";
import { EntityList, type ColumnDefinition } from "@launchthatapp/ui/entity-list";

import { Badge } from "@launchthatapp/ui/badge";
import { Button } from "@launchthatapp/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@launchthatapp/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/ui/collapsible";
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
import { useAction, useConvex } from "convex/react";
import { api } from "@convex-config/_generated/api";
import type {
  MondayIdentity,
  MondayJobMetricsSummary,
  MondayMetricsContractorReferralBreakdown,
  MondayMetricsHiredContact,
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

type HiredContactListRow = MondayMetricsHiredContact & Record<string, unknown>;

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

const communicationsChartConfig = {
  emailCommunications: {
    label: "Emails",
    color: "var(--chart-1)",
  },
  textCommunications: {
    label: "Texts",
    color: "var(--chart-2)",
  },
  phoneCallCommunications: {
    label: "Phone Calls",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

const ownerChartConfig = {
  allContacts: {
    label: "Contacts",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

const contractorReferralChartConfig = {
  referredCount: {
    label: "Referred Contacts",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

const jobsPostedChartConfig = {
  posted: { label: "Posted", color: "var(--chart-1)" },
  available: { label: "Still Available", color: "var(--chart-3)" },
} satisfies ChartConfig;

const jobsByCategoryChartConfig = {
  count: { label: "Jobs", color: "var(--chart-2)" },
} satisfies ChartConfig;

const jobsByContractorChartConfig = {
  count: { label: "Jobs", color: "var(--chart-4)" },
} satisfies ChartConfig;

const jobsByDistrictChartConfig = {
  count: { label: "Jobs", color: "var(--chart-5)" },
} satisfies ChartConfig;

const hiredContactsColumns: ColumnDefinition<HiredContactListRow>[] = [
  {
    id: "name",
    header: "Name",
    accessorKey: "name",
    sortable: true,
    cell: (item: HiredContactListRow) =>
      item.url ? (
        <Link
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary/80 block truncate px-2 py-2 font-medium underline underline-offset-2"
        >
          {item.name}
        </Link>
      ) : (
        <span className="block truncate px-2 py-2 font-medium">{item.name}</span>
      ),
  },
  {
    id: "email",
    header: "Email",
    accessorKey: "email",
    sortable: true,
    cell: (item: HiredContactListRow) => (
      <span className="block truncate px-2 py-2">
        {item.email?.trim() ? item.email.trim() : "—"}
      </span>
    ),
  },
  {
    id: "hireCount",
    header: "Times Hired",
    accessorKey: "hireCount",
    sortable: true,
    cell: (item: HiredContactListRow) => (
      <span className="block px-2 py-2 text-right tabular-nums">
        {numberFormatter.format(Number(item.hireCount ?? 0))}
      </span>
    ),
  },
];

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

const ContractorReferralsChart = ({
  fiscalYear,
  rows,
}: {
  fiscalYear: string;
  rows: MondayMetricsContractorReferralBreakdown[];
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{fiscalYear} - Referred to Contractor</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          No contractor referrals found for this period.
        </CardContent>
      </Card>
    );
  }

  const chartHeight = Math.max(260, rows.length * 34);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="min-w-0">
            <CardTitle className="text-base">
              {fiscalYear} - Referred to Contractor ({numberFormatter.format(rows.length)})
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-xs">
              Expand to view contractor referral counts.
            </p>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 shrink-0 gap-1.5 px-2.5 text-xs">
              {isExpanded ? "Collapse" : "Expand"}
              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <ChartContainer
              config={contractorReferralChartConfig}
              className="w-full"
              style={{ height: `${chartHeight}px` }}
            >
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart
                  data={rows}
                  layout="vertical"
                  margin={{ top: 8, right: 12, bottom: 8, left: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="contractorName"
                    width={220}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        label="Contractor"
                        hideLabel
                        valueFormatter={(value) => numberFormatter.format(Number(value ?? 0))}
                      />
                    }
                  />
                  <Bar dataKey="referredCount" fill="var(--color-referredCount)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

const JobMetricsSummaryCards = ({ summary }: { summary: MondayJobMetricsSummary }) => (
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          Live Available Jobs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tabular-nums">
          {numberFormatter.format(summary.liveJobCount)}
        </p>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          {summary.fiscalYear} - Jobs Posted
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tabular-nums">
          {numberFormatter.format(summary.postedThisFY)}
        </p>
      </CardContent>
    </Card>
    {summary.bySalaryType.slice(0, 2).map((entry) => (
      <Card key={entry.salaryType}>
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            {summary.fiscalYear} - {entry.salaryType}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tabular-nums">
            {numberFormatter.format(entry.count)}
          </p>
        </CardContent>
      </Card>
    ))}
  </div>
);

const JobMetricsMonthlyChart = ({ summary }: { summary: MondayJobMetricsSummary }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">
        {summary.fiscalYear} - Jobs Posted Per Month
      </CardTitle>
    </CardHeader>
    <CardContent>
      <ChartContainer config={jobsPostedChartConfig}>
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
                  valueFormatter={(value) => numberFormatter.format(Number(value ?? 0))}
                />
              }
            />
            <Bar dataKey="posted" fill="var(--color-posted)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="available" fill="var(--color-available)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
      <p className="text-muted-foreground mt-2 text-xs">
        "Still Available" counts jobs posted that month that remain open today.
      </p>
    </CardContent>
  </Card>
);

const JobMetricsCategoryChart = ({ summary }: { summary: MondayJobMetricsSummary }) => {
  const rows = summary.byCategory;
  if (rows.length === 0) return null;
  const chartHeight = Math.max(220, rows.length * 34);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {summary.fiscalYear} - Jobs by Category
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={jobsByCategoryChartConfig} className="w-full" style={{ height: `${chartHeight}px` }}>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 8, right: 12, bottom: 8, left: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="category"
                width={160}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    valueFormatter={(value) => numberFormatter.format(Number(value ?? 0))}
                  />
                }
              />
              <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

const JobMetricsContractorChart = ({ summary }: { summary: MondayJobMetricsSummary }) => {
  const rows = summary.byContractor;
  if (rows.length === 0) return null;
  const chartHeight = Math.max(220, rows.length * 34);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {summary.fiscalYear} - Jobs by Contractor
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={jobsByContractorChartConfig} className="w-full" style={{ height: `${chartHeight}px` }}>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 8, right: 12, bottom: 8, left: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="contractor"
                width={200}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    valueFormatter={(value) => numberFormatter.format(Number(value ?? 0))}
                  />
                }
              />
              <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

const JobMetricsDistrictChart = ({ summary }: { summary: MondayJobMetricsSummary }) => {
  const rows = summary.byDistrict.slice(0, 10);
  if (rows.length === 0) return null;
  const chartHeight = Math.max(220, rows.length * 34);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {summary.fiscalYear} - Jobs by District
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={jobsByDistrictChartConfig} className="w-full" style={{ height: `${chartHeight}px` }}>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 8, right: 12, bottom: 8, left: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="district"
                width={160}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    valueFormatter={(value) => numberFormatter.format(Number(value ?? 0))}
                  />
                }
              />
              <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export function MondayMetricsView({ forcedOwnerId }: MondayMetricsViewProps) {
  const monday: MondayClientSdk = useMemo(() => mondaySdkInitialize(), []);
  const convex = useConvex();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [identity, setIdentity] = useState<MondayIdentity | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const getMetricsAction = useAction(api.mondayMetricsNode.getMetrics);
  const getJobMetricsAction = useAction(api.mondayJobMetricsNode.getJobMetrics);
  const [isHiredContactsExpanded, setIsHiredContactsExpanded] = useState(false);
  const [isJobChartsExpanded, setIsJobChartsExpanded] = useState(false);
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
        const queryToken = readTokenFromLocation();
        if (queryToken && typeof window !== "undefined") {
          const currentUrl = new URL(window.location.href);
          if (currentUrl.searchParams.has("sessionToken")) {
            currentUrl.searchParams.delete("sessionToken");
            const nextSearch = currentUrl.searchParams.toString();
            const nextUrl = `${currentUrl.pathname}${nextSearch ? `?${nextSearch}` : ""}${currentUrl.hash}`;
            window.history.replaceState(null, "", nextUrl);
          }
        }

        let sdkToken: string | null = null;
        try {
          const tokenResponse = await monday.get("sessionToken");
          sdkToken = readTokenFromSdkResponse(tokenResponse);
        } catch {
          sdkToken = null;
        }
        let maybeToken = sdkToken ?? queryToken;

        const verifySessionWithConvex = async (token: string): Promise<MondayIdentity> => {
          const result = await convex.action(api.mondayAuth.verifyAndProvision, {
            sessionToken: token,
          });
          return {
            userId: result.userId,
            accountId: result.accountId,
            boardId: result.boardId,
            appClientId: result.appClientId,
          };
        };

        if (!maybeToken) {
          try {
            const devIdentity = await verifySessionWithConvex("");
            setSessionToken(MONDAY_DEV_BYPASS_TOKEN);
            setIdentity(devIdentity);
            setIsMondayEmbeddedContext(false);
            return;
          } catch (devError) {
            const message =
              devError instanceof Error
                ? devError.message
                : "Missing Monday session token from SDK/query string";
            throw new Error(message);
          }
        }

        let verifiedIdentity: MondayIdentity;
        try {
          verifiedIdentity = await verifySessionWithConvex(maybeToken);
        } catch (firstError) {
          const message =
            firstError instanceof Error
              ? firstError.message
              : "Unable to verify Monday session";
          if (
            message === "signature verification failed" &&
            sdkToken &&
            sdkToken !== maybeToken
          ) {
            maybeToken = sdkToken;
            verifiedIdentity = await verifySessionWithConvex(maybeToken);
          } else {
            throw new Error(message);
          }
        }

        setSessionToken(maybeToken);
        setIdentity(verifiedIdentity);
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
  }, [monday, convex]);

  const metricsQuery = useQuery({
    queryKey: ["monday-metrics", sessionToken, selectedFiscalYear, effectiveOwnerId],
    enabled: !!sessionToken,
    queryFn: async () => {
      const result = await getMetricsAction({
        sessionToken: sessionToken!,
        fiscalYear: selectedFiscalYear,
        ownerId: effectiveOwnerId || undefined,
      });
      return result.summary;
    },
    staleTime: 30_000,
  });
  const jobMetricsQuery = useQuery({
    queryKey: ["monday-job-metrics", sessionToken, selectedFiscalYear],
    enabled: !!sessionToken,
    queryFn: async () => {
      const result = await getJobMetricsAction({
        sessionToken: sessionToken!,
        fiscalYear: selectedFiscalYear,
      });
      return result.summary;
    },
    staleTime: 30_000,
  });
  const userBoardSettingsQuery = useQuery({
    queryKey: [
      "monday-user-board-settings",
      sessionToken,
      identity?.accountId,
      identity?.userId,
      settingsScopeOwnerId,
    ],
    enabled:
      !!sessionToken &&
      !!identity?.accountId?.trim() &&
      !!identity?.userId?.trim() &&
      settingsScopeOwnerId.length > 0,
    queryFn: async () => {
      const result = await convex.query(api.mondayUserBoardSettings.getForOwnerBoard, {
        accountId: identity!.accountId.trim(),
        ownerMondayUserId: settingsScopeOwnerId,
        viewerMondayUserId: identity!.userId.trim(),
      });
      return parseUserBoardGeneralSettings(result ?? undefined);
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
    if (!jobMetricsQuery.error) return;
    const message =
      jobMetricsQuery.error instanceof Error
        ? jobMetricsQuery.error.message
        : "Failed to load job metrics";
    toast.error(message);
  }, [jobMetricsQuery.error]);
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
  const hiredContactRows = useMemo<HiredContactListRow[]>(
    () => summary?.hiredContacts.map((row) => ({ ...row })) ?? [],
    [summary?.hiredContacts],
  );
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

          <div className="grid gap-4 xl:grid-cols-3">
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

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {summary.fiscalYear} - Communications Per Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={communicationsChartConfig}>
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
                        dataKey="emailCommunications"
                        fill="var(--color-emailCommunications)"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="textCommunications"
                        fill="var(--color-textCommunications)"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="phoneCallCommunications"
                        fill="var(--color-phoneCallCommunications)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
                <p className="text-muted-foreground mt-2 text-xs">
                  Emails: {numberFormatter.format(summary.communicationTotals.emailCommunications)} |{" "}
                  Texts: {numberFormatter.format(summary.communicationTotals.textCommunications)} |{" "}
                  Phone Calls: {numberFormatter.format(summary.communicationTotals.phoneCallCommunications)}
                </p>
              </CardContent>
            </Card>
          </div>

          <ContractorReferralsChart
            fiscalYear={summary.fiscalYear}
            rows={summary.contractorReferrals}
          />

          {!effectiveOwnerId ? (
            <OwnerBreakdownChart rows={summary.ownerBreakdown} />
          ) : null}

          <Collapsible open={isHiredContactsExpanded} onOpenChange={setIsHiredContactsExpanded}>
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div className="min-w-0">
                  <CardTitle className="text-base">
                    {summary.fiscalYear} - Hired Contacts ({numberFormatter.format(summary.hiredContacts.length)})
                  </CardTitle>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Expand to view the hired contacts table.
                  </p>
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 shrink-0 gap-1.5 px-2.5 text-xs">
                    {isHiredContactsExpanded ? "Collapse" : "Expand"}
                    {isHiredContactsExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent>
                  <p className="text-muted-foreground mb-2 text-xs">
                    {numberFormatter.format(summary.hiredContacts.length)} records /{" "}
                    {numberFormatter.format(summary.totals.hiredTotal)} individual hires
                  </p>
                  <EntityList
                    data={hiredContactRows}
                    columns={hiredContactsColumns}
                    viewModes={["list"]}
                    defaultViewMode="list"
                    enableSearch
                    enableFooter={false}
                    showRowCount={false}
                    hideFilters
                    getRowId={(item) => String(item.contactId)}
                    emptyState={
                      <div className="text-muted-foreground py-6 text-sm">
                        No hired contacts found for this period.
                      </div>
                    }
                  />
                  <p className="text-muted-foreground mt-2 text-xs">
                    {numberFormatter.format(summary.hiredContacts.length)} records /{" "}
                    {numberFormatter.format(summary.totals.hiredTotal)} individual hires
                  </p>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
          {/* ---- Job Metrics Section ---- */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">Job Listing Metrics</h2>
              <span className="text-muted-foreground text-xs">— {selectedFiscalYear} · Job Listing Board</span>
              {jobMetricsQuery.isFetching && (
                <span className="text-muted-foreground text-xs">Refreshing...</span>
              )}
            </div>

            {jobMetricsQuery.isLoading && !jobMetricsQuery.data ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <Card key={`job-skeleton-${idx}`}>
                    <CardHeader><Skeleton className="h-4 w-40" /></CardHeader>
                    <CardContent><Skeleton className="h-8 w-20" /></CardContent>
                  </Card>
                ))}
              </div>
            ) : jobMetricsQuery.data ? (
              <>
                <JobMetricsSummaryCards summary={jobMetricsQuery.data} />
                <Collapsible open={isJobChartsExpanded} onOpenChange={setIsJobChartsExpanded}>
                  <Card>
                    <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                      <div className="min-w-0">
                        <CardTitle className="text-base">Job Trend Charts</CardTitle>
                        <p className="text-muted-foreground mt-1 text-xs">
                          Monthly posting trends, categories, contractors, and districts for {jobMetricsQuery.data.fiscalYear}.
                        </p>
                      </div>
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 shrink-0 gap-1.5 px-2.5 text-xs">
                          {isJobChartsExpanded ? "Collapse" : "Expand"}
                          {isJobChartsExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </Button>
                      </CollapsibleTrigger>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent className="space-y-4">
                        <JobMetricsMonthlyChart summary={jobMetricsQuery.data} />
                        <div className="grid gap-4 xl:grid-cols-2">
                          <JobMetricsCategoryChart summary={jobMetricsQuery.data} />
                          <JobMetricsContractorChart summary={jobMetricsQuery.data} />
                        </div>
                        <JobMetricsDistrictChart summary={jobMetricsQuery.data} />
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              </>
            ) : jobMetricsQuery.isError ? (
              <Card>
                <CardContent className="py-6 text-sm">
                  <p className="text-destructive font-medium">Job metrics request failed.</p>
                  <p className="text-muted-foreground mt-1">
                    {jobMetricsQuery.error instanceof Error
                      ? jobMetricsQuery.error.message
                      : "Unable to load job metrics"}
                  </p>
                </CardContent>
              </Card>
            ) : null}
          </div>
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
