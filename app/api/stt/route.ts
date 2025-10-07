import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("audio") as Blob | null; // usar Blob, no File (evita errores TS en server)
    if (!file) {
      return NextResponse.json({ error: "Missing 'audio' file" }, { status: 400 });
    }

    // 1) Primera pasada: detectar idioma (verbose_json)
    const fdDetect = new FormData();
    fdDetect.append("file", file, "audio.webm");
    fdDetect.append("model", "whisper-1");
    fdDetect.append("response_format", "verbose_json"); // <-- incluye 'language'

    const detectResp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY || ""}` },
      body: fdDetect,
    });

    if (!detectResp.ok) {
      const errText = await detectResp.text().catch(() => "");
      return NextResponse.json(
        { error: "OpenAI error (detect)", details: errText, status: detectResp.status },
        { status: 500 }
      );
    }

    const detectData: any = await detectResp.json();
    const detectedLang: string = detectData?.language || "unknown";

    // Si ya es inglés, aprovechamos el texto de esta misma respuesta
    if (detectedLang === "en") {
      const transcriptText: string = (detectData?.text || "").trim();
      return NextResponse.json({
        transcript: transcriptText,
        detected_language: detectedLang,
      });
    }

    // 2) Segunda pasada: traducir al inglés si NO es en
    const fdTranslate = new FormData();
    fdTranslate.append("file", file, "audio.webm");
    fdTranslate.append("model", "whisper-1");
    fdTranslate.append("translate", "true"); // <-- traducir al inglés

    const translateResp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY || ""}` },
      body: fdTranslate,
    });

    if (!translateResp.ok) {
      const errText = await translateResp.text().catch(() => "");
      return NextResponse.json(
        { error: "OpenAI error (translate)", details: errText, status: translateResp.status },
        { status: 500 }
      );
    }

    const translateData: any = await translateResp.json();
    const finalText: string = (translateData?.text || "").trim();

    return NextResponse.json({
      transcript: finalText,
      detected_language: detectedLang,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "STT failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/stt" });
}
