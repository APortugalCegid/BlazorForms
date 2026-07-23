import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { BoardClient } from "@/components/board/board-client"

export default async function BoardPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  return <BoardClient currentUser={{ id: session.id, name: session.name }} />
}
