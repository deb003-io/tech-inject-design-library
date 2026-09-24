import { promises as fs } from "node:fs";
import path from "node:path";
import type { DbSchema } from "./types";

function emptyDb(): DbSchema {
  return { users: [], components: [] };
}

/** Minimal persistent JSON-file store. Atomic writes (tmp + rename) survive restarts/redeploys. */
export class JsonDb {
  private cache: DbSchema | null = null;

  constructor(private readonly dbPath: string) {}

  private async ensureDir(): Promise<void> {
    await fs.mkdir(path.dirname(this.dbPath), { recursive: true });
  }

  async load(): Promise<DbSchema> {
    if (this.cache) return this.cache;
    await this.ensureDir();
    try {
      const raw = await fs.readFile(this.dbPath, "utf8");
      const parsed = JSON.parse(raw) as DbSchema;
      if (!Array.isArray(parsed.users) || !Array.isArray(parsed.components)) {
        this.cache = emptyDb();
      } else {
        this.cache = parsed;
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        this.cache = emptyDb();
      } else {
        throw err;
      }
    }
    return this.cache as DbSchema;
  }

  /** Mutate under a single async boundary, then persist atomically. */
  async update(mutator: (db: DbSchema) => void): Promise<DbSchema> {
    const db = await this.load();
    mutator(db);
    const tmp = `${this.dbPath}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
    await fs.rename(tmp, this.dbPath);
    return db;
  }
}
