import type { JSX } from "react"
import { ROUTES } from "@/constants"
import { getAccessToken, getRefreshToken } from "@/utils/token"
import { Navigate, useLocation } from "react-router-dom"

export function RequireAuth({ children }: { children: JSX.Element }) {
  const location = useLocation()
  const isAuthenticated = Boolean(getAccessToken() && getRefreshToken())

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
