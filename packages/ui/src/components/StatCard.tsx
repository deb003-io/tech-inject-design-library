import * as React from "react";
import { cn } from "../utils";
import "../theme/theme.css";

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "flat";
}

export function StatCard({ label, value, delta, trend = "flat", className, ...rest }: StatCardProps): React.JSX.Element {
  return (
    <div className={cn("ti-stat", className)} {...rest}>
      <div className="ti-stat-label">{label}</div>
      <div className="ti-stat-value">{value}</div>
      {delta ? <div className={trend === "down" ? "ti-stat-delta-down" : "ti-stat-delta-up"}>{delta}</div> : null}
    </div>
  );
}
