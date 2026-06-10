import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const sql = postgres(url, { max: 1 });
  await migrate(drizzle(sql), { migrationsFolder: path.join(__dirname, "..", "..", "drizzle") });
  await sql.end();
  // eslint-disable-next-line no-console
  console.log("[migrate] done");
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("[migrate] failed", error);
  process.exit(1);
});
