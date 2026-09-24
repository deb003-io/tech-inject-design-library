import { hashPassword } from "./auth";
import { JsonDb } from "./db";
import type { ComponentRecord, DbSchema, User } from "./types";
import { validateBundle } from "./validation";

const THEME_CSS = `:root{--ti-primary:#1a73e8;--ti-primary-hover:#1557b0;--ti-text:#1a1a1a;--ti-muted:#6b7280;--ti-border:#e5e7eb;--ti-font:'Inter',system-ui,sans-serif}
.ti-btn{font-family:var(--ti-font);display:inline-flex;align-items:center;justify-content:center;border-radius:8px;font-size:.875rem;font-weight:500;padding:.5rem 1rem;border:1px solid transparent;cursor:pointer}
.ti-btn:focus-visible{outline:2px solid var(--ti-primary);outline-offset:2px}.ti-btn:disabled{opacity:.5;cursor:not-allowed}
.ti-btn-primary{background:var(--ti-primary);color:#fff}.ti-btn-primary:hover:not(:disabled){background:var(--ti-primary-hover)}
.ti-btn-secondary{background:#fff;color:var(--ti-text);border-color:var(--ti-border)}.ti-btn-secondary:hover:not(:disabled){background:#f3f4f6}
.ti-btn-ghost{background:transparent;color:var(--ti-text)}.ti-btn-ghost:hover:not(:disabled){background:#f3f4f6}
.ti-btn-danger{background:#d93025;color:#fff}
.ti-input{font-family:var(--ti-font);width:100%;border:1px solid var(--ti-border);border-radius:8px;padding:.5rem .75rem;font-size:.875rem}
.ti-input:focus{outline:2px solid var(--ti-primary);border-color:var(--ti-primary)}.ti-input:disabled{background:#f3f4f6}
.ti-label{font-family:var(--ti-font);font-size:.875rem;font-weight:500;display:block;margin-bottom:.375rem}
.ti-card{font-family:var(--ti-font);background:#fff;border:1px solid var(--ti-border);border-radius:12px}
.ti-card-header{padding:1rem 1.25rem;border-bottom:1px solid var(--ti-border);font-weight:600}
.ti-card-body{padding:1.25rem}.ti-card-footer{padding:.75rem 1.25rem;border-top:1px solid var(--ti-border);font-size:.75rem;color:var(--ti-muted)}
.ti-badge{font-family:var(--ti-font);display:inline-flex;align-items:center;border-radius:9999px;font-size:.75rem;font-weight:500;padding:.125rem .625rem;border:1px solid transparent}
.ti-badge-neutral{background:#f3f4f6;color:#374151}.ti-badge-success{background:#e6f4ea;color:#188038}
.ti-badge-warning{background:#fef7e0;color:#e37400}.ti-badge-error{background:#fce8e6;color:#d93025}.ti-badge-info{background:#e8f0fe;color:#1a73e8}
.ti-stat{font-family:var(--ti-font);background:#fff;border:1px solid var(--ti-border);border-radius:12px;padding:1rem 1.25rem}
.ti-stat-label{font-size:.75rem;color:var(--ti-muted);font-weight:500;text-transform:uppercase;letter-spacing:.04em}
.ti-stat-value{font-size:1.5rem;font-weight:700;margin-top:.25rem}
.ti-table{font-family:var(--ti-font);width:100%;border-collapse:collapse;font-size:.875rem}
.ti-table th{text-align:left;font-size:.75rem;color:var(--ti-muted);text-transform:uppercase;padding:.625rem 1rem;border-bottom:1px solid var(--ti-border);background:#f9fafb}
.ti-table td{padding:.75rem 1rem;border-bottom:1px solid #f3f4f6}.ti-table tbody tr:hover{background:#f9fafb}
`;

function thumb(label: string, accent: string): string {
  const safe = label.replace(/[<>&"]/g, "");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" rx="16" fill="#f8f9fa"/><rect x="48" y="48" width="544" height="264" rx="12" fill="#ffffff" stroke="#e5e7eb"/><rect x="80" y="120" width="220" height="44" rx="8" fill="${accent}"/><text x="80" y="96" font-family="Inter,sans-serif" font-size="22" font-weight="600" fill="#1a1a1a">${safe}</text><text x="80" y="216" font-family="Inter,sans-serif" font-size="14" fill="#6b7280">Static thumbnail — sign in for live preview</text></svg>`;
}

interface SeedOptions {
  dbPath: string;
  adminEmail: string;
  adminPasswordHash: string;
  freeEmail: string;
  freePassword: string;
  premiumEmail: string;
  premiumPassword: string;
}

const BUTTON_SOURCE = `import * as React from "react";
import "./theme.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** CRM primary action button. Keyboard-operable, visible focus ring, disabled state. */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, type = "button", ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      className={["ti-btn", \`ti-btn-\${variant}\`, size !== "md" ? \`ti-btn-\${size}\` : "", className ?? ""].filter(Boolean).join(" ")}
      {...rest}
    />
  )
);
Button.displayName = "Button";
`;

const INPUT_SOURCE = `import * as React from "react";
import "./theme.css";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/** CRM text field with accessible label and error announcement. */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, ...rest }, ref) => {
    const inputId = id ?? "ti-input";
    return (
      <div>
        {label ? <label htmlFor={inputId} className="ti-label">{label}</label> : null}
        <input ref={ref} id={inputId} className="ti-input" aria-invalid={Boolean(error)} {...rest} />
        {error ? <p role="alert" style={{ color: "#d93025", fontSize: "0.75rem" }}>{error}</p> : null}
      </div>
    );
  }
);
Input.displayName = "Input";
`;

const CARD_SOURCE = `import * as React from "react";
import "./theme.css";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

