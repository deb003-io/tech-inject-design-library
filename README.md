# Tech Inject Design Library

Shared Sales-CRM-themed React + TypeScript component system: public catalogue, admin
publishing dashboard, Express backend with JSON-file persistence, and a safe installer CLI.
Built AI-assisted in a TurboRepo monorepo.

## Links

| What | URL |
|---|---|
| Catalogue (local) | http://localhost:3000 |
| Admin (local) | http://localhost:3001 |
| Backend API (local) | http://localhost:4000/api |
| Catalogue (deployed) | TBD — set `NEXT_PUBLIC_API_URL` then deploy `packages/catalogue` (see Deployment) |
| Admin (deployed) | TBD — same backend, deploy `packages/admin` |
| Backend (deployed) | https://tech-inject-backend.onrender.com/api |

> Honesty note: the backend is deployed on Render's free tier, so `DATABASE_PATH`
> points at instance-local storage (`/tmp`) — the database reseeds on every
> redeploy/restart rather than persisting across them (Render disks require a paid
> plan). Catalogue and Admin deployment to Vercel with `NEXT_PUBLIC_API_URL` is a
> documented operator step; everything else was verified locally and against the
> live backend (see Verification).

## Monorepo layout

```
packages/ui         @tech-inject/ui — theme tokens + 6 typed components (Button, Input, Card, Badge, StatCard, DataTable)
packages/backend    @tech-inject/backend — Express API, JSON-file DB, JWT auth, zod validation, vitest suite
packages/catalogue  @tech-inject/catalogue — public Next.js catalogue (Pages Router, API-driven at runtime)
packages/admin      @tech-inject/admin — admin Next.js dashboard (drafts, publish/unpublish, grant/revoke)
packages/cli        @tech-inject/cli — `tech-inject-add` installer (safe paths, --token for premium)
data/               runtime persistence (gitignored; created by seed on first boot)
```

## Setup / build / check commands

```bash
npm install
npm run typecheck                      # tsc --noEmit in ui, backend, catalogue, admin
npm run test --workspace=@tech-inject/backend   # 5 access-control/publishing/installer tests
npm run test --workspace=@tech-inject/ui        # 6 interaction/keyboard tests
npm run test --workspace=@tech-inject/cli       # 3 installer-safety tests
npm run build --workspace=@tech-inject/backend  # tsc emit -> dist/
npm run build --workspace=@tech-inject/ui       # vite lib build -> dist/
npm run build --workspace=@tech-inject/catalogue
npm run build --workspace=@tech-inject/admin
npm run dev --workspace=@tech-inject/backend    # :4000 (seeds data/db.json on first boot)
npm run dev --workspace=@tech-inject/catalogue  # :3000
npm run dev --workspace=@tech-inject/admin      # :3001
```

Environment variables (secret-free example — see `.env.example`):

```env
PORT=4000
DATABASE_PATH=./data/db.json
JWT_SECRET=change-me-to-32-plus-characters-long-secret
JWT_EXPIRES_IN=12h
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=AdminPass123!
SEED_FREE_EMAIL=free@example.com
SEED_PREMIUM_EMAIL=premium@example.com
NEXT_PUBLIC_API_URL=http://localhost:4000/api
PUBLIC_API_URL=http://localhost:4000/api
```

Seeded review accounts are created on first boot (passwords via env, defaults in
`.env.example`); share real credentials through the private submission channel only.

## Deployment

1. Provision Node 20+ hosts (e.g. Render/Railway/Fly for backend, Vercel/Netlify for
   the two Next.js apps) plus a persistent disk for `DATABASE_PATH`.
2. Set `JWT_SECRET` (≥32 chars), `ADMIN_EMAIL`, `ADMIN_PASSWORD` (or
   `ADMIN_PASSWORD_HASH`), `PUBLIC_API_URL` (public backend origin), and
   `NEXT_PUBLIC_API_URL` (same value) in each service.
3. Deploy backend first; on boot it seeds users + 6 components if the DB is empty.
   Data survives restarts/redeploys (atomic JSON writes + files on disk).
4. Deploy catalogue and admin pointing at the backend URL.
5. Nothing extra for the installer: `GET <API>/cli.tgz` packs `packages/cli`
   on demand with the host `tar` binary (override via `CLI_TAR_BIN`), so the
   catalogue install command (`npx -y <API>/cli.tgz add <slug> …`) works without
   cloning this repo. Premium installs pass `--token $TECH_INJECT_TOKEN`.

Recovery: check `/api/health`; confirm env + disk mount from logs; redeploy —
records live in `DATABASE_PATH`, so redeploys never need migration. If a newly
published component breaks a page, unpublish it in admin (listings, detail routes
and new installs drop it on next refresh) and inspect its bundle JSON; tell the
team the catalogue reads one DB record per component, so rollback = unpublish.

## Component inventory (reference analysis)

The brief's "Sales CRM reference" arrived as a label without a reachable URL, so no
reference screenshots could be captured — flagged, not invented. Boundaries were
chosen from standard CRM UI anatomy instead: actions/inputs as atoms (variants, not
separate components), cards/badges/stats as display molecules, the deals grid as a
data organism. Implemented first because every CRM screen needs them:

