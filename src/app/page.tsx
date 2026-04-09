"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter") {
        router.push("/shift");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return (
    <div
      onClick={() => router.push("/shift")}
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f5f2ed",
        color: "#1a1a1a",
        fontFamily: "Georgia, serif",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      {/* Graduation Cap SVG */}
      <svg
        width="96"
        height="96"
        viewBox="0 0 96 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ marginBottom: "2rem" }}
      >
        {/* Mortarboard top */}
        <polygon points="48,12 8,36 48,60 88,36" fill="#2d5a3d" />
        {/* Brim shadow */}
        <polygon points="48,60 88,36 88,40 48,64 8,40 8,36" fill="#1e3d2a" />
        {/* Tassel string */}
        <line x1="76" y1="36" x2="76" y2="62" stroke="#2d5a3d" strokeWidth="2.5" />
        {/* Tassel */}
        <circle cx="76" cy="66" r="4" fill="#2d5a3d" />
        {/* Band under cap */}
        <path d="M24,44 L24,64 Q48,80 72,64 L72,44" fill="none" stroke="#2d5a3d" strokeWidth="2.5" />
      </svg>

      <h1
        style={{
          fontSize: "3.5rem",
          fontWeight: "bold",
          color: "#2d5a3d",
          margin: "0 0 1rem 0",
          letterSpacing: "-0.02em",
        }}
      >
        AdmissionPrep
      </h1>

      <p
        style={{
          fontSize: "1.25rem",
          color: "#555",
          margin: "0 0 3rem 0",
          textAlign: "center",
          maxWidth: "480px",
          lineHeight: 1.6,
        }}
      >
        Empowering Future Leaders Through Education
      </p>

      <p
        style={{
          fontSize: "0.95rem",
          color: "#888",
          animation: "pulse 2s ease-in-out infinite",
        }}
      >
        Press Enter to continue
      </p>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
