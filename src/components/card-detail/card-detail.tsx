"use client"

import { useState } from "react"
import type { FormDetail, UserRecord, FormRecord } from "@/types"
import { STATUSES, CLASSIFICATION_STYLE, STATUS_COLORS, CHECKLIST_TEMPLATES, CHECKLIST_TEMPLATE, checklistTotalFor } from "@/lib/constants"
import type { ChecklistNode } from "@/lib/constants"
import { X, Send, ChevronRight, CheckSquare } from "lucide-react"
import { cn } from "@/lib/utils"

interface CardDetailProps {
  form: FormDetail
  users: UserRecord[]
  currentUserId: string
  onClose: () => void
  onUpdate: (updated: FormRecord) => void
}

// ── Checklist helpers ──────────────────────────────────────────────────────────

type ChecklistData = Record<string, boolean>

function parseChecklist(raw: string | null): ChecklistData {
  if (!raw) return {}
  try { return JSON.parse(raw) as ChecklistData } catch { return {} }
}

function findNode(key: string, nodes: ChecklistNode[]): ChecklistNode | null {
  for (const n of nodes) {
    if (n.key === key) return n
    if (n.children) { const f = findNode(key, n.children); if (f) return f }
  }
  return null
}

function allKeys(node: ChecklistNode): string[] {
  return [node.key, ...(node.children?.flatMap(allKeys) ?? [])]
}

function countChecked(data: ChecklistData, nodes: ChecklistNode[]): number {
  let n = 0
  for (const node of nodes) {
    if (data[node.key]) n++
    if (node.children) n += countChecked(data, node.children)
  }
  return n
}

// ── ChecklistSection component ─────────────────────────────────────────────────

