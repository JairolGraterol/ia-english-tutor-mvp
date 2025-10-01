// app/page.tsx
export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f3f4f6", // gris claro
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 980,
          background: "white",
          borderRadius: 16,
          boxShadow: "0 6px 24px rgba(0,0,0,0.06)",
          padding: 28,
        }}
      >
        <header style={{ textAlign: "center", marginBottom: 18 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
            IA English Tutor – MVP
          </h1>
          <p style={{ color: "#374151" }}>
            Un entrenador de inglés para profesionales en EE. UU. que te ayuda a
            practicar <b>conversación</b>, <b>lectura</b> e <b>entrevistas</b> con
            audio, transcripción y feedback inmediato.
          </p>
        </header>

        <section
          style={{
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
            marginBottom: 18,
          }}
        >
          <h2 style={{ fontWeight: 700, marginBottom: 8 }}>Propósito (resumen)</h2>
          <p style={{ color: "#4b5563" }}>
            Acelerar tu inglés profesional con prácticas reales por <b>rol</b> (Finanzas,
            Ventas, Marketing, Servicio al Cliente, IT, Logística) y por <b>enfoque</b>
            (Entrevista, Conversación, Lectura, Presentación, Vocabulario), usando
            reconocimiento de voz y evaluación asistida por IA.
          </p>
        </section>

        <section
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            marginBottom: 14,
          }}
        >
          <a
            href="/practice"
            style={{
              display: "block",
              padding: "16px 14px",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: "white",
              textDecoration: "none",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              🎙️ Práctica integral
            </div>
            <div style={{ color: "#4b5563" }}>
              Graba tu voz → Transcribe (Whisper) → Obtén feedback (GPT) adaptado a rol y
              enfoque.
            </div>
          </a>

          <a
            href="/stt-test"
            style={{
              display: "block",
              padding: "16px 14px",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: "white",
              textDecoration: "none",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              🔊 Test de Transcripción
            </div>
            <div style={{ color: "#4b5563" }}>
              Sube audio y verifica la transcripción con el backend <code>/api/stt</code>.
            </div>
          </a>

          <a
            href="/feedback-test"
            style={{
              display: "block",
              padding: "16px 14px",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: "white",
              textDecoration: "none",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              ✅ Test de Feedback
            </div>
            <div style={{ color: "#4b5563" }}>
              Pega texto/transcript y recibe correcciones, sugerencias y “respuesta
              modelo”.
            </div>
          </a>
        </section>

        <footer
          style={{
            marginTop: 8,
            paddingTop: 12,
            borderTop: "1px dashed #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div style={{ color: "#6b7280" }}>
            <b>Diseñado por:</b> JAIROL <i>CAN I HELP YOU!!</i> — con la asistencia de IA
          </div>
          <div style={{ color: "#6b7280" }}>v0 • MVP en Next.js + Vercel</div>
        </footer>
      </div>
    </main>
  );
}
