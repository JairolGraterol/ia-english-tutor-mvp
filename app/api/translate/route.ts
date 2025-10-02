import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing 'text' string" }, { status: 400 });
    }

    const body = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a translator. Detect the input language and return a concise JSON object with keys: 'detected' ('en' or 'es'), 'en' (English version), 'es' (Spanish version). Do not add explanations.",
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    };

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY || ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const err = await resp.text().catch(() => "");
      return NextResponse.json({ error: "OpenAI error", details: err }, { status: 500 });
    }

    const data = await resp.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");

    return NextResponse.json({
      detected: parsed.detected || null,
      en: parsed.en || "",
      es: parsed.es || "",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Translate failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/translate" });
}
