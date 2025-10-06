export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 980,
          background: "white",
          borderRadius: 18,
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          padding: "32px",
        }}
      >
        <header style={{ textAlign: "center", marginBottom: 18 }}>
          <div
            style={{
              display: "inline-block",
              padding: "6px 12px",
              borderRadius: 999,
              background: "#eef2ff",
              color: "#3730a3",
              fontWeight: 800,
              fontSize: 14,
              letterSpacing: 0.3,
            }}
          >
            🇺🇸🇪🇸 English Practice • Guided MVP
          </div>
          <h1
            style={{
              marginTop: 10,
              fontWeight: 900,
              fontSize: "2.25rem",
              lineHeight: 1.15,
              color: "#0f172a",
            }}
          >
            Mejora tu inglés con práctica guiada y feedback inmediato
          </h1>
          <p style={{ marginTop: 8, color: "#1f2937", fontSize: "1.1rem" }}>
            Para personas hispanohablantes dentro o fuera de EE. UU. (nivel intermedio o superior).
            Graba o sube tu audio, obtén transcripción EN/ES y recomendaciones para entrevistas,
            conversación, presentaciones y más.
          </p>
        </header>

        <div
          style={{
            display: "grid",
            gap: 14,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            marginTop: 6,
          }}
        >
          <Card
            title="🎤 Graba o sube"
            desc="Graba hasta 2 minutos o sube un audio corto desde tu dispositivo."
          />
          <Card
            title="✍️ Transcribe (EN/ES)"
            desc="Reconocimiento de voz (Whisper) + traducción automática."
          />
          <Card
            title="✅ Feedback claro"
            desc="Nivel estimado, correcciones, vocabulario y tips de pronunciación."
          />
          <Card
            title="🗂️ Historial"
            desc="Guarda, revisa y borra prácticas para medir tu progreso."
          />
        </div>

        <div
          style={{
            marginTop: 20,
            display: "grid",
            placeItems: "center",
          }}
        >
          <a
            href="/practice"
            style={{
              textDecoration: "none",
              padding: "12px 18px",
              borderRadius: 12,
              background: "linear-gradient(90deg, #2563eb, #7c3aed)",
              color: "white",
              fontWeight: 800,
              boxShadow: "0 10px 24px rgba(124,58,237,0.35)",
            }}
          >
            🚀 ¡Comienza a practicar ahora!
          </a>
        </div>

        <footer
          style={{
            marginTop: 24,
            textAlign: "center",
            color: "#6b7280",
            fontSize: 14,
          }}
        >
          Diseñado por <b>Jairol CAN HELP YOU</b> — con la asistencia de IA
        </footer>
      </section>

      {/* Responsivo móvil */}
      <style>{`
        @media (max-width: 640px) {
          h1 { 
            font-size: 1.8rem !important;
            line-height: 1.25 !important;
            color: #0f172a !important;
          }
          p { 
            font-size: 1.05rem !important;
            color: #1f2937 !important;
          }
          section { padding: 22px !important; }
        }
      `}</style>
    </main>
  );
}

function Card({ title, desc }: { title: string; desc: string }) {
  return (
    <div
      style={{
        background: "#fafafa",
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        padding: 18,
        minHeight: 110,
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 6, fontSize: "1.05rem", color: "#111827" }}>
        {title}
      </div>
      <div style={{ color: "#4b5563" }}>{desc}</div>
    </div>
  );
}
