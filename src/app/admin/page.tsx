"use client"

import { useState } from "react"
import { Upload, AlertTriangle, CheckCircle2, Loader2, Download, RotateCcw } from "lucide-react"

export default function AdminPage() {
  const [file, setFile] = useState<File | null>(null)
  const [confirm, setConfirm] = useState("")
  const [deleteUsers, setDeleteUsers] = useState(false)
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const canImport = file !== null && confirm === "CONFIRMAR" && status !== "loading"

  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const [restoreConfirm, setRestoreConfirm] = useState("")
  const [restoreStatus, setRestoreStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [restoreMessage, setRestoreMessage] = useState("")
  const canRestore = restoreFile !== null && restoreConfirm === "RESTAURAR" && restoreStatus !== "loading"

  const handleRestore = async () => {
    if (!restoreFile) return
    setRestoreStatus("loading")
    setRestoreMessage("")
    const formData = new FormData()
    formData.append("file", restoreFile)
    try {
      const res = await fetch("/api/admin/restore", { method: "POST", body: formData })
      const data = await res.json()
      if (res.ok) {
        setRestoreStatus("success")
        setRestoreMessage("Base de dados restaurada. A página vai recarregar...")
        setTimeout(() => window.location.href = "/board", 2000)
      } else {
        setRestoreStatus("error")
        setRestoreMessage(data.error || "Erro ao restaurar")
      }
    } catch {
      setRestoreStatus("error")
      setRestoreMessage("Erro de rede. Tenta novamente.")
    }
  }

  const handleImport = async () => {
    if (!file) return
    setStatus("loading")
    setMessage("")

    const formData = new FormData()
    formData.append("file", file)
    if (deleteUsers) formData.append("deleteUsers", "true")

    try {
      const res = await fetch("/api/import", { method: "POST", body: formData })
      const data = await res.json()
      if (res.ok) {
        setStatus("success")
        setMessage(`${data.imported} forms importados com sucesso${data.deletedUsers ? ` · ${data.deletedUsers} utilizadores eliminados` : ""}.`)
      } else {
        setStatus("error")
        setMessage(data.error || "Erro ao importar")
      }
    } catch {
      setStatus("error")
      setMessage("Erro de rede. Tenta novamente.")
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Administração</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">Importar Forms do Excel</h2>
        <p className="text-xs text-gray-400 mb-4">
          Importa o ficheiro <code className="bg-gray-100 px-1 rounded">ERP_Forms_Estimative.xlsx</code>.
          Esta operação substitui todos os forms existentes (o histórico de estados e notas será eliminado).
        </p>

        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center mb-4 hover:border-blue-300 transition-colors">
          <Upload className="mx-auto text-gray-400 mb-2" size={24} />
          <label className="cursor-pointer">
            <span className="text-sm text-blue-600 hover:underline font-medium">
              {file ? file.name : "Seleccionar ficheiro Excel"}
            </span>
            <input
              type="file"
              accept=".xlsx,.xls"
              suppressHydrationWarning
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null)
                setConfirm("")
                setStatus("idle")
                setMessage("")
              }}
            />
          </label>
          {file && (
            <p className="text-xs text-gray-400 mt-1">
              {(file.size / 1024).toFixed(0)} KB
            </p>
          )}
        </div>

        {file && (
          <div className="mb-4 flex flex-col gap-3">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={deleteUsers}
                onChange={(e) => setDeleteUsers(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-red-600 flex-shrink-0"
              />
              <div>
                <span className="text-xs font-medium text-gray-700">Apagar também os utilizadores</span>
                <p className="text-xs text-gray-400 mt-0.5">
                  Remove todos os utilizadores que iniciaram sessão na app. Todos terão de entrar novamente após a importação.
                </p>
              </div>
            </label>

            {deleteUsers && (
              <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">
                <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                <span>As sessões activas serão invalidadas. Todos os utilizadores perderão o acesso imediatamente.</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-red-700 mb-1.5">
                Para confirmar, escreve <strong>CONFIRMAR</strong>:
              </label>
              <input
                type="text"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="CONFIRMAR"
                className="w-full text-sm border border-red-200 rounded-lg px-3 py-2 bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleImport}
            disabled={!canImport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {status === "loading" ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Upload size={15} />
            )}
            {status === "loading" ? "A importar..." : "Importar"}
          </button>

          {status === "success" && (
            <div className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle2 size={15} />
              {message}
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center gap-1.5 text-sm text-red-600">
              <AlertTriangle size={15} />
              {message}
            </div>
          )}
        </div>
      </div>

      {/* Warning */}
      <div className="mt-4 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
        <p>
          A importação elimina todos os forms e o respectivo histórico. Os utilizadores são mantidos por omissão —
          usa a opção acima para os remover também. Usa apenas para o setup inicial ou quando o Excel for actualizado.
        </p>
      </div>

      {/* Backup & Restore */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <h2 className="text-sm font-semibold text-gray-700">Backup e Restore</h2>

        {/* Backup */}
        <div>
          <p className="text-xs text-gray-400 mb-3">
            Faz download da base de dados actual. Guarda o ficheiro num local seguro antes de qualquer operação destrutiva.
          </p>
          <a
            href="/api/admin/backup"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Download size={15} />
            Fazer Backup
          </a>
        </div>

        <div className="border-t border-gray-100" />

        {/* Restore */}
        <div>
          <p className="text-xs text-gray-400 mb-3">
            Substitui a base de dados actual por um backup anterior. Todos os dados actuais serão perdidos.
          </p>

          <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center mb-3 hover:border-red-300 transition-colors">
            <RotateCcw className="mx-auto text-gray-400 mb-1.5" size={20} />
            <label className="cursor-pointer">
              <span className="text-sm text-red-600 hover:underline font-medium">
                {restoreFile ? restoreFile.name : "Seleccionar ficheiro de backup (.db)"}
              </span>
              <input
                type="file"
                accept=".db"
                className="hidden"
                suppressHydrationWarning
                onChange={(e) => {
                  setRestoreFile(e.target.files?.[0] || null)
                  setRestoreConfirm("")
                  setRestoreStatus("idle")
                  setRestoreMessage("")
                }}
              />
            </label>
            {restoreFile && (
              <p className="text-xs text-gray-400 mt-1">{(restoreFile.size / 1024).toFixed(0)} KB</p>
            )}
          </div>

          {restoreFile && (
            <div className="mb-3">
              <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5 mb-3">
                <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                <span>Esta operação substitui toda a base de dados. Os dados actuais serão perdidos permanentemente.</span>
              </div>
              <label className="block text-xs font-medium text-red-700 mb-1.5">
                Para confirmar, escreve <strong>RESTAURAR</strong>:
              </label>
              <input
                type="text"
                value={restoreConfirm}
                onChange={(e) => setRestoreConfirm(e.target.value)}
                placeholder="RESTAURAR"
                className="w-full text-sm border border-red-200 rounded-lg px-3 py-2 bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleRestore}
              disabled={!canRestore}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {restoreStatus === "loading" ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}
              {restoreStatus === "loading" ? "A restaurar..." : "Restaurar"}
            </button>

            {restoreStatus === "success" && (
              <div className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircle2 size={15} />
                {restoreMessage}
              </div>
            )}
            {restoreStatus === "error" && (
              <div className="flex items-center gap-1.5 text-sm text-red-600">
                <AlertTriangle size={15} />
                {restoreMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
