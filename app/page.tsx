export default function HomePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f3f4f6", // gris claro
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "40px",
        fontFamily: "sans-serif",
      }}
    >
      {/* Título principal */}
      <h1 style={{ fontSize: "2.5rem", fontWeight: "bold", marginBottom: "20px" }}>
        🌎 Mejora tu inglés con IA
      </h1>

      {/* Subtítulo */}
      <p style={{ fontSize: "1.2rem", maxWidth: "700px", marginBottom: "20px", lineHeight: "1.6" }}>
        Este proyecto está diseñado para cualquier persona hispanohablante que desee mejorar su inglés, 
        ya sea que viva en Estados Unidos o en otro país.  
        Aquí podrás practicar entrevistas, conversaciones y vocabulario profesional con retroalimentación en tiempo real.
      </p>

      {/* Explicación de pasos */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: "20px",
          maxWidth: "600px",
          marginBottom: "30px",
          boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
          textAlign: "left",
        }}
      >
        <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "10px" }}>
          🚀 ¿Cómo funciona?
        </h2>
        <ol style={{ fontSize: "1rem", lineHeight: "1.8", paddingLeft: "20px" }}>
          <li>🎤 Graba tu voz o una conversación de práctica.</li>
          <li>🤖 El sistema transcribe lo que dijiste y corrige errores de gramática y vocabulario.</li>
          <li>📊 Recibe retroalimentación inmediata y una versión mejorada de tu respuesta.</li>
        </ol>
      </div>

      {/* Botón con gradiente */}
      <a
        href="/practice"
        style={{
          display: "inline-block",
          padding: "14px 28px",
          borderRadius: 12,
          background: "linear-gradient(90deg, #2563eb, #7c3aed)", // Azul → Violeta
          color: "white",
          fontWeight: 700,
          fontSize: 18,
          textDecoration: "none",
          boxShadow: "0 6px 16px rgba(124, 58, 237, 0.4)",
          transition: "transform 0.2s ease, boxShadow 0.2s ease",
        }}
        onMouseOver={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "scale(1.05)";
          (e.currentTarget as HTMLElement).style.boxShadow =
            "0 8px 20px rgba(124, 58, 237, 0.6)";
        }}
        onMouseOut={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "scale(1)";
          (e.currentTarget as HTMLElement).style.boxShadow =
            "0 6px 16px rgba(124, 58, 237, 0.4)";
        }}
      >
        🚀 ¡Comienza a practicar ahora!
      </a>

      {/* Footer con créditos */}
      <footer style={{ marginTop: "40px", fontSize: "0.9rem", color: "#555" }}>
        Diseñado por <strong>Jairol CAN HELP YOU</strong> ✨ con la asistencia de IA
      </footer>
    </div>
  );
}
