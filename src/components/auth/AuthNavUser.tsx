"use client";

import * as React from "react";
import { LogOut, User } from "lucide-react";

import { cn } from "@acme/ui";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

type Viewer =
  | {
      userId: string;
      email: string;
      name?: string;
    }
  | null;

export function AuthNavUser({ className }: { className?: string }) {
  const [viewer, setViewer] = React.useState<Viewer>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as unknown;
      const user =
        json && typeof json === "object" && "user" in json
          ? ((json as { user: Viewer }).user ?? null)
          : null;
      setViewer(user);
    } catch {
      setViewer(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleSignOut = React.useCallback(async () => {
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
    } catch {
      // ignore
    } finally {
      window.location.assign("/");
    }
  }, []);

  if (loading) {
    return (
      <Button
        type="button"
        variant="ghost"
        className={cn("text-foreground/60", className)}
        disabled
      >
        Loading…
      </Button>
    );
  }

  if (!viewer) {
    return (
      <Button
        type="button"
        variant="ghost"
        className={cn("text-foreground/80", className)}
        onClick={() => window.location.assign("/sign-in")}
      >
        Sign in
      </Button>
    );
  }

  const label = viewer.name?.trim() ? viewer.name.trim() : viewer.email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          className={cn("max-w-[220px] justify-start gap-2", className)}
        >
          <User className="h-4 w-4" />
          <span className="truncate">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="space-y-0.5">
          <div className="truncate text-sm font-medium">{label}</div>
          <div className="text-muted-foreground truncate text-xs">{viewer.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

