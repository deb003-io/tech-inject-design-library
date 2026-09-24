import * as React from "react";
import { cn } from "../utils";
import "../theme/theme.css";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className, ...rest }, ref) => {
    const inputId = id ?? `ti-input-${label?.toLowerCase().replace(/\s+/g, "-") ?? "field"}`;
    return (
      <div>
        {label ? (
          <label htmlFor={inputId} className="ti-label">
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={cn("ti-input", error && "ti-input-error", className)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...rest}
        />
        {error ? (
          <p id={`${inputId}-error`} role="alert" style={{ color: "#d93025", fontSize: "0.75rem", marginTop: "0.25rem" }}>
            {error}
          </p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "Input";
