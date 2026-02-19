"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/jobs?q=${encodeURIComponent(q)}` : "/jobs");
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-6 py-14">
      <div className="space-y-3">
        <p className="text-muted-foreground text-xs font-semibold tracking-[0.22em] uppercase">
          Job board
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Find jobs. Apply fast.
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
          Search for roles by title, company, or location, then apply with a simple
          workflow.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 flex w-full gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search jobs (e.g. frontend, remote, React)…"
        />
        <Button type="submit">Search</Button>
      </form>

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <Link className="underline" href="/jobs">
          Browse all jobs
        </Link>
        <Link className="underline" href="/sign-in">
          Sign in
        </Link>
        <Link className="underline" href="/sign-up">
          Create account
        </Link>
      </div>
    </main>
  );
}

