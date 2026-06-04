"use client";

import type { HTMLAttributes } from "react";
import { cn } from "@launchthatapp/ui";

export interface CodeBlockProps extends HTMLAttributes<HTMLPreElement> {
  code: string;
  language?: string;
}

export const CodeBlock = ({
  code,
  language = "json",
  className,
  ...props
}: CodeBlockProps) => (
  <pre
    className={cn(
      "max-h-72 overflow-auto rounded-md border bg-muted px-3 py-2 text-xs",
      className
    )}
    {...props}
  >
    <code data-language={language}>{code}</code>
  </pre>
);
