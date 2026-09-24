import type { AppProps } from "next/app";
import Head from "next/head";
import Link from "next/link";
import * as React from "react";
import { fetchSession, type Session } from "../lib/api";
import "../styles/globals.css";

export const SessionContext = React.createContext<{ session: Session | null; refresh: () => void }>({
  session: null,
  refresh: () => {}
});

export default function CatalogueApp({ Component, pageProps }: AppProps): React.JSX.Element {
  const [session, setSession] = React.useState<Session | null>(null);
  const refresh = React.useCallback(() => {
    fetchSession().then(setSession).catch(() => setSession(null));
  }, []);
  React.useEffect(() => {
    refresh();
  }, [refresh]);

  function signOut(): void {
    window.localStorage.removeItem("ti_token");
    setSession(null);
  }

  return (
    <SessionContext.Provider value={{ session, refresh }}>
      <Head>
        <title>Tech Inject Design Library</title>
        <meta name="description" content="Shared CRM component catalogue: previews, copyable code, installer commands and agent prompts." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="ti-shell">
        <nav className="ti-nav" aria-label="Catalogue">
          <Link href="/" className="ti-brand">Tech Inject UI</Link>
          <Link href="/components">Components</Link>
          <Link href="/login">Sign in</Link>
          <span style={{ marginLeft: "auto", display: "inline-flex", gap: 8, alignItems: "center" }}>
            {session ? (
              <>
                <span className={`ti-badge ${session.premium ? "ti-badge-premium" : "ti-badge-free"}`} aria-live="polite">
                  {session.premium ? "Premium" : "Free"} · {session.email}
                </span>
                <button className="ti-btn ti-btn-secondary" type="button" onClick={signOut}>Sign out</button>
              </>
            ) : (
              <span className="ti-badge">Signed out</span>
            )}
          </span>
        </nav>
        <main>
          <Component {...pageProps} />
        </main>
      </div>
    </SessionContext.Provider>
  );
}
