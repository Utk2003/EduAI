type GradeRequestBody = {
  subject?: string;
  studentName?: string;
  fileName?: string;
  maxMarks?: number;
  answerKey?: string;
  rubric?: string;
  concepts?: string[];
  fileBase64?: string; // raw base64, no data: prefix
  mimeType?: string;
};

// Step 1: OCR the uploaded answer sheet using Mistral's OCR API.
// Mistral is used ONLY for text extraction here — no grading/analysis happens in this step.
async function runMistralOCR(fileBase64: string, mimeType: string, apiKey: string): Promise<{ text: string; ms: number }> {
  const isPdf = mimeType === "application/pdf";
  const dataUrl = `data:${mimeType};base64,${fileBase64}`;

  const document = isPdf
    ? { type: "document_url", document_url: dataUrl }
    : { type: "image_url", image_url: dataUrl };

  const startedAt = Date.now();
  const res = await fetch("https://api.mistral.ai/v1/ocr", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral-ocr-latest",
      document,
    }),
  });
  const ms = Date.now() - startedAt;

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Mistral OCR failed: ${errText}`);
  }

  const data = await res.json();
  const pages: { markdown?: string }[] = data?.pages || [];
  const text = pages.map(p => p.markdown || "").join("\n\n").trim();

  if (!text) {
    throw new Error("Mistral OCR returned no text for this file.");
  }
  return { text, ms };
}

// Step 2: Send the OCR'd text to OpenAI for the actual grading/analysis.
// OpenAI is used ONLY for analysis here — it never sees the raw file, only extracted text.
async function runOpenAIAnalysis(
  ocrText: string,
  ctx: {
    subject: string;
    studentName: string;
    fileName: string;
    maxMarks: number;
    answerKey: string;
    rubric: string;
    concepts: string[];
  },
  apiKey: string
): Promise<{ score: number; maxMarks: number; gaps: { concept: string; mastery: number }[]; feedback: string; _ms: number }> {
  const conceptList = ctx.concepts.length
    ? ctx.concepts.join(", ")
    : "the key concepts relevant to this subject and rubric";

  const systemPrompt =
    "You are a teaching assistant that grades a student's answer sheet from OCR-extracted text against a rubric and answer key. " +
    "Respond with ONLY a single JSON object, no markdown fences, no commentary, matching exactly this shape: " +
    '{"score": number, "maxMarks": number, "gaps": [{"concept": string, "mastery": number}], "feedback": string}. ' +
    "mastery is 0-100, based on how well the student's actual answer (from the OCR text) demonstrates each concept. " +
    "Include one gap entry per listed concept, in the same order. Base your grading on the OCR text provided, not assumptions.";

  const userPrompt =
    `Subject: ${ctx.subject}\n` +
    `Student: ${ctx.studentName}\n` +
    `Answer sheet file: ${ctx.fileName}\n` +
    `Maximum marks: ${ctx.maxMarks}\n` +
    `Answer key: ${ctx.answerKey || "(none provided)"}\n` +
    `Rubric: ${ctx.rubric || "(none provided)"}\n` +
    `Concepts to assess: ${conceptList}\n\n` +
    `OCR-extracted answer sheet text:\n"""\n${ocrText}\n"""\n\n` +
    "Grade this against the answer key and rubric, and produce the required JSON shape.";

  const startedAt = Date.now();
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5.6-sol",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  const _ms = Date.now() - startedAt;

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI analysis failed: ${errText}`);
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw || typeof raw !== "string") {
    throw new Error("Empty response from OpenAI");
  }

  try {
    return { ...JSON.parse(raw), _ms };
  } catch {
    throw new Error("OpenAI did not return valid JSON");
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GradeRequestBody;
    const {
      subject = "General",
      studentName = "Student",
      fileName = "answer sheet",
      maxMarks = 10,
      answerKey = "",
      rubric = "",
      concepts = [],
      fileBase64,
      mimeType = "application/pdf",
    } = body;

    const mistralKey = process.env.MISTRAL_API_KEY;
    if (!mistralKey) {
      return Response.json(
        { error: "MISTRAL_API_KEY is not set. Add it to .env.local and restart the dev server." },
        { status: 500 }
      );
    }
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return Response.json(
        { error: "OPENAI_API_KEY is not set. Add it to .env.local and restart the dev server." },
        { status: 500 }
      );
    }
    if (!fileBase64) {
      return Response.json(
        { error: "No file data was provided to OCR. Make sure the answer sheet was uploaded and stored before grading." },
        { status: 400 }
      );
    }

    // Step 1 — OCR with Mistral (text extraction only)
    const ocr = await runMistralOCR(fileBase64, mimeType, mistralKey);

    // Step 2 — Analysis/grading with OpenAI
    const result = await runOpenAIAnalysis(
      ocr.text,
      { subject, studentName, fileName, maxMarks, answerKey, rubric, concepts },
      openaiKey
    );

    const { _ms: openaiMs, ...gradePayload } = result;
    return Response.json({
      ...gradePayload,
      ocrText: ocr.text,
      timing: [
        { provider: "mistral", ms: ocr.ms, ok: true },
        { provider: "openai", ms: openaiMs, ok: true },
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}
