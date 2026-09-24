import Head from "next/head";
import Link from "next/link";
import * as React from "react";
import { apiBase, authHeaders, type ComponentMeta } from "../lib/api";

export default function ComponentsPage(): React.JSX.Element {
  const [items, setItems] = React.useState<ComponentMeta[]>([]);
  const [query, setQuery] = React.useState("");
  const [state, setState] = React.useState<"loading" | "error" | "ready">("loading");

  React.useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const res = await fetch(`${apiBase()}/components`, { headers: authHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as ComponentMeta[];
        if (!cancelled) {
          setItems(data);
          setState("ready");
        }
      } catch {
        if (!cancelled) setState("error");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = items.filter((c) =>
    `${c.name} ${c.description} ${c.category}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <Head><title>Components · Tech Inject UI</title></Head>
      <h1>Components</h1>
      <label className="ti-label" htmlFor="component-search">Search components</label>
      <input
        id="component-search"
        className="ti-input"
        placeholder="button, table, premium…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ maxWidth: 420, marginBottom: 16 }}
      />
      {state === "loading" && <p role="status">Loading components…</p>}
      {state === "error" && (
        <div className="ti-error" role="alert">
          Could not reach the API at {apiBase()}. Start the backend, then refresh.
        </div>
      )}
      {state === "ready" && filtered.length === 0 && <p>No components match “{query}”.</p>}
      <div className="ti-grid">
        {filtered.map((c) => (
          <article key={c.slug} className="ti-card">
            {/* Static thumbnail; runtime premium source never ships in the list payload. */}
            <img className="ti-thumb" src={`data:image/svg+xml;utf8,${encodeURIComponent(c.thumbnailSvg)}`} alt={`${c.name} thumbnail`} />
            <div className="ti-card-body">
              <div className="ti-row" style={{ justifyContent: "space-between" }}>
                <h3>{c.name}</h3>
                <span className={`ti-badge ${c.accessLevel === "premium" ? "ti-badge-premium" : "ti-badge-free"}`}>
                  {c.accessLevel === "premium" ? "Premium" : "Free"}
                </span>
              </div>
              <p>{c.description}</p>
              <p style={{ fontSize: 12 }}>v{c.version} · {c.category}{c.locked ? " · locked" : ""}</p>
              <Link href={`/components/${encodeURIComponent(c.slug)}`} className="ti-btn ti-btn-secondary">
                Open {c.locked ? "details (locked)" : "details"}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
