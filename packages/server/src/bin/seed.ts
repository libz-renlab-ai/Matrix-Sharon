#!/usr/bin/env node
import { openDb } from "@matrix-sharon/adapters/storage/sqlite";
import { runMigrations } from "@matrix-sharon/adapters/storage/sqlite/migrate";
import { seedSampleSkills } from "@matrix-sharon/adapters";

async function main(): Promise<void> {
  const db = openDb();
  await runMigrations(db);
  const r = await seedSampleSkills(db);
  process.stdout.write(
    `[sharon-server-seed] +${r.skillsInserted} skills, +${r.versionsInserted} versions, user inserted=${r.userInserted}\n`
  );
  db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
