const ABSOLUTE_URL_PATTERN = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i

export function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined
  if (ABSOLUTE_URL_PATTERN.test(url)) return url

  const apiBaseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "")
  const mediaPath = url.startsWith("/") ? url : `/${url}`

  return `${apiBaseUrl}${mediaPath}`
}
