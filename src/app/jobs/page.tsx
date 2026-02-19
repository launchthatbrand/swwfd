import Link from "next/link";

import { api } from "@convex-config/_generated/api";

import { getConvexHttpClient } from "~/server/convexHttp";

const normalizeQuery = (value: string | string[] | undefined): string => {
  if (!value) return "";
  const first = Array.isArray(value) ? (value[0] ?? "") : value;
  return first.trim();
};

export default async function JobsPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const q = normalizeQuery(searchParams.q);
  const qLower = q.toLowerCase();

  const convex = getConvexHttpClient();
  const jobs = await convex.query(api.jobs.list, { limit: 100 });

  const filtered =
    qLower.length > 0
      ? jobs.filter((job) => {
          const haystack =
            `${job.title} ${job.company} ${job.location} ${job.tags.join(" ")}`.toLowerCase();
          return haystack.includes(qLower);
        })
      : jobs;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Jobs</h1>
        <p className="text-muted-foreground text-sm">
          {q ? (
            <>
              Showing results for <span className="font-medium">“{q}”</span>
            </>
          ) : (
            "Browse the latest roles."
          )}
        </p>
      </div>

      <div className="mt-8 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-muted-foreground text-sm">
            No jobs found. Add a job via the Convex dashboard using `jobs.create`.
          </div>
        ) : (
          filtered.map((job) => (
            <Link
              key={job._id}
              href={`/jobs/${job._id}`}
              className="block rounded-xl border border-border bg-background p-4 transition hover:bg-muted/40"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold">
                    {job.title}
                  </div>
                  <div className="text-muted-foreground mt-1 truncate text-sm">
                    {job.company} • {job.location}
                  </div>
                </div>
                <div className="text-muted-foreground shrink-0 text-xs">
                  {new Date(job.createdAt).toLocaleDateString()}
                </div>
              </div>
              {job.tags.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {job.tags.slice(0, 6).map((tag) => (
                    <span
                      key={tag}
                      className="text-muted-foreground rounded-full border border-border px-2 py-0.5 text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </Link>
          ))
        )}
      </div>
    </main>
  );
}

