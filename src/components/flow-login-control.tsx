import { useState, type FormEvent } from "react"
import {
  FLOW_CONNECTIONS_QUERY_KEY,
  getFlowConnections,
  loginFlow,
  logoutFlow,
  type FlowConnection,
} from "@/services/flow-connection"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  LogIn,
  LogOut,
  Plus,
  RefreshCw,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"

type FlowErrorResponse = { code?: string; message?: string }

export function FlowLoginControl({
  open: controlledOpen,
  onOpenChange,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
} = {}) {
  const queryClient = useQueryClient()
  const [internalOpen, setInternalOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [retryConnectionId, setRetryConnectionId] = useState<string | null>(
    null
  )
  const open = controlledOpen ?? internalOpen
  const setOpen = (next: boolean) => {
    setInternalOpen(next)
    onOpenChange?.(next)
  }

  const connectionsQuery = useQuery({
    queryKey: FLOW_CONNECTIONS_QUERY_KEY,
    queryFn: getFlowConnections,
    refetchInterval: (query) =>
      query.state.data?.some((connection) => connection.status === "CONNECTING")
        ? 1_000
        : false,
  })
  const connections = connectionsQuery.data ?? []
  const connectedCount = connections.filter(
    (connection) => connection.status === "CONNECTED"
  ).length

  const refreshConnections = () =>
    queryClient.invalidateQueries({ queryKey: FLOW_CONNECTIONS_QUERY_KEY })

  const loginMutation = useMutation({
    mutationFn: () => loginFlow(email.trim(), password),
    onSuccess: async () => {
      setPassword("")
      setEmail("")
      setRetryConnectionId(null)
      await refreshConnections()
    },
    onError: refreshConnections,
  })
  const logoutMutation = useMutation({
    mutationFn: logoutFlow,
    onSuccess: refreshConnections,
    onError: refreshConnections,
  })

  const busy =
    loginMutation.isPending ||
    logoutMutation.isPending ||
    connections.some((connection) => connection.status === "CONNECTING")
  const retryConnection = connections.find(
    (connection) => connection.id === retryConnectionId
  )
  const mutationError =
    readFlowError(loginMutation.error) || readFlowError(logoutMutation.error)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!email.trim() || !password || loginMutation.isPending) return
    loginMutation.mutate()
  }

  const retry = (connection: FlowConnection) => {
    setRetryConnectionId(connection.id)
    setEmail(connection.email)
    setPassword("")
    loginMutation.reset()
  }

  return (
    <>
      <Button
        type="button"
        variant={connectedCount ? "outline" : "secondary"}
        onClick={() => setOpen(true)}
      >
        {busy ? (
          <Loader2 className="animate-spin" />
        ) : connectedCount ? (
          <CheckCircle2 className="text-emerald-600" />
        ) : (
          <LogIn />
        )}
        Flow accounts: {connectedCount}/{connections.length}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-4 py-8"
          onMouseDown={(event) =>
            event.target === event.currentTarget && !busy && setOpen(false)
          }
        >
          <section
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-zinc-200 bg-white p-5 shadow-xl"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Google Flow accounts</h2>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Each project stays bound to one account. Passwords are never
                  stored.
                </p>
              </div>
              <Button
                aria-label="Close Flow accounts"
                disabled={busy}
                size="icon"
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                <X />
              </Button>
            </div>

            <div className="mt-4 grid gap-2">
              {connectionsQuery.isLoading && (
                <p className="text-sm text-zinc-500">Loading accounts...</p>
              )}
              {connections.map((connection) => (
                <div
                  key={connection.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {connection.email}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {connection.status}
                    </p>
                    {connection.lastError && (
                      <p className="mt-1 text-xs text-red-600">
                        {connection.lastError}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {connection.status !== "CONNECTED" && (
                      <Button
                        size="sm"
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={() => retry(connection)}
                      >
                        <RefreshCw />
                        Retry
                      </Button>
                    )}
                    {connection.status === "CONNECTED" && (
                      <Button
                        size="sm"
                        type="button"
                        variant="destructive"
                        disabled={busy}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Clear the local Flow session for ${connection.email}?`
                            )
                          )
                            logoutMutation.mutate(connection.id)
                        }}
                      >
                        <LogOut />
                        Logout
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <form
              className="mt-5 grid gap-3 border-t border-zinc-200 pt-4"
              onSubmit={submit}
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Plus className="size-4" />
                {retryConnection
                  ? `Retry ${retryConnection.email}`
                  : "Add Flow account"}
              </div>
              <label className="grid gap-1 text-xs font-medium text-zinc-600">
                Google email
                <input
                  autoComplete="email"
                  className="h-10 rounded-md border border-zinc-300 px-3 text-sm"
                  disabled={busy || !!retryConnection}
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label className="grid gap-1 text-xs font-medium text-zinc-600">
                Google password
                <input
                  autoComplete="current-password"
                  className="h-10 rounded-md border border-zinc-300 px-3 text-sm"
                  disabled={busy}
                  required
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              {mutationError && (
                <div className="rounded-md bg-red-50 p-3 text-xs text-red-700">
                  <AlertTriangle className="mr-1 inline size-3.5" />
                  {mutationError}
                </div>
              )}
              <div className="flex gap-2">
                {retryConnection && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setRetryConnectionId(null)
                      setEmail("")
                      setPassword("")
                    }}
                  >
                    Cancel retry
                  </Button>
                )}
                <Button
                  disabled={busy || !email.trim() || !password}
                  type="submit"
                >
                  {loginMutation.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <LogIn />
                  )}
                  {loginMutation.isPending
                    ? "Signing in..."
                    : retryConnection
                      ? "Retry login"
                      : "Login & add"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  )
}

function readFlowError(error: unknown) {
  if (!error) return null
  if (axios.isAxiosError<FlowErrorResponse>(error))
    return error.response?.data?.message || error.message
  return error instanceof Error ? error.message : "Flow account action failed"
}
