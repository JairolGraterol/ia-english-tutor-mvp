"use client";

export default function Home() {
  function shareSite() {
    const url =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://ia-english-tutor-mvp.vercel.app";
    const text =
      "Practica inglés con voz → transcripción → feedback. Ideal para profesionales hispanohablantes.";
    const title = "IA English Tutor — Jairol CAN HELP YOU";

    // Web Share API (móvil / navegadores modernos)
    if (navigator.share) {
      navigator
        .share({ title, text, url })
        .catch(() => {/* usuario canceló o no disponible */});
      return;
    }

    // Fallback: copiar al portapapeles
    const payload = `${title}\n${text}\n${url}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(payload).then(() => {
        alert("¡Enlace copiado! Pégalo en WhatsApp, email o donde quieras.");
      });
    } else {
      alert(`Copia este enlace:\n${url}`);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans",
      }}
    >
      <section
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "40px 20px",
          display: "grid",
          gap: 22,
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: 18,
            padding: 28,
            boxShadow: "0 10px 30px rgba(0,0,0,.07)",
          }}
        >
          <h1
            style={{
              fontSize: 34,
              fontWeight: 900,
              color: "#0f172a",
              marginBottom: 8,
              letterSpacing: 0.2,
            }}
          >
            🇺🇸 IA English Tutor —{" "}
            <span style={{ color: "#2563eb" }}>Jairol CAN HELP YOU</span>
          </h1>
          <p style={{ color: "#374151", maxWidth: 840 }}>
            Práctica guiada para hispanohablantes con nivel{" "}
            <b>no básico</b>, dentro o fuera de EEUU. Graba tu voz, obtén la
            transcripción y recibe <b>feedback</b> claro para entrevistas,
            conversaciones, presentaciones y más.
          </p>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 18,
            }}
          >
            <a
              href="/practice"
              style={{
                padding: "12px 18px",
                borderRadius: 12,
                background: "linear-gradient(90deg, #2563eb, #7c3aed)",
                color: "white",
                fontWeight: 900,
                textDecoration: "none",
                boxShadow: "0 8px 20px rgba(124,58,237,.35)",
                letterSpacing: 0.2,
              }}
              title="Ir a la práctica guiada"
            >
              🚀 Empezar práctica
            </a>

            <button
              onClick={shareSite}
              style={{
                padding: "12px 18px",
                borderRadius: 12,
                background: "linear-gradient(90deg, #0ea5e9, #2563eb)",
                color: "white",
                fontWeight: 900,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 8px 20px rgba(37,99,235,.35)",
                letterSpacing: 0.2,
              }}
              title="Compartir este sistema"
            >
              📤 Compartir
            </button>
          </div>
        </div>

        <div
          style={{
            background: "white",
            borderRadius: 18,
            padding: 24,
            boxShadow: "0 10px 30px rgba(0,0,0,.06)",
          }}
        >
          <h2 style={{ fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>
            👣 ¿Cómo funciona?
          </h2>
          <ol
            style={{
              margin: 0,
              paddingLeft: 18,
              color: "#374151",
              lineHeight: 1.6,
            }}
          >
            <li>Elige tu <b>Dominio</b> y el <b>Enfoque</b>.</li>
            <li>Graba tu voz (máx 02:00) o sube un archivo.</li>
            <li>Presiona <b>Transcribir</b> y revisa el texto.</li>
            <li>Obtén <b>Feedback</b>: nivel estimado, correcciones, consejos y discurso sugerido.</li>
            <li>Guarda tu práctica o <b>compártela</b> con amigos/coaches.</li>
          </ol>
        </div>

        <footer style={{ textAlign: "center", color: "#6b7280" }}>
          Diseñado por <b>Jairol CAN HELP YOU</b> — con la asistencia de IA
        </footer>
      </section>

      {/* Responsive móvil */}
      <style>{`
        @media (max-width: 768px) {
          h1 { font-size: 1.6rem !important; line-height: 1.2 !important; }
          h2 { font-size: 1.15rem !important; }
          p, li, a, button { font-size: 1rem !important; }
        }
      `}</style>
    </main>
  );
}
