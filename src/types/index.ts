export interface UserRecord {
  id: string
  name: string | null
  email: string | null  // kept for compatibility, always null now
  image: string | null  // kept for compatibility, always null now
}

export interface FormRecord {
  id: string
  module: string
  className: string
  loc: number
  token: string | null
  copies: number
  classification: string
  estimatedDays: number
  status: string
  included: boolean
  assignedUserId: string | null
  assignedUser: UserRecord | null
  checklistProgress: { checked: number; total: number }
  isBlocked: boolean
  blockedReason: string | null
  dueDate: string | null
  createdAt: string
  updatedAt: string
}

export interface StateHistoryRecord {
  id: string
  fromStatus: string | null
  toStatus: string
  createdAt: string
  user: { id: string; name: string | null } | null
}

export interface NoteRecord {
  id: string
  content: string
  createdAt: string
  user: { id: string; name: string | null } | null
}

export interface FormDetail extends FormRecord {
  stateHistory: StateHistoryRecord[]
  notes: NoteRecord[]
  checklistData: string | null
}

export interface BoardFilters {
  module?: string
  classification?: string
  assignedUserId?: string
  search?: string
  included?: boolean
  activeOnly?: boolean
  isBlocked?: boolean
}
