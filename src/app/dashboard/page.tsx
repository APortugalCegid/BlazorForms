import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/db"
import { STATUSES, STATUS_COLORS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { Download } from "lucide-react"
import { VelocityCard } from "@/components/dashboard/velocity-card"

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [rawForms, users, completedHistory, extraRows, todayHistory] = await Promise.all([
    prisma.form.findMany({
      select: {
        id: true,
        module: true,
        classification: true,
        status: true,
        estimatedDays: true,
        assignedUserId: true,
        included: true,
      },
    }),
    prisma.user.findMany({ select: { id: true, name: true } }),
    prisma.stateHistory.findMany({
      where: { toStatus: "Concluído" },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    // Bypass stale Prisma client for fields added after initial codegen
    prisma.$queryRaw<{ id: string; isBlocked: number; dueDate: string | null }[]>`
      SELECT "id", "isBlocked", "dueDate" FROM "Form"
    `,
    prisma.stateHistory.findMany({
      where: {
        createdAt: { gte: todayStart },
        toStatus: { in: ["Em Estabilização", "Concluído"] },
      },
      include: {
        form: { select: { className: true, module: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ])

  const extraMap = new Map((extraRows as { id: string; isBlocked: number; dueDate: string | null }[]).map((r) => [r.id, r]))
  const forms = rawForms.map((f) => ({
    ...f,
    isBlocked: Boolean(extraMap.get(f.id)?.isBlocked),
    dueDate: extraMap.get(f.id)?.dueDate ?? null,
  }))

  // ── Overall stats ───────────────────────────────────────────────────────────
  const total = forms.length
  const done = forms.filter((f) => f.status === "Concluído").length
  const blocked = forms.filter((f) => f.isBlocked).length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const in7 = new Date(today); in7.setDate(in7.getDate() + 7)
  const dueSoon = forms.filter((f) => {
    if (!f.dueDate) return false
    const d = new Date(f.dueDate)
    return d <= in7
  }).length

  // ── By status ───────────────────────────────────────────────────────────────
  const byStatus = STATUSES.map((s) => ({
    status: s,
    count: forms.filter((f) => f.status === s).length,
  }))

  // ── By module ───────────────────────────────────────────────────────────────
  const modules = [...new Set(forms.map((f) => f.module))].sort()
  const byModule = modules.map((m) => {
    const mf = forms.filter((f) => f.module === m)
    const statusCounts: Record<string, number> = Object.fromEntries(STATUSES.map((s) => [s, mf.filter((f) => f.status === s).length]))
    const d = statusCounts["Concluído"] || 0
    return { module: m, total: mf.length, done: d, statusCounts, pct: mf.length > 0 ? Math.round((d / mf.length) * 100) : 0 }
  }).sort((a: { module: string; pct: number }, b: { module: string; pct: number }) => b.pct - a.pct || a.module.localeCompare(b.module))

  // ── By classification ───────────────────────────────────────────────────────
  const classifications = ["Editor", "Manutenção", "Exploração", "Other"]
  const byClass = classifications.map((c) => ({
    c, count: forms.filter((f) => f.classification === c).length,
  }))

  // ── By assignee ─────────────────────────────────────────────────────────────
  const ACTIVE_STATUSES = ["Em Estabilização"] as const
  const byUser = users.map((u) => {
    const userForms = forms.filter((f) => f.assignedUserId === u.id)
    const statusCounts = Object.fromEntries(
      STATUSES.map((s) => [s, userForms.filter((f) => f.status === s).length])
    )
    const active = ACTIVE_STATUSES.reduce((n, s) => n + (statusCounts[s] ?? 0), 0)
    return {
      user: u,
      assigned: userForms.length,
      done: statusCounts["Concluído"] ?? 0,
      blocked: userForms.filter((f) => f.isBlocked).length,
      active,
      statusCounts,
    }
  }).filter((u) => u.assigned > 0).sort((a, b) => b.active - a.active || b.assigned - a.assigned)

  // ── Weekly velocity (last 8 weeks) ──────────────────────────────────────────
  const getISOWeek = (d: Date): string => {
    const tmp = new Date(d)
    tmp.setHours(0, 0, 0, 0)
    tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7))
    const week1 = new Date(tmp.getFullYear(), 0, 4)
    const wk = 1 + Math.round(((tmp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
    return `${tmp.getFullYear()}-W${String(wk).padStart(2, "0")}`
  }

  const weekLabels: string[] = []
  const weekCounts: Record<string, number> = {}
  for (let i = 7; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i * 7)
    const wk = getISOWeek(d)
    if (!weekLabels.includes(wk)) { weekLabels.push(wk); weekCounts[wk] = 0 }
  }
  for (const h of completedHistory) {
    const wk = getISOWeek(new Date(h.createdAt))
    if (wk in weekCounts) weekCounts[wk]++
  }
  const weeklyData = weekLabels.map((wk) => ({ wk, count: weekCounts[wk] }))

  // ── Projected completion ────────────────────────────────────────────────────
  const currentWeek = getISOWeek(today)
  const last4 = weeklyData.filter((w) => w.wk !== currentWeek).slice(-4)
  const avgVelocity = last4.length > 0
    ? last4.reduce((s, w) => s + w.count, 0) / last4.length
    : 0
  const remaining = total - done
  const projectedDate = avgVelocity > 0 && remaining > 0
    ? (() => { const d = new Date(today); d.setDate(d.getDate() + Math.ceil((remaining / avgVelocity) * 7)); return d })()
    : null

  return (
    <div className="p-6 space-y-6 min-h-screen" style={{ backgroundColor: "#f8fafc" }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#022341" }}>Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">Progresso da migração ERP Forms → Blazor</p>
        </div>
        <a
          href="/api/export"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-opacity shrink-0"
          style={{ backgroundColor: "#2962FF" }}
        >
          <Download size={14} />
          Exportar Excel
        </a>
      </div>

      {/* Resumo do Dia */}
      {todayHistory.length > 0 && (() => {
        const byStatus = {
          "Em Estabilização": todayHistory.filter((h) => h.toStatus === "Em Estabilização"),
          "Concluído":        todayHistory.filter((h) => h.toStatus === "Concluído"),
        }
        const cols = [
          { key: "Em Estabilização", label: "Em Estabilização", color: "#2962FF", bg: "#eff6ff" },
          { key: "Concluído",        label: "Concluídos",       color: "#10b981", bg: "#f0fdf4" },
        ] as const
        return (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold mb-4" style={{ color: "#022341" }}>
              Resumo do Dia
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {cols.map(({ key, label, color, bg }) => {
                const items = byStatus[key]
                return (
                  <div key={key} className="rounded-lg p-3" style={{ backgroundColor: bg }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold" style={{ color }}>{label}</span>
                      <span className="text-lg font-bold" style={{ color }}>{items.length}</span>
                    </div>
                    {items.length === 0 ? (
                      <p className="text-xs text-slate-400">Sem entradas hoje</p>
                    ) : (
                      <ul className="space-y-1">
                        {items.slice(0, 5).map((h) => (
                          <li key={h.id} className="text-xs text-slate-600 truncate">
                            <span className="font-medium">{h.form?.className}</span>
                            {h.user?.name && <span className="text-slate-400"> · {h.user.name}</span>}
                          </li>
                        ))}
                        {items.length > 5 && (
                          <li className="text-xs text-slate-400">+{items.length - 5} mais</li>
                        )}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Forms", value: total, color: "#022341", sub: null },
          { label: "Concluídos", value: done, color: "#10b981", sub: `${pct}%` },
          { label: "Em Curso", value: forms.filter((f) => f.status === "Em Estabilização").length, color: "#2962FF", sub: null },
          { label: "Bloqueados", value: blocked, color: blocked > 0 ? "#ef4444" : "#94a3b8", sub: null },
          { label: "Prazo < 7 dias", value: dueSoon, color: dueSoon > 0 ? "#f59e0b" : "#94a3b8", sub: null },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-3xl font-bold" style={{ color }}>{value}</p>
              {sub && <span className="text-sm font-medium" style={{ color }}>{sub}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar global */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold" style={{ color: "#022341" }}>Progresso Global</p>
          <span className="text-sm font-bold" style={{ color: pct === 100 ? "#10b981" : "#2962FF" }}>{done} / {total} ({pct}%)</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#10b981" : "#2962FF" }} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Por Estado */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold mb-4" style={{ color: "#022341" }}>Por Estado</h2>
          <div className="space-y-3">
            {byStatus.map(({ status, count }) => {
              const c = STATUS_COLORS[status]
              const p = total > 0 ? (count / total) * 100 : 0
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className={cn("font-medium", c?.text)}>{status}</span>
                    <span className="text-slate-400">{count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", c?.bg)} style={{ width: `${p}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Velocidade Semanal */}
        <VelocityCard
          weeklyData={weeklyData}
          avgVelocity={avgVelocity}
          projectedDateISO={projectedDate ? projectedDate.toISOString() : null}
          remaining={remaining}
          last4Length={last4.length}
        />

        {/* Por Utilizador */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold mb-4" style={{ color: "#022341" }}>Por Utilizador</h2>
          {byUser.length === 0 ? (
            <p className="text-xs text-slate-400">Sem utilizadores com forms atribuídos</p>
          ) : (
            <div className="space-y-3">
              {byUser.map(({ user, assigned, done: d, blocked: b }) => (
                <div key={user.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 truncate">{user.name}</span>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {b > 0 && <span className="text-[10px] font-semibold text-red-500">{b} bloq.</span>}
                      <span className="text-slate-400">{d}/{assigned}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: assigned > 0 ? `${(d / assigned) * 100}%` : "0%", backgroundColor: "#2962FF" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Carga em Execução por Utilizador */}
      {byUser.some((u) => u.active > 0) && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold mb-4" style={{ color: "#022341" }}>Carga em Execução</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                  <th className="text-left pb-2 font-medium pr-4">Utilizador</th>
                  {ACTIVE_STATUSES.map((s) => (
                    <th key={s} className="text-center pb-2 font-medium px-3 whitespace-nowrap">{s}</th>
                  ))}
                  <th className="text-center pb-2 font-medium px-3">Em Curso</th>
                  <th className="text-center pb-2 font-medium px-3">Concluídos</th>
                  <th className="text-center pb-2 font-medium px-3">Bloqueados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {byUser.filter((u) => u.active > 0).map(({ user, statusCounts, active, done, blocked }) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 font-medium pr-4" style={{ color: "#022341" }}>{user.name}</td>
                    {ACTIVE_STATUSES.map((s) => (
                      <td key={s} className="py-2 text-center px-3">
                        <span className={cn(
                          "text-xs font-semibold px-1.5 py-0.5 rounded",
                          (statusCounts[s] ?? 0) > 0 ? "bg-blue-50 text-[#2962FF]" : "text-slate-300"
                        )}>
                          {statusCounts[s] ?? 0}
                        </span>
                      </td>
                    ))}
                    <td className="py-2 text-center px-3 font-bold" style={{ color: "#2962FF" }}>{active}</td>
                    <td className="py-2 text-center px-3 text-emerald-600 font-semibold">{done}</td>
                    <td className="py-2 text-center px-3">
                      {blocked > 0
                        ? <span className="text-xs font-semibold text-red-500">{blocked}</span>
                        : <span className="text-slate-300">—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Módulos */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold mb-4" style={{ color: "#022341" }}>Progresso por Módulo</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                <th className="text-left pb-2 font-medium pr-4">Módulo</th>
                {STATUSES.map((s) => (
                  <th key={s} className="text-center pb-2 font-medium px-2 whitespace-nowrap">{s}</th>
                ))}
                <th className="text-right pb-2 font-medium px-2">Total</th>
                <th className="pb-2 font-medium pl-4 w-40">Progresso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {byModule.map(({ module, total: t, statusCounts, pct: p }) => (
                <tr key={module} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 font-medium pr-4" style={{ color: "#022341" }}>{module}</td>
                  {STATUSES.map((s) => (
                    <td key={s} className="py-2 text-center text-slate-500 px-2">
                      {statusCounts[s] || 0}
                    </td>
                  ))}
                  <td className="py-2 text-right font-semibold text-slate-700 px-2">{t}</td>
                  <td className="py-2 pl-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${p}%`, backgroundColor: p === 100 ? "#10b981" : "#2962FF" }} />
                      </div>
                      <span className="text-xs font-medium w-8 text-right" style={{ color: p === 100 ? "#10b981" : "#64748b" }}>{p}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
