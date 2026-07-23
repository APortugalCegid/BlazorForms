"use client"

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="pt">
      <body style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "#f9fafb" }}>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ color: "#111827", marginBottom: "1rem" }}>Ocorreu um erro inesperado</h2>
          <button
            onClick={() => reset()}
            style={{ padding: "0.5rem 1.25rem", backgroundColor: "#2962FF", color: "white", border: "none", borderRadius: "0.375rem", cursor: "pointer", fontSize: "0.875rem" }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  )
}
