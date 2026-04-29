"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";

import { api } from "@convex-config/_generated/api";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";

export function JobListingsClient() {
  const jobs = useQuery(api.jobs.list, { limit: 100 });
  const createJob = useMutation(api.jobs.create);

  const [title, setTitle] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [tags, setTags] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await createJob({
        title,
        company,
        location,
        description,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      setTitle("");
      setCompany("");
      setLocation("");
      setTags("");
      setDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create job.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-background p-4">
        <div className="text-sm font-medium">Create job</div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
          <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" />
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" />
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags (comma separated)" />
        </div>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          rows={6}
        />
        {error ? <div className="text-sm text-red-600 dark:text-red-400">{error}</div> : null}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create"}
        </Button>
      </form>

      <div className="space-y-3">
        <div className="text-sm font-medium">Existing jobs</div>
        {jobs === undefined ? (
          <div className="text-muted-foreground text-sm">Loading…</div>
        ) : jobs.length === 0 ? (
          <div className="text-muted-foreground text-sm">No jobs yet.</div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <div key={job._id} className="rounded-lg border border-border bg-background p-3">
                <div className="font-medium">{job.title}</div>
                <div className="text-muted-foreground text-sm">
                  {job.company} • {job.location}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

