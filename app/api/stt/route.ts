import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY in Vercel env" }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get("audio") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Missing 'audio' file" }, { status: 400 });
    }

    const fd = new FormData();
    fd.append("file", file, file.name || "audio.m4a");
    fd.append("model", "whisper-1");

    const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      body: fd,
    });

    const text = await resp.text().catch(() => "");
    if (!resp.ok) {
      return NextResponse.json(
        { error: "OpenAI error", status: resp.status, details: text?.slice(0, 800) },
        { status: 500 }
      );
    }

    // text contiene JSON de OpenAI: { text: "..." }
    let data: any = {};
    try { data = JSON.parse(text); } catch {}
    return NextResponse.json({ transcript: data.text || "" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "STT failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/stt" });
}
