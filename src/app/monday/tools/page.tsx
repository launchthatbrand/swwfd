"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentProps } from "react";

import { Badge } from "@launchthatapp/ui/badge";
import { Button } from "@launchthatapp/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@launchthatapp/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@launchthatapp/ui/collapsible";
import { EntityList, type ColumnDefinition } from "@launchthatapp/ui/entity-list";
import { Input } from "@launchthatapp/ui/input";
import { toast } from "@launchthatapp/ui/toast";

interface BackfillJob {
  jobId: string;
  status: "running" | "done" | "failed" | "cancelled";
  workflowId?: string;
  sourceTag: string;
  baselineDate: string;
  pageSize: number;
  currentCursor?: string | null;
  processedContacts: number;
  createdTouches: number;
  skippedTouches: number;
  errorsCount: number;
  startedAt: number;
  updatedAt: number;
  finishedAt?: number | null;
  lastError?: string | null;
}

interface CsvExportJob {
  jobId: string;
  status: "running" | "done" | "failed" | "cancelled";
  workflowId?: string;
  sourceTag: string;
  baselineDate: string;
  pageSize: number;
  currentCursor?: string | null;
  processedContacts: number;
  rowCount: number;
  chunkCount: number;
  startedAt: number;
  updatedAt: number;
  finishedAt?: number | null;
  lastError?: string | null;
}

interface MonthlyMigrationJob {
  jobId: string;
  status: "running" | "done" | "failed" | "cancelled";
  workflowId?: string;
  sourceBoardId: string;
  sourceBoardName?: string | null;
  targetBoardId: string;
  monthTag: string;
  dryRun: boolean;
  includeParentUpdates: boolean;
  includeSubitems: boolean;
  includeSubitemUpdates: boolean;
  updateProgressColumns?: boolean;
  updatedProgressColumns?: number;
  monthKey?: string;
  createdTouchRecords?: number;
  pageSize: number;
  currentCursor?: string | null;
  processedContacts: number;
  mappedContacts: number;
  skippedContacts: number;
  createdParentUpdates: number;
  createdSubitems: number;
  createdSubitemUpdates: number;
  errorsCount: number;
  warningsCount: number;
  startedAt: number;
  updatedAt: number;
  finishedAt?: number | null;
  lastError?: string | null;
}

interface TouchRangeBackfillJob {
  jobId: string;
  status: "running" | "done" | "failed" | "cancelled";
  workflowId?: string;
  dateFrom: string;
  dateTo: string;
  dryRun: boolean;
  contactBoardId: string;
  touchBoardId: string;
  pageSize: number;
  currentCursor?: string | null;
  processedContacts: number;
  inRangeContacts: number;
  createdTouches: number;
  updatedTouches: number;
  skippedTouches: number;
  errorsCount: number;
  startedAt: number;
  updatedAt: number;
  finishedAt?: number | null;
  lastError?: string | null;
}

interface HireEventBackfillJob {
  jobId: string;
  status: "running" | "done" | "failed" | "cancelled";
  workflowId?: string;
  monthKey: string;
  dateFrom: string;
  dateTo: string;
  dryRun: boolean;
  contactBoardId: string;
  subitemBoardId?: string | null;
  pageSize: number;
  currentCursor?: string | null;
  processedContacts: number;
  inRangeContacts: number;
  createdEvents: number;
  skippedEvents: number;
  errorsCount: number;
  startedAt: number;
  updatedAt: number;
  finishedAt?: number | null;
  lastError?: string | null;
}

interface LastInteractionBackfillResult {
  monthKey: string;
  dateFrom: string;
  dateTo: string;
  dryRun: boolean;
  pageSize: number;
  processedContacts: number;
  registeredContacts: number;
  registeredWithInteraction: number;
  registeredWithoutInteraction: number;
  contactsAlreadyCurrent: number;
  contactsWouldUpdate: number;
  contactsUpdated: number;
  errorsCount: number;
  errorSamples: string[];
}

type UnifiedMigrationJobToolType =
  | "monthly_migration"
  | "hire_event_backfill"
  | "touch_range_backfill"
  | "touch_backfill"
  | "touch_csv_export";

interface UnifiedMigrationJobRow extends Record<string, unknown> {
  toolType: UnifiedMigrationJobToolType;
  toolLabel: string;
  legacy: boolean;
  jobId: string;
  status: "running" | "done" | "failed" | "cancelled";
  workflowId?: string | null;
  startedAt: number;
  updatedAt: number;
  finishedAt?: number | null;
  dryRun?: boolean;
  sourceBoardId?: string | null;
  sourceBoardName?: string | null;
  targetBoardId?: string | null;
  sourceTag?: string | null;
  baselineDate?: string | null;
  monthTag?: string | null;
  monthKey?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  pageSize?: number;
  processedCount: number;
  mappedCount: number;
  skippedCount: number;
  createdCount: number;
  updatedCount: number;
  errorCount: number;
  warningCount: number;
  lastError?: string | null;
  searchText: string;
}

type HistorySortKey = "startedAt" | "status" | "toolLabel" | "dryRun" | "createdCount";

