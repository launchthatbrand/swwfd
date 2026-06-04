import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/utils";

export interface AiChatHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}

export const AiChatHeader = ({
  className,
  title,
  subtitle,
  actions,
  ...props
}: AiChatHeaderProps) => (
  <div
    className={cn(
      "flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3",
      className
    )}
    {...props}
  >
    <div className="space-y-1">
      {title && <h2 className="text-base font-semibold">{title}</h2>}
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);
