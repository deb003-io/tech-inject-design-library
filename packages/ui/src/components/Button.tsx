import * as React from "react";
import { cn } from "../utils";
import "../theme/theme.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, type = "button", ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn("ti-btn", `ti-btn-${variant}`, size !== "md" && `ti-btn-${size}`, className)}
      {...rest}
    />
  )
);
Button.displayName = "Button";
