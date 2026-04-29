"use client";

import * as React from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { HostProvider } from "~/context/HostContext";
import { env } from "~/env";

interface ProvidersProps {
  children: React.ReactNode;
  host: string;
}

export function Providers({ children, host }: ProvidersProps) {
  const convexClient = React.useMemo(
    () => new ConvexReactClient(String(env.NEXT_PUBLIC_CONVEX_URL)),
    [],
  );

  return (
    <HostProvider host={host}>
      <ConvexAuthNextjsProvider client={convexClient}>
        {children}
      </ConvexAuthNextjsProvider>
    </HostProvider>
  );
}
