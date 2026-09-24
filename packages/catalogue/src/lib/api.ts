export interface PropDoc {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface ComponentMeta {
  name: string;
  slug: string;
  description: string;
  category: string;
  version: string;
  accessLevel: "free" | "premium";
  locked: boolean;
  thumbnailSvg: string;
  propsDoc: PropDoc[];
  dependencies: string[];
}

export interface ComponentDetail extends ComponentMeta {
  exampleUsage: string;
  preview: { kind: "button" | "input" | "card" | "badge" | "stat" | "table"; props: Record<string, unknown> };
  entry: string;
}

export function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
}

export function authToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("ti_token");
}

export function authHeaders(): Record<string, string> {
  const token = authToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface Session {
  email: string;
  role: "admin" | "customer";
  premium: boolean;
}

export async function fetchSession(): Promise<Session | null> {
  const token = authToken();
  if (!token) return null;
  const res = await fetch(`${apiBase()}/auth/me`, { headers: authHeaders() });
  if (!res.ok) return null;
  return (await res.json()) as Session;
}
