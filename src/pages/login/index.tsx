import { useEffect, useState, type FormEvent } from "react"
import { ROUTES } from "@/constants"
import { login } from "@/services/auth"
import { getAccessToken, getRefreshToken, setTokens } from "@/utils/token"
import axios from "axios"
import { AlertCircle, Loader2, LogIn } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type LoginLocationState = { from?: string }

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const destination =
    (location.state as LoginLocationState | null)?.from || ROUTES.ADS_VIDEO

  useEffect(() => {
    if (getAccessToken() && getRefreshToken()) {
      navigate(destination, { replace: true })
    }
  }, [destination, navigate])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const tokens = await login(email.trim(), password)
      setTokens(tokens.accessToken, tokens.refreshToken)
      navigate(destination, { replace: true })
    } catch (requestError) {
      if (axios.isAxiosError<{ message?: string }>(requestError)) {
        setError(requestError.response?.data?.message || "Login failed")
      } else {
        setError("Login failed")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-100 px-4 py-10 text-zinc-950">
      <section className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Ads AI
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Admin login</h1>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            Use the administrator account configured by the backend.
          </p>
        </div>

        <form className="grid gap-4" onSubmit={submit}>
          <label className="grid gap-1.5 text-sm font-medium">
            Email
            <Input
              autoComplete="email"
              disabled={submitting}
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Password
            <Input
              autoComplete="current-password"
              disabled={submitting}
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error && (
            <div className="flex gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button className="mt-1 w-full" disabled={submitting} type="submit">
            {submitting ? <Loader2 className="animate-spin" /> : <LogIn />}
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </section>
    </main>
  )
}

export default LoginPage
