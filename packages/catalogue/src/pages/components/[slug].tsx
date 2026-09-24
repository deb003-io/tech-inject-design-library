import Head from "next/head";
import { useRouter } from "next/router";
import * as React from "react";
import { CodeBlock } from "../../components/CodeBlock";
import { SafePreview } from "../../components/SafePreview";
import { apiBase, authHeaders, type ComponentDetail } from "../../lib/api";

interface SourceFile {
  path: string;
  content: string;
}

export default function ComponentDetailPage(): React.JSX.Element {
  const router = useRouter();
  const slug = typeof router.query.slug === "string" ? router.query.slug : null;
  const [detail, setDetail] = React.useState<ComponentDetail | null>(null);
  const [lockedMessage, setLockedMessage] = React.useState<string | null>(null);
  const [state, setState] = React.useState<"loading" | "ready" | "locked" | "missing" | "error">("loading");
  const [source, setSource] = React.useState<{ entry: string; files: SourceFile[]; dependencies: string[]; version: string } | null>(null);
  const [prompt, setPrompt] = React.useState<string | null>(null);
  const [sourceError, setSourceError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    async function load(): Promise<void> {
      if (!slug) return;
      setState("loading");
      try {
        const res = await fetch(`${apiBase()}/components/${encodeURIComponent(slug)}`, { headers: authHeaders() });
        if (res.status === 404) {
          if (!cancelled) setState("missing");
          return;
        }
        const body = (await res.json()) as ComponentDetail & { error?: string; component?: ComponentDetail };
        if (res.status === 403) {
          if (!cancelled) {
            setLockedMessage(typeof body.error === "string" ? body.error : "Premium access required.");
            setDetail(body.component ?? null);
            setState("locked");
          }
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (!cancelled) {
          setDetail(body);
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
  }, [slug]);

  async function loadSource(): Promise<void> {
    if (!slug || source) return;
    try {
      const [s, p] = await Promise.all([
        fetch(`${apiBase()}/components/${encodeURIComponent(slug)}/source`, { headers: authHeaders() }),
        fetch(`${apiBase()}/components/${encodeURIComponent(slug)}/agent-prompt`, { headers: authHeaders() })
      ]);
      if (!s.ok) throw new Error(`source HTTP ${s.status}`);
      setSource((await s.json()) as { entry: string; files: SourceFile[]; dependencies: string[]; version: string });
      if (p.ok) {
        const pj = (await p.json()) as { prompt: string };
        setPrompt(pj.prompt);
      }
    } catch (err) {
      setSourceError(err instanceof Error ? err.message : "Could not load source");
    }
  }

  React.useEffect(() => {
    if (state === "ready") void loadSource();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const api = apiBase();
  const installCmd = detail
    ? detail.accessLevel === "premium"
      ? `npx -y ${api}/cli.tgz add ${detail.slug} --api ${api} --out ./components --token $TECH_INJECT_TOKEN`
      : `npx -y ${api}/cli.tgz add ${detail.slug} --api ${api} --out ./components`
    : "";

  return (
    <>
      <Head><title>{slug ? `${slug} · Tech Inject UI` : "Component · Tech Inject UI"}</title></Head>
      {state === "loading" && <p role="status">Loading component…</p>}
      {state === "missing" && <div className="ti-error" role="alert">Component not found or unpublished.</div>}
      {state === "error" && <div className="ti-error" role="alert">Could not reach the API at {api}. Start the backend, then refresh.</div>}
      {state === "locked" && (
        <>
          <h1>{detail?.name ?? slug}</h1>
          <div className="ti-alert" role="alert">{lockedMessage}</div>
          {detail && (
            <>
              <p>{detail.description}</p>
              <img className="ti-thumb" style={{ maxWidth: 480 }} src={`data:image/svg+xml;utf8,${encodeURIComponent(detail.thumbnailSvg)}`} alt={`${detail.name} static thumbnail`} />
              <p>Premium access is granted by an administrator — there is no checkout in this assignment. Sign in with a premium account to unlock preview, code, install and agent prompt.</p>
            </>
          )}
        </>
      )}
      {state === "ready" && detail && (
        <>
          <h1>{detail.name} <span className={`ti-badge ${detail.accessLevel === "premium" ? "ti-badge-premium" : "ti-badge-free"}`}>{detail.accessLevel} · v{detail.version}</span></h1>
          <p style={{ maxWidth: 680, color: "#4b5563" }}>{detail.description}</p>
          <div className="ti-detail">
            <div>
              <h2>Live preview</h2>
              <div className="ti-preview"><SafePreview detail={detail} /></div>
              <p style={{ fontSize: 12, color: "#6b7280" }}>
                Preview renders a declarative schema with trusted catalogue components — uploaded
                source is never executed here. Variants shown: default, hover (hover the controls),
                focus (Tab to focus), selected and disabled states.
              </p>
              <h2>Props</h2>
              <table className="ti-props">
                <thead><tr><th>Name</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
                <tbody>
                  {detail.propsDoc.map((p) => (
                    <tr key={p.name}><td><code>{p.name}</code></td><td><code>{p.type}</code></td><td>{p.required ? "yes" : "no"}</td><td>{p.description}</td></tr>
                  ))}
                </tbody>
              </table>
              <h2>Dependencies</h2>
              <p><code>{detail.dependencies.join(", ") || "react, react-dom"}</code> · entry <code>{detail.entry}</code></p>
            </div>
            <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
              <h2>Integrate</h2>
              {sourceError && <div className="ti-error" role="alert">{sourceError}</div>}
              {source ? (
                <>
                  {source.files.map((f) => (
                    <CodeBlock key={f.path} title="Copy code" filename={f.path} code={f.content} />
                  ))}
                  <CodeBlock title="Example usage" code={detail.exampleUsage} />
                </>
              ) : (
                <p role="status">Loading source…</p>
              )}
              <CodeBlock title="Copy install command" code={installCmd} />
              <p style={{ fontSize: 12, color: "#6b7280" }}>
                Prerequisites: React 18 + TypeScript consumer. Premium installs need a sign-in token:
                export TECH_INJECT_TOKEN first — tokens are never embedded in copied text or logs.
              </p>
              {prompt ? <CodeBlock title="Copy agent prompt" code={prompt} /> : null}
            </div>
          </div>
        </>
      )}
    </>
  );
}
