"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@acme/ui/badge";
import { Button } from "@acme/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@acme/ui/card";
import { Input } from "@acme/ui/input";
import { toast } from "@acme/ui/toast";

type BackfillJob = {
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
};

type CsvExportJob = {
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
};

export default function MondayToolsPage() {
  const [job, setJob] = useState<BackfillJob | null>(null);
  const [csvJob, setCsvJob] = useState<CsvExportJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [downloadingCsvParts, setDownloadingCsvParts] = useState(false);
  const [baselineDate, setBaselineDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [sourceTag, setSourceTag] = useState("");
  const [pageSize, setPageSize] = useState("100");
  const [csvRowsPerFile, setCsvRowsPerFile] = useState("8000");

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

  useEffect(() => {
    void refresh();
    void refreshCsvStatus();
  }, []);

  useEffect(() => {
    const status = job?.status;
    const csvStatus = csvJob?.status;
    if (status !== "running" && csvStatus !== "running") return;
    const timer = setInterval(() => {
      void refresh();
      void refreshCsvStatus();
    }, 5000);
    return () => clearInterval(timer);
  }, [job?.status, csvJob?.status]);

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

  const statusBadgeVariant = useMemo(() => {
    switch (job?.status) {
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
  }, [job?.status]);

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
          <CardTitle className="text-base">Latest CSV Export Job</CardTitle>
        </CardHeader>
        <CardContent>
          {!csvJob ? (
            <p className="text-muted-foreground text-sm">No CSV export job found.</p>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">Status:</span>
                <Badge variant={statusBadgeVariant as any}>{csvJob.status}</Badge>
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
                <Badge variant={statusBadgeVariant as any}>{job.status}</Badge>
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
    </main>
  );
}
