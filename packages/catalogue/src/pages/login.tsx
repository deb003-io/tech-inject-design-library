import Head from "next/head";
import { useRouter } from "next/router";
import * as React from "react";
import { SessionContext } from "./_app";
import { apiBase } from "../lib/api";

export default function LoginPage(): React.JSX.Element {
  const router = useRouter();
  const { refresh } = React.useContext(SessionContext);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`${apiBase()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const body = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !body.token) {
        setError(body.error ?? `Sign in failed (HTTP ${res.status})`);
        return;
      }
      window.localStorage.setItem("ti_token", body.token);
      refresh();
      await router.push("/components");
    } catch {
      setError("Could not reach the API. Start the backend, then retry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Head><title>Sign in · Tech Inject UI</title></Head>
      <h1>Customer sign in</h1>
      <p style={{ color: "#4b5563" }}>Seeded review accounts are shared privately (never committed). No public signup in this assignment.</p>
      <form onSubmit={submit} style={{ display: "grid", gap: 12, maxWidth: 380 }}>
        <div>
          <label className="ti-label" htmlFor="login-email">Email</label>
          <input id="login-email" className="ti-input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="ti-label" htmlFor="login-password">Password</label>
          <input id="login-password" className="ti-input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <div className="ti-error" role="alert">{error}</div>}
        <button className="ti-btn" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </>
  );
}
