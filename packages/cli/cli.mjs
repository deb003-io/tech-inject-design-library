#!/usr/bin/env node
import { writeBundleFiles } from "./lib.mjs";

function usage() {
  return [
    "tech-inject-add — install one Tech Inject component into a consumer project",
    "",
    "Usage:",
    "  tech-inject-add add <slug> --api <base-url> --out <dir> [--token <jwt>] [--force]",
    "",
    "Flags:",
    "  --api     Backend API base, e.g. https://api.example.com/api (required)",
    "  --out     Consumer directory to write into, e.g. ./components (required)",
    "  --token   JWT from catalogue sign-in. Required for premium components.",
    "            Prefer env TECH_INJECT_TOKEN instead of passing --token on shared machines.",
    "  --force   Overwrite existing files (default: refuse).",
    "",
    "Safety: writes stay inside --out, unsafe paths are rejected, existing files",
    "are never silently overwritten, and no component-supplied shell is executed."
  ].join("\n");
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--api" || a === "--out" || a === "--token") {
      args[a.slice(2)] = argv[i + 1];
      i += 1;
    } else if (a === "--force") {
      args.force = true;
    } else if (a === "--help" || a === "-h") {
      args.help = true;
    } else {
      args._.push(a);
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args._[0] !== "add" || !args._[1]) {
    console.log(usage());
    process.exit(args.help ? 0 : 1);
  }
  const slug = args._[1];
  const api = args.api;
  const out = args.out;
  const token = args.token ?? process.env.TECH_INJECT_TOKEN;
  if (!api || !out) {
    console.error("Missing required flags. See --help.");
    process.exit(1);
  }
  const url = `${String(api).replace(/\/$/, "")}/components/${encodeURIComponent(slug)}/install/bundle`;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  let res;
  try {
    res = await fetch(url, { headers });
  } catch (err) {
    console.error(`Cannot reach API at ${url}: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
  if (res.status === 401 || res.status === 403) {
    const body = await res.text();
    console.error(`Access denied (HTTP ${res.status}). This component likely requires premium access: sign in via the catalogue and retry with --token. Details: ${body.slice(0, 300)}`);
    process.exit(1);
  }
  if (!res.ok) {
    console.error(`Install failed (HTTP ${res.status}): ${(await res.text()).slice(0, 300)}`);
    process.exit(1);
  }
  const bundle = await res.json();
  if (!Array.isArray(bundle.files)) {
    console.error("Invalid bundle received from API.");
    process.exit(1);
  }
  try {
    const written = await writeBundleFiles(out, bundle.files, { force: Boolean(args.force) });
    console.log(`Installed ${slug}@${bundle.version ?? "unknown"} (${written.length} files) into ${out}.`);
    console.log(`Entry: ${bundle.entry ?? "(see bundle)"}. Import theme.css once alongside the component.`);
  } catch (err) {
    console.error(`Install aborted: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

main();
