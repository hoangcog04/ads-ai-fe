import { ROUTES } from "@/constants"
import { ErrorResponse } from "@/types"
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "@/utils/token"
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios"

let refreshPromise: Promise<string> | null = null
async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const resp = await fetch(`${import.meta.env.VITE_API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refreshToken: getRefreshToken(),
        }),
      })
      const data = await resp.json()

      if (resp.status !== 200) {
        clearTokens()
        window.location.href = ROUTES.LOGIN

        return Promise.reject(data?.message || "Session refresh failed")
      }

      setTokens(data.accessToken, data.refreshToken)

      return data.accessToken
    })().finally(
      // callback
      () => {
        refreshPromise = null
      }
    )
  }

  return refreshPromise
}

const httpRequest = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { "Content-Type": "application/json" },
})

httpRequest.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

httpRequest.interceptors.response.use(
  (response: AxiosResponse) => {
    if (response.data) return response.data
  },
  async (error: AxiosError<ErrorResponse>) => {
    const data = error.response?.data
    const status = error.response?.status

    if (status === 401 && !error.config?.url?.includes("/auth/login")) {
      const access = getAccessToken()
      const refresh = getRefreshToken()
      // logged out already
      if (!access || !refresh) {
        clearTokens()
        window.location.href = ROUTES.LOGIN

        return Promise.reject(error.response?.data)
      }

      // try to refresh
      try {
        const newAccessToken = await refreshAccessToken()
        if (error.config?.headers) {
          error.config.headers.Authorization = `Bearer ${newAccessToken}`
        }

        return httpRequest(error.config as AxiosRequestConfig)
      } catch {
        clearTokens()
        window.location.href = ROUTES.LOGIN

        return Promise.reject(error.response?.data)
      }
    }

    if (status === 400) {
      if (data?.message) {
        const toastTitle = data.message
        console.log({ toastTitle })
      }

      if (data?.extra?.fields) {
        const fields = data.extra.fields
        const formatted = []
        for (const [field, fieldMessages] of Object.entries(fields)) {
          if (Array.isArray(fieldMessages)) {
            const fieldMessagesString = fieldMessages.join(", ")
            formatted.push(`${field}: ${fieldMessagesString}`)
          }
        }
        const toastText = formatted.join("\n")
        console.log({ toastText })
      }
    }

    return Promise.reject(error)
  }
)

export default httpRequest