export default function MondayToolsPage() {
  const [job, setJob] = useState<BackfillJob | null>(null);
  const [csvJob, setCsvJob] = useState<CsvExportJob | null>(null);
  const [monthlyJob, setMonthlyJob] = useState<MonthlyMigrationJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [startingMonthlyMigration, setStartingMonthlyMigration] = useState(false);
  const [cancellingMonthlyMigration, setCancellingMonthlyMigration] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [downloadingCsvParts, setDownloadingCsvParts] = useState(false);
  const [baselineDate, setBaselineDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [sourceTag, setSourceTag] = useState("");
  const [pageSize, setPageSize] = useState("100");
  const [csvRowsPerFile, setCsvRowsPerFile] = useState("8000");
  const [migrationSourceBoardId, setMigrationSourceBoardId] = useState("18406885282");
  const [migrationTargetBoardId, setMigrationTargetBoardId] = useState("");
  const [migrationMonthTag, setMigrationMonthTag] = useState("april_2026");
  const [migrationPageSize, setMigrationPageSize] = useState("20");
  const [migrationDryRun, setMigrationDryRun] = useState(true);
  const [migrationIncludeParentUpdates, setMigrationIncludeParentUpdates] = useState(true);
  const [migrationIncludeSubitems, setMigrationIncludeSubitems] = useState(true);
  const [migrationIncludeSubitemUpdates, setMigrationIncludeSubitemUpdates] = useState(true);
  const [migrationUpdateProgressColumns, setMigrationUpdateProgressColumns] = useState(true);
  const [migrationMonthKey, setMigrationMonthKey] = useState(
    () => new Date().toISOString().slice(0, 7),
  );

  // Touch range backfill state
  const [touchRangeJob, setTouchRangeJob] = useState<TouchRangeBackfillJob | null>(null);
  const [touchRangeDateFrom, setTouchRangeDateFrom] = useState("2026-02-01");
  const [touchRangeDateTo, setTouchRangeDateTo] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [touchRangePageSize, setTouchRangePageSize] = useState("50");
  const [touchRangeDryRun, setTouchRangeDryRun] = useState(true);
  const [startingTouchRange, setStartingTouchRange] = useState(false);
  const [cancellingTouchRange, setCancellingTouchRange] = useState(false);
  const [hireEventJob, setHireEventJob] = useState<HireEventBackfillJob | null>(null);
  const [hireEventMonthKey, setHireEventMonthKey] = useState(
    () => new Date().toISOString().slice(0, 7),
  );
  const [hireEventPageSize, setHireEventPageSize] = useState("50");
  const [hireEventDryRun, setHireEventDryRun] = useState(true);
  const [startingHireEventBackfill, setStartingHireEventBackfill] = useState(false);
  const [cancellingHireEventBackfill, setCancellingHireEventBackfill] = useState(false);
  const [lastInteractionMonthKey, setLastInteractionMonthKey] = useState(
    () => new Date().toISOString().slice(0, 7),
  );
  const [lastInteractionPageSize, setLastInteractionPageSize] = useState("100");
  const [lastInteractionDryRun, setLastInteractionDryRun] = useState(true);
  const [runningLastInteractionBackfill, setRunningLastInteractionBackfill] = useState(false);
  const [lastInteractionResult, setLastInteractionResult] =
    useState<LastInteractionBackfillResult | null>(null);
  const [historyJobs, setHistoryJobs] = useState<UnifiedMigrationJobRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyToolTypeFilter, setHistoryToolTypeFilter] = useState<"all" | UnifiedMigrationJobToolType>("all");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<
    "all" | UnifiedMigrationJobRow["status"]
  >("all");
  const [historySortKey, setHistorySortKey] = useState<HistorySortKey>("startedAt");
  const [historySortDirection, setHistorySortDirection] = useState<"asc" | "desc">("desc");
  const [expandedHistoryJobIds, setExpandedHistoryJobIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [isLegacyToolsExpanded, setIsLegacyToolsExpanded] = useState(false);

  const refreshTouchRangeStatus = async () => {
    try {
      const response = await fetch("/api/monday/tools/touch-range-backfill/status", {
        method: "GET",
        cache: "no-store",
      });
      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
        job?: TouchRangeBackfillJob | null;
      };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Failed to load status");
      setTouchRangeJob(data.job ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load touch range status");
    }
  };

  const refreshHireEventBackfillStatus = async () => {
    try {
      const response = await fetch("/api/monday/tools/hire-events-backfill/status", {
        method: "GET",
        cache: "no-store",
      });
      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
        job?: HireEventBackfillJob | null;
      };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to load hire event backfill status");
      }
      setHireEventJob(data.job ?? null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load hire event backfill status",
      );
    }
  };

  const startTouchRangeBackfill = async () => {
    if (!touchRangeDryRun) {
      const confirmed = window.confirm(
        "Run Touch Range Backfill in write mode? This will write records to Monday.",
      );
      if (!confirmed) return;
    }
    setStartingTouchRange(true);
    try {
      const parsedPageSize = Number(touchRangePageSize);
      const response = await fetch("/api/monday/tools/touch-range-backfill/start", {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          dateFrom: touchRangeDateFrom.trim(),
          dateTo: touchRangeDateTo.trim(),
          dryRun: touchRangeDryRun,
          pageSize: Number.isFinite(parsedPageSize) ? parsedPageSize : undefined,
        }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Failed to start");
      toast.success("Touch range backfill started");
      await refreshTouchRangeStatus();
      await refreshHistory();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start touch range backfill");
    } finally {
      setStartingTouchRange(false);
    }
  };

  const cancelTouchRangeBackfill = async () => {
    setCancellingTouchRange(true);
    try {
      const response = await fetch("/api/monday/tools/touch-range-backfill/cancel", {
        method: "POST",
        cache: "no-store",
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Failed to cancel");
      toast.success("Touch range backfill cancelled");
      await refreshTouchRangeStatus();
      await refreshHistory();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel");
    } finally {
      setCancellingTouchRange(false);
    }
  };

  const startHireEventBackfill = async () => {
    if (!hireEventDryRun) {
      const confirmed = window.confirm(
        "Run Hire Event Backfill in write mode? This will create missing Hire Event subitems.",
      );
      if (!confirmed) return;
    }
    setStartingHireEventBackfill(true);
    try {
      const parsedPageSize = Number(hireEventPageSize);
      const response = await fetch("/api/monday/tools/hire-events-backfill/start", {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          monthKey: hireEventMonthKey.trim(),
          dryRun: hireEventDryRun,
          pageSize: Number.isFinite(parsedPageSize) ? parsedPageSize : undefined,
        }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to start hire event backfill");
      }
      toast.success("Hire event backfill started");
      await refreshHireEventBackfillStatus();
      await refreshHistory();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to start hire event backfill",
      );
    } finally {
      setStartingHireEventBackfill(false);
    }
  };

  const cancelHireEventBackfill = async () => {
    setCancellingHireEventBackfill(true);
    try {
      const response = await fetch("/api/monday/tools/hire-events-backfill/cancel", {
        method: "POST",
        cache: "no-store",
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to cancel hire event backfill");
      }
      toast.success("Hire event backfill cancelled");
      await refreshHireEventBackfillStatus();
      await refreshHistory();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel hire event backfill",
      );
    } finally {
      setCancellingHireEventBackfill(false);
    }
  };

  const runLastInteractionBackfill = async () => {
    if (!lastInteractionDryRun) {
      const confirmed = window.confirm(
        "Run Last Interaction Backfill in write mode? This will update parent date_mm3jfsd1 values.",
      );
      if (!confirmed) return;
    }
    setRunningLastInteractionBackfill(true);
    try {
      const parsedPageSize = Number(lastInteractionPageSize);
      const response = await fetch("/api/monday/tools/last-interaction-backfill-month", {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          monthKey: lastInteractionMonthKey.trim(),
          dryRun: lastInteractionDryRun,
          pageSize: Number.isFinite(parsedPageSize) ? parsedPageSize : undefined,
        }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
        result?: LastInteractionBackfillResult;
      };
      if (!response.ok || !data.ok || !data.result) {
        throw new Error(data.error ?? "Failed to run last interaction backfill");
      }
      setLastInteractionResult(data.result);
      toast.success(
        data.result.dryRun
          ? "Last interaction dry-run complete"
          : "Last interaction backfill complete",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to run last interaction backfill",
      );
    } finally {
      setRunningLastInteractionBackfill(false);
    }
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/monday/tools/backfill/status", {
        method: "GET",
        cache: "no-store",
      });
      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
        job?: BackfillJob | null;
      };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to load status");
      }
      setJob(data.job ?? null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load status";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const refreshCsvStatus = async () => {
    try {
      const response = await fetch("/api/monday/tools/backfill/export-csv/status", {
        method: "GET",
        cache: "no-store",
      });
      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
        job?: CsvExportJob | null;
      };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to load CSV export status");
      }
      setCsvJob(data.job ?? null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load CSV export status";
      toast.error(message);
    }
  };

  const refreshMonthlyMigrationStatus = async () => {
    try {
      const response = await fetch("/api/monday/tools/monthly-migration/status", {
        method: "GET",
        cache: "no-store",
      });
      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
        job?: MonthlyMigrationJob | null;
      };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to load monthly migration status");
      }
      setMonthlyJob(data.job ?? null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load monthly migration status";
      toast.error(message);
    }
  };

  const refreshHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch("/api/monday/tools/history?limit=200", {
        method: "GET",
        cache: "no-store",
      });
      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
        jobs?: UnifiedMigrationJobRow[];
      };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to load tool history");
      }
      setHistoryJobs(data.jobs ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load tool history");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    void refreshCsvStatus();
    void refreshMonthlyMigrationStatus();
    void refreshTouchRangeStatus();
    void refreshHireEventBackfillStatus();
    void refreshHistory();
  }, []);

  useEffect(() => {
    const status = job?.status;
    const csvStatus = csvJob?.status;
    const monthlyStatus = monthlyJob?.status;
    const touchRangeStatus = touchRangeJob?.status;
    const hireEventStatus = hireEventJob?.status;
    if (
      status !== "running" &&
      csvStatus !== "running" &&
      monthlyStatus !== "running" &&
      touchRangeStatus !== "running" &&
      hireEventStatus !== "running"
    ) {
      return;
    }
    const timer = setInterval(() => {
      void refresh();
      void refreshCsvStatus();
      void refreshMonthlyMigrationStatus();
      void refreshTouchRangeStatus();
      void refreshHireEventBackfillStatus();
      void refreshHistory();
    }, 5000);
    return () => clearInterval(timer);
  }, [
    job?.status,
    csvJob?.status,
    monthlyJob?.status,
    touchRangeJob?.status,
    hireEventJob?.status,
  ]);

  const startBackfill = async () => {
    setStarting(true);
    try {
      const parsedPageSize = Number(pageSize);
      const response = await fetch("/api/monday/tools/backfill/start", {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          baselineDate,
          sourceTag: sourceTag.trim() || undefined,
          pageSize: Number.isFinite(parsedPageSize) ? parsedPageSize : undefined,
        }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
      };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to start backfill");
      }
      toast.success("Backfill started");
      await refresh();
      await refreshHistory();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to start backfill";
      toast.error(message);
    } finally {
      setStarting(false);
    }
  };

  const cancelBackfill = async () => {
    setCancelling(true);
    try {
      const response = await fetch("/api/monday/tools/backfill/cancel", {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId: job?.jobId }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
      };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to cancel backfill");
      }
      toast.success("Backfill cancelled");
      await refresh();
      await refreshHistory();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to cancel backfill";
      toast.error(message);
    } finally {
      setCancelling(false);
    }
  };

  const startMonthlyMigration = async () => {
    if (!migrationDryRun) {
      const confirmed = window.confirm(
        "Run Monthly Migration in write mode? This will write updates and subitems to the API board.",
      );
      if (!confirmed) return;
    }
    setStartingMonthlyMigration(true);
    try {
      const parsedPageSize = Number(migrationPageSize);
      const sourceBoardId = migrationSourceBoardId.trim();
      if (!sourceBoardId) {
        throw new Error("Source board id is required");
      }
      const response = await fetch("/api/monday/tools/monthly-migration/start", {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceBoardId,
          targetBoardId: migrationTargetBoardId.trim() || undefined,
          monthTag: migrationMonthTag.trim() || undefined,
          dryRun: migrationDryRun,
          includeParentUpdates: migrationIncludeParentUpdates,
          includeSubitems: migrationIncludeSubitems,
          includeSubitemUpdates: migrationIncludeSubitemUpdates,
          updateProgressColumns: migrationUpdateProgressColumns,
          monthKey: migrationMonthKey.trim() || undefined,
          pageSize: Number.isFinite(parsedPageSize) ? parsedPageSize : undefined,
        }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
      };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to start monthly migration");
      }
      toast.success(
        migrationDryRun
          ? "Monthly migration dry-run started"
          : "Monthly migration started",
      );
      await refreshMonthlyMigrationStatus();
      await refreshHistory();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to start monthly migration";
      toast.error(message);
    } finally {
      setStartingMonthlyMigration(false);
    }
  };

  const cancelMonthlyMigration = async () => {
    setCancellingMonthlyMigration(true);
    try {
      const response = await fetch("/api/monday/tools/monthly-migration/cancel", {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId: monthlyJob?.jobId }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
      };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to cancel monthly migration");
      }
      toast.success("Monthly migration cancelled");
      await refreshMonthlyMigrationStatus();
      await refreshHistory();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to cancel monthly migration";
      toast.error(message);
    } finally {
      setCancellingMonthlyMigration(false);
    }
  };

  const exportBackfillCsv = async () => {
    setExportingCsv(true);
    try {
      const parsedPageSize = Number(pageSize);
      const response = await fetch("/api/monday/tools/backfill/export-csv", {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          baselineDate,
          sourceTag: sourceTag.trim() || undefined,
          pageSize: Number.isFinite(parsedPageSize) ? parsedPageSize : undefined,
        }),
      });
      if (!response.ok) {
        const fallbackMessage = "Failed to start CSV export";
        const errorText = await response.text().catch(() => fallbackMessage);
        throw new Error(errorText || fallbackMessage);
      }
      toast.success("CSV export workflow started");
      await refreshCsvStatus();
      await refreshHistory();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to start CSV export";
      toast.error(message);
    } finally {
      setExportingCsv(false);
    }
  };

  const downloadCsvExport = async () => {
    if (!csvJob?.jobId) return;
    setDownloadingCsv(true);
    try {
      const response = await fetch(
        `/api/monday/tools/backfill/export-csv/download?jobId=${encodeURIComponent(csvJob.jobId)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );
      if (!response.ok) {
        const fallbackMessage = "Failed to download CSV export";
        const errorText = await response.text().catch(() => fallbackMessage);
        throw new Error(errorText || fallbackMessage);
      }
      const blob = await response.blob();
      const contentDisposition = response.headers.get("content-disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(contentDisposition);
      const fileName = match?.[1] ?? "monday-touch-backfill.csv";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success("CSV downloaded");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to download CSV export";
      toast.error(message);
    } finally {
      setDownloadingCsv(false);
    }
  };

  const downloadCsvExportInParts = async () => {
    if (!csvJob?.jobId) return;
    if (csvJob.status !== "done") {
      toast.error("CSV export must be done before downloading split files");
      return;
    }
    const parsedRowsPerFile = Number(csvRowsPerFile);
    const maxRows = Number.isFinite(parsedRowsPerFile)
      ? Math.max(1, Math.floor(parsedRowsPerFile))
      : 8000;
    const partCount = Math.max(1, Math.ceil(csvJob.rowCount / maxRows));
    setDownloadingCsvParts(true);
    try {
      for (let part = 1; part <= partCount; part += 1) {
        const response = await fetch(
          `/api/monday/tools/backfill/export-csv/download?jobId=${encodeURIComponent(csvJob.jobId)}&part=${part}&maxRows=${maxRows}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );
        if (!response.ok) {
          const fallbackMessage = `Failed to download CSV part ${part}/${partCount}`;
          const errorText = await response.text().catch(() => fallbackMessage);
          throw new Error(errorText || fallbackMessage);
        }
        const blob = await response.blob();
        const contentDisposition = response.headers.get("content-disposition") ?? "";
        const match = /filename="([^"]+)"/.exec(contentDisposition);
        const fileName =
          match?.[1] ?? `monday-touch-backfill.part${part}-of-${partCount}.csv`;
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      }
      toast.success(`Downloaded ${partCount} CSV part${partCount > 1 ? "s" : ""}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to download split CSV files";
      toast.error(message);
    } finally {
      setDownloadingCsvParts(false);
    }
  };

  const getStatusBadgeVariant = useMemo(() => {
    return (
      status: "running" | "done" | "failed" | "cancelled" | undefined,
    ): ComponentProps<typeof Badge>["variant"] => {
      switch (status) {
        case "running":
          return "default";
        case "done":
          return "secondary";
        case "failed":
        case "cancelled":
          return "destructive";
        default:
          return "outline";
      }
    };
  }, []);

  const activeJobs = useMemo(
    () =>
      [
        monthlyJob
          ? {
              id: `monthly-${monthlyJob.jobId}`,
              label: "Monthly Migration",
              status: monthlyJob.status,
              summary: `${monthlyJob.processedContacts.toLocaleString()} processed`,
              jobId: monthlyJob.jobId,
            }
          : null,
        hireEventJob
          ? {
              id: `hire-${hireEventJob.jobId}`,
              label: "Hire Event Backfill",
              status: hireEventJob.status,
              summary: `${hireEventJob.processedContacts.toLocaleString()} processed`,
              jobId: hireEventJob.jobId,
            }
          : null,
        touchRangeJob
          ? {
              id: `range-${touchRangeJob.jobId}`,
              label: "Touch Range Backfill (Legacy)",
              status: touchRangeJob.status,
              summary: `${touchRangeJob.processedContacts.toLocaleString()} processed`,
              jobId: touchRangeJob.jobId,
            }
          : null,
        csvJob
          ? {
              id: `csv-${csvJob.jobId}`,
              label: "Touch CSV Export (Legacy)",
              status: csvJob.status,
              summary: `${csvJob.processedContacts.toLocaleString()} processed`,
              jobId: csvJob.jobId,
            }
          : null,
        job
          ? {
              id: `baseline-${job.jobId}`,
              label: "Baseline Touch Backfill (Legacy)",
              status: job.status,
              summary: `${job.processedContacts.toLocaleString()} processed`,
              jobId: job.jobId,
            }
          : null,
      ].filter(
        (
          entry,
        ): entry is {
          id: string;
          label: string;
          status: "running" | "done" | "failed" | "cancelled";
          summary: string;
          jobId: string;
        } => Boolean(entry && entry.status === "running"),
      ),
    [csvJob, hireEventJob, job, monthlyJob, touchRangeJob],
  );

  const historyToolTypeOptions = useMemo(() => {
    const labels = new Map<UnifiedMigrationJobToolType, string>();
    for (const entry of historyJobs) {
      labels.set(entry.toolType, entry.toolLabel);
    }
    return Array.from(labels.entries()).map(([value, label]) => ({ value, label }));
  }, [historyJobs]);

  const filteredHistoryRows = useMemo(() => {
    const normalizedSearch = historySearch.trim().toLowerCase();
    const statusRank: Record<UnifiedMigrationJobRow["status"], number> = {
      running: 0,
      failed: 1,
      cancelled: 2,
      done: 3,
    };

    const rows = historyJobs.filter((entry) => {
      if (historyToolTypeFilter !== "all" && entry.toolType !== historyToolTypeFilter) {
        return false;
      }
      if (historyStatusFilter !== "all" && entry.status !== historyStatusFilter) {
        return false;
      }
      if (
        normalizedSearch.length > 0 &&
        !entry.searchText.toLowerCase().includes(normalizedSearch)
      ) {
        return false;
      }
      return true;
    });

    rows.sort((a, b) => {
      const direction = historySortDirection === "asc" ? 1 : -1;
      if (historySortKey === "status") {
        return (statusRank[a.status] - statusRank[b.status]) * direction;
      }
      if (historySortKey === "toolLabel") {
        return a.toolLabel.localeCompare(b.toolLabel) * direction;
      }
      if (historySortKey === "dryRun") {
        return (Number(Boolean(a.dryRun)) - Number(Boolean(b.dryRun))) * direction;
      }
      if (historySortKey === "createdCount") {
        return (a.createdCount - b.createdCount) * direction;
      }
      return (a.startedAt - b.startedAt) * direction;
    });

    return rows;
  }, [
    historyJobs,
    historySearch,
    historySortDirection,
    historySortKey,
    historyStatusFilter,
    historyToolTypeFilter,
  ]);

  const toggleHistorySort = (key: HistorySortKey) => {
    setHistorySortKey((current) => {
      if (current === key) {
        setHistorySortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
        return current;
      }
      setHistorySortDirection("desc");
      return key;
    });
  };

  const toggleHistoryRowExpanded = (jobId: string) => {
    setExpandedHistoryJobIds((current) => {
      const next = new Set(current);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const historyColumns = useMemo<ColumnDefinition<UnifiedMigrationJobRow>[]>(
    () => [
      {
        id: "startedAt",
        header: "Started",
        accessorKey: "startedAt",
        sortable: true,
        cell: (item: UnifiedMigrationJobRow) => (
          <span className="block px-2 py-2 text-xs">
            {new Date(item.startedAt).toLocaleString()}
          </span>
        ),
      },
      {
        id: "toolLabel",
        header: "Tool",
        accessorKey: "toolLabel",
        sortable: true,
        cell: (item: UnifiedMigrationJobRow) => (
          <div className="px-2 py-2">
            <p className="text-sm font-medium">{item.toolLabel}</p>
            <p className="text-muted-foreground text-xs">{item.jobId}</p>
          </div>
        ),
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        sortable: true,
        cell: (item: UnifiedMigrationJobRow) => (
          <div className="space-y-1 px-2 py-2">
            <Badge variant={getStatusBadgeVariant(item.status)}>{item.status}</Badge>
            {item.legacy ? (
              <div>
                <Badge variant="outline" className="text-muted-foreground">
                  legacy
                </Badge>
              </div>
            ) : null}
          </div>
        ),
      },
      {
        id: "counts",
        header: "Counts",
        accessorKey: "createdCount",
        sortable: true,
        cell: (item: UnifiedMigrationJobRow) => (
          <div className="px-2 py-2 text-xs">
            <p>
              <span className="font-medium">Processed:</span>{" "}
              {item.processedCount.toLocaleString()}
            </p>
            <p>
              <span className="font-medium">Created:</span>{" "}
              {item.createdCount.toLocaleString()}
            </p>
            <p>
              <span className="font-medium">Errors:</span> {item.errorCount.toLocaleString()}
            </p>
          </div>
        ),
      },
      {
        id: "details",
        header: "Details",
        accessorKey: "jobId",
        sortable: false,
        cell: (item: UnifiedMigrationJobRow) => {
          const isExpanded = expandedHistoryJobIds.has(item.jobId);
  return (
            <div className="max-w-md px-2 py-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => toggleHistoryRowExpanded(item.jobId)}
              >
                {isExpanded ? "Hide details" : "Show details"}
              </Button>
              {isExpanded ? (
                <div className="bg-muted/30 mt-2 space-y-1 rounded border p-2 text-[11px]">
                  <p>
                    <span className="font-medium">Workflow:</span>{" "}
                    {item.workflowId?.trim() || "—"}
                  </p>
                  <p>
                    <span className="font-medium">Mode:</span>{" "}
                    {item.dryRun ? "Dry run" : "Write mode"}
                  </p>
                  <p>
                    <span className="font-medium">Source/Target:</span>{" "}
                    {item.sourceBoardId?.trim() || "—"} / {item.targetBoardId?.trim() || "—"}
                  </p>
                  <p>
                    <span className="font-medium">Range:</span>{" "}
                    {item.monthKey?.trim() ||
                      `${item.dateFrom?.trim() || "—"} → ${item.dateTo?.trim() || "—"}`}
                  </p>
                  {item.lastError ? (
                    <p className="text-destructive">
                      <span className="font-medium">Last Error:</span> {item.lastError}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        },
      },
    ],
    [expandedHistoryJobIds, getStatusBadgeVariant],
  );

  return (
    <main className="container mx-auto max-w-6xl space-y-4 py-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Monday Tools</h1>
        <p className="text-muted-foreground text-sm">
          Subitem-first migration runbook, active jobs, and unified history.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Runbook: Which Tool Should I Use?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              <span className="font-medium">Monthly Migration</span>: copy records +
              updates/subitems from a monthly board into the main API board.
            </li>
            <li>
              <span className="font-medium">Hire Event Backfill</span>: regenerate
              canonical hire-event subitems for one month.
            </li>
            <li>
              <span className="font-medium">Last Interaction Backfill</span>: recompute
              parent <code className="bg-muted rounded px-1 text-xs">date_mm3jfsd1</code>{" "}
              from subitems.
            </li>
            <li>
              <span className="font-medium">Legacy Touchpoint Tools</span>: deprecated,
              only for historical recovery.
            </li>
          </ol>
          <p className="text-muted-foreground text-xs">
            Recommended order: Monthly Migration → Hire Event Backfill → Last
            Interaction Backfill.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Active Jobs</CardTitle>
            <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void refresh();
              void refreshCsvStatus();
              void refreshMonthlyMigrationStatus();
              void refreshTouchRangeStatus();
              void refreshHireEventBackfillStatus();
              void refreshHistory();
            }}
            disabled={loading || historyLoading}
          >
            Refresh All
            </Button>
        </CardHeader>
        <CardContent>
          {activeJobs.length === 0 ? (
            <p className="text-muted-foreground text-sm">No tools are currently running.</p>
          ) : (
            <div className="space-y-2">
              {activeJobs.map((activeJob) => (
                <div
                  key={activeJob.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border p-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{activeJob.label}</p>
                    <p className="text-muted-foreground text-xs">{activeJob.summary}</p>
                  </div>
            <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(activeJob.status)}>
                      {activeJob.status}
                    </Badge>
                    <span className="text-muted-foreground text-xs">{activeJob.jobId}</span>
            </div>
          </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
            <CardTitle className="text-base">Monthly Migration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
              Primary tool for monthly board sync into the canonical API board.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Source Board ID</label>
              <Input
                value={migrationSourceBoardId}
                onChange={(event) => setMigrationSourceBoardId(event.target.value)}
                placeholder="18406885282"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Target Board ID (optional)</label>
              <Input
                value={migrationTargetBoardId}
                onChange={(event) => setMigrationTargetBoardId(event.target.value)}
                placeholder="7241111668"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Month Tag</label>
              <Input
                value={migrationMonthTag}
                onChange={(event) => setMigrationMonthTag(event.target.value)}
                placeholder="april_2026"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Page Size</label>
              <Input
                value={migrationPageSize}
                onChange={(event) => setMigrationPageSize(event.target.value)}
                placeholder="20"
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={migrationDryRun}
                onChange={(event) => setMigrationDryRun(event.target.checked)}
              />
                Dry run
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={migrationIncludeParentUpdates}
                onChange={(event) =>
                  setMigrationIncludeParentUpdates(event.target.checked)
                }
              />
              Include parent updates
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={migrationIncludeSubitems}
                onChange={(event) => setMigrationIncludeSubitems(event.target.checked)}
              />
              Include subitems
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={migrationIncludeSubitemUpdates}
                onChange={(event) =>
                  setMigrationIncludeSubitemUpdates(event.target.checked)
                }
              />
              Include subitem updates
            </label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={migrationUpdateProgressColumns}
                onChange={(event) =>
                  setMigrationUpdateProgressColumns(event.target.checked)
                }
              />
              Update progress columns
            </label>
          </div>
            <label className="flex items-center gap-2 text-sm">
              <span className="whitespace-nowrap text-muted-foreground">
                Month key (YYYY-MM):
              </span>
              <input
                type="text"
                className="w-28 rounded border px-2 py-1 text-sm"
                placeholder="2026-04"
                value={migrationMonthKey}
                onChange={(event) => setMigrationMonthKey(event.target.value)}
              />
              <Badge variant={migrationDryRun ? "outline" : "secondary"}>
                {migrationDryRun ? "Dry Run" : "Write Mode"}
              </Badge>
            </label>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => void startMonthlyMigration()}
              disabled={startingMonthlyMigration}
            >
              {startingMonthlyMigration
                ? "Starting..."
                : migrationDryRun
                  ? "Start Dry Run"
                  : "Start Migration"}
            </Button>
            <Button
              variant="outline"
              onClick={() => void refreshMonthlyMigrationStatus()}
            >
                Refresh Status
            </Button>
            {monthlyJob?.status === "running" ? (
              <Button
                variant="destructive"
                onClick={() => void cancelMonthlyMigration()}
                disabled={cancellingMonthlyMigration}
              >
                  {cancellingMonthlyMigration ? "Cancelling..." : "Cancel"}
              </Button>
            ) : null}
          </div>
            {monthlyJob ? (
              <div className="space-y-1 rounded border p-3 text-xs">
              <div className="flex items-center gap-2">
                <Badge variant={getStatusBadgeVariant(monthlyJob.status)}>
                  {monthlyJob.status}
                </Badge>
                  <span>{monthlyJob.jobId}</span>
              </div>
              <p>
                  Processed {monthlyJob.processedContacts.toLocaleString()} · Mapped{" "}
                  {monthlyJob.mappedContacts.toLocaleString()} · Skipped{" "}
                {monthlyJob.skippedContacts.toLocaleString()}
              </p>
              <p>
                  Created updates/subitems:{" "}
                  {(
                    monthlyJob.createdParentUpdates +
                    monthlyJob.createdSubitems +
                    monthlyJob.createdSubitemUpdates
                  ).toLocaleString()}
              </p>
              <p>
                  Updated progress columns:{" "}
                  {(monthlyJob.updatedProgressColumns ?? 0).toLocaleString()} · Errors:{" "}
                {monthlyJob.errorsCount.toLocaleString()}
              </p>
              {monthlyJob.lastError ? (
                  <p className="text-destructive">{monthlyJob.lastError}</p>
              ) : null}
            </div>
            ) : (
              <p className="text-muted-foreground text-xs">No migration run yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle className="text-base">Hire Event Backfill (By Month)</CardTitle>
        </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground text-sm">
              Rebuild canonical hire-event subitems month-by-month.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <span className="whitespace-nowrap text-muted-foreground">Month:</span>
                <input
                  type="month"
                  className="rounded border px-2 py-1 text-sm"
                  value={hireEventMonthKey}
                  onChange={(event) => setHireEventMonthKey(event.target.value)}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <span className="whitespace-nowrap text-muted-foreground">Page size:</span>
                <input
                  type="number"
                  className="w-20 rounded border px-2 py-1 text-sm"
                  value={hireEventPageSize}
                  min={25}
                  max={200}
                  onChange={(event) => setHireEventPageSize(event.target.value)}
                />
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={hireEventDryRun}
                  onChange={(event) => setHireEventDryRun(event.target.checked)}
                />
                <span>Dry Run</span>
              </label>
              <Badge variant={hireEventDryRun ? "outline" : "secondary"}>
                {hireEventDryRun ? "Dry Run" : "Write Mode"}
                </Badge>
              </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => void startHireEventBackfill()}
                disabled={startingHireEventBackfill}
              >
                {startingHireEventBackfill
                  ? "Starting..."
                  : hireEventDryRun
                    ? "Start Dry Run"
                    : "Start Backfill"}
              </Button>
              <Button variant="outline" onClick={() => void refreshHireEventBackfillStatus()}>
                Refresh Status
              </Button>
              {hireEventJob?.status === "running" ? (
                <Button
                  variant="destructive"
                  onClick={() => void cancelHireEventBackfill()}
                  disabled={cancellingHireEventBackfill}
                >
                  {cancellingHireEventBackfill ? "Cancelling..." : "Cancel"}
                </Button>
              ) : null}
            </div>
            {hireEventJob ? (
              <div className="space-y-1 rounded border p-3 text-xs">
              <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadgeVariant(hireEventJob.status)}>
                    {hireEventJob.status}
                </Badge>
                  <span>{hireEventJob.jobId}</span>
              </div>
              <p>
                  Range: {hireEventJob.dateFrom} → {hireEventJob.dateTo}
              </p>
              <p>
                  Processed {hireEventJob.processedContacts.toLocaleString()} · In range{" "}
                  {hireEventJob.inRangeContacts.toLocaleString()}
              </p>
              <p>
                  Created {hireEventJob.createdEvents.toLocaleString()} · Skipped{" "}
                  {hireEventJob.skippedEvents.toLocaleString()} · Errors{" "}
                  {hireEventJob.errorsCount.toLocaleString()}
                </p>
                {hireEventJob.lastError ? (
                  <p className="text-destructive">{hireEventJob.lastError}</p>
              ) : null}
            </div>
            ) : (
              <p className="text-muted-foreground text-xs">No hire-event run yet.</p>
          )}
        </CardContent>
      </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Last Interaction Date Backfill (By Month)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Recompute parent <code className="bg-muted rounded px-1 text-xs">date_mm3jfsd1</code>{" "}
            from each contact&apos;s latest subitem interaction.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <span className="whitespace-nowrap text-muted-foreground">Month:</span>
              <input
                type="month"
                className="rounded border px-2 py-1 text-sm"
                value={lastInteractionMonthKey}
                onChange={(event) => setLastInteractionMonthKey(event.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="whitespace-nowrap text-muted-foreground">Page size:</span>
              <input
                type="number"
                className="w-20 rounded border px-2 py-1 text-sm"
                value={lastInteractionPageSize}
                min={10}
                max={200}
                onChange={(event) => setLastInteractionPageSize(event.target.value)}
              />
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={lastInteractionDryRun}
                onChange={(event) => setLastInteractionDryRun(event.target.checked)}
              />
              <span>Dry Run</span>
            </label>
            <Badge variant={lastInteractionDryRun ? "outline" : "secondary"}>
              {lastInteractionDryRun ? "Dry Run" : "Write Mode"}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => void runLastInteractionBackfill()}
              disabled={runningLastInteractionBackfill}
            >
              {runningLastInteractionBackfill
                ? "Running..."
                : lastInteractionDryRun
                  ? "Run Dry Run"
                  : "Run Backfill"}
            </Button>
          </div>
          {runningLastInteractionBackfill ? (
            <p className="text-muted-foreground text-sm">
              Backfill is running... this can take up to a minute on larger months.
            </p>
          ) : null}
          {lastInteractionResult ? (
            <div className="space-y-1 rounded border p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">Run Mode:</span>
                <Badge variant={lastInteractionResult.dryRun ? "outline" : "secondary"}>
                  {lastInteractionResult.dryRun ? "Dry Run" : "Write Mode"}
                </Badge>
              </div>
              <p>
                <span className="font-medium">Month:</span> {lastInteractionResult.monthKey} ·{" "}
                <span className="font-medium">Range:</span> {lastInteractionResult.dateFrom} →{" "}
                {lastInteractionResult.dateTo}
              </p>
              <p>
                <span className="font-medium">Scanned:</span>{" "}
                {lastInteractionResult.processedContacts.toLocaleString()} ·{" "}
                <span className="font-medium">Registered:</span>{" "}
                {lastInteractionResult.registeredContacts.toLocaleString()}
              </p>
              <p>
                <span className="font-medium">
                  {lastInteractionResult.dryRun ? "Would Update:" : "Updated:"}
                </span>{" "}
                {(
                  lastInteractionResult.dryRun
                    ? lastInteractionResult.contactsWouldUpdate
                    : lastInteractionResult.contactsUpdated
                ).toLocaleString()} ·{" "}
                <span className="font-medium">Errors:</span>{" "}
                {lastInteractionResult.errorsCount.toLocaleString()}
              </p>
              {lastInteractionResult.errorSamples.length > 0 ? (
                <div className="space-y-1">
                  <p className="font-medium text-destructive">Sample Errors</p>
                  {lastInteractionResult.errorSamples.map((sampleError) => (
                    <p key={sampleError} className="text-destructive">
                      {sampleError}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No last interaction backfill run yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Migration History</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refreshHistory()}
            disabled={historyLoading}
          >
            {historyLoading ? "Refreshing..." : "Refresh History"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <Input
              value={historySearch}
              onChange={(event) => setHistorySearch(event.target.value)}
              placeholder="Search job id, workflow, board, month..."
            />
            <select
              value={historyToolTypeFilter}
              onChange={(event) =>
                setHistoryToolTypeFilter(
                  event.target.value === "all"
                    ? "all"
                    : (event.target.value as UnifiedMigrationJobToolType),
                )
              }
              className="rounded border bg-transparent px-2 py-2 text-sm"
            >
              <option value="all">All tools</option>
              {historyToolTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={historyStatusFilter}
              onChange={(event) =>
                setHistoryStatusFilter(
                  event.target.value === "all"
                    ? "all"
                    : (event.target.value as UnifiedMigrationJobRow["status"]),
                )
              }
              className="rounded border bg-transparent px-2 py-2 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="running">Running</option>
              <option value="done">Done</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <div className="flex items-center gap-2">
              <select
                value={historySortKey}
                onChange={(event) => toggleHistorySort(event.target.value as HistorySortKey)}
                className="w-full rounded border bg-transparent px-2 py-2 text-sm"
              >
                <option value="startedAt">Sort: Started</option>
                <option value="status">Sort: Status</option>
                <option value="toolLabel">Sort: Tool</option>
                <option value="dryRun">Sort: Dry Run</option>
                <option value="createdCount">Sort: Created</option>
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setHistorySortDirection((direction) =>
                    direction === "asc" ? "desc" : "asc",
                  )
                }
              >
                {historySortDirection.toUpperCase()}
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            Showing {filteredHistoryRows.length.toLocaleString()}{" "}
            {filteredHistoryRows.length === 1 ? "job" : "jobs"}.
          </p>
          <EntityList
            data={filteredHistoryRows}
            columns={historyColumns}
            viewModes={["list"]}
            defaultViewMode="list"
            enableFooter={false}
            showRowCount={false}
            hideFilters
            getRowId={(item) => String(item.jobId)}
            isLoading={historyLoading}
            emptyState={
              <div className="text-muted-foreground py-6 text-sm">
                No migration jobs match this filter.
              </div>
            }
          />
        </CardContent>
      </Card>

      <Collapsible open={isLegacyToolsExpanded} onOpenChange={setIsLegacyToolsExpanded}>
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Legacy Touchpoint Tools (Deprecated)</CardTitle>
              <p className="text-muted-foreground mt-1 text-xs">
                These tools target legacy touchpoint workflows and are no longer part of the
                recommended subitem-first path.
              </p>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm">
                {isLegacyToolsExpanded ? "Hide Legacy Tools" : "Show Legacy Tools"}
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Baseline Touch Backfill + CSV Export</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Baseline Date</label>
                      <Input
                        type="date"
                        value={baselineDate}
                        onChange={(event) => setBaselineDate(event.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Source Tag</label>
                      <Input
                        value={sourceTag}
                        onChange={(event) => setSourceTag(event.target.value)}
                        placeholder="baseline_import"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Page Size</label>
                      <Input
                        value={pageSize}
                        onChange={(event) => setPageSize(event.target.value)}
                        placeholder="100"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={() => void startBackfill()} disabled={starting}>
                      {starting ? "Starting..." : "Start Backfill"}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => void exportBackfillCsv()}
                      disabled={exportingCsv}
                    >
                      {exportingCsv ? "Starting CSV Export..." : "Start CSV Export"}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => void downloadCsvExport()}
                      disabled={downloadingCsv || csvJob?.status !== "done"}
                    >
                      {downloadingCsv ? "Downloading..." : "Download Latest CSV"}
                    </Button>
                    <div className="flex items-center gap-2">
                      <Input
                        value={csvRowsPerFile}
                        onChange={(event) => setCsvRowsPerFile(event.target.value)}
                        placeholder="8000"
                        className="w-24"
                      />
                      <Button
                        variant="secondary"
                        onClick={() => void downloadCsvExportInParts()}
                        disabled={downloadingCsvParts || csvJob?.status !== "done"}
                      >
                        {downloadingCsvParts ? "Downloading..." : "Download Parts"}
                      </Button>
                    </div>
                    {job?.status === "running" ? (
                      <Button
                        variant="destructive"
                        onClick={() => void cancelBackfill()}
                        disabled={cancelling}
                      >
                        {cancelling ? "Cancelling..." : "Cancel Running Job"}
                      </Button>
              ) : null}
            </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded border p-2 text-xs">
                      <p className="font-medium">Latest Touch Backfill</p>
                      {job ? (
                        <>
                          <p>
                            <Badge variant={getStatusBadgeVariant(job.status)}>{job.status}</Badge>
                          </p>
                          <p>Processed: {job.processedContacts.toLocaleString()}</p>
                          <p>Created: {job.createdTouches.toLocaleString()}</p>
                          <p>Errors: {job.errorsCount.toLocaleString()}</p>
                        </>
                      ) : (
                        <p className="text-muted-foreground">No job found.</p>
                      )}
                    </div>
                    <div className="rounded border p-2 text-xs">
                      <p className="font-medium">Latest CSV Export</p>
                      {csvJob ? (
                        <>
                          <p>
                            <Badge variant={getStatusBadgeVariant(csvJob.status)}>
                              {csvJob.status}
                            </Badge>
                          </p>
                          <p>Rows: {csvJob.rowCount.toLocaleString()}</p>
                          <p>Chunks: {csvJob.chunkCount.toLocaleString()}</p>
                        </>
                      ) : (
                        <p className="text-muted-foreground">No CSV job found.</p>
                      )}
                    </div>
                  </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
                  <CardTitle className="text-sm">Touch Range Backfill (Legacy)</CardTitle>
        </CardHeader>
                <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
                      <span className="whitespace-nowrap text-muted-foreground">From:</span>
              <input
                        type="date"
                className="rounded border px-2 py-1 text-sm"
                        value={touchRangeDateFrom}
                        onChange={(event) => setTouchRangeDateFrom(event.target.value)}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <span className="whitespace-nowrap text-muted-foreground">To:</span>
                      <input
                        type="date"
                        className="rounded border px-2 py-1 text-sm"
                        value={touchRangeDateTo}
                        onChange={(event) => setTouchRangeDateTo(event.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="whitespace-nowrap text-muted-foreground">Page size:</span>
              <input
                type="number"
                className="w-20 rounded border px-2 py-1 text-sm"
                        value={touchRangePageSize}
                min={25}
                max={200}
                        onChange={(event) => setTouchRangePageSize(event.target.value)}
              />
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                        checked={touchRangeDryRun}
                        onChange={(event) => setTouchRangeDryRun(event.target.checked)}
              />
              <span>Dry Run</span>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
                      onClick={() => void startTouchRangeBackfill()}
                      disabled={startingTouchRange}
            >
                      {startingTouchRange
                ? "Starting..."
                        : touchRangeDryRun
                  ? "Start Dry Run"
                  : "Start Backfill"}
            </Button>
                    <Button variant="outline" onClick={() => void refreshTouchRangeStatus()}>
              Refresh Status
            </Button>
                    {touchRangeJob?.status === "running" ? (
              <Button
                variant="destructive"
                        onClick={() => void cancelTouchRangeBackfill()}
                        disabled={cancellingTouchRange}
              >
                        {cancellingTouchRange ? "Cancelling..." : "Cancel"}
              </Button>
            ) : null}
          </div>
                  {touchRangeJob ? (
                    <div className="space-y-1 rounded border p-3 text-xs">
              <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(touchRangeJob.status)}>
                          {touchRangeJob.status}
                </Badge>
                        <span>{touchRangeJob.jobId}</span>
              </div>
              <p>
                        Range: {touchRangeJob.dateFrom} → {touchRangeJob.dateTo}
              </p>
              <p>
                        Processed {touchRangeJob.processedContacts.toLocaleString()} · In range{" "}
                        {touchRangeJob.inRangeContacts.toLocaleString()}
              </p>
              <p>
                        Created {touchRangeJob.createdTouches.toLocaleString()} · Updated{" "}
                        {touchRangeJob.updatedTouches.toLocaleString()} · Skipped{" "}
                        {touchRangeJob.skippedTouches.toLocaleString()}
                      </p>
            </div>
          ) : (
                    <p className="text-muted-foreground text-xs">
                      No touch-range backfill job found.
            </p>
          )}
        </CardContent>
      </Card>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </main>
  );
}
