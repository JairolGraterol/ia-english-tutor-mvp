"use client";
import { useState } from "react";

export default function PracticePage() {
  const [file, setFile] = useState<File | null>(null);
  const [loadingSTT, setLoadingSTT] = useState(false);
  const [loadingFB, setLoadingFB] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [role, setRole] = useState("Finance & Accounting");
  const [focus, setFocus] = useState("interview");
  const [feedback, setFeedback] = useState<any>(null);
  const [error, setError] = useState("");

  const runSTT = async () => {
    if (!file) { alert("Selecciona un audio (.m4a/.mp3/.webm)"); return; }
    setError(""); setFeedback(null); setTranscript("");
    setLoadingSTT(true);
    try {
      const fd = new FormData();
      fd.append("audio", file);
      const res = await fetch("/api/stt", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "STT error");
      setTranscript(json.transcript || "");
    } catch (e:any) {
      setError("STT: " + (e?.message || "failed"));
    } finally {
      setLoadingSTT(false);
    }
  };

  const runFeedback = async () => {
    if (!transcript.trim()) { alert("No hay transcript todavía"); return; }
    setLoadingFB(true); setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, role, focus }),
      });
      const raw = await res.text();
      let data:any = null;
      try { data = JSON.parse(raw); } catch { throw new Error(raw?.slice(0,500) || "Non-JSON"); }
      if (!res.ok) throw new Error(data?.error || raw);
      setFeedback(data);
    } catch (e:any) {
      setError("Feedback: " + (e?.message || "failed"));
    } finally {
      setLoadingFB(false);
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif", maxWidth: 900, margin: "0 auto" }}>
      <h1>Practice (Audio → Transcript → Feedback)</h1>
      <p>Sube un audio, obtén transcripción y feedback en una sola vista.</p>

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <label>
          <div>Rol / Dominio</div>
          <input value={role} onChange={(e)=>setRole(e.target.value)} style={{ width:"100%", padding:8 }} />
        </label>
        <label>
          <div>Enfoque</div>
          <input value={focus} onChange={(e)=>setFocus(e.target.value)} style={{ width:"100%", padding:8 }} placeholder="interview, reading, conversation..." />
        </label>
        <label>
          <div>Audio</div>
          <input type="file" accept="audio/*" onChange={(e)=>setFile(e.target.files?.[0] ?? null)} />
        </label>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={runSTT} disabled={loadingSTT} style={{ padding: "8px 12px" }}>
            {loadingSTT ? "Transcribiendo..." : "1) Transcribir audio"}
          </button>
          <button onClick={runFeedback} disabled={loadingFB || !transcript} style={{ padding: "8px 12px" }}>
            {loadingFB ? "Analizando..." : "2) Obtener feedback"}
          </button>
        </div>

        {error && <pre style={{ color:"crimson", whiteSpace:"pre-wrap" }}>{error}</pre>}

        <section style={{ marginTop: 8 }}>
          <h3>Transcript</h3>
          <pre style={{ whiteSpace:"pre-wrap", background:"#f6f6f6", padding:12, borderRadius:8 }}>
            {transcript || "—"}
          </pre>
        </section>

        {feedback && (
          <div style={{ display:"grid", gap: 12, marginTop: 8 }}>
            <div><b>Level estimate:</b> {feedback.level_estimate || "—"}</div>

            <div>
              <b>Strengths</b>
              <ul>{(feedback.strengths||[]).map((s:string,i:number)=><li key={i}>{s}</li>)}</ul>
            </div>

            <div>
              <b>Issues</b>
              <ul>{(feedback.issues||[]).map((s:string,i:number)=><li key={i}>{s}</li>)}</ul>
            </div>

            <div>
              <b>Corrections</b>
              <ul>
                {(feedback.corrections||[]).map((c:any,i:number)=>(
                  <li key={i}>
                    <div><b>Original:</b> {c.original}</div>
                    <div><b>Corrected:</b> {c.corrected}</div>
                    <div style={{color:"#555"}}>{c.explanation}</div>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <b>Practice words</b>
              <div>{(feedback.practice_words||[]).join(", ") || "—"}</div>
            </div>

            <div>
              <b>Pronunciation tips</b>
              <ul>{(feedback.pronunciation_tips||[]).map((s:string,i:number)=><li key={i}>{s}</li>)}</ul>
            </div>

            <div>
              <b>Suggested answer</b>
              <pre style={{ whiteSpace:"pre-wrap" }}>{feedback.suggested_answer || "—"}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
