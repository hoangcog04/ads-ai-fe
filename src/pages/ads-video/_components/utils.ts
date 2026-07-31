export function sanitizeProductRefName(fileName: string, index: number) {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "")
  const normalized = withoutExtension
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
  return normalized || `i_product_${index + 1}`
}

export function inferProductKind(fileName: string) {
  const normalized = fileName.toLowerCase()
  if (normalized.includes("logo")) return "logo"
  if (
    normalized.includes("screen") ||
    normalized.includes("scan") ||
    normalized.includes("home") ||
    normalized.includes("result")
  ) {
    return "app_screen"
  }
  return "other"
}

export function buildProductContext(
  refs: Array<{ name?: string; visualDescription?: string }>
) {
  return refs
    .map((ref, index) => {
      const name = ref.name?.trim() || `i_product_${index + 1}`
      const description = ref.visualDescription?.trim()
      return description ? `${name}:\n${description}` : `${name}:`
    })
    .join("\n\n")
}

export function splitDurationRange(value: string) {
  const [min, max] = value.split("-")
  return [min || "", max || ""]
}

export function readMutationError(error: unknown) {
  if (!error) return null
  if (error instanceof Error) return error.message
  return "Request failed"
}
