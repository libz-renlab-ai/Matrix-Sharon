import Fastify from "fastify";
import { openDb } from "@matrix-sharon/adapters/storage/sqlite";
import { runMigrations } from "@matrix-sharon/adapters/storage/sqlite/migrate";

const PORT = Number(process.env.PORT ?? 4321);
const HOST = process.env.HOST ?? "127.0.0.1";

async function main() {
  const db = openDb();
  await runMigrations(db);

  const app = Fastify({ logger: true });

  app.get("/health", async () => ({ ok: true, ts: Date.now() }));

  await app.listen({ port: PORT, host: HOST });
  app.log.info(`Matrix-Sharon server listening on http://${HOST}:${PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
