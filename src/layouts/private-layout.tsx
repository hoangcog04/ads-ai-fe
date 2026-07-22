import { ROUTES } from "@/constants"
import { RequireAuth } from "@/layouts/components/require-auth"
import { clearTokens } from "@/utils/token"
import { LogOut } from "lucide-react"
import { Outlet, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"

export function PrivateLayout() {
  const navigate = useNavigate()

  const logout = () => {
    clearTokens()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  return (
    <RequireAuth>
      <>
        <Outlet />
        <Button
          className="fixed bottom-4 right-4 z-40 shadow-lg"
          type="button"
          variant="outline"
          onClick={logout}
        >
          <LogOut />
          Sign out
        </Button>
      </>
    </RequireAuth>
  )
}
