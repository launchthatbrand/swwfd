"use client";

import type { ReactNode } from "react";

type BoardFilterBarProps = {
  left: ReactNode;
  right?: ReactNode;
};

export const BoardFilterBar = ({ left, right }: BoardFilterBarProps) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{left}</div>
      {right ? <div className="flex shrink-0 items-center gap-2">{right}</div> : null}
    </div>
  );
};