/** CRM card container: 12px radius, 1px border, header/body/footer slots. */
export function Card({ header, footer, children, ...rest }: CardProps): React.JSX.Element {
  return (
    <div className="ti-card" {...rest}>
      {header ? <div className="ti-card-header">{header}</div> : null}
      <div className="ti-card-body">{children}</div>
      {footer ? <div className="ti-card-footer">{footer}</div> : null}
    </div>
  );
}
`;

const BADGE_SOURCE = `import * as React from "react";
import "./theme.css";

export type BadgeTone = "neutral" | "success" | "warning" | "error" | "info";

/** CRM status pill used for deal stages and pipeline states. */
export function Badge({ tone = "neutral", children, ...rest }: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }): React.JSX.Element {
  return <span className={\`ti-badge ti-badge-\${tone}\`} {...rest}>{children}</span>;
}
`;

const STAT_SOURCE = `import * as React from "react";
import "./theme.css";

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "flat";
}

/** PREMIUM: CRM KPI stat card (pipeline value, win rate). */
export function StatCard({ label, value, delta, trend = "flat", ...rest }: StatCardProps): React.JSX.Element {
  const color = trend === "down" ? "#d93025" : "#188038";
  return (
    <div className="ti-stat" {...rest}>
      <div className="ti-stat-label">{label}</div>
      <div className="ti-stat-value">{value}</div>
      {delta ? <div style={{ color, fontSize: "0.75rem", fontWeight: 500 }}>{delta}</div> : null}
    </div>
  );
}
`;

const TABLE_SOURCE = `import * as React from "react";
import "./theme.css";

export interface DealRow { id: string; name: string; stage: string; value: string }

/** PREMIUM: CRM deals table. Rows are keyboard-selectable (Enter/Space). */
export function DataTable({ rows, selectedId, onSelect }: { rows: DealRow[]; selectedId?: string; onSelect?: (r: DealRow) => void }): React.JSX.Element {
  if (rows.length === 0) return <p style={{ color: "#6b7280" }}>No deals yet</p>;
  return (
    <table className="ti-table">
      <thead><tr><th scope="col">Deal</th><th scope="col">Stage</th><th scope="col">Value</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr
            key={r.id}
            aria-selected={selectedId === r.id}
            tabIndex={onSelect ? 0 : undefined}
            onClick={() => onSelect?.(r)}
            onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && onSelect) { e.preventDefault(); onSelect(r); } }}
          >
            <td>{r.name}</td><td>{r.stage}</td><td>{r.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
`;

export async function seedDatabase(opts: SeedOptions): Promise<void> {
  const db = new JsonDb(opts.dbPath);
  const existing = await db.load();
  if (existing.users.length > 0 || existing.components.length > 0) return;

  const now = new Date().toISOString();
  const users: User[] = [
    { id: "u-admin", email: opts.adminEmail, passwordHash: opts.adminPasswordHash, role: "admin", premium: false, createdAt: now },
    { id: "u-free", email: opts.freeEmail, passwordHash: await hashPassword(opts.freePassword), role: "customer", premium: false, createdAt: now },
    { id: "u-premium", email: opts.premiumEmail, passwordHash: await hashPassword(opts.premiumPassword), role: "customer", premium: true, createdAt: now }
  ];

  const defs = [
    {
      name: "Button", slug: "button", description: "Primary CRM action button with primary/secondary/ghost/danger variants and sm/md/lg sizes.", category: "Actions", version: "1.0.0", accessLevel: "free",
      files: [{ path: "Button.tsx", content: BUTTON_SOURCE }, { path: "theme.css", content: THEME_CSS }],
      entry: "Button.tsx",
      exampleUsage: `import { Button } from "./components/Button";\nimport "./components/theme.css";\n\n<Button variant="primary" onClick={() => alert("Saved")}>Save deal</Button>`,
      propsDoc: [
        { name: "variant", type: '"primary" | "secondary" | "ghost" | "danger"', required: false, description: "Visual variant" },
        { name: "size", type: '"sm" | "md" | "lg"', required: false, description: "Button size" },
        { name: "disabled", type: "boolean", required: false, description: "Disabled state" }
      ],
      dependencies: ["react", "react-dom"],
      preview: { kind: "button", props: {} }
    },
    {
      name: "Input", slug: "input", description: "CRM text field with accessible label, placeholder, error and disabled states.", category: "Forms", version: "1.0.0", accessLevel: "free",
      files: [{ path: "Input.tsx", content: INPUT_SOURCE }, { path: "theme.css", content: THEME_CSS }],
      entry: "Input.tsx",
      exampleUsage: `import { Input } from "./components/Input";\n\n<Input label="Deal name" placeholder="Acme Corp" />`,
      propsDoc: [
        { name: "label", type: "string", required: false, description: "Accessible label" },
        { name: "error", type: "string", required: false, description: "Error message announced via role=alert" }
      ],
      dependencies: ["react", "react-dom"],
      preview: { kind: "input", props: {} }
    },
    {
      name: "Card", slug: "card", description: "CRM card container with header/body/footer slots, 12px radius and 1px border.", category: "Layout", version: "1.0.0", accessLevel: "free",
      files: [{ path: "Card.tsx", content: CARD_SOURCE }, { path: "theme.css", content: THEME_CSS }],
      entry: "Card.tsx",
      exampleUsage: `import { Card } from "./components/Card";\n\n<Card header="Deal details" footer="Updated 2h ago">Pipeline content</Card>`,
      propsDoc: [
        { name: "header", type: "ReactNode", required: false, description: "Header slot" },
        { name: "footer", type: "ReactNode", required: false, description: "Footer slot" }
      ],
      dependencies: ["react", "react-dom"],
      preview: { kind: "card", props: {} }
    },
    {
      name: "Badge", slug: "badge", description: "Status pill for deal stages: neutral/success/warning/error/info tones.", category: "Display", version: "1.0.0", accessLevel: "free",
      files: [{ path: "Badge.tsx", content: BADGE_SOURCE }, { path: "theme.css", content: THEME_CSS }],
      entry: "Badge.tsx",
      exampleUsage: `import { Badge } from "./components/Badge";\n\n<Badge tone="success">Won</Badge>`,
      propsDoc: [{ name: "tone", type: '"neutral" | "success" | "warning" | "error" | "info"', required: false, description: "Status tone" }],
      dependencies: ["react", "react-dom"],
      preview: { kind: "badge", props: {} }
    },
    {
      name: "StatCard", slug: "stat-card", description: "PREMIUM: KPI stat card for pipeline value and win rate with trend delta.", category: "Display", version: "1.0.0", accessLevel: "premium",
      files: [{ path: "StatCard.tsx", content: STAT_SOURCE }, { path: "theme.css", content: THEME_CSS }],
      entry: "StatCard.tsx",
      exampleUsage: `import { StatCard } from "./components/StatCard";\n\n<StatCard label="Pipeline value" value="$248k" delta="+12% vs last month" trend="up" />`,
      propsDoc: [
        { name: "label", type: "string", required: true, description: "KPI label" },
        { name: "value", type: "string", required: true, description: "KPI value" }
      ],
      dependencies: ["react", "react-dom"],
      preview: { kind: "stat", props: {} }
    },
    {
      name: "DataTable", slug: "data-table", description: "PREMIUM: keyboard-selectable CRM deals table with hover and selected states.", category: "Data", version: "1.0.0", accessLevel: "premium",
      files: [{ path: "DataTable.tsx", content: TABLE_SOURCE }, { path: "theme.css", content: THEME_CSS }],
      entry: "DataTable.tsx",
      exampleUsage: `import { DataTable } from "./components/DataTable";\n\n<DataTable rows={[{ id: "1", name: "Acme", stage: "Negotiation", value: "$12k" }]} />`,
      propsDoc: [{ name: "rows", type: "DealRow[]", required: true, description: "Deal rows" }],
      dependencies: ["react", "react-dom"],
      preview: { kind: "table", props: {} }
    }
  ];

  const components: ComponentRecord[] = defs.map((d, i) => {
    const validated = validateBundle({ ...d, status: undefined });
    return {
      id: `c-seed-${i}`,
      ...validated,
      status: "published" as const,
      thumbnailSvg: thumb(d.name, d.accessLevel === "premium" ? "#7c3aed" : "#1a73e8"),
      createdAt: now,
      updatedAt: now
    };
  });

  await db.update((draft: DbSchema) => {
    draft.users = users;
    draft.components = components;
  });
}
