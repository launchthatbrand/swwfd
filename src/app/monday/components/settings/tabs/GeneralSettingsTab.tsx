"use client";

import type { ReactNode } from "react";

type GeneralSettingsTabProps = {
  children: ReactNode;
};

export const GeneralSettingsTab = ({ children }: GeneralSettingsTabProps) => {
  return <div className="space-y-4">{children}</div>;
};
