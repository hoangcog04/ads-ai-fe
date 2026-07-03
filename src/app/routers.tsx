import { ROUTES } from "@/constants"
import { PrivateLayout } from "@/layouts/private-layout"
import LoginPage from "@/pages/login"
import NotFoundPage from "@/pages/not-found"
import ProductPage from "@/pages/product"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

export function AppRouters() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect */}
        <Route path={ROUTES.ROOT} element={<Navigate to={ROUTES.PRODUCT} />} />
        {/* Not Found */}
        <Route path="*" element={<NotFoundPage />} />
        {/* Login */}
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        {/* Private */}
        <Route element={<PrivateLayout />}>
          <Route path={ROUTES.PRODUCT} element={<ProductPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
