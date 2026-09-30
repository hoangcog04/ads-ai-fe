import { ROUTES } from "@/constants"
import { useAuth } from "@/contexts/auth-context"
import { RequireAuth } from "@/layouts/guards/require-auth"
import { FileJson, KeyRound, LogOut } from "lucide-react"
import { Outlet, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"

export function PrivateLayout() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const userIdentifier =
    user?.email && user?.username
      ? `${user.email} · ${user.username}`
      : user?.email ?? user?.username

  const handleLogout = () => {
    logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  return (
    <RequireAuth>
      <>
        <Outlet />
        <div className="fixed bottom-4 right-4 z-40 flex flex-wrap items-center justify-end gap-2">
          {user?.role === "ADMIN" && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(ROUTES.ADMIN_FLOW_CONNECTIONS)}
              >
                <FileJson />
                Flow Sessions
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(ROUTES.ADMIN_LLM_KEYS)}
              >
                <KeyRound />
                LLM Keys
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="outline"
            title={userIdentifier ? `Sign out ${userIdentifier}` : "Sign out"}
            onClick={handleLogout}
          >
            <LogOut />
            {userIdentifier || "Sign out"}
          </Button>
        </div>
      </>
    </RequireAuth>
  )
}
