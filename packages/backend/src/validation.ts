import { z } from "zod";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const NPM_NAME_RE = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*(@\^[0-9]+\.[0-9]+\.[0-9]+)?$/;
const ALLOWED_EXT = [".tsx", ".ts", ".css", ".json", ".md"] as const;

/** Patterns rejected by the restricted component format (never executed server-side). */
const DENIED_PATTERNS = [
  "child_process",
  "process.env",
  "exec(",
  "execSync",
  "spawn(",
  "spawnSync",
  "__dirname",
  "__filename",
  "fs.",
  "node:",
  "eval(",
  "Function(",
  "require(",
  "DANGEROUSLY"
];

export function assertSafePath(p: string): void {
  if (p.length === 0 || p.length > 120) throw new Error("invalid file path length");
  if (p.startsWith("/") || /^[A-Za-z]:/.test(p) || p.includes("\\")) {
    throw new Error(`unsafe file path: ${p}`);
  }
  const segments = p.split("/");
  if (segments.some((s) => s === "" || s === "." || s === "..")) {
    throw new Error(`unsafe file path: ${p}`);
  }
  const lower = p.toLowerCase();
  const ok = ALLOWED_EXT.some((ext) => lower.endsWith(ext));
  if (!ok) throw new Error(`unsupported file type: ${p}`);
}

export function assertSafeContent(filePath: string, content: string): void {
  if (content.length > 100_000) throw new Error(`file too large: ${filePath}`);
  for (const pattern of DENIED_PATTERNS) {
    if (content.includes(pattern)) {
      throw new Error(`file ${filePath} contains denied pattern ${pattern}`);
    }
  }
}

const componentFileSchema = z.object({
  path: z.string().min(1).max(120),
  content: z.string().min(1).max(100_000)
});

export const componentBundleSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(60).regex(SLUG_RE, "slug must be kebab-case"),
  description: z.string().min(10).max(2000),
  category: z.string().min(2).max(40),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "version must be semver x.y.z"),
  accessLevel: z.enum(["free", "premium"]),
  files: z.array(componentFileSchema).min(1).max(20),
  entry: z.string().min(1).max(120),
  exampleUsage: z.string().min(1).max(20_000),
  propsDoc: z
    .array(
      z.object({
        name: z.string().min(1).max(60),
        type: z.string().min(1).max(120),
        required: z.boolean(),
        description: z.string().min(1).max(500)
      })
    )
    .max(40)
    .default([]),
  dependencies: z.array(z.string().min(1).max(120)).max(20).default([]),
  preview: z.object({
    kind: z.enum(["button", "input", "card", "badge", "stat", "table"]),
    props: z.record(z.unknown()).default({})
  })
});

export type ComponentBundleInput = z.infer<typeof componentBundleSchema>;

export function validateBundle(input: unknown): ComponentBundleInput {
  const parsed = componentBundleSchema.parse(input);
  const paths = new Set<string>();
  let total = 0;
  for (const f of parsed.files) {
    assertSafePath(f.path);
    assertSafeContent(f.path, f.content);
    if (paths.has(f.path)) throw new Error(`duplicate file path: ${f.path}`);
    paths.add(f.path);
    total += f.content.length;
  }
  if (total > 500_000) throw new Error("bundle too large (max 500KB total)");
  if (!paths.has(parsed.entry)) throw new Error("entry must match one of files[].path");
  for (const dep of parsed.dependencies) {
    if (!NPM_NAME_RE.test(dep)) throw new Error(`invalid dependency: ${dep}`);
  }
  return parsed;
}

export const loginSchema = z.object({
  email: z.string().email().max(160),
  password: z.string().min(8).max(200)
});

export const grantSchema = z.object({
  premium: z.boolean()
});
