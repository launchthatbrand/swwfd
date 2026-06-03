"use client";

import type { ReactNode } from "react";

type BoardToolbarProps = {
  children: ReactNode;
};

export const BoardToolbar = ({ children }: BoardToolbarProps) => {
  return <div className="flex flex-wrap items-center justify-between gap-2">{children}</div>;
};
