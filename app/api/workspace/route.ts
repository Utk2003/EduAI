import { env } from "cloudflare:workers";

const WORKSPACE_ID = "sunrise-academy";
const MAX_STATE_BYTES = 4 * 1024 * 1024;

async function ensureWorkspaceTable() {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS workspace_snapshots (
      workspace_id TEXT PRIMARY KEY NOT NULL,
      state_json TEXT NOT NULL,
      revision INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    )
  `).run();
}

export async function GET() {
  try {
    await ensureWorkspaceTable();
    const row = await env.DB.prepare(
      "SELECT state_json, revision, updated_at FROM workspace_snapshots WHERE workspace_id = ?"
    ).bind(WORKSPACE_ID).first<{ state_json: string; revision: number; updated_at: string }>();
    if (!row) return Response.json({ state: null, revision: 0 });
    return Response.json({ state: JSON.parse(row.state_json), revision: row.revision, updatedAt: row.updated_at });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Database read failed" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json() as { state?: unknown };
    if (!body.state || typeof body.state !== "object") {
      return Response.json({ error: "A workspace state object is required." }, { status: 400 });
    }
    const stateJson = JSON.stringify(body.state);
    if (new TextEncoder().encode(stateJson).byteLength > MAX_STATE_BYTES) {
      return Response.json({ error: "Workspace state exceeds the 4 MB storage limit." }, { status: 413 });
    }
    await ensureWorkspaceTable();
    const now = new Date().toISOString();
    await env.DB.prepare(`
      INSERT INTO workspace_snapshots (workspace_id, state_json, revision, updated_at)
      VALUES (?, ?, 1, ?)
      ON CONFLICT(workspace_id) DO UPDATE SET
        state_json = excluded.state_json,
        revision = workspace_snapshots.revision + 1,
        updated_at = excluded.updated_at
    `).bind(WORKSPACE_ID, stateJson, now).run();
    const row = await env.DB.prepare(
      "SELECT revision FROM workspace_snapshots WHERE workspace_id = ?"
    ).bind(WORKSPACE_ID).first<{ revision: number }>();
    return Response.json({ ok: true, revision: row?.revision || 1, updatedAt: now });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Database write failed" }, { status: 500 });
  }
}
