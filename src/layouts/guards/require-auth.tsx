import type { JSX } from "react"
import { ROUTES } from "@/constants"
import { useAuth } from "@/contexts/auth-context"
import { Loader2 } from "lucide-react"
import { Navigate, useLocation } from "react-router-dom"

export function RequireAuth({ children }: { children: JSX.Element }) {
  const location = useLocation()
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-50">
        <Loader2 className="size-6 animate-spin text-zinc-500" />
      </main>
    )
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={ROUTES.LOGIN}
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  return children
}
