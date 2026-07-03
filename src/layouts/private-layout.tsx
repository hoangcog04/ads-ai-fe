import { RequireAuth } from "@/layouts/components/require-auth"
import { Outlet } from "react-router-dom"

export function PrivateLayout() {
  return (
    <RequireAuth>
      <Outlet />
    </RequireAuth>
  )
}
