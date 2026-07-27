import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("production build contains the deployed worker and persistence routes", async () => {
  await access(new URL("../dist/server/index.js", import.meta.url));
  const manifest = await readFile(new URL("../dist/server/manifest.json", import.meta.url), "utf8").catch(() => "");
  const worker = await readFile(new URL("../dist/server/index.js", import.meta.url), "utf8");
  assert.ok(manifest.includes("/api/workspace") || worker.includes("workspace_snapshots"));
  assert.ok(manifest.includes("/api/files/:id") || worker.includes("uploads/"));
});

test("database and object-storage bindings have deployable migrations", async () => {
  const hosting = JSON.parse(await readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"));
  const migration = await readFile(new URL("../drizzle/0000_warm_roulette.sql", import.meta.url), "utf8");
  assert.equal(hosting.d1, "DB");
  assert.equal(hosting.r2, "FILES");
  for (const table of [
    "schools", "users", "classes", "students", "assessments", "uploaded_files",
    "grade_results", "interventions", "resources", "followup_evidence",
    "audit_events", "workspace_snapshots",
  ]) {
    assert.match(migration, new RegExp(`CREATE TABLE \\\`${table}\\\``));
  }
});
