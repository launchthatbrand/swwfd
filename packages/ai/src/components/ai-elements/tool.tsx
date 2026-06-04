"use client";

import {
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  ClockIcon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@launchthatapp/ui/collapsible";
import type { ComponentProps, ReactNode } from "react";
import type { DynamicToolUIPart, ToolUIPart } from "ai";

import { Badge } from "@launchthatapp/ui/badge";
import { CodeBlock } from "./code-block";
import { cn } from "@launchthatapp/ui";
import { isValidElement } from "react";

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn("rounded-lg border bg-background", className)}
    defaultOpen
    {...props}
  />
);

export type ToolPart = ToolUIPart | DynamicToolUIPart;

export type ToolHeaderProps = {
  title?: string;
  className?: string;
} & (
    | { type: ToolUIPart["type"]; state: ToolUIPart["state"]; toolName?: never }
    | {
      type: DynamicToolUIPart["type"];
      state: DynamicToolUIPart["state"];
      toolName: string;
    }
  );

const labels: Record<string, string> = {
  "input-streaming": "Pending",
  "input-available": "Running",
  "approval-requested": "Awaiting Approval",
  "approval-responded": "Responded",
  "output-available": "Completed",
  "output-error": "Error",
  "output-denied": "Denied",
};

const icons: Record<string, ReactNode> = {
  "input-streaming": <ClockIcon className="size-3" />,
  "input-available": <CircleIcon className="size-3" />,
  "approval-requested": <ClockIcon className="size-3" />,
  "approval-responded": <CircleIcon className="size-3" />,
  "output-available": <CheckCircleIcon className="size-3" />,
  "output-error": <XCircleIcon className="size-3" />,
  "output-denied": <XCircleIcon className="size-3" />,
};

export const ToolHeader = ({
  className,
  title,
  type,
  state,
  toolName,
  ...props
}: ToolHeaderProps) => {
  const derivedName =
    type === "dynamic-tool"
      ? toolName
      : type.split("-").slice(1).join("-");

  return (
    <CollapsibleTrigger
      className={cn(
        "flex w-full items-center justify-between gap-3 px-3 py-2 text-left",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        <WrenchIcon className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">{title ?? derivedName}</span>
      </div>
      <div className="flex items-center gap-2">
        <Badge className="flex items-center gap-1" variant="secondary">
          {icons[String(state)] ?? <CircleIcon className="size-3" />}
          <span className="text-xs">
            {labels[String(state)] ?? String(state)}
          </span>
        </Badge>
        <ChevronDownIcon className="size-4 text-muted-foreground" />
      </div>
    </CollapsibleTrigger>
  );
};

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({
  className,
  ...props
}: ToolContentProps) => (
  <CollapsibleContent
    className={cn("border-t px-3 pb-3 pt-2", className)}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<"div"> & {
  input: ToolPart["input"];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <div className={cn("space-y-2", className)} {...props}>
    <p className="text-xs font-medium uppercase text-muted-foreground">
      Parameters
    </p>
    <CodeBlock code={JSON.stringify(input ?? {}, null, 2)} language="json" />
  </div>
);

export type ToolOutputProps = ComponentProps<"div"> & {
  output: ToolPart["output"];
  errorText: ToolPart["errorText"];
};

export const ToolOutput = ({
  className,
  output,
  errorText,
  ...props
}: ToolOutputProps) => {
  if (!(output || errorText)) {
    return null;
  }

  let Output: ReactNode = output as ReactNode;

  if (typeof output === "object" && !isValidElement(output)) {
    Output = (
      <CodeBlock
        code={JSON.stringify(output, null, 2)}
        language="json"
      />
    );
  } else if (typeof output === "string") {
    Output = <CodeBlock code={output} language="text" />;
  }

  return (
    <div className={cn("space-y-2", className)} {...props}>
      <p className="text-xs font-medium uppercase text-muted-foreground">
        {errorText ? "Error" : "Result"}
      </p>
      {errorText ? (
        <CodeBlock code={errorText} language="text" />
      ) : (
        Output
      )}
    </div>
  );
};
