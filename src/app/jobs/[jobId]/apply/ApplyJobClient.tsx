"use client";

import * as React from "react";
import { useMutation } from "convex/react";

import { api } from "@convex-config/_generated/api";
import type { Id } from "@convex-config/_generated/dataModel";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";

export function ApplyJobClient(props: { jobId: string }) {
  const applyToJob = useMutation(api.jobApplications.apply);
  const [coverLetter, setCoverLetter] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await applyToJob({
        jobId: props.jobId as Id<"jobs">,
        coverLetter,
      });
      setSuccess(true);
    } catch {
      // Most common case is unauthenticated; middleware will also protect the route.
      window.location.assign(
        `/sign-in?return_to=${encodeURIComponent(`/jobs/${props.jobId}/apply`)}`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-xl border border-border bg-background p-6">
        <div className="text-lg font-semibold">Application submitted</div>
        <p className="text-muted-foreground mt-2 text-sm">
          Thanks. You can close this page or keep browsing jobs.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <div className="text-sm font-medium">Cover letter</div>
        <Textarea
          value={coverLetter}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setCoverLetter(e.target.value)
          }
          placeholder="Optional: a short note to the employer…"
          rows={8}
        />
        <div className="text-muted-foreground text-xs">
          Optional. You can leave this empty and still apply.
        </div>
      </div>

      {error ? (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      ) : null}

      <Button type="submit" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit application"}
      </Button>
    </form>
  );
}

