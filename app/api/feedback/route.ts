import { NextResponse } from "next/server";
export const runtime = "nodejs";

type Body = { transcript?: string; role?: string; focus?: string; };

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });

    let body: Body = {};
    try { body = (await req.json()) as Body; }
    catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

    const transcript = (body.transcript || "").trim();
    const role = (body.role || "General English").trim();
    const focus = (body.focus || "general").trim();
    if (!transcript) return NextResponse.json({ error: "Missing 'transcript' text" }, { status: 400 });

    const system = `
You are an English coach for adults living in the US. The user has at least basic/intermediate level.
Return feedback as STRICT JSON. No preamble, no markdown.
Schema:{
  "level_estimate":"A2"|"B1"|"B2"|"C1",
  "strengths":string[],
  "issues":string[],
  "corrections":[{"original":string,"corrected":string,"explanation":string}],
  "practice_words":string[],
  "pronunciation_tips":string[],
  "suggested_answer":string
}
Keep it concise, practical, and specific to the user's domain if provided.`.trim();

    const user = `
ROLE / Domain: ${role}
FOCUS: ${focus}
TEXT TO EVALUATE:
"""${transcript}"""
Return ONLY the JSON object.`.trim();

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
    });

    const text = await resp.text().catch(() => "");
    if (!resp.ok) {
      return NextResponse.json(
        { error: "OpenAI error", status: resp.status, details: text?.slice(0, 2000) || "(empty)" },
        { status: 500 }
      );
    }

    let parsed: any = {};
    try { parsed = JSON.parse(text); } catch { parsed = { raw: text || "(empty from OpenAI)" }; }

    const content = parsed?.choices?.[0]?.message?.content ?? parsed;
    let finalObj: any = {};
    if (typeof content === "string") {
      try { finalObj = JSON.parse(content); } catch { finalObj = { raw: content }; }
    } else {
      finalObj = content;
    }

    return NextResponse.json(finalObj);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "feedback failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/feedback" });
}