| Component | Access | States covered | Maps to |
|---|---|---|---|
| Button | free | hover/focus/disabled, primary/secondary/ghost/danger, sm/md/lg | CRM row actions, form submits |
| Input | free | hover/focus/disabled, label/error announcement | Deal text fields |
| Card | free | header/body/footer slots | Detail panels |
| Badge | free | 5 status tones | Pipeline stage pills |
| StatCard | premium | trend delta | KPI header (revenue/win-rate) |
| DataTable | premium | hover/selected, keyboard selection | Deals grid |

Omitted for scope: sidebar nav, modal, pagination, charts — useful but not needed to
prove publishing, preview, install and premium gating. Theme tokens
(`packages/ui/src/theme/tokens.ts` + `theme.css`): primary `#1a73e8`, 8/12px radii,
1px `#e5e7eb` borders, Inter stack — mirrored byte-identically into seed bundles so
installed copies render the same theme standalone.

## Verification (actually run, Temp staging dir, Node v22)

- `npm install`: 417 packages, ok.
- Typechecks: backend, ui, catalogue, admin — all pass (two real failures found and
  fixed during the session: jsonwebtoken v9 `expiresIn` typing; nullable router slug).
- `backend` vitest: **5/5 pass** (admin-write rejection + draft privacy; invalid-upload
  rejection + publish/unpublish; metadata/source consistency; installer script + tarball
  servability; premium grant/revoke + self-grant block).
- `ui` vitest: **6/6 pass** (click, disabled, variants; label/error a11y; table mouse +
  keyboard selection, empty state).
- `cli` vitest: **3/3 pass** (unsafe paths; overwrite refusal; directory containment);
  `node --check` on CLI files passes.
- `next build`: catalogue (6 routes) and admin (5 routes) compile successfully.
- Live server smoke (21 checks, all PASS): seed → 6 published, no source in list
  payload; free source open; anon/free premium denied; premium agent prompt;
  admin draft hidden (404) → publish → live without redeploy → unpublish → 404;
  grant → access on same token → revoke → denied; `/api/cli/download` self-contained.
- Live CLI e2e (6 checks, all PASS): free install writes `Button.tsx` + `theme.css`;
  overwrite refused without `--force`; premium without token denied (no silent
  install); premium with token succeeds; CLI contains no shell execution.
- Tarball proof: `/api/cli.tgz` serves gzip bytes listing `package/package.json`,
  `cli.mjs`, `lib.mjs`; installed into a clean consumer via npm and its
  `tech-inject-add --help` ran through `npm exec` (the same bin `npx` resolves).
- Consumer check: installed bundle files are byte-identical to the published DB
  record (metadata/source/install consistency test); agent prompt verified present
  and specific (imports, theme, deps, verify step). A full `tsc` consumer build was
  not run here (no consumer fixture committed) — recommended reviewer step.
- Keyboard/mobile: tab-order, focus rings, aria-selected rows and alert roles covered
  in ui tests; layouts use responsive grids (narrow-screen single column).
- Preview isolation: uploaded source is never executed anywhere (backend stores it as
  text; catalogue renders a declarative `preview.kind` schema with trusted
  components). Limitation: this is format restriction, not a sandboxed iframe —
  richer previews would need iframe sandbox + CSP (future work).

## Premium accounts and authenticated install

- Sign in at catalogue `/login` (seeded free/premium accounts). The header shows
  Free/Premium status from a fresh `/api/auth/me` lookup.
- Admin → Customers → Grant/Revoke. Every protected request reloads the user from
  the DB, so revocation bites immediately even on an existing session; it cannot
  recall already-copied code (documented in UI copy).
- Installer: `npx -y <API>/cli.tgz add <slug> --api <API> --out ./components`
  (premium: append `--token $TECH_INJECT_TOKEN`; export the token, never commit it).
  Signed-out/free premium requests fail with a clear denial, never a silent
  free-substitute.
- Test evidence: backend suite §5 (direct-URL 403s, grant→200→revoke→403 on the same
  token, customer self-grant 403, customer admin-action 403) plus live smoke above.

## AI usage

- Tool: conversational coding assistant (this session) for scaffolding, debugging and
  test design; every suggestion was typechecked and executed, not pasted on trust.
- Representative prompt: "scaffold an Express + zod JSON-file backend with JWT auth
  where premium is re-read from the DB on every request, plus vitest coverage for
  draft privacy and grant/revoke".
- Challenged assumption: generated `jwt.sign(claims, secret, { expiresIn })` failed
  `tsc` under jsonwebtoken v9 + `exactOptionalPropertyTypes` (real transcript kept);
  fixed with `Secret`/`SignOptions` casts in `packages/backend/src/auth.ts` and
  re-ran green. Also rejected my own smoke regex (`/exec|…/` matched the word
  "executed") in favour of a `child_process`-specific check.

## Known gaps

- No public deployment performed from here (no hosting credentials); deployed-flow
  evidence is local live-server + CLI runs, honestly labelled.
- `npx -y <API>/cli.tgz` was proven end to end against the local API origin
  (serve → install → run); only the public-host transport remains an operator step.
- Previews cover the 6 declarative kinds only; arbitrary uploaded layouts render as
  their kind schematic, not pixel replicas.
- Single admin, no signup/recovery, no payments (per assignment: admin-granted
  premium only).
- Time spent: one extended AI-assisted build session within the 8h timebox remit
  (no wall-clock log kept); scope was cut to 6 components to protect the core flows.
