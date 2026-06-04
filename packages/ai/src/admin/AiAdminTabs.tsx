"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@launchthatapp/ui";

const DEFAULT_TABS = [
  { segment: "", label: "Overview" },
  { segment: "/threads", label: "Threads" },
  { segment: "/rag", label: "RAG" },
  { segment: "/pricing", label: "Pricing" },
  { segment: "/logs", label: "Logs" },
  { segment: "/settings", label: "Settings" },
];

export interface AiAdminTabsProps {
  basePath: string;
  tabs?: Array<{ segment: string; label: string }>;
}

export const AiAdminTabs = ({
  basePath,
  tabs = DEFAULT_TABS,
}: AiAdminTabsProps) => {
  const pathname = usePathname();

  return (
    <div className="bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]">
      {tabs.map((tab) => {
        const href = `${basePath}${tab.segment}`;
        const isActive =
          tab.segment === ""
            ? pathname === basePath || pathname === `${basePath}/`
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={tab.segment}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-3 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              isActive &&
                "bg-background dark:text-foreground dark:border-input dark:bg-input/30 shadow-sm",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
};
