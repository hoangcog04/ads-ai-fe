import * as React from "react"
import type { AuthTokens, AuthUser } from "@/services/auth"
import { useLogout, useMe } from "@/services/use-auth"
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "@/utils/token"

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  authenticate: (tokens: AuthTokens) => void
  logout: () => void
}
const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [hasSession, setHasSession] = React.useState(
    () => Boolean(getAccessToken() && getRefreshToken())
  )
  const currentUser = useMe(hasSession)

  const authenticate = React.useCallback((tokens: AuthTokens) => {
    setTokens(tokens.accessToken, tokens.refreshToken)
    setHasSession(true)
  }, [])
  const handleLogout = React.useCallback(() => setHasSession(false), [])
  const logout = useLogout({ onLogout: handleLogout })

  const value = React.useMemo(
    () => ({
      user: currentUser.data ?? null,
      isAuthenticated: hasSession && Boolean(currentUser.data),
      isLoading: hasSession && currentUser.isPending,
      authenticate,
      logout,
    }),
    [authenticate, currentUser.data, currentUser.isPending, hasSession, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error(`useAuth must be used within a AuthProvider`)
  }

  return context
}

// Provider and hook intentionally share one module so consumers use one context.
// eslint-disable-next-line react-refresh/only-export-components
export { AuthProvider, useAuth }
