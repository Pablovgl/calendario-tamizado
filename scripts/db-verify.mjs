// Comprueba que la base de datos (TURSO_DATABASE_URL) tiene las tablas esperadas.
// Uso: TURSO_DATABASE_URL=… TURSO_AUTH_TOKEN=… npm run db:verify
import { createClient } from "@libsql/client";

const EXPECTED = ["users", "sources", "events"];

const client = createClient({
  url: process.env.TURSO_DATABASE_URL ?? "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const { rows } = await client.execute(
  "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '\\_\\_%' ESCAPE '\\' ORDER BY name",
);
const found = rows.map((r) => String(r.name));
let ok = true;
for (const table of EXPECTED) {
  if (!found.includes(table)) {
    ok = false;
    console.log(`✗ ${table}: NO existe`);
    continue;
  }
  const cols = (await client.execute(`PRAGMA table_info(${table})`)).rows.map((r) => r.name);
  const count = (await client.execute(`SELECT count(*) AS n FROM ${table}`)).rows[0].n;
  console.log(`✓ ${table}: ${cols.length} columnas (${cols.join(", ")}), ${count} filas`);
}
process.exit(ok ? 0 : 1);
