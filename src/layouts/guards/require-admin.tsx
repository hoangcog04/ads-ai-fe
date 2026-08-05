import type { JSX } from "react"
import { ROUTES } from "@/constants"
import { useAuth } from "@/contexts/auth-context"
import { Navigate } from "react-router-dom"

export function RequireAdmin({ children }: { children: JSX.Element }) {
  const { user } = useAuth()

  if (user?.role !== "ADMIN") {
    return <Navigate to={ROUTES.ADS_VIDEO} replace />
  }

  return children
}
