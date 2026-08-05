import { useState, type FormEvent } from "react"
import { ROUTES } from "@/constants"
import type { LlmApiKey } from "@/services/llm-api-keys"
import {
  useCreateLlmApiKeyMutation,
  useDeleteLlmApiKeyMutation,
  useLlmApiKeysQuery,
  useUpdateLlmApiKeyMutation,
} from "@/services/use-llm-api-keys"
import axios from "axios"
import {
  ArrowLeft,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

type ApiError = { message?: string }

function errorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiError>(error)) {
    return error.response?.data?.message || error.message
  }
  return error instanceof Error ? error.message : "Request failed"
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "Never"
}

function LlmApiKeysPage() {
  const navigate = useNavigate()
  const keysQuery = useLlmApiKeysQuery()
  const createMutation = useCreateLlmApiKeyMutation()
  const updateMutation = useUpdateLlmApiKeyMutation()
  const deleteMutation = useDeleteLlmApiKeyMutation()
  const [name, setName] = useState("")
  const [secret, setSecret] = useState("")
  const [enabled, setEnabled] = useState(true)
  const [editing, setEditing] = useState<LlmApiKey | null>(null)
  const [editName, setEditName] = useState("")
  const [replacementSecret, setReplacementSecret] = useState("")
  const [actionError, setActionError] = useState<string | null>(null)

  const createKey = async (event: FormEvent) => {
    event.preventDefault()
    setActionError(null)
    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        provider: "SHOPAIKEY",
        secret: secret.trim(),
        enabled,
      })
      setName("")
      setSecret("")
      setEnabled(true)
    } catch (error) {
      setActionError(errorMessage(error))
    }
  }

  const openEdit = (key: LlmApiKey) => {
    setActionError(null)
    setEditing(key)
    setEditName(key.name)
    setReplacementSecret("")
  }

  const saveEdit = async (event: FormEvent) => {
    event.preventDefault()
    if (!editing) return
    setActionError(null)
    try {
      await updateMutation.mutateAsync({
        id: editing.id,
        payload: {
          name: editName.trim(),
          ...(replacementSecret.trim()
            ? { secret: replacementSecret.trim() }
            : {}),
        },
      })
      setEditing(null)
    } catch (error) {
      setActionError(errorMessage(error))
    }
  }

  const toggleKey = async (key: LlmApiKey) => {
    setActionError(null)
    try {
      await updateMutation.mutateAsync({
        id: key.id,
        payload: { enabled: !key.enabled },
      })
    } catch (error) {
      setActionError(errorMessage(error))
    }
  }

  const removeKey = async (key: LlmApiKey) => {
    if (!window.confirm(`Delete LLM key "${key.name}"?`)) return
    setActionError(null)
    try {
      await deleteMutation.mutateAsync(key.id)
    } catch (error) {
      setActionError(errorMessage(error))
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6">
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
                <KeyRound className="size-6" />
                LLM API Keys
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Manage encrypted ShopAIKey credentials used by plan and scene
                replan tasks.
              </p>
            </div>
          </div>
          <Button
            disabled={keysQuery.isFetching}
            type="button"
            variant="outline"
            onClick={() => void keysQuery.refetch()}
          >
            <RefreshCw className={keysQuery.isFetching ? "animate-spin" : ""} />
            Refresh
          </Button>
        </header>

        {actionError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </div>
        )}

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="font-semibold">Add key</h2>
            <p className="text-sm text-zinc-500">
              The secret is encrypted before storage and cannot be viewed again.
            </p>
          </div>
          <form
            className="grid gap-3 md:grid-cols-[minmax(180px,1fr)_minmax(260px,2fr)_auto_auto]"
            onSubmit={createKey}
          >
            <label className="grid gap-1 text-sm font-medium">
              Name
              <Input
                disabled={createMutation.isPending}
                maxLength={100}
                placeholder="ShopAIKey 01"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Secret
              <Input
                autoComplete="off"
                disabled={createMutation.isPending}
                minLength={8}
                placeholder="Paste API key"
                required
                type="password"
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
              />
            </label>
            <label className="flex items-end gap-2 pb-2 text-sm font-medium">
              <input
                checked={enabled}
                disabled={createMutation.isPending}
                type="checkbox"
                onChange={(event) => setEnabled(event.target.checked)}
              />
              Enabled
            </label>
            <Button
              className="self-end"
              disabled={createMutation.isPending}
              type="submit"
            >
              {createMutation.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Plus />
              )}
              Add key
            </Button>
          </form>
        </section>

        <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          {keysQuery.isPending ? (
            <div className="grid min-h-48 place-items-center">
              <Loader2 className="size-6 animate-spin text-zinc-500" />
            </div>
          ) : keysQuery.isError ? (
            <div className="p-6 text-sm text-red-700">
              {errorMessage(keysQuery.error)}
            </div>
          ) : !keysQuery.data?.length ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              No database keys yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Key</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Last selected</th>
                    <th className="px-4 py-3 text-right">Selected</th>
                    <th className="px-4 py-3 text-right">Success</th>
                    <th className="px-4 py-3 text-right">Failure</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {keysQuery.data.map((key) => {
                    const updatingThisKey =
                      updateMutation.isPending &&
                      updateMutation.variables?.id === key.id
                    const deletingThisKey =
                      deleteMutation.isPending &&
                      deleteMutation.variables === key.id
                    return (
                      <tr key={key.id} className="hover:bg-zinc-50/70">
                        <td className="px-4 py-3">
                          <div className="font-medium">{key.name}</div>
                          <div className="mt-0.5 text-xs text-zinc-500">
                            {key.provider} - ****{key.secretLastFour}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              key.enabled
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-zinc-100 text-zinc-600"
                            }`}
                            disabled={updatingThisKey}
                            type="button"
                            onClick={() => void toggleKey(key)}
                          >
                            {updatingThisKey
                              ? "Saving..."
                              : key.enabled
                                ? "Enabled"
                                : "Disabled"}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-zinc-600">
                          {formatDate(key.lastSelectedAt)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {key.selectedCount}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-emerald-700">
                          {key.successCount}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-red-700">
                          {key.failureCount}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              aria-label={`Edit ${key.name}`}
                              disabled={deletingThisKey}
                              size="icon"
                              type="button"
                              variant="outline"
                              onClick={() => openEdit(key)}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              aria-label={`Delete ${key.name}`}
                              disabled={deletingThisKey}
                              size="icon"
                              type="button"
                              variant="destructive"
                              onClick={() => void removeKey(key)}
                            >
                              {deletingThisKey ? (
                                <Loader2 className="animate-spin" />
                              ) : (
                                <Trash2 />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open && !updateMutation.isPending) setEditing(null)
        }}
      >
        <DialogContent>
          <form className="grid gap-4" onSubmit={saveEdit}>
            <DialogHeader>
              <DialogTitle>Edit LLM key</DialogTitle>
              <DialogDescription>
                Leave the new secret blank to keep the existing encrypted key.
              </DialogDescription>
            </DialogHeader>
            <label className="grid gap-1.5 text-sm font-medium">
              Name
              <Input
                disabled={updateMutation.isPending}
                maxLength={100}
                required
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              New secret
              <Input
                autoComplete="off"
                disabled={updateMutation.isPending}
                minLength={8}
                placeholder="Leave blank to keep current secret"
                type="password"
                value={replacementSecret}
                onChange={(event) => setReplacementSecret(event.target.value)}
              />
            </label>
            <DialogFooter>
              <Button
                disabled={updateMutation.isPending}
                type="button"
                variant="outline"
                onClick={() => setEditing(null)}
              >
                Cancel
              </Button>
              <Button disabled={updateMutation.isPending} type="submit">
                {updateMutation.isPending && (
                  <Loader2 className="animate-spin" />
                )}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  )
}

export default LlmApiKeysPage
