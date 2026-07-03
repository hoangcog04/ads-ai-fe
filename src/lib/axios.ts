import { LS_KEYS, ROUTES } from "@/constants"
import { ErrorResponse } from "@/types"
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios"

let refreshPromise: Promise<string> | null = null
async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const resp = await fetch(
        `${import.meta.env.VITE_API_URL}/token/refresh/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            refresh: localStorage.getItem(LS_KEYS.REFRESH_TOKEN),
          }),
        }
      )
      const data = await resp.json()

      if (resp.status !== 200) {
        localStorage.removeItem(LS_KEYS.ACCESS_TOKEN)
        localStorage.removeItem(LS_KEYS.REFRESH_TOKEN)
        window.location.href = ROUTES.LOGIN

        return Promise.reject(data.message.detail)
      }

      localStorage.setItem(LS_KEYS.ACCESS_TOKEN, data.access)
      localStorage.setItem(LS_KEYS.REFRESH_TOKEN, data.refresh)

      return data.access
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
  const token = localStorage.getItem(LS_KEYS.ACCESS_TOKEN)
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
      const access = localStorage.getItem(LS_KEYS.ACCESS_TOKEN)
      const refresh = localStorage.getItem(LS_KEYS.REFRESH_TOKEN)
      // logged out already
      if (!access || !refresh) {
        localStorage.removeItem(LS_KEYS.ACCESS_TOKEN)
        localStorage.removeItem(LS_KEYS.REFRESH_TOKEN)
        window.location.href = ROUTES.LOGIN

        return Promise.reject(error.response?.data)
      }

      // try to refresh
      try {
        const newAccessToken = await refreshAccessToken()
        localStorage.setItem(LS_KEYS.ACCESS_TOKEN, newAccessToken)
        if (error.config?.headers) {
          error.config.headers.Authorization = `Bearer ${newAccessToken}`
        }

        return httpRequest(error.config as AxiosRequestConfig)
      } catch {
        localStorage.removeItem(LS_KEYS.ACCESS_TOKEN)
        localStorage.removeItem(LS_KEYS.REFRESH_TOKEN)
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
