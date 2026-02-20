import Link from "next/link";

import { ApplicationsClient } from "./_components/ApplicationsClient";

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Your saved activity and applications.
          </p>
        </div>
        <Link className="underline text-sm" href="/jobs">
          Browse jobs
        </Link>
      </div>

      <div className="mt-8 space-y-3">
        <div className="text-sm font-medium">My applications</div>
        <ApplicationsClient />
      </div>
    </main>
  );
}

