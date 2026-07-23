import { useEffect, useState, type FormEvent } from "react"
import {
  getFlowConnection,
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
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"

type FlowErrorResponse = {
  code?: string
  message?: string
}

const FLOW_CONNECTION_QUERY_KEY = ["flow-connection"] as const

export function FlowLoginControl() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const connectionQuery = useQuery({
    queryKey: FLOW_CONNECTION_QUERY_KEY,
    queryFn: getFlowConnection,
    refetchInterval: (query) =>
      query.state.data?.status === "CONNECTING" ? 1_000 : false,
  })
  const connection = connectionQuery.data

  useEffect(() => {
    if (connection?.email) {
      setEmail((currentEmail) => currentEmail || connection.email || "")
    }
  }, [connection?.email])

  const loginMutation = useMutation({
    mutationFn: () => loginFlow(email.trim(), password),
    onSuccess: (nextConnection) => {
      queryClient.setQueryData(FLOW_CONNECTION_QUERY_KEY, nextConnection)
      setPassword("")
    },
    onError: () => {
      void queryClient.invalidateQueries({
        queryKey: FLOW_CONNECTION_QUERY_KEY,
      })
    },
  })

  const logoutMutation = useMutation({
    mutationFn: logoutFlow,
    onSuccess: (nextConnection) => {
      queryClient.setQueryData(FLOW_CONNECTION_QUERY_KEY, nextConnection)
      setEmail("")
      setPassword("")
    },
    onError: () => {
      void queryClient.invalidateQueries({
        queryKey: FLOW_CONNECTION_QUERY_KEY,
      })
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (
      !email.trim() ||
      !password ||
      loginMutation.isPending ||
      logoutMutation.isPending
    ) {
      return
    }
    loginMutation.mutate()
  }

  const logout = () => {
    if (
      !window.confirm(
        `Clear only the local Flow ${formatSessionStore(connection?.logoutTarget)}? The other session store will be kept.`
      )
    ) {
      return
    }
    logoutMutation.mutate()
  }

  const connected = connection?.status === "CONNECTED"
  const busy =
    loginMutation.isPending ||
    logoutMutation.isPending ||
    connection?.status === "CONNECTING"
  const mutationError =
    readFlowError(loginMutation.error) || readFlowError(logoutMutation.error)
  const visibleError = mutationError || connection?.lastError

  return (
    <>
      <Button
        type="button"
        variant={connected ? "outline" : "secondary"}
        onClick={() => setOpen(true)}
      >
        {busy ? (
          <Loader2 className="animate-spin" />
        ) : connected ? (
          <CheckCircle2 className="text-emerald-600" />
        ) : (
          <LogIn />
        )}
        {busy
          ? "Flow connecting..."
          : connected
            ? `Flow: ${connection.email || "Connected"}`
            : "Login Flow"}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-4 py-8"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) {
              setOpen(false)
            }
          }}
        >
          <section
            aria-labelledby="flow-login-title"
            aria-modal="true"
            className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-xl"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="flow-login-title" className="text-lg font-semibold">
                  Google Flow login
                </h2>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Credentials run once in Playwright. Password is not stored.
                </p>
              </div>
              <Button
                aria-label="Close Flow login"
                disabled={busy}
                size="icon"
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                <X />
              </Button>
            </div>

            <FlowStatus
              connection={connection}
              loading={connectionQuery.isLoading}
            />

            <form className="mt-4 grid gap-3" onSubmit={submit}>
              <label className="grid gap-1 text-xs font-medium text-zinc-600">
                Google email
                <input
                  autoComplete="email"
                  className="h-10 rounded-md border border-zinc-300 px-3 text-sm text-zinc-900"
                  disabled={busy}
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
                  className="h-10 rounded-md border border-zinc-300 px-3 text-sm text-zinc-900"
                  disabled={busy}
                  required
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>

              {visibleError && (
                <div className="rounded-md bg-red-50 p-3 text-xs leading-5 text-red-700">
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <AlertTriangle className="size-3.5" />
                    Flow session action failed
                  </span>
                  <p className="mt-1">{visibleError}</p>
                  {connection?.lastDebugScreenshotKey && (
                    <code className="mt-1 block break-all text-[11px] text-red-600">
                      Debug: {connection.lastDebugScreenshotKey}
                    </code>
                  )}
                </div>
              )}

              <Button
                disabled={busy || !email.trim() || !password}
                type="submit"
              >
                {busy ? <Loader2 className="animate-spin" /> : <LogIn />}
                {busy ? "Signing in..." : "Login Google Flow"}
              </Button>
            </form>

            <div className="mt-4 border-t border-zinc-200 pt-4">
              <p className="text-xs leading-5 text-zinc-500">
                Logout clears only the configured{" "}
                <strong>{formatSessionStore(connection?.logoutTarget)}</strong>.
                The other local session store is kept.
              </p>
              <Button
                className="mt-3 w-full"
                disabled={busy}
                type="button"
                variant="destructive"
                onClick={logout}
              >
                {logoutMutation.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <LogOut />
                )}
                {logoutMutation.isPending
                  ? "Clearing Flow session..."
                  : "Logout & clear Flow session"}
              </Button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}

function FlowStatus({
  connection,
  loading,
}: {
  connection?: FlowConnection
  loading: boolean
}) {
  const color =
    connection?.status === "CONNECTED"
      ? "bg-emerald-50 text-emerald-700"
      : connection?.status === "CONNECTING"
        ? "bg-blue-50 text-blue-700"
        : connection?.status === "REQUIRES_2FA"
          ? "bg-amber-50 text-amber-700"
          : "bg-zinc-100 text-zinc-600"
  return (
    <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-zinc-200 p-3 text-xs">
      <span className="text-zinc-500">Saved session</span>
      <span className={`rounded px-2 py-1 font-medium ${color}`}>
        {loading ? "LOADING" : connection?.status || "DISCONNECTED"}
      </span>
    </div>
  )
}

function readFlowError(error: unknown) {
  if (!error) return null
  if (axios.isAxiosError<FlowErrorResponse>(error)) {
    return error.response?.data?.message || error.message
  }
  return error instanceof Error ? error.message : "Flow login failed"
}

function formatSessionStore(value?: "profile" | "storage-state") {
  return value === "storage-state"
    ? "storage-state.json"
    : "persistent Chrome profile"
}
