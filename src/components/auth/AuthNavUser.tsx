"use client";

import * as React from "react";
import { LogOut, User } from "lucide-react";

import { cn } from "@acme/ui";
import { AuthLoading, Authenticated, Unauthenticated } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@convex-config/_generated/api";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

export function AuthNavUser({ className }: { className?: string }) {
  const { signOut } = useAuthActions();
  const viewer = useQuery(api.viewer.me);

  const handleSignOut = React.useCallback(async () => {
    await signOut();
    window.location.assign("/");
  }, [signOut]);

  return (
    <>
      <AuthLoading>
        <Button
          type="button"
          variant="ghost"
          className={cn("text-foreground/60", className)}
          disabled
        >
          Loading…
        </Button>
      </AuthLoading>

      <Unauthenticated>
        <Button
          type="button"
          variant="ghost"
          className={cn("text-foreground/80", className)}
          onClick={() => window.location.assign("/sign-in")}
        >
          Sign in
        </Button>
      </Unauthenticated>

      <Authenticated>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              className={cn("max-w-[220px] justify-start gap-2", className)}
            >
              <User className="h-4 w-4" />
              <span className="truncate">
                {viewer?.name?.trim() ? viewer.name.trim() : viewer?.email ?? "Account"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="space-y-0.5">
              <div className="truncate text-sm font-medium">
                {viewer?.name?.trim() ? viewer.name.trim() : viewer?.email ?? "Account"}
              </div>
              {viewer?.email ? (
                <div className="text-muted-foreground truncate text-xs">
                  {viewer.email}
                </div>
              ) : null}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Authenticated>
    </>
  );
}

