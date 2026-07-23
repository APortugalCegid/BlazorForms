"use client"

import { useMemo } from "react"
import type { FormRecord } from "@/types"
import { STATUSES, STATUS_COLORS } from "@/lib/constants"
import { cn } from "@/lib/utils"

interface ModuleViewProps {
  forms: FormRecord[]
}

export function ModuleView({ forms }: ModuleViewProps) {
  const byModule = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    for (const f of forms) {
      if (!map[f.module]) map[f.module] = {}
      map[f.module][f.status] = (map[f.module][f.status] || 0) + 1
    }
    return Object.entries(map)
      .map(([module, counts]) => {
        const total = Object.values(counts).reduce((a, b) => a + b, 0)
        const done = counts["Concluído"] || 0
        return { module, counts, total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 }
      })
      .sort((a, b) => b.pct - a.pct || a.module.localeCompare(b.module))
  }, [forms])

  if (forms.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        Selecciona um filtro para ver os módulos
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wide">
              <th className="text-left px-4 py-3 font-medium">Módulo</th>
              {STATUSES.map((s) => (
                <th key={s} className={cn("text-center px-3 py-3 font-medium", STATUS_COLORS[s]?.text)}>{s}</th>
              ))}
              <th className="text-right px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium w-36">Progresso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {byModule.map(({ module, counts, total, done, pct }) => (
              <tr key={module} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium" style={{ color: "#022341" }}>{module}</td>
                {STATUSES.map((s) => (
                  <td key={s} className="px-3 py-3 text-center text-slate-500">
                    {counts[s] || 0}
                  </td>
                ))}
                <td className="px-4 py-3 text-right font-semibold text-slate-700">{total}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: pct === 100 ? "#10b981" : "#2962FF",
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium w-8 text-right"
                      style={{ color: pct === 100 ? "#10b981" : "#64748b" }}>
                      {pct}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
