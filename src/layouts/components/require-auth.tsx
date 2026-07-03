import type { JSX } from "react"
import { ROUTES } from "@/constants"
import { Navigate } from "react-router-dom"

export function RequireAuth({ children }: { children: JSX.Element }) {
  const isAuthenticated = true

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} />
  }

  return children
}
