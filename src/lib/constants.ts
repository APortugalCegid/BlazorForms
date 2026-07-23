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
  { key: "resize", label: "Resize ecrãs", children: [
    { key: "resize_min",   label: "Minimiza" },
    { key: "resize_rest",  label: "Restaura" },
    { key: "resize_max",   label: "Maximiza" },
    { key: "resize_livre", label: "Resize livre - memoriza layout" },
  ]},
  { key: "ajuda", label: "Ajuda", children: [
    { key: "ajuda_botao", label: "Botão" },
    { key: "ajuda_f1",    label: "F1" },
  ]},
  { key: "atalhos",    label: "Atalhos de Teclado" },
  { key: "active_bar", label: "Opções Active Bar" },
  { key: "status_bar", label: "Informação StatusBar" },
  { key: "listas", label: "Listas", children: [
    { key: "listas_sistema",  label: "Sistema" },
    { key: "listas_defeito",  label: "Por defeito" },
    { key: "listas_pref",     label: "Preferências" },
  ]},
  { key: "ctrl_data",   label: "Controlos de Data" },
  { key: "impressoes", label: "Impressões", children: [
    { key: "imp_categorias", label: "Categorias" },
    { key: "imp_local",      label: "Localização" },
  ]},
  { key: "paineis_lat",  label: "Paineis Laterais" },
  { key: "local_idioma", label: "Localização/Idioma" },
  { key: "bd_ao_mz_cv", label: "BD AO/MZ/CV" },
  { key: "prigrelhas", label: "Prigrelhas", children: [
    { key: "prig_col",      label: "Configuração de colunas" },
    { key: "prig_agrupa",   label: "Agrupamentos" },
    { key: "prig_ordem",    label: "Ordenação" },
    { key: "prig_imp",      label: "Impressão" },
    { key: "prig_opcoes",   label: "Opções funcionais" },
    { key: "prig_tooltips", label: "ToolTips" },
    { key: "prig_vistas",   label: "Vistas" },
    { key: "prig_paineis",  label: "Painéis" },
    { key: "prig_filtros",  label: "Filtros Personalizados" },
    { key: "prig_export",   label: "Opções de exportação" },
  ]},
  { key: "ext", label: "Extensibilidade", children: [
    { key: "ext_cdus",    label: "CDUs" },
    { key: "ext_sdus",    label: "SDUs" },
    { key: "ext_mapas",   label: "Mapas" },
    { key: "ext_funcoes", label: "Funções" },
    { key: "ext_eventos", label: "Eventos" },
  ]},
  { key: "manut", label: "Manutenções", children: [
    { key: "manut_val_visual", label: "Validação visual" },
    { key: "manut_crud", label: "Operações CRUD", children: [
      { key: "manut_crud_ui",  label: "Validação UI" },
      { key: "manut_crud_sql", label: "Validação SQL" },
    ]},
    { key: "manut_dup",      label: "Duplicação de registos" },
    { key: "manut_log",      label: "Registo de Log" },
    { key: "manut_perm",     label: "Permissões" },
    { key: "manut_perm_din", label: "Permissões dinâmicas" },
    { key: "manut_perm_hor", label: "Permissões horizontais" },
    { key: "manut_bloq",     label: "Bloqueio de registos" },
  ]},
]

// Exploração = Editor sem secção Manutenções (forms read-only não têm CRUD)
const EXPLORAÇÃO_TEMPLATE: ChecklistNode[] = [
  { key: "f4s",         label: "F4s" },
  { key: "drilldowns",  label: "DrillDowns" },
  { key: "tabindex",    label: "TabIndex" },
  { key: "resize", label: "Resize ecrãs", children: [
    { key: "resize_min",   label: "Minimiza" },
    { key: "resize_rest",  label: "Restaura" },
    { key: "resize_max",   label: "Maximiza" },
    { key: "resize_livre", label: "Resize livre - memoriza layout" },
  ]},
  { key: "ajuda", label: "Ajuda", children: [
    { key: "ajuda_botao", label: "Botão" },
    { key: "ajuda_f1",    label: "F1" },
  ]},
  { key: "atalhos",    label: "Atalhos de Teclado" },
  { key: "active_bar", label: "Opções Active Bar" },
  { key: "status_bar", label: "Informação StatusBar" },
  { key: "listas", label: "Listas", children: [
    { key: "listas_sistema",  label: "Sistema" },
    { key: "listas_defeito",  label: "Por defeito" },
    { key: "listas_pref",     label: "Preferências" },
  ]},
  { key: "ctrl_data",   label: "Controlos de Data" },
  { key: "impressoes", label: "Impressões", children: [
    { key: "imp_categorias", label: "Categorias" },
    { key: "imp_local",      label: "Localização" },
  ]},
  { key: "paineis_lat",  label: "Paineis Laterais" },
  { key: "local_idioma", label: "Localização/Idioma" },
  { key: "bd_ao_mz_cv", label: "BD AO/MZ/CV" },
  { key: "prigrelhas", label: "Prigrelhas", children: [
    { key: "prig_col",      label: "Configuração de colunas" },
    { key: "prig_agrupa",   label: "Agrupamentos" },
    { key: "prig_ordem",    label: "Ordenação" },
    { key: "prig_imp",      label: "Impressão" },
    { key: "prig_opcoes",   label: "Opções funcionais" },
    { key: "prig_tooltips", label: "ToolTips" },
    { key: "prig_vistas",   label: "Vistas" },
    { key: "prig_paineis",  label: "Painéis" },
    { key: "prig_filtros",  label: "Filtros Personalizados" },
    { key: "prig_export",   label: "Opções de exportação" },
  ]},
  { key: "ext", label: "Extensibilidade", children: [
    { key: "ext_cdus",    label: "CDUs" },
    { key: "ext_sdus",    label: "SDUs" },
    { key: "ext_mapas",   label: "Mapas" },
    { key: "ext_funcoes", label: "Funções" },
    { key: "ext_eventos", label: "Eventos" },
  ]},
]

function _flatKeys(nodes: ChecklistNode[]): string[] {
  return nodes.flatMap((n) => [n.key, ...(_flatKeys(n.children ?? []))])
}

// Editor = Manutenção = Other = template completo (52 itens)
// Exploração = sem secção Manutenções (41 itens)
export const CHECKLIST_TEMPLATES: Record<string, ChecklistNode[]> = {
  "Editor":     CHECKLIST_TEMPLATE,
  "Manutenção": CHECKLIST_TEMPLATE,
  "Exploração": EXPLORAÇÃO_TEMPLATE,
  "Other":      CHECKLIST_TEMPLATE,
}

export const CHECKLIST_KEYS = _flatKeys(CHECKLIST_TEMPLATE)
export const CHECKLIST_TOTAL = CHECKLIST_KEYS.length // 52 — Editor/Manutenção/Other

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
