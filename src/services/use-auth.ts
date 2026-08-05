import { getCurrentUser } from "@/services/auth"
import { clearTokens } from "@/utils/token"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"

export const authKeys = {
  me: ["auth", "me"] as const,
}

export function useCurrentUserQuery(enabled = true) {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: getCurrentUser,
    enabled,
  })
}

export function useMe(enabled = true) {
  return useCurrentUserQuery(enabled)
}

export function useLogout(options?: { onLogout?: () => void }) {
  const queryClient = useQueryClient()
  const onLogout = options?.onLogout

  return useCallback(() => {
    clearTokens()
    queryClient.removeQueries({ queryKey: authKeys.me })
    onLogout?.()
  }, [onLogout, queryClient])
}
