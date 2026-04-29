import Link from "next/link";
import { notFound } from "next/navigation";

import { api } from "@convex-config/_generated/api";
import type { Id } from "@convex-config/_generated/dataModel";

import { getConvexHttpClient } from "~/server/convexHttp";
import { Button } from "~/components/ui/button";

export default async function JobDetailPage(props: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await props.params;

  const convex = getConvexHttpClient();
  const job = await convex.query(api.jobs.get, { jobId: jobId as Id<"jobs"> });
  if (!job) notFound();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {job.title}
          </h1>
          <div className="text-muted-foreground truncate text-sm">
            {job.company} • {job.location}
          </div>
        </div>
        <Button asChild>
          <Link href={`/jobs/${job._id}/apply`}>Apply</Link>
        </Button>
      </div>

      {job.tags.length ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {job.tags.map((tag) => (
            <span
              key={tag}
              className="text-muted-foreground rounded-full border border-border px-2 py-0.5 text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="prose dark:prose-invert mt-8 max-w-none">
        <p className="whitespace-pre-wrap">{job.description}</p>
      </div>
    </main>
  );
}

