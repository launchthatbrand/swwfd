"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";

import { api } from "@convex-config/_generated/api";
import { Button } from "~/components/ui/button";

export function AdminBootstrapClient() {
  const viewer = useQuery(api.viewer.me);
  const ensureFirstAdmin = useMutation(api.admin.ensureFirstAdmin);

  const [status, setStatus] = React.useState<
    "idle" | "working" | "done" | "error"
  >("idle");

  const handleBootstrap = async () => {
    setStatus("working");
    try {
      await ensureFirstAdmin({});
      setStatus("done");
      window.location.reload();
    } catch {
      setStatus("error");
    }
  };

  if (viewer?.isAdmin === true) return null;

  return (
    <div className="space-y-3">
      <Button type="button" onClick={handleBootstrap} disabled={status === "working"}>
        {status === "working" ? "Bootstrapping…" : "Bootstrap First Admin"}
      </Button>
      {status === "error" ? (
        <div className="text-sm text-red-600 dark:text-red-400">
          Unable to bootstrap admin. Either an admin already exists or this account
          is not eligible.
        </div>
      ) : null}
      {status === "done" ? (
        <div className="text-muted-foreground text-sm">Done. Reloading…</div>
      ) : null}
    </div>
  );
}

