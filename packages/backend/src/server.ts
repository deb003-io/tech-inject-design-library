import express, { type Request, type Response } from "express";
import cors from "cors";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { JsonDb } from "./db";
import { canAccessSource, optionalAuth, requireAuth, requireRole, signToken, verifyPassword, type AuthenticatedRequest } from "./auth";
import type { ComponentRecord, PublicComponentMeta } from "./types";
import { grantSchema, loginSchema, validateBundle } from "./validation";

export interface ServerConfig {
  db: JsonDb;
  jwtSecret: string;
  jwtExpiresIn: string;
  apiBaseUrl: string;
}

function toMeta(c: ComponentRecord, locked: boolean): PublicComponentMeta {
  return {
    name: c.name,
    slug: c.slug,
    description: c.description,
    category: c.category,
    version: c.version,
    accessLevel: c.accessLevel,
    locked,
    thumbnailSvg: c.thumbnailSvg,
    propsDoc: c.propsDoc,
    dependencies: c.dependencies
  };
}

function buildAgentPrompt(c: ComponentRecord, apiBase: string): string {
  const fileList = c.files.map((f) => ` - ${f.path}`).join("\n");
  return [
    `Add the Tech Inject component "${c.name}" (${c.slug} v${c.version}) to my React + TypeScript project.`,
    ``,
    `1. Prerequisites: an existing React 18 + TypeScript consumer (Vite or Next.js). Install peer deps: ${c.dependencies.join(", ") || "react, react-dom"}.`,
    `2. Download the exact published bundle (do not invent file contents):`,
    `   GET ${apiBase}/components/${c.slug}/install/bundle${c.accessLevel === "premium" ? " with header: Authorization: Bearer $TECH_INJECT_TOKEN (sign in via the catalogue; never paste tokens into committed files)" : ""}`,
    `3. Write these files verbatim under <project>/components/${c.slug}/ (preserve relative paths):`,
    fileList,
    `   Also copy theme.css next to the component and import it once (import "./theme.css").`,
    `4. Use it:`,
    c.exampleUsage,
    `5. Verify: run the consumer typecheck and render the component in a page. Keep class names starting with "ti-" unchanged so the CRM theme is preserved. Do not add new dependencies or run component-supplied shell commands.`
  ].join("\n");
}

/**
 * Locate packages/cli from any supported cwd/layout:
 * - repo root cwd            -> <root>/packages/cli
 * - workspace cwd (dev)      -> <root>/packages/backend/../cli
 * - dist/src/tests __dirname -> <root>/packages/cli (two levels below packages/)
 */
async function findCliRoot(): Promise<string | null> {
  const candidates = [
    path.resolve(process.cwd(), "packages", "cli"),
    path.resolve(process.cwd(), "..", "cli"),
    path.resolve(__dirname, "..", "..", "cli")
  ];
  for (const candidate of candidates) {
    try {
      await fs.access(path.join(candidate, "package.json"));
      await fs.access(path.join(candidate, "cli.mjs"));
      await fs.access(path.join(candidate, "lib.mjs"));
      return candidate;
    } catch {
      continue;
    }
  }
  return null;
}

