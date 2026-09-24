import Head from "next/head";
import Link from "next/link";
import * as React from "react";

export default function Home(): React.JSX.Element {
  return (
    <>
      <Head><title>Get started · Tech Inject UI</title></Head>
      <h1>Shared CRM component library</h1>
      <p style={{ maxWidth: 640, color: "#4b5563" }}>
        Reusable React + TypeScript components extracted from the Sales CRM reference theme.
        Browse components, inspect live previews, copy source, install with one command,
        or hand an integration prompt to your AI coding agent.
      </p>
      <h2>Get started in a consumer project</h2>
      <ol>
        <li>Install React 18 + TypeScript (Vite or Next.js).</li>
        <li>Open any component page and copy the install command.</li>
        <li>Run it inside your consumer directory (never inside this catalogue).</li>
        <li>Import the component and <code>theme.css</code>; run your typecheck.</li>
      </ol>
      <p>
        <Link href="/components" className="ti-btn">Explore components</Link>
      </p>
      <h2>Free vs premium</h2>
      <p style={{ maxWidth: 640, color: "#4b5563" }}>
        Free components are fully accessible signed out. Premium components show a
        description and static thumbnail until you sign in with a premium account
        (granted by an administrator — no checkout in this assignment). Revocation
        blocks future preview, source, install and agent-prompt requests.
      </p>
    </>
  );
}
