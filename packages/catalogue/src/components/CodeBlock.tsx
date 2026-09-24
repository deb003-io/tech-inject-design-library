import * as React from "react";

export function CodeBlock({ title, code, filename }: { title: string; code: string; filename?: string }): React.JSX.Element {
  const [status, setStatus] = React.useState<"idle" | "ok" | "error">("idle");
  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      setStatus("ok");
    } catch {
      // Clipboard API unavailable (permissions/insecure context): select manually.
      setStatus("error");
    }
    window.setTimeout(() => setStatus("idle"), 2000);
  }
  return (
    <section aria-label={title}>
      <div className="ti-row" style={{ justifyContent: "space-between" }}>
        <h3 style={{ margin: 0, fontSize: 14 }}>{title}{filename ? ` · ${filename}` : ""}</h3>
        <button className="ti-btn ti-btn-secondary" type="button" onClick={copy} aria-live="polite">
          {status === "ok" ? "Copied ✓" : status === "error" ? "Copy failed — select manually" : "Copy"}
        </button>
      </div>
      <pre className="ti-code" tabIndex={0}><code>{code}</code></pre>
    </section>
  );
}
