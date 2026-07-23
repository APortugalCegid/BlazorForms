"use client"

import { memo } from "react"
import { Calendar, AlertCircle } from "lucide-react"
import { Draggable } from "@hello-pangea/dnd"
import type { FormRecord } from "@/types"
import { CLASSIFICATION_STYLE } from "@/lib/constants"
import { cn } from "@/lib/utils"

interface FormCardProps {
  form: FormRecord
  index: number
  onClick: (form: FormRecord) => void
  selectionMode?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
}

export const FormCard = memo(function FormCard({ form, index, onClick, selectionMode, selected, onToggleSelect }: FormCardProps) {
  const style = CLASSIFICATION_STYLE[form.classification] ?? CLASSIFICATION_STYLE.Other

  const handleClick = () => {
    if (selectionMode) onToggleSelect?.(form.id)
    else onClick(form)
  }

  return (
    <Draggable draggableId={form.id} index={index} isDragDisabled={selectionMode}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...(selectionMode ? {} : provided.dragHandleProps)}
          onClick={handleClick}
          className={cn(
            "bg-white rounded-xl border border-l-4 p-3",
            "select-none transition-all relative",
            "hover:border-slate-300 hover:shadow-md",
            style.border,
            selectionMode
              ? selected
                ? "border-[#2962FF] ring-2 ring-[#2962FF]/40 cursor-pointer"
                : "border-slate-200 cursor-pointer"
              : "border-slate-200 cursor-grab active:cursor-grabbing",
            snapshot.isDragging && "shadow-2xl opacity-95 !cursor-grabbing ring-2 ring-[#2962FF]/40 rotate-1"
          )}
        >
          {/* Classification + module + selection checkbox */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide", style.badge)}>
              {form.classification}
            </span>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] text-slate-400 truncate">{form.module}</span>
              {selectionMode && (
                <div className={cn(
                  "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0",
                  selected ? "bg-[#2962FF] border-[#2962FF]" : "bg-white border-slate-300"
                )}>
                  {selected && <span className="text-white text-[8px] font-bold">✓</span>}
                </div>
              )}
            </div>
          </div>

          {/* Form name */}
          <p className="text-sm font-semibold leading-snug break-all" style={{ color: "#022341" }}>
            {form.className}
          </p>
          {form.loc > 0 && (
            <p className="text-[10px] text-slate-400 mt-0.5">{form.loc.toLocaleString("pt-PT")} LOC</p>
          )}

          {/* Checklist progress — always visible */}
          <div className="mt-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-[10px] mb-1"
              style={{ color: form.checklistProgress.checked === form.checklistProgress.total && form.checklistProgress.checked > 0 ? "#10b981" : "#64748b" }}>
              <span>Checklist</span>
              <span className="font-medium">{form.checklistProgress.checked}/{form.checklistProgress.total}</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{
                  width: `${(form.checklistProgress.checked / form.checklistProgress.total) * 100}%`,
                  backgroundColor: form.checklistProgress.checked === form.checklistProgress.total && form.checklistProgress.checked > 0
                    ? "#10b981"
                    : "#2962FF",
                }} />
            </div>
          </div>

          {/* Due date */}
          {form.dueDate && (() => {
            const due = new Date(form.dueDate)
            const now = new Date()
            const diffDays = Math.ceil((due.getTime() - now.setHours(0,0,0,0)) / 86400000)
            const color = diffDays < 0 ? "#ef4444" : diffDays <= 3 ? "#f59e0b" : "#10b981"
            const label = diffDays < 0 ? `${Math.abs(diffDays)}d atraso` : diffDays === 0 ? "Hoje" : `${diffDays}d`
            return (
              <div className="flex items-center gap-1 mt-1.5" style={{ color }}>
                <Calendar size={9} />
                <span className="text-[10px] font-medium">{label}</span>
              </div>
            )
          })()}

          {/* Blocked badge */}
          {form.isBlocked && (
            <div className="flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-white w-fit"
              style={{ backgroundColor: "#ef4444" }}>
              <AlertCircle size={9} />
              Bloqueado
            </div>
          )}

          {/* Assignee */}
          {form.assignedUser && (
            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100">
              <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] text-white font-bold flex-shrink-0"
                style={{ backgroundColor: "#2962FF" }}>
                {(form.assignedUser.name ?? "?")[0].toUpperCase()}
              </div>
              <span className="text-[11px] text-slate-500 truncate">{form.assignedUser.name}</span>
            </div>
          )}
        </div>
      )}
    </Draggable>
  )
})
