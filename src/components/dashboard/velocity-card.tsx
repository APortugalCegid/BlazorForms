"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface Props {
  weeklyData: { wk: string; count: number }[]
  avgVelocity: number
  projectedDateISO: string | null
  remaining: number
  last4Length: number
}

export function VelocityCard({ weeklyData, avgVelocity, projectedDateISO, remaining, last4Length }: Props) {
  const [showProjection, setShowProjection] = useState(false)

  const maxV = Math.max(...weeklyData.map((w) => w.count), 1)

  const projectedDate = projectedDateISO ? new Date(projectedDateISO) : null

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold" style={{ color: "#022341" }}>Velocidade Semanal</h2>
        <button
          onClick={() => setShowProjection((p) => !p)}
          className={cn(
            "text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors",
            showProjection
              ? "bg-[#2962FF] text-white border-[#2962FF]"
              : "bg-white text-slate-500 border-slate-200 hover:border-[#2962FF] hover:text-[#2962FF]"
          )}
        >
          Projectar
        </button>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-1.5 h-32">
        {weeklyData.map(({ wk, count }) => {
          const heightPct = maxV > 0 ? (count / maxV) * 100 : 0
          const weekNum = wk.split("-W")[1]
          return (
            <div key={wk} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] text-slate-400 font-medium">{count > 0 ? count : ""}</span>
              <div className="w-full flex items-end" style={{ height: 90 }}>
                <div
                  className="w-full rounded-t transition-all"
                  style={{
                    height: `${Math.max(heightPct, count > 0 ? 4 : 0)}%`,
                    backgroundColor: count > 0 ? "#2962FF" : "#e2e8f0",
                    minHeight: count > 0 ? 4 : 2,
                  }}
                />
              </div>
              <span className="text-[9px] text-slate-400">W{weekNum}</span>
            </div>
          )
        })}
      </div>
      <p className="text-[10px] text-slate-400 mt-2 text-center">Forms movidos para Concluído por semana</p>

      {/* Projection (optional) */}
      {showProjection && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          {projectedDate && avgVelocity > 0 ? (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500">Conclusão estimada</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {avgVelocity.toFixed(1)} forms/sem · {last4Length} sem analisadas · {remaining} por concluir
                </p>
              </div>
              <p className="text-sm font-bold shrink-0" style={{ color: "#022341" }}>
                {projectedDate.toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Sem dados de velocidade suficientes para projectar.</p>
          )}
        </div>
      )}
    </div>
  )
}