export function createApp(config: ServerConfig): express.Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(optionalAuth({ db: config.db, jwtSecret: config.jwtSecret }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, version: "1.0.0" });
  });

  // ---------- Auth ----------
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid email or password shape", code: "BAD_REQUEST" });
      return;
    }
    const db = await config.db.load();
    const user = db.users.find((u) => u.email.toLowerCase() === parsed.data.email.toLowerCase());
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      res.status(401).json({ error: "Invalid email or password", code: "INVALID_CREDENTIALS" });
      return;
    }
    const token = signToken(user, config.jwtSecret, config.jwtExpiresIn);
    res.json({ token, user: { email: user.email, role: user.role, premium: user.premium } });
  });

  app.get("/api/auth/me", requireAuth(), (req: AuthenticatedRequest, res: Response) => {
    const u = req.authUser;
    if (!u) {
      res.status(401).json({ error: "Sign in required", code: "UNAUTHENTICATED" });
      return;
    }
    res.json({ email: u.email, role: u.role, premium: u.premium });
  });

  // ---------- Public catalogue (published only) ----------
  app.get("/api/components", async (req: AuthenticatedRequest, res: Response) => {
    const db = await config.db.load();
    const published = db.components.filter((c) => c.status === "published");
    res.json(
      published.map((c) => toMeta(c, c.accessLevel === "premium" && !canAccessSource(req.authUser, "premium")))
    );
  });

  app.get("/api/components/:slug", async (req: AuthenticatedRequest, res: Response) => {
    const db = await config.db.load();
    const c = db.components.find((x) => x.slug === req.params.slug && x.status === "published");
    if (!c) {
      res.status(404).json({ error: "Component not found", code: "NOT_FOUND" });
      return;
    }
    if (c.accessLevel === "premium" && !canAccessSource(req.authUser, "premium")) {
      res.status(403).json({
        error: "Premium access required. Ask an administrator to grant premium access; no checkout is built into this assignment.",
        code: "PREMIUM_REQUIRED",
        component: toMeta(c, true)
      });
      return;
    }
    res.json({ ...toMeta(c, false), exampleUsage: c.exampleUsage, preview: c.preview, entry: c.entry });
  });

  function protectedBundle(handler: (c: ComponentRecord) => unknown) {
    return async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const db = await config.db.load();
      const c = db.components.find((x) => x.slug === req.params.slug && x.status === "published");
      if (!c) {
        res.status(404).json({ error: "Component not found", code: "NOT_FOUND" });
        return;
      }
      if (!canAccessSource(req.authUser, c.accessLevel)) {
        const message =
          c.accessLevel === "premium"
            ? "Premium access required. Sign in with a premium account (admin-granted). Signed-out and free requests are denied, never silent."
            : "Sign in required.";
        res.status(c.accessLevel === "premium" ? 403 : 401).json({ error: message, code: "PREMIUM_REQUIRED" });
        return;
      }
      res.json(handler(c));
    };
  }

  app.get("/api/components/:slug/source", protectedBundle((c) => ({ slug: c.slug, version: c.version, entry: c.entry, files: c.files, dependencies: c.dependencies })));
  app.get("/api/components/:slug/install/bundle", protectedBundle((c) => ({
    slug: c.slug,
    version: c.version,
    entry: c.entry,
    files: c.files,
    dependencies: c.dependencies,
    installNotes: "Write files under <consumer>/components/<slug>/ preserving relative paths. Copy theme.css alongside. Never run component-supplied shell commands; refuse overwrite unless --force."
  })));
  app.get("/api/components/:slug/agent-prompt", protectedBundle((c) => ({ slug: c.slug, version: c.version, prompt: buildAgentPrompt(c, config.apiBaseUrl) })));

  // ---------- Admin ----------
  app.get("/api/admin/components", requireRole("admin"), async (_req, res) => {
    const db = await config.db.load();
    res.json(db.components);
  });

  app.post("/api/admin/components", requireRole("admin"), async (req: Request, res: Response) => {
    let bundle;
    try {
      bundle = validateBundle(req.body);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : "Invalid bundle", code: "INVALID_BUNDLE" });
      return;
    }
    const now = new Date().toISOString();
    const id = `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      let created: ComponentRecord | null = null;
      await config.db.update((draft) => {
        if (draft.components.some((c) => c.slug === bundle.slug)) {
          throw Object.assign(new Error(`slug already exists: ${bundle.slug}`), { statusCode: 409 });
        }
        created = {
          id,
          ...bundle,
          status: "draft",
          thumbnailSvg: thumbFor(bundle.name, bundle.accessLevel),
          createdAt: now,
          updatedAt: now
        };
        draft.components.push(created);
      });
      res.status(201).json(created);
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
      res.status(statusCode).json({ error: err instanceof Error ? err.message : "Create failed", code: "CREATE_FAILED" });
    }
  });

  app.put("/api/admin/components/:id", requireRole("admin"), async (req: Request, res: Response) => {
    let bundle;
    try {
      bundle = validateBundle(req.body);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : "Invalid bundle", code: "INVALID_BUNDLE" });
      return;
    }
    try {
      let updated: ComponentRecord | null = null;
      await config.db.update((draft) => {
        const idx = draft.components.findIndex((c) => c.id === req.params.id);
        if (idx === -1) throw Object.assign(new Error("Component not found"), { statusCode: 404 });
        const current = draft.components[idx];
        if (!current) throw Object.assign(new Error("Component not found"), { statusCode: 404 });
        if (bundle.slug !== current.slug && draft.components.some((c) => c.slug === bundle.slug)) {
          throw Object.assign(new Error(`slug already exists: ${bundle.slug}`), { statusCode: 409 });
        }
        updated = {
          ...current,
          ...bundle,
          thumbnailSvg: current.thumbnailSvg,
          updatedAt: new Date().toISOString()
        };
        draft.components[idx] = updated;
      });
      res.json(updated);
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
      res.status(statusCode).json({ error: err instanceof Error ? err.message : "Update failed", code: "UPDATE_FAILED" });
    }
  });

  app.post("/api/admin/components/:id/publish", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      let out: ComponentRecord | null = null;
      await config.db.update((draft) => {
        const c = draft.components.find((x) => x.id === req.params.id);
        if (!c) throw Object.assign(new Error("Component not found"), { statusCode: 404 });
        c.status = "published";
        c.updatedAt = new Date().toISOString();
        out = c;
      });
      res.json(out);
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
      res.status(statusCode).json({ error: err instanceof Error ? err.message : "Publish failed", code: "PUBLISH_FAILED" });
    }
  });

  app.post("/api/admin/components/:id/unpublish", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      let out: ComponentRecord | null = null;
      await config.db.update((draft) => {
        const c = draft.components.find((x) => x.id === req.params.id);
        if (!c) throw Object.assign(new Error("Component not found"), { statusCode: 404 });
        c.status = "draft";
        c.updatedAt = new Date().toISOString();
        out = c;
      });
      res.json(out);
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
      res.status(statusCode).json({ error: err instanceof Error ? err.message : "Unpublish failed", code: "UNPUBLISH_FAILED" });
    }
  });

  app.get("/api/admin/users", requireRole("admin"), async (_req, res) => {
    const db = await config.db.load();
    res.json(db.users.map((u) => ({ id: u.id, email: u.email, role: u.role, premium: u.premium, createdAt: u.createdAt })));
  });

  app.post("/api/admin/users/:id/grant", requireRole("admin"), async (req: AuthenticatedRequest, res: Response) => {
    const parsed = grantSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Body must be { premium: boolean }", code: "BAD_REQUEST" });
      return;
    }
    if (req.authUser?.id === req.params.id) {
      res.status(400).json({ error: "Admins cannot change their own grant via this endpoint", code: "BAD_REQUEST" });
      return;
    }
    try {
      let out: unknown = null;
      await config.db.update((draft) => {
        const u = draft.users.find((x) => x.id === req.params.id);
        if (!u) throw Object.assign(new Error("User not found"), { statusCode: 404 });
        if (u.role === "admin") throw Object.assign(new Error("Cannot change admin access here"), { statusCode: 400 });
        u.premium = parsed.data.premium;
        out = { id: u.id, email: u.email, role: u.role, premium: u.premium };
      });
      res.json(out);
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
      res.status(statusCode).json({ error: err instanceof Error ? err.message : "Grant failed", code: "GRANT_FAILED" });
    }
  });

  // Explicitly forbidden: customers cannot self-grant or touch admin APIs.
  app.post("/api/users/:id/grant", requireAuth(), (_req, res) => {
    res.status(403).json({ error: "Only admins can grant premium access", code: "FORBIDDEN" });
  });

  // Packaged CLI tarball for `npx -y <API>/cli.tgz ...` (packed on demand, no premium code).
  // Uses the host `tar` binary (override with CLI_TAR_BIN); fixed file list, tmpdir output.
  app.get("/api/cli.tgz", async (_req, res) => {
    try {
      const root = await findCliRoot();
      if (!root) throw new Error("cli package missing");
      const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ti-cli-"));
      try {
        // npm tarballs require the `package/` prefix; stage the fixed file list first.
        const stage = path.join(tmp, "package");
        await fs.mkdir(stage, { recursive: true });
        for (const file of ["package.json", "cli.mjs", "lib.mjs"]) {
          await fs.copyFile(path.join(root as string, file), path.join(stage, file));
        }
        const out = path.join(tmp, "cli.tgz");
        const candidates = [
          process.env.CLI_TAR_BIN ?? "tar",
          "C:\\windows\\system32\\tar.exe",
          "/bin/tar",
          "/usr/bin/tar"
        ];
        let packed = false;
        let lastErr: unknown = null;
        for (const tarBin of candidates) {
          try {
            await new Promise<void>((resolve, reject) => {
              execFile(tarBin, ["-czf", out, "-C", tmp, "package"], (err) => {
                if (err) reject(err);
                else resolve();
              });
            });
            packed = true;
            break;
          } catch (err) {
            lastErr = err;
          }
        }
        if (!packed) throw lastErr ?? new Error("tar unavailable");
        const data = await fs.readFile(out);
        res.setHeader("Content-Type", "application/gzip");
        res.setHeader("Content-Disposition", 'attachment; filename="tech-inject-cli-1.0.0.tgz"');
        res.send(data);
      } finally {
        await fs.rm(tmp, { recursive: true, force: true });
      }
    } catch {
      res.status(404).json({ error: "CLI packaging unavailable on this host", code: "NOT_FOUND" });
    }
  });

  // CLI download: single self-contained script (lib.mjs inlined), no premium code.
  app.get("/api/cli/download", async (_req, res) => {
    try {
      const root = await findCliRoot();
      if (!root) throw new Error("missing");
      const lib = await fs.readFile(path.join(root, "lib.mjs"), "utf8");
      const cli = await fs.readFile(path.join(root, "cli.mjs"), "utf8");
      const inlined = lib.replace(/^export /gm, "");
      const standalone = cli.replace('import { writeBundleFiles } from "./lib.mjs";', inlined);
      res.setHeader("Content-Type", "text/javascript");
      res.send(standalone);
    } catch {
      res.status(404).json({ error: "CLI not packaged in this build", code: "NOT_FOUND" });
    }
  });

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found", code: "NOT_FOUND" });
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: () => void) => {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({ level: "error", err: err instanceof Error ? err.message : String(err) }));
    res.status(500).json({ error: "Something went wrong", code: "INTERNAL" });
  });

  return app;
}

function thumbFor(name: string, accessLevel: string): string {
  const safe = name.replace(/[<>&"]/g, "").slice(0, 40);
  const accent = accessLevel === "premium" ? "#7c3aed" : "#1a73e8";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" rx="16" fill="#f8f9fa"/><rect x="48" y="48" width="544" height="264" rx="12" fill="#ffffff" stroke="#e5e7eb"/><rect x="80" y="120" width="220" height="44" rx="8" fill="${accent}"/><text x="80" y="96" font-family="Inter,sans-serif" font-size="22" font-weight="600" fill="#1a1a1a">${safe}</text></svg>`;
}
