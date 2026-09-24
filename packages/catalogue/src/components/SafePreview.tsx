import * as React from "react";
import type { ComponentDetail } from "../lib/api";

/**
 * Isolated preview: renders the declarative `preview` schema with trusted
 * catalogue components only. Uploaded component source is NEVER executed
 * here (documented restricted format). This is why newly published
 * components render without per-component imports or frontend redeploys.
 */
export function SafePreview({ detail }: { detail: ComponentDetail }): React.JSX.Element {
  const kind = detail.preview.kind;
  if (kind === "button") {
    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="ti-btn" type="button">Save deal</button>
        <button className="ti-btn ti-btn-secondary" type="button">Cancel</button>
        <button className="ti-btn" type="button" disabled>Disabled</button>
      </div>
    );
  }
  if (kind === "input") {
    return (
      <div style={{ display: "grid", gap: 12, maxWidth: 360 }}>
        <div><label className="ti-label" htmlFor="pv-name">Deal name</label><input id="pv-name" className="ti-input" placeholder="Acme Corp" /></div>
        <div><label className="ti-label" htmlFor="pv-dis">Disabled</label><input id="pv-dis" className="ti-input" disabled value="Locked" /></div>
      </div>
    );
  }
  if (kind === "card") {
    return (
      <div className="ti-card" style={{ maxWidth: 420 }}>
        <div className="ti-card-body">
          <h3 style={{ margin: 0 }}>Deal details</h3>
          <p style={{ color: "#6b7280", fontSize: 14 }}>Acme Corp · Negotiation · $12,000</p>
        </div>
      </div>
    );
  }
  if (kind === "badge") {
    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span className="ti-badge">Prospecting</span>
        <span className="ti-badge" style={{ background: "#e6f4ea", color: "#188038" }}>Won</span>
        <span className="ti-badge" style={{ background: "#fce8e6", color: "#d93025" }}>Lost</span>
      </div>
    );
  }
  if (kind === "stat") {
    return (
      <div className="ti-card" style={{ maxWidth: 300 }}>
        <div className="ti-card-body">
          <div style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase" }}>Pipeline value</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>$248k</div>
          <div style={{ color: "#188038", fontSize: 12 }}>+12% vs last month</div>
        </div>
      </div>
    );
  }
  return (
    <table className="ti-props">
      <thead><tr><th>Deal</th><th>Stage</th><th>Value</th></tr></thead>
      <tbody>
        <tr><td>Acme Corp</td><td>Negotiation</td><td>$12,000</td></tr>
        <tr><td>Globex</td><td>Qualification</td><td>$8,400</td></tr>
      </tbody>
    </table>
  );
}
