import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createApp } from "../src/server";
import { JsonDb } from "../src/db";
import { seedDatabase } from "../src/seed";

const SECRET = "test-only-32-plus-character-secret-0123456789";

interface LoginResponse {
  token: string;
  user: { email: string; role: string; premium: boolean };
}

async function makeApp(): Promise<{ app: ReturnType<typeof createApp>; dir: string }> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ti-backend-test-"));
  const dbPath = path.join(dir, "db.json");
  await seedDatabase({
    dbPath,
    adminEmail: "admin@example.com",
    adminPasswordHash: await (await import("bcryptjs")).hash("AdminPass123!", 10),
    freeEmail: "free@example.com",
    freePassword: "FreePass123!",
    premiumEmail: "premium@example.com",
    premiumPassword: "PremiumPass123!"
  });
  const app = createApp({ db: new JsonDb(dbPath), jwtSecret: SECRET, jwtExpiresIn: "1h", apiBaseUrl: "http://test/api" });
  return { app, dir };
}

async function login(app: ReturnType<typeof createApp>, email: string, password: string): Promise<LoginResponse> {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body as LoginResponse;
}

describe("backend access control and publishing", () => {
  let app: ReturnType<typeof createApp>;
  let dir = "";

  beforeEach(async () => {
    const made = await makeApp();
    app = made.app;
    dir = made.dir;
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("1. rejects unauthorised admin writes and hides drafts from the public", async () => {
    const noAuth = await request(app).post("/api/admin/components").send({});
    expect(noAuth.status).toBe(401);

    const free = await login(app, "free@example.com", "FreePass123!");
    const asCustomer = await request(app)
      .post("/api/admin/components")
      .set("Authorization", `Bearer ${free.token}`)
      .send({});
    expect(asCustomer.status).toBe(403);

    const admin = await login(app, "admin@example.com", "AdminPass123!");
    const draft = await request(app)
      .post("/api/admin/components")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Draft Widget",
        slug: "draft-widget",
        description: "A draft that must stay private until published.",
        category: "Test",
        version: "0.1.0",
        accessLevel: "free",
        files: [{ path: "DraftWidget.tsx", content: "export function DraftWidget(): string { return 'x'; }" }],
        entry: "DraftWidget.tsx",
        exampleUsage: "use it",
        preview: { kind: "card", props: {} }
      });
    expect(draft.status).toBe(201);

    const publicList = await request(app).get("/api/components");
    expect(publicList.body.some((c: { slug: string }) => c.slug === "draft-widget")).toBe(false);
    const direct = await request(app).get("/api/components/draft-widget");
    expect(direct.status).toBe(404);
    const directSource = await request(app).get("/api/components/draft-widget/source");
    expect(directSource.status).toBe(404);
  });

  it("2. publishes valid bundles and rejects invalid uploads", async () => {
    const admin = await login(app, "admin@example.com", "AdminPass123!");
    const auth = { Authorization: `Bearer ${admin.token}` };

    const badSlug = await request(app).post("/api/admin/components").set(auth).send({
      name: "Bad", slug: "NOT A SLUG", description: "long enough description here", category: "T",
      version: "1.0.0", accessLevel: "free",
      files: [{ path: "A.tsx", content: "export const a = 1;" }], entry: "A.tsx",
      exampleUsage: "x", preview: { kind: "badge", props: {} }
    });
    expect(badSlug.status).toBe(400);

    const unsafePath = await request(app).post("/api/admin/components").set(auth).send({
      name: "Evil", slug: "evil-widget", description: "long enough description here", category: "Test",
      version: "1.0.0", accessLevel: "free",
      files: [{ path: "../../etc/passwd", content: "x" }], entry: "../../etc/passwd",
      exampleUsage: "x", preview: { kind: "badge", props: {} }
    });
    expect(unsafePath.status).toBe(400);

    const deniedPattern = await request(app).post("/api/admin/components").set(auth).send({
      name: "Shell", slug: "shell-widget", description: "long enough description here", category: "Test",
      version: "1.0.0", accessLevel: "free",
      files: [{ path: "Shell.tsx", content: "import { exec } from 'child_process'; exec('rm -rf /');" }], entry: "Shell.tsx",
      exampleUsage: "x", preview: { kind: "badge", props: {} }
    });
    expect(deniedPattern.status).toBe(400);

    const created = await request(app).post("/api/admin/components").set(auth).send({
      name: "Good Widget", slug: "good-widget", description: "A valid widget for publication.", category: "Test",
      version: "1.0.0", accessLevel: "free",
      files: [{ path: "GoodWidget.tsx", content: "export function GoodWidget(): string { return 'ok'; }" }],
      entry: "GoodWidget.tsx",
      exampleUsage: "use GoodWidget",
      preview: { kind: "badge", props: {} }
    });
    expect(created.status).toBe(201);
    const published = await request(app).post(`/api/admin/components/${created.body.id as string}/publish`).set(auth).send();
    expect(published.status).toBe(200);
    expect(published.body.status).toBe("published");

    const listed = await request(app).get("/api/components");
    expect(listed.body.some((c: { slug: string }) => c.slug === "good-widget")).toBe(true);

    const unpublished = await request(app).post(`/api/admin/components/${created.body.id as string}/unpublish`).set(auth).send();
    expect(unpublished.body.status).toBe("draft");
    const relisted = await request(app).get("/api/components");
    expect(relisted.body.some((c: { slug: string }) => c.slug === "good-widget")).toBe(false);
  });

  it("3. keeps metadata/source/installer consistent on one published version", async () => {
    const detail = await request(app).get("/api/components/button");
    expect(detail.status).toBe(200);
    const source = await request(app).get("/api/components/button/source");
    expect(source.status).toBe(200);
    const bundle = await request(app).get("/api/components/button/install/bundle");
    expect(bundle.status).toBe(200);
    expect(bundle.body.version).toBe(detail.body.version);
    expect(source.body.entry).toBe(detail.body.entry);
    expect(JSON.stringify(bundle.body.files)).toBe(JSON.stringify(source.body.files));
    expect(bundle.body.files.every((f: { path: string }) => !f.path.includes("..") && !f.path.startsWith("/"))).toBe(true);
  });

  it("3b. serves the installer as a self-contained script and an installable tarball", async () => {
    const script = await request(app).get("/api/cli/download");
    expect(script.status).toBe(200);
    expect(script.text).toContain("writeBundleFiles");
    expect(script.text).not.toContain('from "./lib.mjs"');

    const tgz = await request(app)
      .get("/api/cli.tgz")
      .parse((res, cb: (err: Error | null, data?: unknown) => void) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(Buffer.from(c)));
        res.on("end", () => cb(null, Buffer.concat(chunks)));
      });
    expect(tgz.status).toBe(200);
    const buf = tgz.body as Buffer;
    expect(buf[0]).toBe(0x1f);
    expect(buf[1]).toBe(0x8b);
    expect(buf.length).toBeGreaterThan(1000);
  });

  it("5. enforces free/premium access on direct URLs, grant/revoke, and blocks self-grant", async () => {
    const anonPremium = await request(app).get("/api/components/stat-card/source");
    expect(anonPremium.status).toBe(403);

    const free = await login(app, "free@example.com", "FreePass123!");
    const freeBlocked = await request(app).get("/api/components/stat-card/source").set("Authorization", `Bearer ${free.token}`);
    expect(freeBlocked.status).toBe(403);
    const freePrompt = await request(app).get("/api/components/stat-card/agent-prompt").set("Authorization", `Bearer ${free.token}`);
    expect(freePrompt.status).toBe(403);
    // Free components stay usable throughout.
    const freeOk = await request(app).get("/api/components/button/source").set("Authorization", `Bearer ${free.token}`);
    expect(freeOk.status).toBe(200);

    const premium = await login(app, "premium@example.com", "PremiumPass123!");
    const premiumOk = await request(app).get("/api/components/stat-card/source").set("Authorization", `Bearer ${premium.token}`);
    expect(premiumOk.status).toBe(200);

    // Customer attempts to grant themselves premium or perform admin actions.
    const selfGrant = await request(app).post("/api/users/u-free/grant").set("Authorization", `Bearer ${free.token}`).send({ premium: true });
    expect(selfGrant.status).toBe(403);
    const adminAction = await request(app).get("/api/admin/users").set("Authorization", `Bearer ${free.token}`);
    expect(adminAction.status).toBe(403);

    // Admin grants premium -> access; revokes -> denied again on the same token (fresh DB check).
    const admin = await login(app, "admin@example.com", "AdminPass123!");
    const users = await request(app).get("/api/admin/users").set("Authorization", `Bearer ${admin.token}`);
    const freeUser = (users.body as Array<{ id: string; email: string }>).find((u) => u.email === "free@example.com");
    if (!freeUser) throw new Error("seed free user missing");

    const grant = await request(app).post(`/api/admin/users/${freeUser.id}/grant`).set("Authorization", `Bearer ${admin.token}`).send({ premium: true });
    expect(grant.status).toBe(200);
    const afterGrant = await request(app).get("/api/components/stat-card/source").set("Authorization", `Bearer ${free.token}`);
    expect(afterGrant.status).toBe(200);

    const revoke = await request(app).post(`/api/admin/users/${freeUser.id}/grant`).set("Authorization", `Bearer ${admin.token}`).send({ premium: false });
    expect(revoke.status).toBe(200);
    const afterRevoke = await request(app).get("/api/components/stat-card/source").set("Authorization", `Bearer ${free.token}`);
    expect(afterRevoke.status).toBe(403);
  });
});
