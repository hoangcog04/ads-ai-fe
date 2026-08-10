import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { ROUTES } from "@/constants"
import {
  importAdminFlowStorageState,
  listAdminFlowConnectionUsers,
  type AdminFlowStorageStateImportResult,
} from "@/services/admin-flow-connections"
import { useMutation, useQuery } from "@tanstack/react-query"
import axios from "axios"
import {
  ArrowLeft,
  CheckCircle2,
  FileJson,
  Loader2,
  Upload,
} from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type ApiError = { message?: string }

function errorMessage(error: unknown) {
  if (axios.isAxiosError<ApiError>(error)) {
    return error.response?.data?.message || error.message
  }
  return error instanceof Error ? error.message : "Storage-state import failed"
}

function inspectStorageState(raw: string) {
  if (!raw.trim()) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { valid: false, message: "JSON root must be an object." }
    }
    const state = value as { cookies?: unknown; origins?: unknown }
    if (!Array.isArray(state.cookies) || !Array.isArray(state.origins)) {
      return {
        valid: false,
        message: "JSON must contain cookies and origins arrays.",
      }
    }
    return {
      valid: true,
      message: `${state.cookies.length} cookies, ${state.origins.length} origins`,
    }
  } catch {
    return { valid: false, message: "Invalid JSON." }
  }
}

function AdminFlowConnectionsPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [userId, setUserId] = useState("")
  const [flowEmail, setFlowEmail] = useState("")
  const [storageStateJson, setStorageStateJson] = useState("")
  const [replaceExisting, setReplaceExisting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [result, setResult] =
    useState<AdminFlowStorageStateImportResult | null>(null)

  const usersQuery = useQuery({
    queryKey: ["admin", "flow-connections", "users"],
    queryFn: listAdminFlowConnectionUsers,
  })
  const importMutation = useMutation({
    mutationFn: importAdminFlowStorageState,
  })
  const jsonSummary = useMemo(
    () => inspectStorageState(storageStateJson),
    [storageStateJson]
  )

  useEffect(() => {
    if (!userId && usersQuery.data?.length === 1) {
      setUserId(usersQuery.data[0].id)
    }
  }, [userId, usersQuery.data])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!userId || !flowEmail.trim() || !jsonSummary?.valid) return
    setActionError(null)
    setResult(null)
    try {
      const imported = await importMutation.mutateAsync({
        userId,
        email: flowEmail.trim(),
        storageStateJson,
        replaceExisting,
      })
      setResult(imported)
      setStorageStateJson("")
      setReplaceExisting(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    } catch (error) {
      setActionError(errorMessage(error))
    }
  }

  const readFile = async (file: File | undefined) => {
    if (!file) return
    setActionError(null)
    setResult(null)
    try {
      setStorageStateJson(await file.text())
    } catch {
      setActionError("Could not read the selected JSON file")
    }
  }

  const busy = importMutation.isPending
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-5xl gap-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              aria-label="Back to Ads Video"
              size="icon"
              type="button"
              variant="outline"
              onClick={() => navigate(ROUTES.ADS_VIDEO)}
            >
              <ArrowLeft />
            </Button>
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-semibold">
                <FileJson className="size-6" />
                Flow storage-state import
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Assign an exported Google Flow session to an app user.
              </p>
            </div>
          </div>
        </header>

        {actionError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </div>
        )}

        {result && (
          <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
            <h2 className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="size-5" />
              Storage state imported
            </h2>
            <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-[180px_1fr]">
              <dt className="text-emerald-700">App user</dt>
              <dd>{result.userEmail}</dd>
              <dt className="text-emerald-700">Google Flow account</dt>
              <dd>{result.email}</dd>
              <dt className="text-emerald-700">Connection ID</dt>
              <dd className="break-all font-mono text-xs">{result.id}</dd>
              <dt className="text-emerald-700">Storage key</dt>
              <dd className="break-all font-mono text-xs">
                {result.storageStateKey}
              </dd>
            </dl>
          </section>
        )}

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <form className="grid gap-5" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium">
                App user
                <select
                  className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-500"
                  disabled={busy || usersQuery.isPending}
                  required
                  value={userId}
                  onChange={(event) => setUserId(event.target.value)}
                >
                  <option value="">Select an app user</option>
                  {usersQuery.data?.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email} ({user.role})
                    </option>
                  ))}
                </select>
                {usersQuery.isError && (
                  <span className="text-xs text-red-600">
                    {errorMessage(usersQuery.error)}
                  </span>
                )}
              </label>

              <label className="grid gap-1.5 text-sm font-medium">
                Google Flow email
                <Input
                  autoComplete="email"
                  disabled={busy}
                  placeholder="flow-account@gmail.com"
                  required
                  type="email"
                  value={flowEmail}
                  onChange={(event) => setFlowEmail(event.target.value)}
                />
              </label>
            </div>

            <div className="grid gap-2">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <label className="grid gap-1.5 text-sm font-medium">
                  Choose cookie.json
                  <Input
                    ref={fileInputRef}
                    accept="application/json,.json"
                    disabled={busy}
                    type="file"
                    onChange={(event) => void readFile(event.target.files?.[0])}
                  />
                </label>
                {jsonSummary && (
                  <span
                    className={`text-xs ${
                      jsonSummary.valid ? "text-emerald-700" : "text-red-600"
                    }`}
                  >
                    {jsonSummary.message}
                  </span>
                )}
              </div>
              <label className="grid gap-1.5 text-sm font-medium">
                Or paste storage-state JSON
                <textarea
                  className="min-h-72 resize-y rounded-md border border-zinc-300 p-3 font-mono text-xs outline-none focus:border-zinc-500"
                  disabled={busy}
                  placeholder={'{\n  "cookies": [],\n  "origins": []\n}'}
                  spellCheck={false}
                  value={storageStateJson}
                  onChange={(event) => setStorageStateJson(event.target.value)}
                />
              </label>
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input
                className="mt-1"
                checked={replaceExisting}
                disabled={busy}
                type="checkbox"
                onChange={(event) => setReplaceExisting(event.target.checked)}
              />
              <span>
                Replace the existing session when this app user already has a
                connection for the same Google email.
              </span>
            </label>

            <div className="flex justify-end">
              <Button
                disabled={
                  busy || !userId || !flowEmail.trim() || !jsonSummary?.valid
                }
                type="submit"
              >
                {busy ? <Loader2 className="animate-spin" /> : <Upload />}
                {busy ? "Importing..." : "Import storage state"}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}

export default AdminFlowConnectionsPage
