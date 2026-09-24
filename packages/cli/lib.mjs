import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Shared installer safety logic (imported by cli.mjs and tests).
 * - Keeps all writes inside the chosen consumer directory.
 * - Rejects absolute paths, `..` segments, backslashes and oversized files.
 * - Never overwrites without explicit `force`; never runs shell commands.
 */
export function assertSafeRelativePath(p) {
  if (typeof p !== "string" || p.length === 0 || p.length > 120) {
    throw new Error(`unsafe install path: ${String(p)}`);
  }
  if (p.startsWith("/") || /^[A-Za-z]:/.test(p) || p.includes("\\")) {
    throw new Error(`unsafe install path (absolute or windows path): ${p}`);
  }
  const segments = p.split("/");
  if (segments.some((s) => s === "" || s === "." || s === "..")) {
    throw new Error(`unsafe install path (empty/dotdot segment): ${p}`);
  }
  const lower = p.toLowerCase();
  const allowed = [".tsx", ".ts", ".css", ".json", ".md"];
  if (!allowed.some((ext) => lower.endsWith(ext))) {
    throw new Error(`unsupported install file type: ${p}`);
  }
}

export function resolveTarget(outDir, relPath) {
  assertSafeRelativePath(relPath);
  const root = path.resolve(outDir);
  const target = path.resolve(root, relPath);
  const relative = path.relative(root, target);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`install path escapes consumer directory: ${relPath}`);
  }
  return target;
}

export async function writeBundleFiles(outDir, files, { force = false } = {}) {
  const written = [];
  for (const file of files) {
    if (!file || typeof file.path !== "string" || typeof file.content !== "string") {
      throw new Error("invalid bundle file entry");
    }
    if (file.content.length > 100_000) {
      throw new Error(`bundle file too large: ${file.path}`);
    }
    const target = resolveTarget(outDir, file.path);
    await fs.mkdir(path.dirname(target), { recursive: true });
    let exists = false;
    try {
      await fs.access(target);
      exists = true;
    } catch {
      exists = false;
    }
    if (exists && !force) {
      throw new Error(`refusing to overwrite existing file without --force: ${file.path}`);
    }
    await fs.writeFile(target, file.content, "utf8");
    written.push(target);
  }
  return written;
}
