"use client";
import { useState } from "react";

export default function FeedbackTest() {
  const [text, setText] = useState(
    "In accounting the balance sheet shown assets, liability and equity."
  );
  const [role, setRole] = useState("Finance & Accounting");
  const [focus, setFocus] = useState("interview");
  const [loading, setLoading] = useState(false);
  const [json, setJson] = useState<any>(null);
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(""); setJson(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text, role, focus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));
      setJson(data);
    } catch (err: any) {
      setError(err?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif", maxWidth: 860, margin: "0 auto" }}>
      <h1>Feedback Test (GPT)</h1>
      <p>Pega el transcript (por ejemplo, lo que te devolvió /stt-test) y obtén feedback.</p>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 12 }}>
        <label>
          <div>Rol / Dominio</div>
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
        </label>
        <label>
          <div>Enfoque</div>
          <input
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            style={{ width: "100%", padding: 8 }}
            placeholder="interview, reading, conversation..."
          />
        </label>
        <label>
          <div>Transcript</div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ width: "100%", minHeight: 140, padding: 8 }}
          />
        </label>
        <button type="submit" disabled={loading} style={{ padding: "8px 12px" }}>
          {loading ? "Analizando..." : "Obtener feedback"}
        </button>
      </form>

      <div style={{ marginTop: 16 }}>
        {error && (
          <pre style={{ color: "crimson", whiteSpace: "pre-wrap" }}>
            {error}
          </pre>
        )}
        {json && (
          <div style={{ display: "grid", gap: 12 }}>
            <section>
              <h3>Level estimate</h3>
              <div>{json.level_estimate || "—"}</div>
            </section>
            <section>
              <h3>Strengths</h3>
              <ul>{(json.strengths || []).map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
            </section>
            <section>
              <h3>Issues</h3>
              <ul>{(json.issues || []).map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
            </section>
            <section>
              <h3>Corrections</h3>
              <ul>
                {(json.corrections || []).map((c: any, i: number) => (
                  <li key={i}>
                    <div><b>Original:</b> {c.original}</div>
                    <div><b>Corrected:</b> {c.corrected}</div>
                    <div style={{ color: "#555" }}>{c.explanation}</div>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h3>Practice words</h3>
              <div>{(json.practice_words || []).join(", ") || "—"}</div>
            </section>
            <section>
              <h3>Pronunciation tips</h3>
              <ul>{(json.pronunciation_tips || []).map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
            </section>
            <section>
              <h3>Suggested answer</h3>
              <pre style={{ whiteSpace: "pre-wrap" }}>{json.suggested_answer || "—"}</pre>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
