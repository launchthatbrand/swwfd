import Link from "next/link";
import { notFound } from "next/navigation";

import { api } from "@convex-config/_generated/api";
import type { Id } from "@convex-config/_generated/dataModel";

import { getConvexHttpClient } from "~/server/convexHttp";
import { ApplyJobClient } from "./ApplyJobClient";

export default async function JobApplyPage(props: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await props.params;

  const convex = getConvexHttpClient();
  const job = await convex.query(api.jobs.get, { jobId: jobId as Id<"jobs"> });
  if (!job) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="space-y-2">
        <div className="text-muted-foreground text-sm">
          Applying to{" "}
          <Link className="underline" href={`/jobs/${job._id}`}>
            {job.title}
          </Link>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Submit application</h1>
      </div>

      <div className="mt-8">
        <ApplyJobClient jobId={jobId} />
      </div>
    </main>
  );
}

