import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
const config = path.resolve("dist/server/wrangler.json");
if (!existsSync(config)) {
  console.error("Execute npm run build antes de migrar o banco.");
  process.exit(1);
}
const runner = path.resolve("node_modules/wrangler/bin/wrangler.js");
function execute(args, capture = false) {
  const r = spawnSync(
    process.execPath,
    [
      "--import",
      "./scripts/sites-env.mjs",
      runner,
      "d1",
      "execute",
      "DB",
      "--local",
      "--config",
      config,
      "--persist-to",
      ".wrangler/state",
      ...args,
    ],
    { encoding: "utf8", stdio: capture ? "pipe" : "inherit" },
  );
  if (r.status !== 0) {
    if (capture) console.error(r.stderr || r.stdout);
    process.exit(r.status || 1);
  }
  return r.stdout;
}
execute([
  "--command",
  "CREATE TABLE IF NOT EXISTS nexo_local_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)",
]);
const raw = execute(
  ["--command", "SELECT name FROM nexo_local_migrations", "--json"],
  true,
);
let applied = [];
try {
  applied = JSON.parse(raw).flatMap((r) =>
    (r.results || []).map((x) => x.name),
  );
} catch {
  console.error("Não foi possível verificar as migrations aplicadas.");
  process.exit(1);
}
for (const file of readdirSync("drizzle")
  .filter((f) => f.endsWith(".sql"))
  .sort()) {
  if (applied.includes(file)) {
    console.log("Já aplicada:", file);
    continue;
  }
  execute(["--file", path.resolve("drizzle", file)]);
  const name = file.replaceAll("'", "''");
  execute([
    "--command",
    `INSERT INTO nexo_local_migrations(name,applied_at) VALUES ('${name}','${new Date().toISOString()}')`,
  ]);
  console.log("Migration aplicada:", file);
}
console.log("Banco local pronto. Execute npm run dev.");
