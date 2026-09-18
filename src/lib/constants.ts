export const STATUSES = [
  "Backlog",
  "Em Estabilização",
  "Concluído",
] as const

export type Status = (typeof STATUSES)[number]

// Cegid-branded status colours
export const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Backlog:             { bg: "bg-slate-100",   text: "text-slate-600",   border: "border-slate-300",  dot: "bg-slate-400" },
  "Em Estabilização":  { bg: "bg-blue-100",    text: "text-[#2962FF]",   border: "border-[#2962FF]",  dot: "bg-[#2962FF]" },
  "Concluído":         { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-400",dot: "bg-emerald-500" },
}

// Card left-border + badge per classification (Cegid Blue family)
export const CLASSIFICATION_STYLE: Record<string, { border: string; badge: string }> = {
  Editor:       { border: "border-l-[#2962FF]", badge: "bg-[#2962FF]/10 text-[#2962FF]" },
  "Manutenção": { border: "border-l-[#022341]", badge: "bg-[#022341]/10 text-[#022341]" },
  "Exploração": { border: "border-l-sky-400",   badge: "bg-[#CCE9FF] text-[#022341]" },
  Other:        { border: "border-l-slate-300",  badge: "bg-slate-100 text-slate-500" },
}

// kept for dashboard page
export const CLASSIFICATION_COLORS: Record<string, string> = {
  Editor:       "bg-[#2962FF]/10 text-[#2962FF]",
  "Manutenção": "bg-[#022341]/10 text-[#022341]",
  "Exploração": "bg-[#CCE9FF] text-[#022341]",
  Other:        "bg-slate-100 text-slate-500",
}

// ── Checklist template (PDF "Genéricos") ─────────────────────────────────────

export interface ChecklistNode {
  key: string
  label: string
  children?: ChecklistNode[]
}

export const CHECKLIST_TEMPLATE: ChecklistNode[] = [
  { key: "f4s",         label: "F4s" },
  { key: "drilldowns",  label: "DrillDowns" },
  { key: "tabindex",    label: "TabIndex" },
  { key: "resize",      label: "Resize Ecrã" },
  { key: "ajuda_botao", label: "Botão de Ajuda" },
  { key: "atalhos",     label: "Atalhos de Teclado" },
  { key: "active_bar",  label: "Opções Active Bar" },
  { key: "status_bar",  label: "Informação Status Bar" },
  { key: "listas", label: "Listas", children: [
    { key: "listas_sistema", label: "Sistema" },
    { key: "listas_defeito", label: "Por Defeito" },
    { key: "listas_pref",    label: "Preferências" },
  ]},
  { key: "impressoes",   label: "Impressões" },
  { key: "local_idioma", label: "Localização / Idioma" },
  { key: "prigrelhas", label: "Grelhas", children: [
    { key: "prig_col",      label: "Configuração de Colunas" },
    { key: "prig_agrupa",   label: "Agrupamentos" },
    { key: "prig_ordem",    label: "Ordenação" },
    { key: "prig_opcoes",   label: "Opções Funcionais" },
    { key: "prig_tooltips", label: "ToolTips" },
    { key: "prig_vistas",   label: "Vistas" },
    { key: "prig_paineis",  label: "Painéis" },
    { key: "prig_filtros",  label: "Filtros Personalizados" },
    { key: "prig_export",   label: "Opções de Exportação" },
  ]},
  { key: "manut_crud",       label: "Operações Crud" },
  { key: "manut_val_visual", label: "Validação Visual" },
  { key: "manut_dup",        label: "Duplicação de Registos" },
  { key: "manut_log",        label: "Registo de Log" },
  { key: "manut_perm",       label: "Permissões" },
  { key: "manut_perm_din",   label: "Permissões dinâmicas" },
  { key: "manut_bloq",       label: "Bloqueio de Registos" },
]

function _flatKeys(nodes: ChecklistNode[]): string[] {
  return nodes.flatMap((n) => [n.key, ...(_flatKeys(n.children ?? []))])
}

// Exploração = forms read-only, sem CRUD -> exclui os itens de manutenção que não se aplicam
const EXCLUDED_FOR_EXPLORACAO = new Set([
  "manut_crud", "manut_dup", "manut_log", "manut_perm_din", "manut_bloq",
])

const EXPLORAÇÃO_TEMPLATE: ChecklistNode[] =
  CHECKLIST_TEMPLATE.filter((n) => !EXCLUDED_FOR_EXPLORACAO.has(n.key))

// Editor = Manutenção = Other = template completo (31 itens)
// Exploração = sem os itens de manutenção não aplicáveis (26 itens)
export const CHECKLIST_TEMPLATES: Record<string, ChecklistNode[]> = {
  "Editor":     CHECKLIST_TEMPLATE,
  "Manutenção": CHECKLIST_TEMPLATE,
  "Exploração": EXPLORAÇÃO_TEMPLATE,
  "Other":      CHECKLIST_TEMPLATE,
}

export const CHECKLIST_KEYS = _flatKeys(CHECKLIST_TEMPLATE)
export const CHECKLIST_TOTAL = CHECKLIST_KEYS.length // 31 — Editor/Manutenção/Other

export function checklistTotalFor(classification: string): number {
  const tpl = CHECKLIST_TEMPLATES[classification] ?? CHECKLIST_TEMPLATE
  return _flatKeys(tpl).length
}

export function checklistProgress(data: string | null, classification = "Editor"): { checked: number; total: number } {
  const tpl = CHECKLIST_TEMPLATES[classification] ?? CHECKLIST_TEMPLATE
  const validKeys = new Set(_flatKeys(tpl))
  const total = validKeys.size
  if (!data) return { checked: 0, total }
  try {
    const obj = JSON.parse(data) as Record<string, boolean>
    return { checked: Object.entries(obj).filter(([k, v]) => v && validKeys.has(k)).length, total }
  } catch {
    return { checked: 0, total }
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export const MODULES = [
  "Accounting",
  "Base",
  "Budgeting",
  "CashManagement",
  "Construction",
  "ContactsOpportunities",
  "ContractManagement",
  "ElectronicDataInterchange",
  "EquipmentsFixedAssets",
  "Erp",
  "Extensibility",
  "HumanResources",
  "Internal",
  "Inventory",
  "PayablesReceivables",
  "Platform",
  "Production",
  "ProjectsServices",
  "Purchases",
  "Saft",
  "Sales",
  "TechnicalServices",
  "UpgradeSupport",
  "_SharedFiles",
] as const
