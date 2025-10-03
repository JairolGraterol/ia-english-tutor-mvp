import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "IA English Tutor — Jairol CAN HELP YOU",
  description:
    "Práctica guiada de inglés con transcripción EN/ES y feedback inmediato. Diseñado por Jairol CAN HELP YOU, con la asistencia de IA.",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png", // ← lo subiremos en el paso 2
  },
  manifest: "/site.webmanifest", // ← lo subiremos en el paso 2
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          background: "#f3f4f6",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans",
        }}
      >
        {/* NAVBAR */}
        <nav
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            background: "white",
            borderBottom: "1px solid #e5e7eb",
            boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
          }}
        >
          <div
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              justifyContent: "space-between",
            }}
          >
            <Link
              href="/"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                textDecoration: "none",
              }}
            >
              <img
                src="/apple-touch-icon.png"
                alt="Logo"
                width={28}
                height={28}
                style={{ borderRadius: 6 }}
              />
              <b style={{ color: "#111827", fontSize: 16 }}>
                IA English Tutor
              </b>
            </Link>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Link
                href="/"
                style={{
                  textDecoration: "none",
                  padding: "8px 12px",
                  borderRadius: 10,
                  color: "#111827",
                  fontWeight: 700,
                }}
              >
                🏠 Inicio
              </Link>
              <Link
                href="/practice"
                style={{
                  textDecoration: "none",
                  padding: "8px 12px",
                  borderRadius: 10,
                  background: "linear-gradient(90deg, #2563eb, #7c3aed)",
                  color: "white",
                  fontWeight: 800,
                  boxShadow: "0 6px 16px rgba(124, 58, 237, 0.3)",
                }}
              >
                🎤 Práctica
              </Link>
            </div>
          </div>
        </nav>

        {/* CONTENIDO */}
        {children}

        {/* Footer global opcional */}
        <footer
          style={{
            textAlign: "center",
            color: "#6b7280",
            padding: "16px 8px 28px",
          }}
        >
          Diseñado por <b>Jairol CAN HELP YOU</b> — con la asistencia de IA
        </footer>

        {/* Ajustes responsive del navbar */}
        <style>{`
          @media (max-width: 640px) {
            nav a { font-size: 0.95rem !important; }
            nav img { width: 24px !important; height: 24px !important; }
          }
        `}</style>
      </body>
    </html>
  );
}
