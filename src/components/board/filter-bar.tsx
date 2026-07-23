"use client"

import type { BoardFilters, UserRecord } from "@/types"
import { Search, X } from "lucide-react"

interface FilterBarProps {
  filters: BoardFilters
  users: UserRecord[]
  modules: string[]
  onChange: (f: BoardFilters) => void
}

const CLASSIFICATIONS = ["Editor", "Manutenção", "Exploração", "Other"]

const selectCls = [
  "text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white",
  "text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2962FF] focus:border-transparent",
  "cursor-pointer",
].join(" ")

export function FilterBar({ filters, users, modules, onChange }: FilterBarProps) {
  const update = (patch: Partial<BoardFilters>) => onChange({ ...filters, ...patch })
  const hasFilters = filters.module || filters.classification || filters.assignedUserId || filters.search || !!filters.activeOnly || !!filters.isBlocked

  return (
    <div className="flex items-center gap-2 flex-wrap">

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Pesquisar form..."
          value={filters.search || ""}
          onChange={(e) => update({ search: e.target.value })}
          style={{ color: "#0f172a" }}
          className="pl-8 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white
            focus:outline-none focus:ring-2 focus:ring-[#2962FF] focus:border-transparent w-44"
        />
      </div>

      {/* Module */}
      <select
        value={filters.module || ""}
        onChange={(e) => update({ module: e.target.value || undefined })}
        style={{ color: "#0f172a" }}
        className={selectCls}
      >
        <option value="">Todos os módulos</option>
        {modules.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>

      {/* Classification */}
      <select
        value={filters.classification || ""}
        onChange={(e) => update({ classification: e.target.value || undefined })}
        style={{ color: "#0f172a" }}
        className={selectCls}
      >
        <option value="">Todas as classificações</option>
        {CLASSIFICATIONS.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      {/* Assignee */}
      <select
        value={filters.assignedUserId || ""}
        onChange={(e) => update({ assignedUserId: e.target.value || undefined })}
        style={{ color: "#0f172a" }}
        className={selectCls}
      >
        <option value="">Todos os utilizadores</option>
        <option value="me">Atribuídos a mim</option>
        {users.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
      </select>

      {/* Active only */}
      <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={!!filters.activeOnly}
          onChange={(e) => update({ activeOnly: e.target.checked ? true : undefined })}
          className="rounded accent-[#2962FF]"
        />
        Só activos
      </label>

      {/* Clear */}
      {hasFilters && (
        <button
          onClick={() => onChange({})}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
        >
          <X size={13} />
          Limpar
        </button>
      )}
    </div>
  )
}
