import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ChartCard({
  title,
  description,
  action,
  children,
  className,
  height = 280,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  height?: number;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent>
        <div style={{ height }} className="w-full">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

/** Gaya umum untuk Tooltip Recharts agar mengikuti tema. */
export const chartTooltipStyle = {
  contentStyle: {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 12,
    boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
    fontSize: 12,
    color: "hsl(var(--foreground))",
  },
  labelStyle: { fontWeight: 700, color: "hsl(var(--foreground))" },
  cursor: { fill: "hsl(var(--muted))", opacity: 0.5 },
} as const;

export const axisProps = {
  tick: { fill: "hsl(var(--muted-foreground))", fontSize: 12 },
  axisLine: false,
  tickLine: false,
} as const;
