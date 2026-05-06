import * as React from "react";

import { Legend as RechartsLegend, Tooltip as RechartsTooltip } from "recharts";

import { cn } from "~/lib/utils";

export interface ChartConfigEntry {
  label?: React.ReactNode;
  color?: string;
}

export type ChartConfig = Record<string, ChartConfigEntry>;

const ChartConfigContext = React.createContext<ChartConfig | null>(null);

const useChartConfig = () => {
  const value = React.useContext(ChartConfigContext);
  if (!value) {
    throw new Error("Chart components must be used within ChartContainer.");
  }
  return value;
};

export const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    config: ChartConfig;
  }
>(({ config, className, style, ...props }, ref) => {
  const cssVariables = React.useMemo(() => {
    const vars: Record<string, string> = {};
    for (const [key, entry] of Object.entries(config)) {
      if (!entry.color) continue;
      vars[`--color-${key}`] = entry.color;
    }
    return vars;
  }, [config]);

  return (
    <ChartConfigContext.Provider value={config}>
      <div
        ref={ref}
        className={cn("h-[280px] w-full", className)}
        style={{ ...(cssVariables as React.CSSProperties), ...style }}
        {...props}
      />
    </ChartConfigContext.Provider>
  );
});
ChartContainer.displayName = "ChartContainer";

type TooltipPayloadEntry = {
  color?: string;
  dataKey?: string | number;
  name?: string;
  value?: number | string;
  payload?: Record<string, unknown>;
};

export const ChartTooltip = RechartsTooltip;

export interface ChartTooltipContentProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string | number;
  hideLabel?: boolean;
  valueFormatter?: (value: number | string | undefined) => string;
}

export const ChartTooltipContent = ({
  active,
  payload,
  label,
  hideLabel = false,
  valueFormatter,
}: ChartTooltipContentProps) => {
  const config = useChartConfig();
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-background min-w-[180px] space-y-2 rounded-md border px-3 py-2 text-xs shadow-md">
      {!hideLabel ? <p className="text-muted-foreground font-medium">{label}</p> : null}
      <div className="space-y-1.5">
        {payload.map((entry) => {
          const key = String(entry.dataKey ?? entry.name ?? "");
          const cfg = config[key];
          const rowLabel = cfg?.label ?? entry.name ?? key;
          const rowColor = entry.color ?? cfg?.color ?? "hsl(var(--muted-foreground))";
          const rawValue = entry.value;
          const value = valueFormatter ? valueFormatter(rawValue) : String(rawValue ?? "0");
          return (
            <div key={key} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-[2px]"
                  style={{ backgroundColor: rowColor }}
                />
                <span className="text-muted-foreground">{rowLabel}</span>
              </div>
              <span className="font-medium tabular-nums">{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

type LegendPayloadEntry = {
  color?: string;
  dataKey?: string | number;
  value?: string;
};

export const ChartLegend = RechartsLegend;

export interface ChartLegendContentProps {
  payload?: LegendPayloadEntry[];
}

export const ChartLegendContent = ({ payload }: ChartLegendContentProps) => {
  const config = useChartConfig();
  if (!payload || payload.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
      {payload.map((entry) => {
        const key = String(entry.dataKey ?? entry.value ?? "");
        const cfg = config[key];
        const label = cfg?.label ?? entry.value ?? key;
        const color = entry.color ?? cfg?.color ?? "hsl(var(--muted-foreground))";
        return (
          <div key={key} className="text-muted-foreground flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-[2px]"
              style={{ backgroundColor: color }}
            />
            <span>{label}</span>
          </div>
        );
      })}
    </div>
  );
};
