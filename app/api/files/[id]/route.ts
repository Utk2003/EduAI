import { env } from "cloudflare:workers";

function fileId(request: Request) {
  return decodeURIComponent(new URL(request.url).pathname.split("/").pop() || "");
}

export async function PUT(request: Request) {
  try {
    const id = fileId(request);
    if (!id || id.length > 300) return Response.json({ error: "Invalid file id." }, { status: 400 });
    const blob = await request.blob();
    if (!blob.size || blob.size > 10 * 1024 * 1024) {
      return Response.json({ error: "Files must be between 1 byte and 10 MB." }, { status: 413 });
    }
    await env.FILES.put(`uploads/${id}`, blob.stream(), {
      httpMetadata: { contentType: request.headers.get("content-type") || "application/octet-stream" },
      customMetadata: { originalName: request.headers.get("x-file-name") || id },
    });
    return Response.json({ ok: true, size: blob.size });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "File upload failed" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const object = await env.FILES.get(`uploads/${fileId(request)}`);
    if (!object) return Response.json({ error: "File not found." }, { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", "private, max-age=60");
    return new Response(object.body, { headers });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "File download failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await env.FILES.delete(`uploads/${fileId(request)}`);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "File deletion failed" }, { status: 500 });
  }
}
