import * as React from "react";
import { cn } from "../utils";
import "../theme/theme.css";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export function Card({ header, footer, className, children, ...rest }: CardProps): React.JSX.Element {
  return (
    <div className={cn("ti-card", className)} {...rest}>
      {header ? <div className="ti-card-header">{header}</div> : null}
      <div className="ti-card-body">{children}</div>
      {footer ? <div className="ti-card-footer">{footer}</div> : null}
    </div>
  );
}
