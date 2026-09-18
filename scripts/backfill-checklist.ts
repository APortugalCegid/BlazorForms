/**
 * Backfill de checklistData após a reestruturação da checklist (2026-09-18).
 * Para itens "colapsados" (pai + filhos -> 1 item único), marca o novo item
 * como feito se o pai OU qualquer um dos filhos antigos já estava true.
 * Não remove nenhuma key antiga — só acrescenta/ativa as novas.
 *
 * Uso:
 *   npx tsx scripts/backfill-checklist.ts               (dry-run sobre Data/dev.db)
 *   npx tsx scripts/backfill-checklist.ts --apply        (aplica sobre Data/dev.db)
 *   npx tsx scripts/backfill-checklist.ts --db <path> [--apply]
 */
import { PrismaClient } from "@prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import path from "path"

const COLLAPSE_MAP: Record<string, string[]> = {
  resize:      ["resize", "resize_min", "resize_rest", "resize_max", "resize_livre"],
  ajuda_botao: ["ajuda", "ajuda_botao"],
  impressoes:  ["impressoes", "imp_categorias", "imp_local"],
  manut_crud:  ["manut_crud", "manut_crud_ui", "manut_crud_sql"],
}

async function main() {
  const args = process.argv.slice(2)
  const apply = args.includes("--apply")
  const dbArgIndex = args.indexOf("--db")
  const dbPath = dbArgIndex >= 0 ? args[dbArgIndex + 1] : path.join(process.cwd(), "Data", "dev.db")

  console.log(`DB alvo: ${dbPath}  ${apply ? "(APPLY)" : "(dry-run)"}`)

  const adapter = new PrismaBetterSqlite3({ url: dbPath })
  const prisma = new PrismaClient({ adapter })

  const forms = await prisma.form.findMany({ select: { id: true, checklistData: true } })

  let changed = 0
  for (const f of forms) {
    if (!f.checklistData) continue
    let old: Record<string, boolean>
    try {
      old = JSON.parse(f.checklistData)
    } catch {
      continue
    }

    const next = { ...old }
    let touched = false
    for (const [newKey, oldKeys] of Object.entries(COLLAPSE_MAP)) {
      const inherited = oldKeys.some((k) => old[k] === true)
      if (inherited && next[newKey] !== true) {
        next[newKey] = true
        touched = true
      }
    }
    if (!touched) continue

    changed++
    console.log(f.id, "antes:", old, "depois:", next)
    if (apply) {
      await prisma.$executeRaw`UPDATE "Form" SET "checklistData" = ${JSON.stringify(next)} WHERE "id" = ${f.id}`
    }
  }

  console.log(`${changed}/${forms.length} forms afetados. ${apply ? "aplicado." : "(dry-run, nada escrito — corre com --apply)"}`)
  await prisma.$disconnect()
}

main()
