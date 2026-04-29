import { redirect } from "next/navigation";

import { isAuthenticatedNextjs } from "@convex-dev/auth/nextjs/server";

export default async function DashboardLayout(props: { children: React.ReactNode }) {
  const ok = await isAuthenticatedNextjs();
  if (!ok) {
    redirect("/sign-in?return_to=/dashboard");
  }
  return props.children;
}