function ChecklistSection({
  node,
  data,
  onToggle,
  depth = 0,
}: {
  node: ChecklistNode
  data: ChecklistData
  onToggle: (key: string) => void
  depth?: number
}) {
  const [open, setOpen] = useState(true)
  const hasChildren = !!node.children?.length
  const checked = !!data[node.key]

  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-0.5 group rounded"
        style={{ paddingLeft: depth * 16 + 4 }}
      >
        {/* expand/collapse toggle */}
        <button
          onClick={() => hasChildren && setOpen((o) => !o)}
          className={cn(
            "flex-shrink-0 text-slate-300 transition-colors",
            hasChildren ? "hover:text-slate-500 cursor-pointer" : "invisible"
          )}
          tabIndex={-1}
        >
          <ChevronRight
            size={12}
            className={cn("transition-transform", open && hasChildren ? "rotate-90" : "")}
          />
        </button>

        {/* checkbox */}
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(node.key)}
          className="flex-shrink-0 rounded-sm w-3.5 h-3.5 cursor-pointer"
          style={{ accentColor: "#2962FF" }}
        />

        {/* label */}
        <span
          onClick={() => onToggle(node.key)}
          className={cn(
            "text-xs select-none cursor-pointer leading-snug flex-1",
            hasChildren ? "font-semibold text-slate-600" : "text-slate-600",
            checked && "line-through text-slate-400"
          )}
        >
          {node.label}
        </span>
      </div>

      {hasChildren && open && (
        <div>
          {node.children!.map((child) => (
            <ChecklistSection
              key={child.key}
              node={child}
              data={data}
              onToggle={onToggle}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function CardDetail({ form, users, currentUserId: _currentUserId, onClose, onUpdate }: CardDetailProps) {
  const [noteText, setNoteText] = useState("")
  const [submittingNote, setSubmittingNote] = useState(false)
  const [localForm, setLocalForm] = useState(form)
  const [checklistData, setChecklistData] = useState<ChecklistData>(() => parseChecklist(form.checklistData))

  const updateField = async (patch: { status?: string; assignedUserId?: string | null; isBlocked?: boolean; blockedReason?: string | null; dueDate?: string | null }) => {
    const res = await fetch(`/api/forms/${form.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
    if (res.ok) {
      const updated = await res.json()
      setLocalForm((prev) => ({ ...prev, ...updated }))
      onUpdate(updated)
    }
  }

  const toggleChecklist = async (key: string) => {
    const newValue = !checklistData[key]
    const node = findNode(key, template)
    const keys = node ? allKeys(node) : [key]
    const next = { ...checklistData }
    for (const k of keys) next[k] = newValue
    setChecklistData(next)
    const res = await fetch(`/api/forms/${form.id}/checklist`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checklistData: JSON.stringify(next) }),
    })
    if (res.ok) {
      const { checklistProgress: cp } = await res.json()
      onUpdate({ ...localForm, checklistProgress: cp })
    }
  }

  const clearChecklist = async () => {
    setChecklistData({})
    const res = await fetch(`/api/forms/${form.id}/checklist`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checklistData: JSON.stringify({}) }),
    })
    if (res.ok) {
      const { checklistProgress: cp } = await res.json()
      onUpdate({ ...localForm, checklistProgress: cp })
    }
  }

  const submitNote = async () => {
    if (!noteText.trim()) return
    setSubmittingNote(true)
    const res = await fetch(`/api/forms/${form.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: noteText }),
    })
    if (res.ok) {
      const note = await res.json()
      setLocalForm((prev) => ({ ...prev, notes: [note, ...prev.notes] }))
      setNoteText("")
    }
    setSubmittingNote(false)
  }

  const classStyle = CLASSIFICATION_STYLE[localForm.classification] ?? CLASSIFICATION_STYLE.Other
  const template = CHECKLIST_TEMPLATES[localForm.classification] ?? CHECKLIST_TEMPLATE
  const checklistTotal = checklistTotalFor(localForm.classification)
  const checkedCount = countChecked(checklistData, template)
  const checklistPct = Math.round((checkedCount / checklistTotal) * 100)

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="w-[520px] bg-white shadow-2xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div className="flex-1 min-w-0">
            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide", classStyle.badge)}>
              {localForm.classification}
            </span>
            <h2 className="text-base font-bold mt-1 break-all" style={{ color: "#022341" }}>{localForm.className}</h2>
            <p className="text-xs text-slate-400">{localForm.module}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 ml-3 flex-shrink-0 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-6">
          {/* Token */}
          {localForm.token && localForm.token !== "-" && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Token</p>
              <p className="text-sm text-slate-700">{localForm.token}</p>
            </div>
          )}

          {/* Due date */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">Prazo</p>
            <input
              type="date"
              value={localForm.dueDate ?? ""}
              onChange={(e) => updateField({ dueDate: e.target.value || null })}
              style={{ color: "#0f172a" }}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white
                focus:outline-none focus:ring-2 focus:border-transparent"
              onFocus={(e) => (e.target.style.boxShadow = "0 0 0 2px #2962FF")}
              onBlur={(e) => (e.target.style.boxShadow = "")}
            />
          </div>

          {/* Status */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">Estado</p>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => {
                const c = STATUS_COLORS[s]
                const active = localForm.status === s
                return (
                  <button
                    key={s}
                    onClick={() => updateField({ status: s })}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                      active
                        ? cn(c.bg, c.text, c.border, "ring-2 ring-offset-1 ring-current")
                        : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                    )}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Assignee */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">Atribuído a</p>
            <select
              value={localForm.assignedUserId || ""}
              onChange={(e) => updateField({ assignedUserId: e.target.value || null })}
              style={{ color: "#0f172a" }}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white
                focus:outline-none focus:ring-2 focus:border-transparent"
              onFocus={(e) => (e.target.style.boxShadow = "0 0 0 2px #2962FF")}
              onBlur={(e) => (e.target.style.boxShadow = "")}
            >
              <option value="">Não atribuído</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name || u.email}</option>
              ))}
            </select>
          </div>

          {/* Blocked */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-500">Bloqueado</p>
              <button
                role="switch"
                aria-checked={localForm.isBlocked}
                aria-label="Bloqueado"
                onClick={() => updateField({ isBlocked: !localForm.isBlocked, blockedReason: localForm.isBlocked ? null : localForm.blockedReason })}
                className={cn(
                  "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400",
                  localForm.isBlocked ? "bg-red-500" : "bg-slate-200"
                )}
              >
                <span className={cn(
                  "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
                  localForm.isBlocked ? "translate-x-4" : "translate-x-1"
                )} />
              </button>
            </div>
            {localForm.isBlocked && (
              <input
                type="text"
                aria-label="Motivo do bloqueio"
                value={localForm.blockedReason ?? ""}
                onChange={(e) => setLocalForm((prev) => ({ ...prev, blockedReason: e.target.value }))}
                onBlur={(e) => {
                  updateField({ blockedReason: e.target.value || null })
                  e.target.style.boxShadow = ""
                }}
                placeholder="Motivo do bloqueio..."
                style={{ color: "#0f172a" }}
                className="w-full text-sm border border-red-200 rounded-lg px-3 py-2 bg-red-50
                  focus:outline-none focus:ring-2 focus:border-transparent"
                onFocus={(e) => (e.target.style.boxShadow = "0 0 0 2px #ef4444")}
              />
            )}
          </div>

          {/* ── Checklist Genéricos ───────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <CheckSquare size={13} style={{ color: "#2962FF" }} />
                <p className="text-xs font-medium text-slate-700">Checklist Genéricos</p>
              </div>
              <div className="flex items-center gap-2">
                {checkedCount > 0 && (
                  <button
                    onClick={clearChecklist}
                    className="text-[10px] text-slate-400 hover:text-red-500 transition-colors"
                  >
                    Limpar tudo
                  </button>
                )}
                <span className="text-[11px] font-semibold" style={{ color: checkedCount === checklistTotal ? "#10b981" : "#2962FF" }}>
                  {checkedCount} / {checklistTotal}
                </span>
              </div>
            </div>

            {/* progress bar */}
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${checklistPct}%`,
                  backgroundColor: checkedCount === checklistTotal ? "#10b981" : "#2962FF",
                }}
              />
            </div>

            {/* items */}
            <div className="border border-slate-100 rounded-lg overflow-hidden">
              <div className="p-2 space-y-0.5 max-h-96 overflow-y-auto">
                {template.map((node) => (
                  <ChecklistSection
                    key={node.key}
                    node={node}
                    data={checklistData}
                    onToggle={toggleChecklist}
                    depth={0}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* State history */}
          {localForm.stateHistory.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">Histórico de estados</p>
              <div className="space-y-2">
                {localForm.stateHistory.map((h) => (
                  <div key={h.id} className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: "#2962FF", opacity: 0.4 }} />
                    <span>
                      {h.fromStatus ? `${h.fromStatus} → ` : ""}
                      <span className="font-medium text-slate-700">{h.toStatus}</span>
                    </span>
                    <span className="ml-auto text-slate-400">
                      {h.user?.name || "–"} · {new Date(h.createdAt).toLocaleDateString("pt-PT")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">Notas</p>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                aria-label="Adicionar nota"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitNote()}
                placeholder="Adicionar nota..."
                style={{ color: "#0f172a" }}
                className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white
                  focus:outline-none focus:ring-2 focus:border-transparent"
                onFocus={(e) => (e.target.style.boxShadow = "0 0 0 2px #2962FF")}
                onBlur={(e) => (e.target.style.boxShadow = "")}
              />
              <button
                onClick={submitNote}
                disabled={submittingNote || !noteText.trim()}
                className="px-3 py-2 text-white rounded-lg disabled:opacity-40 transition-opacity"
                style={{ backgroundColor: "#2962FF" }}
              >
                <Send size={14} />
              </button>
            </div>
            <div className="space-y-2">
              {localForm.notes.map((n) => (
                <div key={n.id} className="rounded-lg p-3 border border-slate-100"
                  style={{ backgroundColor: "#f8fafc" }}>
                  <p className="text-sm text-slate-700">{n.content}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {n.user?.name || "–"} · {new Date(n.createdAt).toLocaleDateString("pt-PT")}
                  </p>
                </div>
              ))}
              {localForm.notes.length === 0 && (
                <p className="text-xs text-slate-400">Sem notas</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
