"use client";

import Link from "next/link";
import { useQuery } from "convex/react";

import { api } from "@convex-config/_generated/api";

export function ApplicationsClient() {
  const apps = useQuery(api.jobApplications.listMine);

  if (apps === undefined) {
    return <div className="text-muted-foreground text-sm">Loading…</div>;
  }

  if (apps.length === 0) {
    return (
      <div className="text-muted-foreground text-sm">
        No applications yet.{" "}
        <Link className="underline" href="/jobs">
          Browse jobs
        </Link>
        .
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {apps.map((a) => (
        <div key={a._id} className="rounded-lg border border-border bg-background p-3">
          <div className="text-sm font-medium">Application</div>
          <div className="text-muted-foreground text-xs">
            Job ID: {a.jobId}
          </div>
        </div>
      ))}
    </div>
  );
}

