import { getSupabaseServer } from "../../../lib/supabase-server";

const WORKSPACE_ID = "sunrise-academy";
const MAX_STATE_BYTES = 4 * 1024 * 1024;

export async function GET() {
  try {
    const { data, error } = await getSupabaseServer()
      .from("workspace_snapshots")
      .select("state_json, revision, updated_at")
      .eq("workspace_id", WORKSPACE_ID)
      .maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ state: null, revision: 0 });
    return Response.json({ state: data.state_json, revision: data.revision, updatedAt: data.updated_at });
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
    const serialized = JSON.stringify(body.state);
    if (new TextEncoder().encode(serialized).byteLength > MAX_STATE_BYTES) {
      return Response.json({ error: "Workspace state exceeds the 4 MB storage limit." }, { status: 413 });
    }
    const { data, error } = await getSupabaseServer().rpc("save_workspace_snapshot", {
      p_workspace_id: WORKSPACE_ID,
      p_state_json: body.state,
    });
    if (error) throw error;
    return Response.json({ ok: true, revision: data });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Database write failed" }, { status: 500 });
  }
}
