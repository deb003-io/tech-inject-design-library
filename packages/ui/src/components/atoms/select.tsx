import * as React from "react";
import "../../theme/theme.css";

/** Deprecated: native select passthrough kept for back-compat. Prefer a controlled combobox. */
export interface LegacySelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Array<{ value: string; label: string }>;
}

export function LegacySelect({ label, options, id, ...rest }: LegacySelectProps): React.JSX.Element {
  const selectId = id ?? "ti-legacy-select";
  return (
    <div>
      {label ? <label htmlFor={selectId} className="ti-label">{label}</label> : null}
      <select id={selectId} className="ti-input" {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
export { LegacySelect as Select };
