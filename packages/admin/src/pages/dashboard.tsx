import Head from "next/head";
import * as React from "react";
import { BUNDLE_TEMPLATE, adminHeaders, apiBase } from "../lib/api";

interface AdminComponent {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  version: string;
  accessLevel: "free" | "premium";
  status: "draft" | "published";
  updatedAt: string;
}

const EMPTY_DRAFT = JSON.stringify(BUNDLE_TEMPLATE, null, 2);

export default function Dashboard(): React.JSX.Element {
  const [items, setItems] = React.useState<AdminComponent[]>([]);
  const [draft, setDraft] = React.useState(EMPTY_DRAFT);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function refresh(): Promise<void> {
    setMessage(null);
    try {
      const res = await fetch(`${apiBase()}/admin/components`, { headers: adminHeaders() });
      if (res.status === 401 || res.status === 403) {
        setMessage({ kind: "error", text: "Admin sign-in required (server-verified on every write)." });
        return;
      }
      const data = (await res.json()) as AdminComponent[];
      setItems(data);
    } catch {
      setMessage({ kind: "error", text: `Could not reach the API at ${apiBase()}.` });
    }
  }

  React.useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(): Promise<void> {
    setBusy(true);
    setMessage(null);
    try {
      const bundle: unknown = JSON.parse(draft);
      const url = editingId ? `${apiBase()}/admin/components/${editingId}` : `${apiBase()}/admin/components`;
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: adminHeaders(),
        body: JSON.stringify(bundle)
      });
      const body = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) {
        setMessage({ kind: "error", text: body.error ?? `Save failed (HTTP ${res.status})` });
        return;
      }
      setMessage({ kind: "ok", text: editingId ? "Draft updated and validated." : "Draft created and validated. Publish to make it public." });
      setEditingId(body.id ?? editingId);
      await refresh();
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? `Invalid JSON or bundle: ${err.message}` : "Save failed" });
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, action: "publish" | "unpublish"): Promise<void> {
    setMessage(null);
    const res = await fetch(`${apiBase()}/admin/components/${id}/${action}`, {
      method: "POST",
      headers: adminHeaders()
    });
    const body = (await res.json()) as { error?: string };
    if (!res.ok) {
      setMessage({ kind: "error", text: body.error ?? `${action} failed` });
      return;
    }
    setMessage({ kind: "ok", text: action === "publish" ? "Published — visible in the catalogue after refresh (no redeploy)." : "Unpublished — removed from listings, detail routes and new installs." });
    await refresh();
  }

  function edit(item: AdminComponent): void {
    setEditingId(item.id);
    setDraft(JSON.stringify({ ...BUNDLE_TEMPLATE, name: item.name, slug: item.slug, description: item.description, category: item.category, version: item.version, accessLevel: item.accessLevel }, null, 2));
    window.scrollTo({ top: document.body.scrollHeight });
  }

  function newDraft(): void {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  }

  return (
    <>
      <Head><title>Components · Admin</title></Head>
      <h1>Components</h1>
      <div className="ti-row">
        <button className="ti-btn ti-btn-secondary" type="button" onClick={refresh}>Refresh list</button>
        <button className="ti-btn ti-btn-secondary" type="button" onClick={newDraft}>New draft</button>
      </div>
      {message && <div className={message.kind === "ok" ? "ti-ok" : "ti-error"} role={message.kind === "ok" ? "status" : "alert"}>{message.text}</div>}
      <table className="ti-table">
        <thead><tr><th>Name</th><th>Slug</th><th>Access</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td><code>{c.slug}</code></td>
              <td>{c.accessLevel}</td>
              <td>{c.status}</td>
              <td>
                <div className="ti-row">
                  <button className="ti-btn ti-btn-secondary" type="button" onClick={() => edit(c)}>Edit</button>
                  {c.status === "draft" ? (
                    <button className="ti-btn" type="button" onClick={() => setStatus(c.id, "publish")}>Publish</button>
                  ) : (
                    <button className="ti-btn ti-btn-secondary" type="button" onClick={() => setStatus(c.id, "unpublish")}>Unpublish</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 && <p style={{ color: "#6b7280" }}>No components yet — create a draft below.</p>}

      <h2>{editingId ? "Edit draft (JSON bundle)" : "New draft (JSON bundle)"}</h2>
      <p style={{ color: "#4b5563", maxWidth: 720 }}>
        Constrained bundle format: kebab-case slug, semver version, 1–20 files (.tsx/.ts/.css/.json/.md,
        100KB each, 500KB total), relative paths only, no server/shell patterns. The backend validates
        every field; drafts stay private until published.
      </p>
      <label className="ti-label" htmlFor="bundle">Component bundle JSON</label>
      <textarea id="bundle" className="ti-textarea" value={draft} onChange={(e) => setDraft(e.target.value)} spellCheck={false} />
      <div className="ti-row" style={{ marginTop: 8 }}>
        <button className="ti-btn" type="button" disabled={busy} onClick={save}>
          {busy ? "Validating…" : editingId ? "Validate & save draft" : "Validate & create draft"}
        </button>
      </div>
    </>
  );
}
