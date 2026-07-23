"use client"

import { memo } from "react"
import { Droppable } from "@hello-pangea/dnd"
import { FormCard } from "./form-card"
import type { FormRecord } from "@/types"
import { STATUS_COLORS } from "@/lib/constants"
import { cn } from "@/lib/utils"

interface BoardColumnProps {
  status: string
  forms: FormRecord[]
  onCardClick: (form: FormRecord) => void
  selectionMode?: boolean
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
}

export const BoardColumn = memo(function BoardColumn({ status, forms, onCardClick, selectionMode, selectedIds, onToggleSelect }: BoardColumnProps) {
  const c = STATUS_COLORS[status] || STATUS_COLORS["Backlog"]
  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      {/* Header */}
      <div className={cn("rounded-t-xl px-3 py-3 border-b-2", c.bg, c.border)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn("w-2 h-2 rounded-full", c.dot)} />
            <h3 className={cn("text-sm font-semibold", c.text)}>{status}</h3>
          </div>
          <span className={cn(
            "text-xs font-bold px-2 py-0.5 rounded-full border",
            c.bg, c.text, c.border
          )}>
            {forms.length}
          </span>
        </div>
      </div>

      {/* Droppable */}
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 rounded-b-xl p-2 space-y-2 min-h-24 transition-colors",
              snapshot.isDraggingOver ? "bg-[#CCE9FF]/40 ring-2 ring-[#2962FF]/30" : "bg-slate-100/80"
            )}
            style={{ maxHeight: "calc(100vh - 185px)", overflowY: "auto" }}
          >
            {forms.map((form, index) => (
              <FormCard
                key={form.id}
                form={form}
                index={index}
                onClick={onCardClick}
                selectionMode={selectionMode}
                selected={selectedIds?.has(form.id)}
                onToggleSelect={onToggleSelect}
              />
            ))}
            {provided.placeholder}
            {forms.length === 0 && !snapshot.isDraggingOver && (
              <p className="text-xs text-slate-400 text-center py-6">Sem forms</p>
            )}
          </div>
        )}
      </Droppable>
    </div>
  )
})
