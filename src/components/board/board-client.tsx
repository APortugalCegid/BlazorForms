"use client"

import dynamic from "next/dynamic"

const BoardView = dynamic(
  () => import("./board-view").then((m) => m.BoardView),
  { ssr: false }
)

export function BoardClient({ currentUser }: { currentUser: { id: string; name: string } }) {
  return <BoardView currentUser={currentUser} />
}
