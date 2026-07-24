type GradeRequestBody = {
  subject?: string;
  studentName?: string;
  fileName?: string;
  maxMarks?: number;
  answerKey?: string;
  rubric?: string;
  concepts?: string[];
};

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
    } = body;

    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "MISTRAL_API_KEY is not set. Add it to .env.local and restart the dev server." },
        { status: 500 }
      );
    }

    const conceptList = concepts.length
      ? concepts.join(", ")
      : "the key concepts relevant to this subject and rubric";

    const systemPrompt =
      "You are an assistant that produces a plausible, illustrative grading result for a teacher-facing demo. " +
      "Respond with ONLY a single JSON object, no markdown fences, no commentary, matching exactly this shape: " +
      '{"score": number, "maxMarks": number, "gaps": [{"concept": string, "mastery": number}], "feedback": string}. ' +
      "mastery is 0-100. Include one gap entry per listed concept, in the same order.";

    const userPrompt =
      `Subject: ${subject}\n` +
      `Student: ${studentName}\n` +
      `Answer sheet file: ${fileName}\n` +
      `Maximum marks: ${maxMarks}\n` +
      `Answer key: ${answerKey || "(none provided)"}\n` +
      `Rubric: ${rubric || "(none provided)"}\n` +
      `Concepts to assess: ${conceptList}\n\n` +
      "Produce a realistic-looking grading result following the required JSON shape.";

    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistral-large-latest",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return Response.json({ error: errText }, { status: res.status });
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content;

    if (!raw || typeof raw !== "string") {
      return Response.json({ error: "Empty response from Mistral" }, { status: 502 });
    }

    let parsed: { score: number; maxMarks: number; gaps: { concept: string; mastery: number }[]; feedback: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return Response.json({ error: "Mistral did not return valid JSON", raw }, { status: 502 });
    }

    return Response.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}
