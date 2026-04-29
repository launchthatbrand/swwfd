"use client";

import * as React from "react";

export interface HostContextValue {
  host: string;
  hostname: string;
}

const HostContext = React.createContext<HostContextValue | null>(null);

export const HostProvider = ({
  host,
  children,
}: {
  host: string;
  children: React.ReactNode;
}) => {
  const hostname = (host.split(":")[0] ?? "").toLowerCase();

  const value = React.useMemo<HostContextValue>(() => {
    return {
      host,
      hostname,
    };
  }, [host, hostname]);

  return <HostContext.Provider value={value}>{children}</HostContext.Provider>;
};

export const useHostContext = (): HostContextValue => {
  const ctx = React.useContext(HostContext);
  if (!ctx) {
    throw new Error("useHostContext must be used within HostProvider");
  }
  return ctx;
};
