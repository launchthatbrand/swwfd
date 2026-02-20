import { redirect } from "next/navigation";

import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex-config/_generated/api";

import { AdminBootstrapClient } from "./_components/AdminBootstrapClient";

export default async function AdminLayout(props: { children: React.ReactNode }) {
  const token = await convexAuthNextjsToken();
  if (!token) {
    redirect("/sign-in?return_to=/admin");
  }

  const viewer = await fetchQuery(api.viewer.me, {}, { token });
  if (!viewer) {
    redirect("/sign-in?return_to=/admin");
  }

  // If already admin, render normally. If not, allow bootstrap flow to attempt
  // promoting the first-ever admin (only succeeds when no admins exist yet).
  if (viewer.isAdmin !== true) {
    return (
      <div className="flex w-full flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4 rounded-xl border border-border bg-background p-6">
          <div className="text-lg font-semibold">Admin access required</div>
          <p className="text-muted-foreground text-sm">
            This area is for platform administrators. If this is a fresh SWWFD
            environment with no admins yet, you can bootstrap the first admin
            account.
          </p>
          <AdminBootstrapClient />
        </div>
      </div>
    );
  }

  // Already authorized as admin via server-side check; avoid rendering the bootstrap
  // client component (it can briefly flash a button while viewer loads client-side).
  return props.children;
}

