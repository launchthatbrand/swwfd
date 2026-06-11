"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const safeReturnTo = (raw: string | null): string => {
  const value = (raw ?? "").trim();
  if (!value) return "/jobs";
  if (value.startsWith("/")) return value;
  return "/jobs";
};

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get("return_to"));

  return (
    <div className="flex w-full flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-background p-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Account creation disabled</h1>
          <p className="text-muted-foreground text-sm">New account registration is not available.</p>
        </div>

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

