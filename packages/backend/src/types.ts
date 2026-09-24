export type Role = "admin" | "customer";
export type AccessLevel = "free" | "premium";
export type ComponentStatus = "draft" | "published";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  /** Active premium entitlement. Checked fresh from DB on every protected request. */
  premium: boolean;
  createdAt: string;
}

export interface ComponentFile {
  path: string;
  content: string;
}

export interface PropDoc {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export type PreviewKind = "button" | "input" | "card" | "badge" | "stat" | "table";

export interface ComponentRecord {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  version: string;
  accessLevel: AccessLevel;
  status: ComponentStatus;
  /** Single source of truth: preview, copy, installer and agent prompt all read these files. */
  files: ComponentFile[];
  entry: string;
  exampleUsage: string;
  propsDoc: PropDoc[];
  dependencies: string[];
  /** Declarative preview rendered by trusted catalogue code; uploaded code is never executed. */
  preview: { kind: PreviewKind; props: Record<string, unknown> };
  thumbnailSvg: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbSchema {
  users: User[];
  components: ComponentRecord[];
}

export interface PublicComponentMeta {
  name: string;
  slug: string;
  description: string;
  category: string;
  version: string;
  accessLevel: AccessLevel;
  locked: boolean;
  thumbnailSvg: string;
  propsDoc: PropDoc[];
  dependencies: string[];
}

export interface JwtClaims {
  sub: string;
  email: string;
  role: Role;
}
