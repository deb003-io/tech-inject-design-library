import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveTarget, writeBundleFiles } from "./lib.mjs";

describe("installer safety (req. 4)", () => {
  it("rejects unsafe install paths", () => {
    const out = path.join(os.tmpdir(), "ti-out");
    for (const bad of ["../evil.tsx", "/abs/path.tsx", "C:\\win.tsx", "a/../../b.tsx", "file.exe", ""]) {
      expect(() => resolveTarget(out, bad)).toThrow();
    }
    expect(() => resolveTarget(out, "ok/Button.tsx")).not.toThrow();
  });

  it("refuses to overwrite existing files unless --force", async () => {
    const out = await fs.mkdtemp(path.join(os.tmpdir(), "ti-install-"));
    const files = [{ path: "Button.tsx", content: "v1" }];
    await writeBundleFiles(out, files);
    await expect(writeBundleFiles(out, files)).rejects.toThrow(/without --force/);
    await writeBundleFiles(out, [{ path: "Button.tsx", content: "v2" }], { force: true });
    expect(await fs.readFile(path.join(out, "Button.tsx"), "utf8")).toBe("v2");
    await fs.rm(out, { recursive: true, force: true });
  });

  it("keeps writes inside the consumer directory", async () => {
    const out = await fs.mkdtemp(path.join(os.tmpdir(), "ti-install-"));
    await writeBundleFiles(out, [{ path: "sub/Deep.tsx", content: "x" }]);
    const entries = await fs.readdir(path.join(out, "sub"));
    expect(entries).toContain("Deep.tsx");
    await fs.rm(out, { recursive: true, force: true });
  });
});
