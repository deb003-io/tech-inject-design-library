export function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
}

export function adminToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("ti_admin_token");
}

export function adminHeaders(): Record<string, string> {
  const token = adminToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

/** Documented constrained JSON bundle format (no code editor needed). */
export const BUNDLE_TEMPLATE = {
  name: "New Widget",
  slug: "new-widget",
  description: "What this component is and when to use it (10+ chars).",
  category: "Display",
  version: "1.0.0",
  accessLevel: "free",
  files: [{ path: "NewWidget.tsx", content: "export function NewWidget(): string { return 'hello'; }" }],
  entry: "NewWidget.tsx",
  exampleUsage: 'import { NewWidget } from "./components/NewWidget";',
  propsDoc: [{ name: "tone", type: "string", required: false, description: "Visual tone" }],
  dependencies: ["react", "react-dom"],
  preview: { kind: "badge", props: {} }
};
