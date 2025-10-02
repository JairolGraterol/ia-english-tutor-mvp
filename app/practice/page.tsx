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
const MAX_SECONDS = 15; // límite de grabación

/** Indicador intermitente */
function BlinkBadge({ children, color = "#2563eb" }: { children: any; color?: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 999,
        fontWeight: 700,
        background: color,
        color: "white",
        animation: "blink 1.2s infinite",
      }}
    >
      {children}
      <style>{`
        @keyframes blink {
          0% { opacity: 1 }
          50% { opacity: .45 }
          100% { opacity: 1 }
        }
      `}</style>
    </span>
  );
}

/** Círculo de semáforo con valor */
function ScoreCircle({
  label,
  value,
  activeColor,
  active,
}: {
  label: string;
  value: number;
  activeColor: string;
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
        title={`${label}: ${Math.round(value)}`}
      >
        {Math.round(value)}
      </div>
      <div style={{ fontSize: 12, color: "#374151", textAlign: "center" }}>{label}</div>
    </div>
  );
}

export default function PracticePage() {
  // --- Estado general / paso a paso ---
  // Paso “progresivo”: 0=sin selección, 1=rol ok, 2=enfoque ok, 3=audio listo, 4=transcrito, 5=feedback
  const [step, setStep] = useState<number>(0);

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
  const [loadingTR, setLoadingTR] = useState(false);

  const [transcript, setTranscript] = useState("");
  const [transEN, setTransEN] = useState(""); // transcript (inglés)
  const [transES, setTransES] = useState(""); // transcript traducido (español)

  const [role, setRole] = useState("");   // placeholder
  const [focus, setFocus] = useState(""); // placeholder
  const [feedback, setFeedback] = useState<any>(null);
  const [error, setError] = useState("");

  // --- Puntuaciones (semáforo) ---
  const [overallScore, setOverallScore] = useState<number>(0);

  // --- Historial en localStorage ---
  const [history, setHistory] = useState<PracticeItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  // --- Timer grabación (auto-stop a 15s) ---
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSeconds(0);
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        const next = s + 1;
        if (next >= MAX_SECONDS) stopRecording();
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
      setTransEN("");
      setTransES("");
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
        setStep((s) => Math.max(s, 3)); // audio listo
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

  // --- STT y Traducción ---
  const runSTT = async () => {
    if (!file) {
      alert("Graba o selecciona un audio (.m4a/.mp3/.webm)");
      return;
    }
    setError("");
    setFeedback(null);
    setTranscript("");
    setTransEN("");
    setTransES("");
    setLoadingSTT(true);

    try {
      const fd = new FormData();
      fd.append("audio", file);
      const res = await fetch("/api/stt", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "STT error");

      const raw = (json.transcript || "").trim();
      setTranscript(raw);

      // Traducción automática: devolver EN y ES
      setLoadingTR(true);
      const tr = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: raw }),
      });
      const trJson = await tr.json();
      if (!tr.ok) throw new Error(trJson?.error || "Translate error");

      setTransEN(trJson.en || "");
      setTransES(trJson.es || "");

      setStep((s) => Math.max(s, 4)); // ya hay transcripción+traducción
    } catch (e: any) {
      setError("STT/Translate: " + (e?.message || "failed"));
    } finally {
      setLoadingTR(false);
      setLoadingSTT(false);
    }
  };

  // --- Feedback ---
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

      // calcular puntajes heurísticos a partir de feedback
      const issues: string[] = data?.issues || [];
      const corrections: any[] = data?.corrections || [];
      const pronTips: string[] = data?.pronunciation_tips || [];
      const practiceWords: string[] = data?.practice_words || [];

      const countMatch = (arr: string[], key: string) =>
        arr.filter((s) => s.toLowerCase().includes(key)).length;

      const grammarHits =
        countMatch(issues, "gramm") +
        countMatch(issues, "tense") +
        countMatch(issues, "article") +
        corrections.length;

      const vocabHits =
        countMatch(issues, "vocab") +
        countMatch(issues, "word choice") +
        (practiceWords?.length ? 1 : 0);

      const pronHits =
        countMatch(issues, "pronun") + pronTips.length;

      const clamp = (n: number) => Math.max(0, Math.min(100, n));
      const grammarScore = clamp(92 - grammarHits * 7);
      const vocabScore = clamp(90 - vocabHits * 6);
      const pronScore = clamp(90 - pronHits * 6);

      const overall = Math.round((grammarScore + vocabScore + pronScore) / 3);
      setOverallScore(overall);

      setStep((s) => Math.max(s, 5)); // feedback listo
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
    const next = [item, ...history].slice(0, 200);
    persistHistory(next);
  };

  const deletePractice = (id: string) => {
    const next = history.filter((h) => h.id !== id);
    persistHistory(next);
    setSelectedIds((prev) => {
      const copy = new Set(prev);
      copy.delete(id);
      return copy;
    });
  };

  const clearCurrent = () => {
    setTranscript("");
    setTransEN("");
    setTransES("");
    setFeedback(null);
    setError("");
    setRecordUrl("");
    setFile(null);
    setOverallScore(0);
    setSeconds(0);
    setStep(role ? (focus ? 2 : 1) : 0); // volver al paso correcto del wizard
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
      setMediaStream(null);
    }
  };

  const clearAll = () => {
    if (!confirm("¿Borrar TODO el historial?")) return;
    persistHistory([]);
    setSelectedIds(new Set());
  };

  const loadPractice = (item: PracticeItem) => {
    setRole(item.role);
    setFocus(item.focus);
    setTranscript(item.transcript);
    setTransEN(item.transcript); // fallback: sin traducción guardada
    setTransES("");
    setFeedback(item.feedback);
    setStep(5); // llevar al final para visualizar
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // --- Selección múltiple en historial ---
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectAll = () => setSelectedIds(new Set(history.map((h) => h.id)));
  const clearSelection = () => setSelectedIds(new Set());
  const deleteSelected = () => {
    if (selectedIds.size === 0) {
      alert("No has seleccionado prácticas.");
      return;
    }
    if (!confirm(`¿Borrar ${selectedIds.size} práctica(s) seleccionada(s)?`)) return;
    const next = history.filter((h) => !selectedIds.has(h.id));
    persistHistory(next);
    setSelectedIds(new Set());
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

  // --- Estado del semáforo ---
  const hasScore = overallScore > 0; // al inicio: false → todos apagados
  const isGreen = hasScore && overallScore >= 85;
  const isYellow = hasScore && overallScore >= 70 && overallScore < 85;
  const isOrange = hasScore && overallScore >= 50 && overallScore < 70;
  const isRed = hasScore && overallScore < 50;

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
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 16 }}>
        {/* Encabezado */}
        <header
          style={{
            background: "white",
            borderRadius: 16,
            boxShadow: "0 6px 24px rgba(0,0,0,0.06)",
            padding: 20,
          }}
        >
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>
            🎧 Práctica guiada — Paso a paso
          </h1>
          <p style={{ color: "#374151", marginBottom: 12 }}>
            Completa cada paso en orden. Primero elige <b>Dominio</b> y <b>Enfoque</b>, luego
            <b> graba</b> (máx {humanTime(MAX_SECONDS)}), <b>transcribe</b> y finalmente obtén <b>feedback</b>.
          </p>

          {/* Paso 1: Rol / Dominio */}
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr", marginBottom: 8 }}>
            <label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <b>1) Rol / Dominio</b>
                {!role && <BlinkBadge>Elige primero</BlinkBadge>}
              </div>
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setStep(1);
                }}
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
          </div>

          {/* Paso 2: Enfoque (se muestra luego de rol) */}
          {step >= 1 && (
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr", marginBottom: 8 }}>
              <label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <b>2) Enfoque</b>
                  {!focus && <BlinkBadge color="#7c3aed">Ahora selecciona enfoque</BlinkBadge>}
                </div>
                <select
                  value={focus}
                  onChange={(e) => {
                    setFocus(e.target.value);
                    setStep(2);
                  }}
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
          )}

          {/* Paso 3: Grabación/Subir archivo (se muestra luego de enfoque) */}
          {step >= 2 && (
            <div style={{ display: "grid", gap: 10, marginTop: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <b>3) Audio</b>
                {!(recordUrl || file) && <BlinkBadge>① Graba o sube un archivo</BlinkBadge>}
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
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
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setFile(f);
                    if (f) setStep((s) => Math.max(s, 3));
                  }}
                  title="(Opcional) También puedes elegir un archivo"
                />

                <a
                  onClick={runSTT}
                  style={{
                    cursor: file ? "pointer" : "not-allowed",
                    padding: "10px 16px",
                    borderRadius: 10,
                    background: file ? "#111827" : "#cbd5e1",
                    color: "white",
                    fontWeight: 700,
                    textDecoration: "none",
                    opacity: loadingSTT || loadingTR ? 0.7 : 1,
                  }}
                  title="Transcribir audio (STT)"
                >
                  {loadingSTT || loadingTR ? "⌛ Transcribiendo..." : "✍️ ② Transcribir"}
                </a>
              </div>

              {/* Audio grabado */}
              {recordUrl && <audio controls src={recordUrl} style={{ marginTop: 10, width: "100%" }} />}
            </div>
          )}

          {/* Paso 4: Mostrar transcripciones (EN / ES) */}
          {step >= 4 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <b>4) Transcripción</b>
                {!loadingTR && <BlinkBadge color="#0ea5e9">Revisa EN / ES</BlinkBadge>}
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 10,
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>English</div>
                  <pre
                    style={{
                      whiteSpace: "pre-wrap",
                      background: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      padding: 12,
                      borderRadius: 10,
                      minHeight: 80,
                    }}
                  >
                    {transEN || transcript || "—"}
                  </pre>
                </div>

                <div>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Español</div>
                  <pre
                    style={{
                      whiteSpace: "pre-wrap",
                      background: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      padding: 12,
                      borderRadius: 10,
                      minHeight: 80,
                    }}
                  >
                    {transES || "—"}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Paso 5: Obtener feedback (aparece después de transcribir) */}
          {step >= 4 && (
            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <BlinkBadge color="#16a34a">③ Obtén tu feedback</BlinkBadge>

              <a
                onClick={runFeedback}
                style={{
                  cursor: transcript && role && focus ? "pointer" : "not-allowed",
                  padding: "10px 16px",
                  borderRadius: 10,
                  background:
                    transcript && role && focus
                      ? "linear-gradient(90deg, #2563eb, #7c3aed)"
                      : "#cbd5e1",
                  color: "white",
                  fontWeight: 700,
                  textDecoration: "none",
                  boxShadow:
                    transcript && role && focus ? "0 6px 16px rgba(124, 58, 237, 0.4)" : "none",
                  opacity: loadingFB ? 0.7 : 1,
                }}
                title="Obtener feedback"
              >
                {loadingFB ? "⌛ Analizando..." : "✅ Obtener feedback"}
              </a>

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
            <ScoreCircle label="🟢 Excelente" value={overallScore} activeColor="#10b981" active={hasScore && overallScore >= 85} />
            <ScoreCircle label="🟡 Aceptable" value={overallScore} activeColor="#f59e0b" active={hasScore && overallScore >= 70 && overallScore < 85} />
            <ScoreCircle label="🟠 Necesita práctica" value={overallScore} activeColor="#fb923c" active={hasScore && overallScore >= 50 && overallScore < 70} />
            <ScoreCircle label="🔴 Debes mejorar" value={overallScore} activeColor="#ef4444" active={hasScore && overallScore < 50} />
          </div>
          <div style={{ marginTop: 8, color: "#4b5563", fontSize: 14 }}>
            El color activo se enciende solo después de obtener feedback.
          </div>
        </section>

        {/* Panel de Feedback (aparece a partir de step >= 5) */}
        <section
          style={{
            background: "white",
            borderRadius: 16,
            boxShadow: "0 6px 24px rgba(0,0,0,0.06)",
            padding: 20,
          }}
        >
          <h3 style={{ fontWeight: 800, marginBottom: 8 }}>✅ Feedback</h3>
          {step < 5 ? (
            <div style={{ color: "#6b7280" }}>Aún no has solicitado feedback.</div>
          ) : !feedback ? (
            <div style={{ color: "#6b7280" }}>Sin contenido.</div>
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
        </section>

        {/* Historial con selección múltiple */}
        <section
          style={{
            background: "white",
            borderRadius: 16,
            boxShadow: "0 6px 24px rgba(0,0,0,0.06)",
            padding: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <h3 style={{ fontWeight: 800 }}>🗂️ Historial de prácticas</h3>

            {history.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <a
                  onClick={selectAll}
                  style={{
                    cursor: "pointer",
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: "#f3f4f6",
                    color: "#111827",
                    fontWeight: 700,
                    textDecoration: "none",
                    border: "1px solid #e5e7eb",
                  }}
                  title="Seleccionar todas"
                >
                  ✅ Seleccionar todas
                </a>
                <a
                  onClick={clearSelection}
                  style={{
                    cursor: "pointer",
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: "#f3f4f6",
                    color: "#111827",
                    fontWeight: 700,
                    textDecoration: "none",
                    border: "1px solid #e5e7eb",
                  }}
                  title="Limpiar selección"
                >
                  ✖️ Limpiar selección
                </a>
                <a
                  onClick={deleteSelected}
                  style={{
                    cursor: selectedIds.size ? "pointer" : "not-allowed",
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: selectedIds.size ? "#fee2e2" : "#f3f4f6",
                    color: selectedIds.size ? "#991b1b" : "#6b7280",
                    fontWeight: 700,
                    textDecoration: "none",
                    border: "1px solid #fecaca",
                    opacity: selectedIds.size ? 1 : 0.7,
                  }}
                  title="Borrar seleccionados"
                >
                  🗑️ Borrar seleccionados
                </a>
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
                  🚮 Borrar todo
                </a>
              </div>
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
              {history.map((item) => {
                const checked = selectedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      padding: 12,
                      background: "#f9fafb",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelect(item.id)}
                        title="Seleccionar esta práctica"
                      />
                      <div style={{ fontWeight: 700 }}>
                        {fmtDate(item.createdAt)}
                      </div>
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
                );
              })}
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
