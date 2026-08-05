import { ROUTES } from "@/constants"
import { AuthProvider } from "@/contexts/auth-context"
import { RequireAdmin } from "@/layouts/guards/require-admin"
import { PrivateLayout } from "@/layouts/private-layout"
import LlmApiKeysPage from "@/pages/admin/llm-api-keys"
import AdsVideoPage from "@/pages/ads-video"
import ExportPromptsPage from "@/pages/export-prompts"
import LoginPage from "@/pages/login"
import NotFoundPage from "@/pages/not-found"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

export function AppRouters() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Redirect */}
          <Route
            path={ROUTES.ROOT}
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
            <Route
              path={ROUTES.EXPORT_PROMPTS}
              element={<ExportPromptsPage />}
            />
            <Route
              path={ROUTES.ADMIN_LLM_KEYS}
              element={
                <RequireAdmin>
                  <LlmApiKeysPage />
                </RequireAdmin>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
