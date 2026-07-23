export const dynamic = "force-dynamic"

export default function NotFound() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ textAlign: "center" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>404 — Página não encontrada</h2>
        <a href="/" style={{ color: "#2962FF" }}>Voltar ao início</a>
      </div>
    </div>
  )
}
