"use client";

import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@launchthatapp/ui/popover";
import { buildMockBusinessInfo } from "../helpers";

export const BusinessInfoHoverCard = (props: {
  companyName: string;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const info = useMemo(
    () => buildMockBusinessInfo(props.companyName),
    [props.companyName],
  );

  return (
    <Popover open={open}>
      <PopoverTrigger asChild>
        <div
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className="inline-flex"
        >
          {props.children}
        </div>
      </PopoverTrigger>
      <PopoverContent
        portal={false}
        side="top"
        align="start"
        className="w-[min(22rem,calc(100vw-2rem))]"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <div className="space-y-1.5">
          <p className="text-sm font-semibold wrap-break-word">{info.name}</p>
          <p className="text-muted-foreground text-xs wrap-break-word">
            {info.industry} · {info.city}, {info.state}
          </p>
          <div className="text-muted-foreground grid grid-cols-2 gap-2 pt-1 text-xs">
            <span>Team size: {info.teamSize}</span>
            <span>Projects: {info.activeProjects}</span>
            <span className="col-span-2">
              Reliability score: {info.reliabilityScore}/100
            </span>
          </div>
          <p className="text-muted-foreground pt-1 text-[11px] leading-snug wrap-break-word whitespace-normal">
            Mock business data preview. Replace with CRM/company profile data when
            integration is ready.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};
