import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
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
        Authorization: `Bearer ${process.env.OPENAI_API_KEY || ""}`,
        Accept: "application/json",
      },
      body: fd,
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      // Devolvemos status y texto para diagnóstico
      return NextResponse.json(
        { error: "OpenAI error", status: resp.status, details: text.slice(0, 500) },
        { status: 500 }
      );
    }

    const data = await resp.json();
    return NextResponse.json({ transcript: data.text || "" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "STT failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/stt" });
}
import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("audio") as File | null;
    if (!file) return NextResponse.json({ error: "Missing 'audio' file" }, { status: 400 });

    const fd = new FormData();
    fd.append("file", file, file.name || "audio.webm");
    fd.append("model", "whisper-1"); // OpenAI STT

    const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY || ""}` },
      body: fd,
    });

    if (!resp.ok) {
      const err = await resp.text().catch(() => "");
      return NextResponse.json({ error: "OpenAI error", details: err }, { status: 500 });
    }

    const data = await resp.json(); // { text: "..." }
    return NextResponse.json({ transcript: data.text || "" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "STT failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/stt" });
}
