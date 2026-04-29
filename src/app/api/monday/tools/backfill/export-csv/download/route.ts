/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { NextResponse } from "next/server";

import { api as apiGenerated } from "@convex-config/_generated/api";

import { getConvexHttpClient } from "~/server/convexHttp";

export const runtime = "nodejs";

const apiAny = apiGenerated as any;

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const jobId = url.searchParams.get("jobId");
  const partParam = url.searchParams.get("part");
  const maxRowsParam = url.searchParams.get("maxRows");
  if (!jobId) {
    return NextResponse.json({ ok: false, error: "Missing jobId" }, { status: 400 });
  }
  try {
    const convex = getConvexHttpClient();
    const result = await convex.query(apiAny.mondayTouchBackfill.getCsvExportCsv, {
      jobId,
    });
    if (!result) {
      return NextResponse.json({ ok: false, error: "CSV export job not found" }, { status: 404 });
    }
    if (result.status !== "done" || !result.csv) {
      return NextResponse.json(
        {
          ok: false,
          error: result.lastError ?? "CSV export not finished yet",
          status: result.status,
        },
        { status: 409 },
      );
    }

    const parsedPart = Number(partParam ?? "1");
    const parsedMaxRows = Number(maxRowsParam ?? "0");
    const hasSplitRequest =
      Number.isFinite(parsedPart) &&
      parsedPart >= 1 &&
      Number.isFinite(parsedMaxRows) &&
      parsedMaxRows >= 1;
    if (hasSplitRequest) {
      const allLines = result.csv.split("\n");
      const nonEmptyLines =
        allLines.length > 0 && allLines[allLines.length - 1] === ""
          ? allLines.slice(0, -1)
          : allLines;
      if (nonEmptyLines.length === 0) {
        return NextResponse.json({ ok: false, error: "CSV is empty" }, { status: 500 });
      }
      const header = nonEmptyLines[0]!;
      const rows = nonEmptyLines.slice(1);
      const maxRows = Math.floor(parsedMaxRows);
      const part = Math.floor(parsedPart);
      const partCount = Math.max(1, Math.ceil(rows.length / maxRows));
      if (part > partCount) {
        return NextResponse.json(
          { ok: false, error: `Requested part ${part} exceeds partCount ${partCount}` },
          { status: 400 },
        );
      }
      const start = (part - 1) * maxRows;
      const end = start + maxRows;
      const partRows = rows.slice(start, end);
      const partCsv = `${[header, ...partRows].join("\n")}\n`;
      const baseName = result.fileName.replace(/\.csv$/i, "");
      const partFileName = `${baseName}.part${part}-of-${partCount}.csv`;
      return new Response(partCsv, {
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="${partFileName}"`,
          "x-csv-part": String(part),
          "x-csv-part-count": String(partCount),
          "cache-control": "no-store",
        },
      });
    }

    return new Response(result.csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${result.fileName}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to download CSV export";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
};

