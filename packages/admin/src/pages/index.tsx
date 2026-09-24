import Head from "next/head";
import { useRouter } from "next/router";
import * as React from "react";
import { apiBase } from "../lib/api";

export default function AdminSignIn(): React.JSX.Element {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch(`${apiBase()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const body = (await res.json()) as { token?: string; user?: { role?: string }; error?: string };
      if (!res.ok || !body.token) {
        setError(body.error ?? "Sign in failed");
        return;
      }
      if (body.user?.role !== "admin") {
        setError("This account is not an administrator.");
        return;
      }
      window.localStorage.setItem("ti_admin_token", body.token);
      await router.push("/dashboard");
    } catch {
      setError("Could not reach the API. Start the backend, then retry.");
    }
  }

  return (
    <>
      <Head><title>Admin sign in · Tech Inject</title></Head>
      <h1>Admin sign in</h1>
      <p style={{ color: "#4b5563" }}>One administrator via environment variables. The admin secret never ships in frontend code.</p>
      <form onSubmit={submit} style={{ display: "grid", gap: 12, maxWidth: 380 }}>
        <div>
          <label className="ti-label" htmlFor="a-email">Email</label>
          <input id="a-email" className="ti-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="ti-label" htmlFor="a-pass">Password</label>
          <input id="a-pass" className="ti-input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <div className="ti-error" role="alert">{error}</div>}
        <button className="ti-btn" type="submit">Sign in</button>
      </form>
    </>
  );
}
