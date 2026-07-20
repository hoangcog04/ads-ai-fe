import { ROUTES } from "@/constants"
import { PrivateLayout } from "@/layouts/private-layout"
import AdsVideoPage from "@/pages/ads-video"
import ExportPromptsPage from "@/pages/export-prompts"
import LoginPage from "@/pages/login"
import NotFoundPage from "@/pages/not-found"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

export function AppRouters() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect */}
        <Route
          path={ROUTES.ROOT}
          element={<Navigate to={ROUTES.ADS_VIDEO} replace />}
        />
        <Route
          path={ROUTES.LEGACY_PRODUCT}
          element={<Navigate to={ROUTES.ADS_VIDEO} replace />}
        />
        {/* Not Found */}
        <Route path="*" element={<NotFoundPage />} />
        {/* Login */}
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        {/* Private */}
        <Route element={<PrivateLayout />}>
          <Route path={ROUTES.ADS_VIDEO} element={<AdsVideoPage />} />
          <Route
            path={`${ROUTES.ADS_VIDEO}/:projectId`}
            element={<AdsVideoPage />}
          />
          <Route path={ROUTES.EXPORT_PROMPTS} element={<ExportPromptsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
