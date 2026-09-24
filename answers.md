# answers.md — Section 10 (matches this implementation)

## 1. Reference analysis

The brief's Sales CRM link arrived without a reachable URL, so I flagged it instead
of inventing a theme: boundaries come from CRM anatomy in `packages/ui/src` — actions
and inputs as atoms with variants (Button primary/secondary/ghost/danger, not four
components), cards/badges/stats as display molecules, the deals grid as one `DataTable`
organism. I verified fidelity structurally: seed bundles embed byte-identical
`theme.css` from the UI package, and `tests/api.test.ts` §3 asserts installed files
equal the published record, so the recreation cannot drift from its tokens.

## 2. Architecture and clean code

I chose a TurboRepo monorepo (`ui`, `backend`, `catalogue`, `admin`, `cli`) with an
Express + JSON-file backend because it has zero native dependencies and atomic
tmp+rename writes (`packages/backend/src/db.ts`), keeping persistence without
operating MongoDB. One DRY decision: a single `ComponentRecord.files` array in the DB
feeds preview, copy, installer and agent prompt (`server.ts`), so no divergent copies
exist. Under KISS/YAGNI I avoided npm publication and a code editor/admin roles
system — the installer is a zero-dependency `cli.mjs` served as a tarball and the
admin is one env-configured account, which the test suite proves sufficient.

## 3. Publishing consistency

Preview, copied code, install bundle and agent prompt all read the same
`ComponentRecord` row: detail, `/source`, `/install/bundle` and `/agent-prompt`
handlers project different views of one record, asserted byte-identical in
`tests/api.test.ts` §3. A failed update leaves the previous row untouched (validation
runs before any write), and unpublishing flips `status` to `draft`, which the public
queries exclude — listings, detail routes and new installs 404 on next refresh while
already-copied files are unaffected, as the live smoke run demonstrated.

## 4. Security

Previewing uploads could execute malicious code, admin APIs could be forged, and the
installer could overwrite or escape the consumer dir. Protections implemented and
tested: uploads are validated text (relative paths, allowlisted extensions, denied
`child_process`/`process.env`/`eval` patterns in `validation.ts`) and never executed
— previews render a declarative `preview.kind` schema with trusted components
(`catalogue/src/components/SafePreview.tsx`); every admin write requires a
server-verified admin JWT; the CLI confines writes via `resolveTarget` and refuses
overwrite without `--force` (`cli.test.mjs`, 3/3). Remaining limits: previews cover
only six declarative kinds (no sandboxed iframe yet), and revocation cannot recall
copied code.

## 5. AI ownership

I challenged the assistant's `jwt.sign(claims, secret, { expiresIn })` snippet: `tsc`
rejected it under jsonwebtoken v9 + `exactOptionalPropertyTypes` (real transcript),
so I fixed it with `Secret`/`SignOptions` casts in `packages/backend/src/auth.ts` and
re-ran the backend typecheck green. Copy/install/agent-prompt were checked outside
the catalogue: `smoke.cjs` asserted bundle bytes equal the DB record on a live
server (21/21 PASS) and `cli-smoke.cjs` ran the real `cli.mjs` binary — free install
writes `Button.tsx` + `theme.css`, premium without token is denied, with token it
installs (6/6 PASS). The agent prompt was read back from its endpoint and contains
imports, theme, deps and a verify step.

## 6. Production ownership

I was convinced by executed evidence, not builds alone: install (417 pkgs), four
green typechecks, 14 unit tests, two green `next build`s, plus 28 live server/CLI
smoke checks. If a new publish breaks a page I would first fetch its DB row (source
vs `preview.kind` mismatch is the usual suspect), then unpublish to restore listings
instantly without touching data, redeploy only if the renderer itself is at fault,
and tell the team publication is one row — rollback equals unpublish, no migration.
Recovery overall: `/api/health`, env/disk checks from logs, redeploy; records live
in `DATABASE_PATH` with atomic writes.

## 7. Premium access

Access, publication and administration are three independent fields: `User.premium`,
`ComponentRecord.status`/`accessLevel`, and `User.role`. Free or signed-out callers
get premium metadata plus static thumbnail only; every protected handler
(`protectedBundle` in `server.ts`) reloads the user from the DB and denies
signed-out/free/revoked callers on previews, direct source URLs, install bundles,
agent prompts and the CLI (which forwards `--token`/`TECH_INJECT_TOKEN` and prints
denials instead of silently installing). Proven in `tests/api.test.ts` §5 and the
smoke run: grant → same-token access → revoke → same-token 403, customer self-grant
403. Revocation blocks all future retrieval but cannot delete already-copied files.
