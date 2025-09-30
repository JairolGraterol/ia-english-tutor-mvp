"use client";
import { useEffect, useRef, useState } from "react";

export default function PracticePage() {
  const [file, setFile] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [recordUrl, setRecordUrl] = useState<string>("");
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [loadingSTT, setLoadingSTT] = useState(false);
  const [loadingFB, setLoadingFB] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [role, setRole] = useState("Finance & Accounting");
  const [focus, setFocus] = useState("interview");
  const [feedback, setFeedback] = useState<any>(null);
  const [error, setError] = useState("");

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
      if (recordUrl) URL.revokeObjectURL(recordUrl);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mediaStream, recordUrl]);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const startRecording = async () => {
    try {
      setError("");
      setFeedback(null);
      setTranscript("");
      setRecordUrl("");
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMediaStream(stream);

      // Prefer webm/opus (ampliamente soportado: Chrome/Edge/Opera)
      const options: MediaRecorderOptions = { mimeType: "audio/webm" };
      const rec = new MediaRecorder(stream, options);
      recorderRef.current = rec;

      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stopTimer();
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setRecordUrl(url);
        // Empaquetar como File para /api/stt
        const f = new File([blob], "recording.webm", { type: "audio/webm" });
        setFile(f);
        // liberar micro
        stream.getTracks().forEach(t => t.stop());
        setMediaStream(null);
      };

      rec.start(250); // recolecta cada 250ms
      setRecording(true);
      startTimer();
    } catch (e: any) {
      setError("No se pudo acceder al micrófono: " + (e?.message || "permiso denegado"));
      setRecording(false);
    }
  };

  const stopRecording = () => {
    try {
      recorderRef.current?.stop();
    } catch {}
    setRecording(false);
  };

  const runSTT = async () => {
    if (!file) { alert("Graba o selecciona un audio (.m4a/.mp3/.webm)"); return; }
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

  const humanTime = (s:number) => {
    const mm = Math.floor(s/60).toString().padStart(2,"0");
    const ss = (s%60).toString().padStart(2,"0");
    return `${mm}:${ss}`;
  };

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif", maxWidth: 900, margin: "0 auto" }}>
      <h1>Practice (Graba → Transcribe → Feedback)</h1>
      <p>Graba audio con el micrófono del navegador, obtén transcripción y feedback.</p>

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <label>
          <div>Rol / Dominio</div>
          <input value={role} onChange={(e)=>setRole(e.target.value)} style={{ width:"100%", padding:8 }} />
        </label>
        <label>
          <div>Enfoque</div>
          <input value={focus} onChange={(e)=>setFocus(e.target.value)} style={{ width:"100%", padding:8 }} placeholder="interview, reading, conversation..." />
        </label>

        {/* Grabación directa */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {!recording ? (
            <button onClick={startRecording} style={{ padding: "8px 12px" }}>🎙️ Empezar a grabar</button>
          ) : (
            <button onClick={stopRecording} style={{ padding: "8px 12px", background:"#ffe5e5" }}>⏹️ Detener</button>
          )}
          <span>Tiempo: <b>{humanTime(seconds)}</b></span>
          <input
            type="file"
            accept="audio/*"
            onChange={(e)=>setFile(e.target.files?.[0] ?? null)}
            title="(Opcional) También puedes elegir un archivo"
          />
        </div>

        {/* Previsualización del audio grabado */}
        {recordUrl && (
          <audio controls src={recordUrl} style={{ marginTop: 8 }} />
        )}

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
