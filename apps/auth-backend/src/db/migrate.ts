import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// Standalone migration entrypoint — run by a Kubernetes Job before rollout
// (never auto-migrate on app boot). Reads DATABASE_URL directly.
async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");

  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql);
  const migrationsFolder = path.join(__dirname, "..", "..", "drizzle");

  // eslint-disable-next-line no-console
  console.log(`[migrate] applying migrations from ${migrationsFolder}`);
  await migrate(db, { migrationsFolder });
  await sql.end();
  // eslint-disable-next-line no-console
  console.log("[migrate] done");
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("[migrate] failed", error);
  process.exit(1);
});
