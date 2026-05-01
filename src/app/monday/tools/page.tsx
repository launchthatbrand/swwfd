"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentProps } from "react";

import { Badge } from "@launchthatapp/ui/badge";
import { Button } from "@launchthatapp/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@launchthatapp/ui/card";
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

  const startTouchRangeBackfill = async () => {
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel");
    } finally {
      setCancellingTouchRange(false);
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

  useEffect(() => {
    void refresh();
    void refreshCsvStatus();
    void refreshMonthlyMigrationStatus();
    void refreshTouchRangeStatus();
  }, []);

  useEffect(() => {
    const status = job?.status;
    const csvStatus = csvJob?.status;
    const monthlyStatus = monthlyJob?.status;
    const touchRangeStatus = touchRangeJob?.status;
    if (
      status !== "running" &&
      csvStatus !== "running" &&
      monthlyStatus !== "running" &&
      touchRangeStatus !== "running"
    ) {
      return;
    }
    const timer = setInterval(() => {
      void refresh();
      void refreshCsvStatus();
      void refreshMonthlyMigrationStatus();
      void refreshTouchRangeStatus();
    }, 5000);
    return () => clearInterval(timer);
  }, [job?.status, csvJob?.status, monthlyJob?.status, touchRangeJob?.status]);

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
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to cancel backfill";
      toast.error(message);
    } finally {
      setCancelling(false);
    }
  };

  const startMonthlyMigration = async () => {
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

  return (
    <main className="container mx-auto max-w-3xl space-y-4 py-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Monday Tools</h1>
        <p className="text-muted-foreground text-sm">
          Backfill baseline touch rows into the touch board using Convex workflow.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Start Baseline Backfill</CardTitle>
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
              {exportingCsv ? "Starting CSV Export..." : "Start CSV Export Workflow"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => void downloadCsvExport()}
              disabled={downloadingCsv || csvJob?.status !== "done"}
            >
              {downloadingCsv ? "Downloading CSV..." : "Download Latest CSV"}
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
                {downloadingCsvParts ? "Downloading Parts..." : "Download All Parts"}
              </Button>
            </div>
            <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh Status"}
            </Button>
            <Button variant="outline" onClick={() => void refreshCsvStatus()}>
              Refresh CSV Export
            </Button>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Board Migration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Migrate a monthly board into the main API board by using each row&apos;s
            <code className="mx-1">main_database_id</code>
            and preserving updates/subitems.
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
              Dry run (no Monday writes)
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
            <label className="flex items-center gap-2 text-sm">
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
          <div className="flex flex-wrap items-center gap-2">
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
            </label>
          </div>
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
              Refresh Migration Status
            </Button>
            {monthlyJob?.status === "running" ? (
              <Button
                variant="destructive"
                onClick={() => void cancelMonthlyMigration()}
                disabled={cancellingMonthlyMigration}
              >
                {cancellingMonthlyMigration ? "Cancelling..." : "Cancel Migration"}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Latest Monthly Migration Job</CardTitle>
        </CardHeader>
        <CardContent>
          {!monthlyJob ? (
            <p className="text-muted-foreground text-sm">
              No monthly migration job found.
            </p>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">Status:</span>
                <Badge variant={getStatusBadgeVariant(monthlyJob.status)}>
                  {monthlyJob.status}
                </Badge>
              </div>
              <p>
                <span className="font-medium">Job ID:</span> {monthlyJob.jobId}
              </p>
              <p>
                <span className="font-medium">Workflow ID:</span>{" "}
                {monthlyJob.workflowId ?? "—"}
              </p>
              <p>
                <span className="font-medium">Source Board:</span>{" "}
                {monthlyJob.sourceBoardId}
                {monthlyJob.sourceBoardName ? ` (${monthlyJob.sourceBoardName})` : ""}
              </p>
              <p>
                <span className="font-medium">Target Board:</span>{" "}
                {monthlyJob.targetBoardId}
              </p>
              <p>
                <span className="font-medium">Month Tag:</span> {monthlyJob.monthTag}
              </p>
              <p>
                <span className="font-medium">Mode:</span>{" "}
                {monthlyJob.dryRun ? "Dry run" : "Write mode"} ·{" "}
                <span className="font-medium">Page Size:</span> {monthlyJob.pageSize}
              </p>
              <p>
                <span className="font-medium">Processed Contacts:</span>{" "}
                {monthlyJob.processedContacts.toLocaleString()}
              </p>
              <p>
                <span className="font-medium">Mapped / Skipped:</span>{" "}
                {monthlyJob.mappedContacts.toLocaleString()} /{" "}
                {monthlyJob.skippedContacts.toLocaleString()}
              </p>
              <p>
                <span className="font-medium">Created Parent Updates:</span>{" "}
                {monthlyJob.createdParentUpdates.toLocaleString()}
              </p>
              <p>
                <span className="font-medium">Created Subitems:</span>{" "}
                {monthlyJob.createdSubitems.toLocaleString()}
              </p>
              <p>
                <span className="font-medium">Created Subitem Updates:</span>{" "}
                {monthlyJob.createdSubitemUpdates.toLocaleString()}
              </p>
              {monthlyJob.updateProgressColumns ? (
                <p>
                  <span className="font-medium">Updated Progress Columns:</span>{" "}
                  {(monthlyJob.updatedProgressColumns ?? 0).toLocaleString()}
                </p>
              ) : null}
              {monthlyJob.monthKey ? (
                <p>
                  <span className="font-medium">Month Key:</span>{" "}
                  {monthlyJob.monthKey}
                  {" · "}
                  <span className="font-medium">Touch Records:</span>{" "}
                  {(monthlyJob.createdTouchRecords ?? 0).toLocaleString()}
                </p>
              ) : null}
              <p>
                <span className="font-medium">Warnings / Errors:</span>{" "}
                {monthlyJob.warningsCount.toLocaleString()} /{" "}
                {monthlyJob.errorsCount.toLocaleString()}
              </p>
              <p>
                <span className="font-medium">Updated:</span>{" "}
                {new Date(monthlyJob.updatedAt).toLocaleString()}
              </p>
              {monthlyJob.lastError ? (
                <p className="text-destructive">
                  <span className="font-medium">Last Error:</span>{" "}
                  {monthlyJob.lastError}
                </p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Latest CSV Export Job</CardTitle>
        </CardHeader>
        <CardContent>
          {!csvJob ? (
            <p className="text-muted-foreground text-sm">No CSV export job found.</p>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">Status:</span>
                <Badge variant={getStatusBadgeVariant(csvJob.status)}>
                  {csvJob.status}
                </Badge>
              </div>
              <p>
                <span className="font-medium">Job ID:</span> {csvJob.jobId}
              </p>
              <p>
                <span className="font-medium">Workflow ID:</span>{" "}
                {csvJob.workflowId ?? "—"}
              </p>
              <p>
                <span className="font-medium">Rows:</span>{" "}
                {csvJob.rowCount.toLocaleString()} ·{" "}
                <span className="font-medium">Chunks:</span>{" "}
                {csvJob.chunkCount.toLocaleString()}
              </p>
              <p>
                <span className="font-medium">Processed Contacts:</span>{" "}
                {csvJob.processedContacts.toLocaleString()}
              </p>
              <p>
                <span className="font-medium">Updated:</span>{" "}
                {new Date(csvJob.updatedAt).toLocaleString()}
              </p>
              {csvJob.lastError ? (
                <p className="text-destructive">
                  <span className="font-medium">Last Error:</span> {csvJob.lastError}
                </p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Latest Backfill Job</CardTitle>
        </CardHeader>
        <CardContent>
          {!job ? (
            <p className="text-muted-foreground text-sm">No backfill job found.</p>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">Status:</span>
                <Badge variant={getStatusBadgeVariant(job.status)}>
                  {job.status}
                </Badge>
              </div>
              <p>
                <span className="font-medium">Job ID:</span> {job.jobId}
              </p>
              <p>
                <span className="font-medium">Workflow ID:</span>{" "}
                {job.workflowId ?? "—"}
              </p>
              <p>
                <span className="font-medium">Baseline Date:</span> {job.baselineDate}
              </p>
              <p>
                <span className="font-medium">Source Tag:</span> {job.sourceTag}
              </p>
              <p>
                <span className="font-medium">Processed Contacts:</span>{" "}
                {job.processedContacts.toLocaleString()}
              </p>
              <p>
                <span className="font-medium">Created Touches:</span>{" "}
                {job.createdTouches.toLocaleString()}
              </p>
              <p>
                <span className="font-medium">Skipped:</span>{" "}
                {job.skippedTouches.toLocaleString()} ·{" "}
                <span className="font-medium">Errors:</span>{" "}
                {job.errorsCount.toLocaleString()}
              </p>
              <p>
                <span className="font-medium">Started:</span>{" "}
                {new Date(job.startedAt).toLocaleString()}
              </p>
              <p>
                <span className="font-medium">Updated:</span>{" "}
                {new Date(job.updatedAt).toLocaleString()}
              </p>
              {job.finishedAt ? (
                <p>
                  <span className="font-medium">Finished:</span>{" "}
                  {new Date(job.finishedAt).toLocaleString()}
                </p>
              ) : null}
              {job.lastError ? (
                <p className="text-destructive">
                  <span className="font-medium">Last Error:</span> {job.lastError}
                </p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Touch Range Backfill</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Creates one touchpoint record per (contact, owner, month) for all contacts
            whose Registration Date falls within the selected date range. Uses the{" "}
            <code className="bg-muted rounded px-1 text-xs">date1__1</code> column for
            efficient server-side filtering — no full board scan needed.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <span className="whitespace-nowrap text-muted-foreground">From:</span>
              <input
                type="date"
                className="rounded border px-2 py-1 text-sm"
                value={touchRangeDateFrom}
                onChange={(e) => setTouchRangeDateFrom(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="whitespace-nowrap text-muted-foreground">To:</span>
              <input
                type="date"
                className="rounded border px-2 py-1 text-sm"
                value={touchRangeDateTo}
                onChange={(e) => setTouchRangeDateTo(e.target.value)}
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
                onChange={(e) => setTouchRangePageSize(e.target.value)}
              />
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={touchRangeDryRun}
                onChange={(e) => setTouchRangeDryRun(e.target.checked)}
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
            <div className="space-y-1 rounded border p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">Status:</span>
                <Badge variant={getStatusBadgeVariant(touchRangeJob.status)}>
                  {touchRangeJob.status}
                </Badge>
                {touchRangeJob.dryRun ? (
                  <Badge variant="outline" className="text-muted-foreground">
                    dry run
                  </Badge>
                ) : null}
              </div>
              <p>
                <span className="font-medium">Range:</span>{" "}
                {touchRangeJob.dateFrom} → {touchRangeJob.dateTo}
              </p>
              <p>
                <span className="font-medium">Scanned:</span>{" "}
                {touchRangeJob.processedContacts.toLocaleString()} contacts ·{" "}
                <span className="font-medium">In Range:</span>{" "}
                {touchRangeJob.inRangeContacts.toLocaleString()}
              </p>
              <p>
                <span className="font-medium">
                  {touchRangeJob.dryRun ? "Would Create:" : "Created:"}
                </span>{" "}
                {touchRangeJob.createdTouches.toLocaleString()} ·{" "}
                <span className="font-medium">
                  {touchRangeJob.dryRun ? "Would Update:" : "Updated:"}
                </span>{" "}
                {touchRangeJob.updatedTouches.toLocaleString()} ·{" "}
                <span className="font-medium">Skipped:</span>{" "}
                {touchRangeJob.skippedTouches.toLocaleString()} ·{" "}
                <span className="font-medium">Errors:</span>{" "}
                {touchRangeJob.errorsCount.toLocaleString()}
              </p>
              <p>
                <span className="font-medium">Started:</span>{" "}
                {new Date(touchRangeJob.startedAt).toLocaleString()}
              </p>
              <p>
                <span className="font-medium">Updated:</span>{" "}
                {new Date(touchRangeJob.updatedAt).toLocaleString()}
              </p>
              {touchRangeJob.finishedAt ? (
                <p>
                  <span className="font-medium">Finished:</span>{" "}
                  {new Date(touchRangeJob.finishedAt).toLocaleString()}
                </p>
              ) : null}
              {touchRangeJob.lastError ? (
                <p className="text-destructive">
                  <span className="font-medium">Last Error:</span> {touchRangeJob.lastError}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No touch range backfill job found.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
