"use client"

import { useState, useEffect } from "react"

const LS_ORG = "blazor_org"
const LS_PAT = "blazor_pat"

export default function LoginPage() {
  const [org, setOrg] = useState("")
  const [pat, setPat] = useState("")
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const savedOrg = localStorage.getItem(LS_ORG) ?? ""
    const savedPat = localStorage.getItem(LS_PAT) ?? ""
    if (savedOrg) setOrg(savedOrg)
    if (savedPat) setPat(savedPat)
    if (savedOrg || savedPat) setRemember(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!org.trim() || !pat.trim()) return
    setLoading(true)
    setError("")

    // Normalize org — accept full URL or just the name
    const cleanOrg = org.trim()
      .replace(/^https?:\/\//i, "")
      .replace(/^(dev\.azure\.com|app\.vssps\.visualstudio\.com)\//i, "")
      .replace(/\.visualstudio\.com.*/i, "")
      .replace(/\/.*$/, "")
      .trim()

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org: cleanOrg, pat: pat.trim() }),
    })

    if (res.ok) {
      if (remember) {
        localStorage.setItem(LS_ORG, org.trim())
        localStorage.setItem(LS_PAT, pat.trim())
      } else {
        localStorage.removeItem(LS_ORG)
        localStorage.removeItem(LS_PAT)
      }
      window.location.href = "/board"
    } else {
      const data = await res.json()
      setError(data.error || "Erro ao entrar")
      setLoading(false)
    }
  }

  const canSubmit = org.trim().length > 0 && pat.trim().length > 0 && !loading

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: "#022341" }}>

      {/* Abstract glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute rounded-full blur-3xl opacity-30"
          style={{ width: 600, height: 600, background: "#2962FF", bottom: -100, right: -100 }} />
        <div className="absolute rounded-full blur-3xl opacity-20"
          style={{ width: 400, height: 400, background: "#2962FF", top: -50, left: 200 }} />
        <div className="absolute rounded-full blur-2xl opacity-15"
          style={{ width: 300, height: 300, background: "#CCE9FF", top: 100, left: -50 }} />
      </div>

      {/* Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl p-10 w-full max-w-sm flex flex-col gap-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "#2962FF" }}>
            <span className="text-white font-black text-xl">B</span>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold" style={{ color: "#022341" }}>Estabilização Blazor</h1>
            <p className="text-sm text-slate-400 mt-0.5">Migração de Forms ERP · Cegid</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3" suppressHydrationWarning>
          {/* Org */}
          <div>
            <label htmlFor="login-org" className="block text-sm font-medium text-slate-700 mb-1.5">
              Organização Azure DevOps
            </label>
            <input
              id="login-org"
              type="text"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              placeholder="ex: cegid"
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              suppressHydrationWarning
              style={{ color: "#0f172a" }}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white
                focus:outline-none focus:ring-2 focus:border-transparent font-mono"
              onFocus={(e) => (e.target.style.boxShadow = "0 0 0 2px #2962FF")}
              onBlur={(e) => (e.target.style.boxShadow = "")}
            />
          </div>

          {/* PAT */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="login-pat" className="block text-sm font-medium text-slate-700">
                Azure DevOps PAT
              </label>
              <a
                href="https://dev.azure.com/_usersSettings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs hover:underline"
                style={{ color: "#2962FF" }}
              >
                Gerar token →
              </a>
            </div>
            <input
              id="login-pat"
              type="password"
              value={pat}
              onChange={(e) => setPat(e.target.value)}
              placeholder="Cole aqui o teu PAT"
              suppressHydrationWarning
              style={{ color: "#0f172a" }}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white
                focus:outline-none focus:ring-2 focus:border-transparent font-mono"
              onFocus={(e) => (e.target.style.boxShadow = "0 0 0 2px #2962FF")}
              onBlur={(e) => (e.target.style.boxShadow = "")}
            />
          </div>

          {/* Remember */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 rounded accent-[#2962FF]"
            />
            <span className="text-sm text-slate-500">Lembrar neste browser</span>
          </label>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full text-white font-semibold py-2.5 rounded-lg transition-opacity text-sm disabled:opacity-40"
            style={{ backgroundColor: "#2962FF" }}>
            {loading ? "A validar..." : "Entrar"}
          </button>
        </form>

        <p className="text-xs text-center text-slate-400">
          O teu nome é obtido automaticamente do Azure DevOps.<br />
          Qualquer PAT válido da organização é aceite.
        </p>
      </div>
    </div>
  )
}
