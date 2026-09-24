import bcrypt from "bcryptjs";
import { createApp } from "./server";
import { JsonDb } from "./db";
import { seedDatabase } from "./seed";

async function main(): Promise<void> {
  const port = Number(process.env.PORT ?? "4000");
  const dbPath = process.env.DATABASE_PATH ?? "./data/db.json";
  const jwtSecret = process.env.JWT_SECRET ?? "dev-only-32-plus-character-secret-0123456789";
  if (jwtSecret.length < 32 && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be at least 32 characters in production");
  }
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN ?? "12h";
  const apiBaseUrl = process.env.PUBLIC_API_URL ?? `http://localhost:${port}/api`;

  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@example.com";
  let adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
  if (!adminPasswordHash) {
    const adminPassword = process.env.ADMIN_PASSWORD ?? "AdminPass123!";
    adminPasswordHash = await bcrypt.hash(adminPassword, 10);
  }

  const db = new JsonDb(dbPath);
  await seedDatabase({
    dbPath,
    adminEmail,
    adminPasswordHash,
    freeEmail: process.env.SEED_FREE_EMAIL ?? "free@example.com",
    freePassword: process.env.SEED_FREE_PASSWORD ?? "FreePass123!",
    premiumEmail: process.env.SEED_PREMIUM_EMAIL ?? "premium@example.com",
    premiumPassword: process.env.SEED_PREMIUM_PASSWORD ?? "PremiumPass123!"
  });

  const app = createApp({ db, jwtSecret, jwtExpiresIn, apiBaseUrl });
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ level: "info", msg: `backend listening on ${port}` }));
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
