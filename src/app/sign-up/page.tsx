"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

const safeReturnTo = (raw: string | null): string => {
  const value = (raw ?? "").trim();
  if (!value) return "/jobs";
  if (value.startsWith("/")) return value;
  return "/jobs";
};

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get("return_to"));
  const { signIn } = useAuthActions();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("email", email);
      formData.set("password", password);
      formData.set("flow", "signUp");
      await signIn("password", formData);
      window.location.assign(returnTo);
    } catch {
      setError("Unable to create account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex w-full flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-background p-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Create account</h1>
          <p className="text-muted-foreground text-sm">
            Save jobs and submit applications.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <p className="text-muted-foreground text-xs">Minimum 8 characters.</p>
          </div>

          {error ? (
            <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
          ) : null}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Creating…" : "Create account"}
          </Button>
        </form>

        <div className="text-muted-foreground text-sm">
          Already have an account?{" "}
          <Link className="text-foreground underline" href={`/sign-in?return_to=${encodeURIComponent(returnTo)}`}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

