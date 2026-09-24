import type { AppProps } from "next/app";
import Head from "next/head";
import Link from "next/link";
import * as React from "react";
import { adminToken, apiBase } from "../lib/api";
import "../styles/globals.css";

export default function AdminApp({ Component, pageProps }: AppProps): React.JSX.Element {
  const [isAdmin, setIsAdmin] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function check(): Promise<void> {
      const token = adminToken();
      if (!token) {
        if (!cancelled) setIsAdmin(false);
        return;
      }
      try {
        const res = await fetch(`${apiBase()}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        const body = (await res.json()) as { role?: string };
        if (!cancelled) setIsAdmin(res.ok && body.role === "admin");
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  function signOut(): void {
    window.localStorage.removeItem("ti_admin_token");
    setIsAdmin(false);
  }

  return (
    <>
      <Head>
        <title>Admin · Tech Inject UI</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="ti-shell">
        <nav className="ti-nav" aria-label="Admin">
          <strong>Tech Inject Admin</strong>
          <Link href="/dashboard">Components</Link>
          <Link href="/customers">Customers</Link>
          <span style={{ marginLeft: "auto" }}>
            {isAdmin === true ? (
              <button className="ti-btn ti-btn-secondary" type="button" onClick={signOut}>Sign out</button>
            ) : (
              <Link href="/">Sign in</Link>
            )}
          </span>
        </nav>
        {isAdmin === false && <p style={{ color: "#6b7280" }}>Admin sign-in required. Use the administrator credentials from the private submission channel.</p>}
        <main>
          <Component {...pageProps} />
        </main>
      </div>
    </>
  );
}
