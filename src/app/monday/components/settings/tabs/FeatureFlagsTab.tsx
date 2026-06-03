"use client";

import type { ReactNode } from "react";

type FeatureFlagsTabProps = {
  children: ReactNode;
};

export const FeatureFlagsTab = ({ children }: FeatureFlagsTabProps) => {
  return <div className="space-y-4">{children}</div>;
};
