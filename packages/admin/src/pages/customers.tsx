import Head from "next/head";
import * as React from "react";
import { adminHeaders, apiBase } from "../lib/api";

interface Customer {
  id: string;
  email: string;
  role: string;
  premium: boolean;
  createdAt: string;
}

export default function Customers(): React.JSX.Element {
  const [users, setUsers] = React.useState<Customer[]>([]);
  const [message, setMessage] = React.useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function refresh(): Promise<void> {
    setMessage(null);
    try {
      const res = await fetch(`${apiBase()}/admin/users`, { headers: adminHeaders() });
      if (!res.ok) {
        setMessage({ kind: "error", text: "Admin sign-in required." });
        return;
      }
      setUsers((await res.json()) as Customer[]);
    } catch {
      setMessage({ kind: "error", text: `Could not reach the API at ${apiBase()}.` });
    }
  }

  React.useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function grant(id: string, premium: boolean): Promise<void> {
    setMessage(null);
    const res = await fetch(`${apiBase()}/admin/users/${id}/grant`, {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({ premium })
    });
    const body = (await res.json()) as { error?: string };
    if (!res.ok) {
      setMessage({ kind: "error", text: body.error ?? "Grant failed" });
      return;
    }
    setMessage({ kind: "ok", text: premium ? "Premium granted — protected requests now succeed." : "Premium revoked — subsequent protected requests are denied (already-copied code cannot be recalled)." });
    await refresh();
  }

  return (
    <>
      <Head><title>Customers · Admin</title></Head>
      <h1>Customers</h1>
      <p style={{ color: "#4b5563", maxWidth: 720 }}>
        Admins grant/revoke premium access here. Customers cannot change their own access;
        premium status never grants admin permissions. Revocation blocks future retrieval
        but cannot remove code already copied or installed.
      </p>
      {message && <div className={message.kind === "ok" ? "ti-ok" : "ti-error"} role={message.kind === "ok" ? "status" : "alert"}>{message.text}</div>}
      <table className="ti-table">
        <thead><tr><th>Email</th><th>Role</th><th>Premium</th><th>Actions</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.premium ? "yes" : "no"}</td>
              <td>
                {u.role === "customer" && (
                  <div className="ti-row">
                    {!u.premium && <button className="ti-btn" type="button" onClick={() => grant(u.id, true)}>Grant premium</button>}
                    {u.premium && <button className="ti-btn ti-btn-secondary" type="button" onClick={() => grant(u.id, false)}>Revoke premium</button>}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
