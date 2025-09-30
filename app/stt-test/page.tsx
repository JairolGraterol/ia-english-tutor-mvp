"use client";
import { useState } from "react";

export default function STTTestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { alert("Selecciona un audio (.webm/.mp3/.m4a)"); return; }
    setLoading(true); setResult("");
    try {
      const fd = new FormData();
      fd.append("audio", file);
      const res = await fetch("/api/stt", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "STT error");
      setResult(json.transcript || "");
    } catch (err: any) {
      setResult("Error: " + (err?.message || "STT failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif", maxWidth: 680, margin: "0 auto" }}>
      <h1>STT Test (Whisper)</h1>
      <p>Sube un audio corto (webm/mp3/m4a) para transcribir con /api/stt.</p>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 12 }}>
        <input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button type="submit" disabled={loading} style={{ padding: "8px 12px" }}>
          {loading ? "Transcribiendo..." : "Enviar a /api/stt"}
        </button>
      </form>
      <div style={{ marginTop: 16, whiteSpace: "pre-wrap" }}>
        <strong>Resultado:</strong>
        <div>{result || "—"}</div>
      </div>
    </div>
  );
}
