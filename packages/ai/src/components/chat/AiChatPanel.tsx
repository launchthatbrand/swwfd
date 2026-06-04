import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export type AiChatPanelProps = HTMLAttributes<HTMLDivElement>;

export const AiChatPanel = ({ className, ...props }: AiChatPanelProps) => (
  <div
    className={cn(
      "flex min-h-0 flex-1 flex-col rounded-lg border bg-background",
      className
    )}
    {...props}
  />
);
