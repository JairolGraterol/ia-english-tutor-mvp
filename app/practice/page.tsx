"use client";
import { useEffect, useRef, useState } from "react";

/** Tipos del historial */
type PracticeItem = {
  id: string;
  createdAt: string; // ISO
  role: string;
  focus: string;
  transcript: string;
  feedback: any | null;
};

const LS_KEY = "practice_history_v1";
const MAX_SECONDS = 15; // ★ Límite de grabación

/** Helper UI: círculo tipo semáforo con valor dentro */
function ScoreCircle({
  label,
  value,
  activeColor,
  active,
}: {
  label: string;
  value: number;
  activeColor: string; // CSS color
  active: boolean;
}) {
  return (
    <div style={{ display: "grid", placeItems: "center", gap: 6 }}>
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          fontWeight: 800,
          border: `3px solid ${active ? activeColor : "#e5e7eb"}`,
          background: active ? activeColor : "white",
          color: active ? "white" : "#111827",
          boxShadow: active ? `0 6px 14px ${activeColor}55` : "none",
        }}
        title={`${label}: ${value}`}
      >
        {Math.round(value)}
      </div>
      <div style={{ fontSize: 12, color: "#374151" }}>{label}</div>
    </div>
  );
}

export default function PracticePage() {
  // --- Estado de práctica ---
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
  const [role, setRole] = useState("");  // placeholder
  const [focus, setFocus] = useState(""); // placeholder
  const [feedback, setFeedback] = useState<any>(null);
  const [error, setError] = useState("");

  // --- Puntuaciones ---
  const [overallScore, setOverallScore] = useState<number>(0);

  // --- Historial en localStorage ---
  const [history, setHistory] = useState<PracticeItem[]>([]);

  // Cargar historial al montar
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
    return () => {
      if (mediaStream) mediaStream.getTracks().forEach((t) => t.stop());
      if (recordUrl) URL.revokeObjectURL(recordUrl);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []); // eslint-disable-line

  const persistHistory = (items: PracticeItem[]) => {
    setHistory(items);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(items));
    } catch {}
  };

  // --- Timer grabación (★ con auto-stop a 15s) ---
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSeconds(0);
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        const next = s + 1;
        if (next >= MAX_SECONDS) {
          stopRecording(); // detiene MediaRecorder y timer
        }
        return next;
      });
    }, 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  // --- Grabación ---
  const startRecording = async () => {
    try {
      setError("");
      setFeedback(null);
      setTranscript("");
      setRecordUrl("");
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMediaStream(stream);

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
        const f = new File([blob], "recording.webm", { type: "audio/webm" });
        setFile(f);
        stream.getTracks().forEach((t) => t.stop());
        setMediaStream(null);
      };

      rec.start(250);
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

  // --- STT y Feedback ---
  const runSTT = async () => {
    if (!file) {
      alert("Graba o selecciona un audio (.m4a/.mp3/.webm)");
      return;
    }
    setError("");
    setFeedback(null);
    setTranscript("");
    setLoadingSTT(true);
    try {
      const fd = new FormData();
      fd.append("audio", file);
      const res = await fetch("/api/stt", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "STT error");
      setTranscript(json.transcript || "");
    } catch (e: any) {
      setError("STT: " + (e?.message || "failed"));
    } finally {
      setLoadingSTT(false);
    }
  };

  const runFeedback = async () => {
    if (!transcript.trim()) {
      alert("No hay transcript todavía");
      return;
    }
    if (!role || !focus) {
      alert("Escoge el dominio y el enfoque antes de continuar.");
      return;
    }
    setLoadingFB(true);
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, role, focus }),
      });
      const raw = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(raw?.slice(0, 500) || "Non-JSON");
      }
      if (!res.ok) throw new Error(data?.error || raw);
      setFeedback(data);

      // calcular puntajes a partir de feedback
      const issues: string[] = data?.issues || [];
      const corrections: any[] = data?.corrections || [];
      const pronTips: string[] = data?.pronunciation_tips || [];
      const practiceWords: string[] = data?.practice_words || [];

      const countMatch = (arr: string[], key: string) =>
        arr.filter((s) => s.toLowerCase().includes(key)).length;

      const grammarHits =
        countMatch(issues, "gramm") + // grammar, grammatical
        countMatch(issues, "tense") +
        countMatch(issues, "article") +
        corrections.length;

      const vocabHits =
        countMatch(issues, "vocab") +
        countMatch(issues, "word choice") +
        (practiceWords?.length ? 1 : 0);

      const pronHits =
        countMatch(issues, "pronun") + // pronunciation
        pronTips.length;

      const clamp = (n: number) => Math.max(0, Math.min(100, n));
      const grammarScore = clamp(92 - grammarHits * 7);
      const vocabScore = clamp(90 - vocabHits * 6);
      const pronScore = clamp(90 - pronHits * 6);

      const overall = Math.round((grammarScore + vocabScore + pronScore) / 3);
      setOverallScore(overall);
    } catch (e: any) {
      setError("Feedback: " + (e?.message || "failed"));
    } finally {
      setLoadingFB(false);
    }
  };

  // --- Guardar / Borrar / Cargar del historial ---
  const savePractice = () => {
    if (!transcript.trim()) {
      alert("No hay transcript para guardar");
      return;
    }
    const item: PracticeItem = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      role,
      focus,
      transcript,
      feedback,
    };
    const next = [item, ...history].slice(0, 200); // límite de seguridad
    persistHistory(next);
  };

  const deletePractice = (id: string) => {
    const next = history.filter((h) => h.id !== id);
    persistHistory(next);
  };

  const clearCurrent = () => {
    setTranscript("");
    setFeedback(null);
    setError("");
    setRecordUrl("");
    setFile(null);
    setOverallScore(0);
    setSeconds(0);
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
      setMediaStream(null);
    }
  };

  const clearAll = () => {
    if (!confirm("¿Borrar TODO el historial?")) return;
    persistHistory([]);
  };

  const loadPractice = (item: PracticeItem) => {
    setRole(item.role);
    setFocus(item.focus);
    setTranscript(item.transcript);
    setFeedback(item.feedback);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // --- Helpers UI ---
  const humanTime = (s: number) => {
    const mm = Math.floor(s / 60).toString().padStart(2, "0");
    const ss = (s % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  };
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  // --- Opciones (alfabéticas) ---
  const roleOptions = [
    "Comida",
    "Customer Service",
    "Finance & Accounting",
    "IT / Technology",
    "Logistics & Operations",
    "Marketing",
    "News",
    "Sales",
    "Tourism / Travel",
  ].sort((a, b) => a.localeCompare(b));

  const focusOptions = [
    "conversation",
    "interview",
    "presentation",
    "reading",
    "vocabulary",
  ].sort((a, b) => a.localeCompare(b));

  // --- Estado del semáforo según overallScore ---
  const isGreen = overallScore >= 85;
  const isYellow = overallScore >= 70 && overallScore < 85;
  const isOrange = overallScore >= 50 && overallScore < 70;
  const isRed = overallScore < 50;

  // --- UI ---
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        padding: 24,
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "grid",
          gap: 16,
        }}
      >
        {/* Encabezado y controles */}
        <header
          style={{
            background: "white",
            borderRadius: 16,
            boxShadow: "0 6px 24px rgba(0,0,0,0.06)",
            padding: 20,
          }}
        >
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>
            🎧 Práctica integral — Graba o sube archivo → ✍️ Transcribe → ✅ Feedback
          </h1>
          <p style={{ color: "#374151", marginBottom: 12 }}>
            Selecciona tu <b>dominio</b> y <b>enfoque</b>, <b>graba</b> (máx {humanTime(MAX_SECONDS)}) o <b>sube</b> audio, obtén
            transcripción y feedback inmediato. Guarda tus intentos para revisar tu progreso.
          </p>

          {/* Selects con placeholders */}
          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              marginTop: 8,
              marginBottom: 8,
            }}
          >
            <label>
              <div>Rol / Dominio</div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e5e7eb" }}
              >
                <option value="" disabled>
                  Escoge el dominio
                </option>
                {roleOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <div>Enfoque</div>
              <select
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e5e7eb" }}
              >
                <option value="" disabled>
                  Escoge el enfoque
                </option>
                {focusOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Controles de grabación + archivo */}
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
              marginTop: 6,
            }}
          >
            {!recording ? (
              <a
                onClick={startRecording}
                style={{
                  cursor: "pointer",
                  padding: "10px 16px",
                  borderRadius: 10,
                  background: "linear-gradient(90deg, #2563eb, #7c3aed)",
                  color: "white",
                  fontWeight: 700,
                  textDecoration: "none",
                  boxShadow: "0 6px 16px rgba(124, 58, 237, 0.4)",
                }}
                title="Empezar a grabar"
              >
                🎤 Grabar
              </a>
            ) : (
              <a
                onClick={stopRecording}
                style={{
                  cursor: "pointer",
                  padding: "10px 16px",
                  borderRadius: 10,
                  background: "#ffe5e5",
                  color: "#991b1b",
                  fontWeight: 700,
                  textDecoration: "none",
                  border: "1px solid #fecaca",
                }}
                title="Detener grabación"
              >
                ⏹️ Detener
              </a>
            )}

            <span>
              Tiempo: <b>{humanTime(seconds)}</b> (máx {humanTime(MAX_SECONDS)})
            </span>

            <input
              type="file"
              accept="audio/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              title="(Opcional) También puedes elegir un archivo"
            />

            {/* Acciones principales */}
            <a
              onClick={runSTT}
              style={{
                cursor: "pointer",
                padding: "10px 16px",
                borderRadius: 10,
                background: "#111827",
                color: "white",
                fontWeight: 700,
                textDecoration: "none",
                opacity: loadingSTT ? 0.7 : 1,
              }}
              title="Transcribir audio (STT)"
            >
              {loadingSTT ? "⌛ Transcribiendo..." : "✍️ 1) Transcribir audio"}
            </a>

            <a
              onClick={runFeedback}
              style={{
                cursor: transcript && role && focus ? "pointer" : "not-allowed",
                padding: "10px 16px",
                borderRadius: 10,
                background: transcript && role && focus ? "linear-gradient(90deg, #2563eb, #7c3aed)" : "#cbd5e1",
                color: "white",
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: transcript && role && focus ? "0 6px 16px rgba(124, 58, 237, 0.4)" : "none",
                opacity: loadingFB ? 0.7 : 1,
              }}
              title="Obtener feedback"
            >
              {loadingFB ? "⌛ Analizando..." : "✅ 2) Obtener feedback"}
            </a>
          </div>

          {/* Audio grabado */}
          {recordUrl && (
            <audio controls src={recordUrl} style={{ marginTop: 10, width: "100%" }} />
          )}

          {/* Errores */}
          {error && (
            <pre
              style={{
                color: "#b91c1c",
                whiteSpace: "pre-wrap",
                background: "#fee2e2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                padding: 10,
                marginTop: 10,
              }}
            >
              {error}
            </pre>
          )}
        </header>

        {/* Panel de puntuación (semáforo) */}
        <section
          style={{
            background: "white",
            borderRadius: 16,
            boxShadow: "0 6px 24px rgba(0,0,0,0.06)",
            padding: 20,
          }}
        >
          <h3 style={{ fontWeight: 800, marginBottom: 12 }}>📊 Puntuación (0–100)</h3>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            <ScoreCircle label="Verde (Excelente)" value={overallScore} activeColor="#10b981" active={isGreen} />
            <ScoreCircle label="Amarillo" value={overallScore} activeColor="#f59e0b" active={isYellow} />
            <ScoreCircle label="Naranja" value={overallScore} activeColor="#fb923c" active={isOrange} />
            <ScoreCircle label="Rojo (Debes mejorar)" value={overallScore} activeColor="#ef4444" active={isRed} />
          </div>
          <div style={{ marginTop: 8, color: "#4b5563", fontSize: 14 }}>
            El color activo refleja tu nivel global basado en gramática, vocabulario y pronunciación del último feedback.
          </div>
        </section>

        {/* Transcript + Feedback + Guardar */}
        <section
          style={{
            background: "white",
            borderRadius: 16,
            boxShadow: "0 6px 24px rgba(0,0,0,0.06)",
            padding: 20,
          }}
        >
          <h3 style={{ fontWeight: 800, marginBottom: 8 }}>✍️ Transcript</h3>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              padding: 12,
              borderRadius: 10,
              marginBottom: 12,
            }}
          >
            {transcript || "—"}
          </pre>

          <h3 style={{ fontWeight: 800, marginBottom: 8 }}>✅ Feedback</h3>

          {!feedback ? (
            <div style={{ color: "#6b7280" }}>Aún no hay feedback.</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <b>Nivel estimado:</b> {feedback.level_estimate || "—"}
              </div>

              <div>
                <b>Fortalezas</b>
                <ul>
                  {(feedback.strengths || []).map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>

              <div>
                <b>Áreas de mejora</b>
                <ul>
                  {(feedback.issues || []).map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>

              <div>
                <b>Correcciones</b>
                <ul>
                  {(feedback.corrections || []).map((c: any, i: number) => (
                    <li key={i}>
                      <div><b>Original:</b> {c.original}</div>
                      <div><b>Correcto:</b> {c.corrected}</div>
                      <div style={{ color: "#555" }}>{c.explanation}</div>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <b>Palabras para practicar</b>
                <div>{(feedback.practice_words || []).join(", ") || "—"}</div>
              </div>

              <div>
                <b>Consejos de pronunciación</b>
                <ul>
                  {(feedback.pronunciation_tips || []).map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>

              <div>
                <b>Respuesta sugerida</b>
                <pre style={{ whiteSpace: "pre-wrap" }}>
                  {feedback.suggested_answer || "—"}
                </pre>
              </div>
            </div>
          )}

          {/* Botones Guardar / Borrar estado actual */}
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <a
              onClick={savePractice}
              style={{
                cursor: "pointer",
                padding: "10px 16px",
                borderRadius: 10,
                background: "linear-gradient(90deg, #2563eb, #7c3aed)",
                color: "white",
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 6px 16px rgba(124, 58, 237, 0.4)",
              }}
              title="Guardar práctica actual"
            >
              💾 Guardar práctica
            </a>

            <a
              onClick={clearCurrent}
              style={{
                cursor: "pointer",
                padding: "10px 16px",
                borderRadius: 10,
                background: "#fee2e2",
                color: "#991b1b",
                fontWeight: 700,
                textDecoration: "none",
                border: "1px solid #fecaca",
              }}
              title="Borrar práctica (pantalla)"
            >
              🗑️ Borrar práctica
            </a>
          </div>
        </section>

        {/* Historial */}
        <section
          style={{
            background: "white",
            borderRadius: 16,
            boxShadow: "0 6px 24px rgba(0,0,0,0.06)",
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <h3 style={{ fontWeight: 800 }}>🗂️ Historial de prácticas</h3>
            {history.length > 0 && (
              <a
                onClick={clearAll}
                style={{
                  cursor: "pointer",
                  padding: "8px 12px",
                  borderRadius: 10,
                  background: "#fee2e2",
                  color: "#991b1b",
                  fontWeight: 700,
                  textDecoration: "none",
                  border: "1px solid #fecaca",
                }}
                title="Borrar todo el historial"
              >
                🗑️ Borrar todo
              </a>
            )}
          </div>

          {history.length === 0 ? (
            <div style={{ color: "#6b7280", marginTop: 8 }}>
              Aún no hay prácticas guardadas. Usa <b>💾 Guardar práctica</b> para registrar tus avances.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 10,
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                marginTop: 12,
              }}
            >
              {history.map((item) => (
                <div
                  key={item.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 12,
                    background: "#f9fafb",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>
                    {fmtDate(item.createdAt)}
                  </div>
                  <div style={{ color: "#374151" }}>
                    <b>Rol:</b> {item.role} • <b>Enfoque:</b> {item.focus}
                  </div>
                  <div
                    style={{
                      color: "#4b5563",
                      marginTop: 6,
                      maxHeight: 74,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={item.transcript}
                  >
                    <b>Transcript:</b> {item.transcript || "—"}
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <a
                      onClick={() => loadPractice(item)}
                      style={{
                        cursor: "pointer",
                        padding: "8px 12px",
                        borderRadius: 10,
                        background: "linear-gradient(90deg, #2563eb, #7c3aed)",
                        color: "white",
                        fontWeight: 700,
                        textDecoration: "none",
                      }}
                      title="Cargar esta práctica"
                    >
                      🔁 Cargar
                    </a>
                    <a
                      onClick={() => deletePractice(item.id)}
                      style={{
                        cursor: "pointer",
                        padding: "8px 12px",
                        borderRadius: 10,
                        background: "#fee2e2",
                        color: "#991b1b",
                        fontWeight: 700,
                        textDecoration: "none",
                        border: "1px solid #fecaca",
                      }}
                      title="Borrar esta práctica"
                    >
                      🗑️ Borrar
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer style={{ textAlign: "center", color: "#6b7280", padding: 8 }}>
          Diseñado por <b>Jairol CAN HELP YOU</b> — con la asistencia de IA
        </footer>
      </div>
    </main>
  );
}
