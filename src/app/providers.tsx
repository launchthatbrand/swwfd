"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { HostProvider } from "~/context/HostContext";
import { env } from "~/env";

let clientQueryClientSingleton: QueryClient | undefined = undefined;
const getQueryClient = () => {
  if (typeof window === "undefined") {
    return new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });
  }
  return (clientQueryClientSingleton ??= new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000 } },
  }));
};

interface ProvidersProps {
  children: React.ReactNode;
  host: string;
}

export function Providers({ children, host }: ProvidersProps) {
  const convexClient = React.useMemo(
    () => new ConvexReactClient(String(env.NEXT_PUBLIC_CONVEX_URL)),
    [],
  );
  const queryClient = getQueryClient();

  return (
    <HostProvider host={host}>
      <QueryClientProvider client={queryClient}>
        <ConvexAuthNextjsProvider client={convexClient}>
          {children}
        </ConvexAuthNextjsProvider>
      </QueryClientProvider>
    </HostProvider>
  );
}
