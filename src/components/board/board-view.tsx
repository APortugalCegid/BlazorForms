"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { DragDropContext, type DropResult } from "@hello-pangea/dnd"
import { BoardColumn } from "./board-column"
import { FilterBar } from "./filter-bar"
import { CardDetail } from "@/components/card-detail/card-detail"
import type { FormRecord, BoardFilters, UserRecord, FormDetail } from "@/types"
import { STATUSES } from "@/lib/constants"
import { cn } from "@/lib/utils"

interface WorkloadEntry {
  id: string
  name: string
  total: number
  counts: Record<string, number>
  dueSoon: number
}

interface BoardViewProps {
  currentUser: { id: string; name: string }
}

export function BoardView({ currentUser }: BoardViewProps) {
  const [forms, setForms] = useState<FormRecord[]>([])
  const [users, setUsers] = useState<UserRecord[]>([])
  const [modules, setModules] = useState<string[]>([])
  const [workload, setWorkload] = useState<WorkloadEntry[]>([])
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkAssignee, setBulkAssignee] = useState("")
  const [bulkStatus, setBulkStatus] = useState("")
  const [bulkDueDate, setBulkDueDate] = useState("")
  const [bulkLoading, setBulkLoading] = useState(false)
  const [filters, setFilters] = useState<BoardFilters>(() => {
    if (typeof window === "undefined") return {}
    const p = new URLSearchParams(window.location.search)
    const f: BoardFilters = {}
    if (p.get("module")) f.module = p.get("module")!
    if (p.get("classification")) f.classification = p.get("classification")!
    if (p.get("assignedUserId")) f.assignedUserId = p.get("assignedUserId")!
    if (p.get("search")) f.search = p.get("search")!
    if (p.get("activeOnly") === "true") f.activeOnly = true
    if (p.get("blocked") === "true") f.isBlocked = true
    return f
  })
  const [selectedForm, setSelectedForm] = useState<FormDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // Sync filters → URL so the link is shareable and survives F5
  useEffect(() => {
    const p = new URLSearchParams()
    if (filters.module) p.set("module", filters.module)
    if (filters.classification) p.set("classification", filters.classification)
    if (filters.assignedUserId) p.set("assignedUserId", filters.assignedUserId)
    if (filters.search) p.set("search", filters.search)
    if (filters.activeOnly) p.set("activeOnly", "true")
    if (filters.isBlocked) p.set("blocked", "true")
    const qs = p.toString()
    history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname)
  }, [filters])

  const fetchForms = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.module) params.set("module", filters.module)
    if (filters.classification) params.set("classification", filters.classification)
    if (filters.assignedUserId) params.set("assignedUserId", filters.assignedUserId)
    if (filters.search) params.set("search", filters.search)
    if (filters.activeOnly) params.set("activeOnly", "true")
    if (filters.isBlocked) params.set("blocked", "true")

    const res = await fetch(`/api/forms?${params}`)
    if (res.ok) setForms(await res.json())
    setLoading(false)
  }, [filters])

  useEffect(() => {
    fetchForms()
  }, [fetchForms])

  const fetchWorkload = useCallback(() => {
    fetch("/api/forms/workload").then((r) => r.json()).then(setWorkload).catch(() => {})
  }, [])

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then(setUsers).catch(() => {})
    fetch("/api/forms/modules").then((r) => r.json()).then(setModules).catch(() => {})
    fetchWorkload()
  }, [])

  const openCard = useCallback(async (form: FormRecord) => {
    const res = await fetch(`/api/forms/${form.id}`)
    if (res.ok) setSelectedForm(await res.json())
  }, [])

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return
    const { draggableId, destination } = result
    const newStatus = destination.droppableId

    const form = forms.find((f) => f.id === draggableId)
    if (!form || form.status === newStatus) return

    const shouldAssign = !form.assignedUserId
    const assignedUser: UserRecord = { id: currentUser.id, name: currentUser.name, email: null, image: null }

    setForms((prev) =>
      prev.map((f) =>
        f.id === draggableId
          ? { ...f, status: newStatus, ...(shouldAssign ? { assignedUserId: currentUser.id, assignedUser } : {}) }
          : f
      )
    )

    await fetch(`/api/forms/${draggableId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: newStatus,
        ...(shouldAssign ? { assignedUserId: currentUser.id } : {}),
      }),
    })
    fetchWorkload()
  }

  const onFormUpdated = async (updated: FormRecord) => {
    setForms((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))
    const res = await fetch(`/api/forms/${updated.id}`)
    if (res.ok) setSelectedForm(await res.json())
    fetchWorkload()
  }

  const formsByStatus = useMemo(
    () =>
      STATUSES.reduce(
        (acc, status) => {
          acc[status] = forms
            .filter((f) => f.status === status)
            .sort((a, b) => b.loc - a.loc)
          return acc
        },
        {} as Record<string, FormRecord[]>
      ),
    [forms]
  )

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const exitSelection = useCallback(() => {
    setSelectionMode(false)
    setSelectedIds(new Set())
    setBulkAssignee("")
    setBulkStatus("")
    setBulkDueDate("")
  }, [])

  const handleBulkApply = async () => {
    if ((!bulkAssignee && !bulkStatus && !bulkDueDate) || selectedIds.size === 0) return
    setBulkLoading(true)
    const body: Record<string, unknown> = { ids: Array.from(selectedIds) }
    if (bulkAssignee) body.assignedUserId = bulkAssignee
    if (bulkStatus) body.status = bulkStatus
    if (bulkDueDate) body.dueDate = bulkDueDate
    await fetch("/api/forms/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    await fetchForms()
    fetchWorkload()
    exitSelection()
    setBulkLoading(false)
  }

  const isMyDay = filters.assignedUserId === currentUser.id && !!filters.activeOnly
  const myDueSoon = workload.find((u) => u.id === currentUser.id)?.dueSoon ?? 0
  const blockedCount = forms.filter((f) => f.isBlocked).length
  const noFilter = !filters.module && !filters.search && !filters.classification && !filters.assignedUserId && !filters.activeOnly && !filters.isBlocked

  const displayedStatuses = filters.activeOnly
    ? STATUSES.filter((s) => s !== "Backlog" && s !== "Concluído")
    : STATUSES

  const topModules = useMemo(() => {
    if (!noFilter) return []
    const counts: Record<string, number> = {}
    for (const f of forms) counts[f.module] = (counts[f.module] ?? 0) + 1
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }))
  }, [forms, noFilter])

  const totalShown = forms.length

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center gap-4 px-6 py-3 bg-white border-b border-slate-200 sticky top-0 z-10 flex-wrap shadow-sm">
        <h1 className="text-lg font-bold shrink-0" style={{ color: "#022341" }}>Board</h1>
        <FilterBar filters={filters} users={users} modules={modules} onChange={setFilters} />
        <button
          onClick={() => isMyDay ? setFilters({}) : setFilters({ assignedUserId: currentUser.id, activeOnly: true })}
          className={cn(
            "text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors shrink-0",
            isMyDay
              ? "bg-[#2962FF] text-white border-[#2962FF]"
              : "bg-white text-slate-600 border-slate-200 hover:border-[#2962FF]"
          )}
        >
          O meu dia
        </button>
        {(blockedCount > 0 || filters.isBlocked) && (
          <button
            onClick={() => setFilters(filters.isBlocked ? {} : { isBlocked: true })}
            className={cn(
              "text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors shrink-0 flex items-center gap-1.5",
              filters.isBlocked
                ? "bg-red-500 text-white border-red-500"
                : "bg-white text-red-500 border-red-200 hover:border-red-400"
            )}
          >
            Bloqueados
            <span className={cn(
              "text-[10px] font-bold px-1 rounded",
              filters.isBlocked ? "bg-red-400 text-white" : "bg-red-50 text-red-500"
            )}>
              {blockedCount}
            </span>
          </button>
        )}
        <button
          onClick={() => { setSelectionMode((m) => !m); setSelectedIds(new Set()); setBulkAssignee("") }}
          className={cn(
            "text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors shrink-0",
            selectionMode
              ? "bg-slate-700 text-white border-slate-700"
              : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
          )}
        >
          {selectionMode ? "Cancelar" : "Seleccionar"}
        </button>
        {myDueSoon > 0 && (
          <button
            onClick={() => setFilters({ assignedUserId: currentUser.id, activeOnly: true })}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 font-medium hover:bg-amber-100 transition-colors shrink-0"
          >
            <span className="text-amber-500">⚠</span>
            {myDueSoon} prazo{myDueSoon !== 1 ? "s" : ""} a expirar
          </button>
        )}
        {!loading && (
          <span className="text-xs text-gray-400 ml-auto shrink-0">
            {totalShown} form{totalShown !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Workload strip — always visible when there are active cards */}
      {workload.length > 0 && (
        <div className="border-b px-6 py-1.5 flex items-center gap-2 flex-wrap bg-white">
          <span className="text-xs text-slate-400 shrink-0">Em execução:</span>
          {workload.map((u) => {
            const isActive = filters.assignedUserId === u.id && filters.activeOnly
            return (
              <button
                key={u.id}
                onClick={() =>
                  isActive
                    ? setFilters({})
                    : setFilters({ assignedUserId: u.id, activeOnly: true })
                }
                className={cn(
                  "text-xs px-2.5 py-0.5 rounded-full border transition-colors",
                  isActive
                    ? "bg-[#2962FF] text-white border-[#2962FF]"
                    : "bg-white text-slate-600 border-slate-200 hover:border-[#2962FF]"
                )}
              >
                {u.name} · {u.total}
              </button>
            )
          })}
          {(filters.activeOnly || filters.assignedUserId) && (
            <button
              onClick={() => setFilters({})}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors ml-1"
            >
              ×
            </button>
          )}
        </div>
      )}

      {noFilter && (
        <div className="border-b px-6 py-2 flex items-center gap-3 flex-wrap"
          style={{ backgroundColor: "#CCE9FF", borderColor: "#93c5fd" }}>
          <span className="text-xs shrink-0" style={{ color: "#022341" }}>
            {loading ? "A carregar…" : topModules.length > 0 ? "Começar por:" : "Selecciona um filtro para explorar os forms."}
          </span>
          {!loading && topModules.map((m) => (
            <button
              key={m.name}
              onClick={() => setFilters({ module: m.name })}
              className="text-xs px-2.5 py-1 rounded-full bg-white border border-blue-300 hover:border-[#2962FF] transition-colors shrink-0"
              style={{ color: "#022341" }}
            >
              {m.name} · {m.count}
            </button>
          ))}
        </div>
      )}

      {loading || !mounted ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          A carregar...
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 p-4 overflow-x-auto flex-1 items-start">
            {displayedStatuses.map((status) => (
              <BoardColumn
                key={status}
                status={status}
                forms={formsByStatus[status] || []}
                onCardClick={openCard}
                selectionMode={selectionMode}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
              />
            ))}
          </div>
        </DragDropContext>
      )}

      {/* Bulk action bar */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-white rounded-xl border border-slate-200 shadow-2xl px-5 py-3 flex items-center gap-3 flex-wrap max-w-xl">
          <span className="text-sm font-semibold text-slate-700 shrink-0">{selectedIds.size} form{selectedIds.size !== 1 ? "s" : ""}</span>
          <span className="text-slate-200 select-none">|</span>
          <select
            value={bulkAssignee}
            onChange={(e) => setBulkAssignee(e.target.value)}
            style={{ color: "#0f172a" }}
            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#2962FF]"
          >
            <option value="">Atribuir a...</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            style={{ color: "#0f172a" }}
            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#2962FF]"
          >
            <option value="">Mover para...</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input
            type="date"
            value={bulkDueDate}
            onChange={(e) => setBulkDueDate(e.target.value)}
            title="Prazo"
            style={{ color: bulkDueDate ? "#0f172a" : "#94a3b8" }}
            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#2962FF]"
          />
          <button
            onClick={handleBulkApply}
            disabled={(!bulkAssignee && !bulkStatus && !bulkDueDate) || bulkLoading}
            className="text-xs px-4 py-1.5 rounded-lg font-medium text-white disabled:opacity-40 transition-opacity shrink-0"
            style={{ backgroundColor: "#2962FF" }}
          >
            {bulkLoading ? "A aplicar..." : "Aplicar"}
          </button>
          <button onClick={exitSelection} className="text-xs text-slate-400 hover:text-red-500 transition-colors">
            ×
          </button>
        </div>
      )}

      {selectedForm && (
        <CardDetail
          form={selectedForm}
          users={users}
          currentUserId={currentUser.id}
          onClose={() => setSelectedForm(null)}
          onUpdate={onFormUpdated}
        />
      )}
    </div>
  )
}
