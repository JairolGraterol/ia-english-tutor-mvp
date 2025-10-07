import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("audio") as Blob | null;
    if (!file) {
      return NextResponse.json({ error: "Missing 'audio' file" }, { status: 400 });
    }

    // 1️⃣ Detectar idioma con verbose_json
    const fdDetect = new FormData();
    fdDetect.append("file", file, "audio.webm");
    fdDetect.append("model", "whisper-1");
    fdDetect.append("response_format", "verbose_json");

    const detectResp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY || ""}` },
      body: fdDetect,
    });

    if (!detectResp.ok) {
      const errText = await detectResp.text().catch(() => "");
      return NextResponse.json(
        { error: "OpenAI detect error", details: errText },
        { status: detectResp.status }
      );
    }

    const detectData = await detectResp.json();
    const detectedLang: string = detectData.language || "unknown";
    const originalText: string = detectData.text || "";

    // 2️⃣ Si el idioma ya es inglés, lo devolvemos directamente
    if (detectedLang === "en") {
      return NextResponse.json({
        transcript: originalText.trim(),
        detected_language: detectedLang,
      });
    }

    // 3️⃣ Si NO es inglés, pedimos traducción explícita al inglés
    const translationPrompt = `
You are a translator. Translate the following text into clear and correct English (US):
---
${originalText}
---
Output only the translated English text, no explanation.
`;

    const translateRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY || ""}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful English translator." },
          { role: "user", content: translationPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!translateRes.ok) {
      const errText = await translateRes.text().catch(() => "");
      return NextResponse.json(
        { error: "OpenAI translation error", details: errText },
        { status: translateRes.status }
      );
    }

    const translateData = await translateRes.json();
    const translatedText = translateData.choices?.[0]?.message?.content?.trim() || "";

    return NextResponse.json({
      transcript: translatedText,
      detected_language: detectedLang,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "STT failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/stt" });
}
