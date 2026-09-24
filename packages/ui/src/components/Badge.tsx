import * as React from "react";
import { cn } from "../utils";
import "../theme/theme.css";

export type BadgeTone = "neutral" | "success" | "warning" | "error" | "info";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ tone = "neutral", className, ...rest }: BadgeProps): React.JSX.Element {
  return <span className={cn("ti-badge", `ti-badge-${tone}`, className)} {...rest} />;
}
