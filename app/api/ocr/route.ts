import { getAuthenticatedUser, unauthorized } from "../../../lib/supabase-auth";

type OcrDocument = { id: "answerSheet" | "questionPaper" | "answerKey"; name: string; base64: string; mimeType: string };

async function extract(document: OcrDocument, apiKey: string) {
  const dataUrl = `data:${document.mimeType};base64,${document.base64}`;
  const source = document.mimeType === "application/pdf"
    ? { type: "document_url", document_url: dataUrl }
    : { type: "image_url", image_url: dataUrl };
  const startedAt = Date.now();
  const response = await fetch("https://api.mistral.ai/v1/ocr", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "mistral-ocr-latest", document: source }),
  });
  const ms = Date.now() - startedAt;
  if (!response.ok) throw new Error(`Mistral OCR failed for ${document.name}: ${await response.text()}`);
  const data = await response.json();
  const text = (data?.pages || []).map((page: { markdown?: string }) => page.markdown || "").join("\n\n").trim();
  if (!text) throw new Error(`Mistral OCR returned no text for ${document.name}.`);
  return { id: document.id, name: document.name, text, ms };
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return unauthorized();
    const { documents = [] } = await request.json() as { documents?: OcrDocument[] };
    if (!Array.isArray(documents) || !documents.some(document => document.id === "answerSheet" && document.base64)) {
      return Response.json({ error: "An answer sheet is required for OCR." }, { status: 400 });
    }
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) return Response.json({ error: "MISTRAL_API_KEY is not configured." }, { status: 500 });
    const results = [];
    for (const document of documents.filter(item => item?.base64)) results.push(await extract(document, apiKey));
    return Response.json({
      documents: Object.fromEntries(results.map(result => [result.id, { name: result.name, text: result.text }])),
      timing: [{ provider: "mistral", ms: results.reduce((sum, result) => sum + result.ms, 0), ok: true }],
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unexpected OCR error" }, { status: 500 });
  }
}
