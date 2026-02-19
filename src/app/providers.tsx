"use client";

import * as React from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
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
      <ConvexProvider client={convexClient}>{children}</ConvexProvider>
    </HostProvider>
  );
}
