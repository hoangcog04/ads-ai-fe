import httpRequest from "@/lib/axios"

export type LlmKeyProvider = "SHOPAIKEY"

export type LlmApiKey = {
  id: string
  name: string
  provider: LlmKeyProvider
  secretLastFour: string
  enabled: boolean
  lastSelectedAt: string | null
  selectedCount: number
  successCount: number
  failureCount: number
  createdAt: string
  updatedAt: string
}

export type CreateLlmApiKeyPayload = {
  name: string
  provider: LlmKeyProvider
  secret: string
  enabled?: boolean
}

export type UpdateLlmApiKeyPayload = {
  name?: string
  secret?: string
  enabled?: boolean
}

export function listLlmApiKeys() {
  return httpRequest.get("/admin/llm-keys") as unknown as Promise<LlmApiKey[]>
}

export function createLlmApiKey(payload: CreateLlmApiKeyPayload) {
  return httpRequest.post(
    "/admin/llm-keys",
    payload
  ) as unknown as Promise<LlmApiKey>
}

export function updateLlmApiKey(id: string, payload: UpdateLlmApiKeyPayload) {
  return httpRequest.patch(
    `/admin/llm-keys/${id}`,
    payload
  ) as unknown as Promise<LlmApiKey>
}

export function deleteLlmApiKey(id: string) {
  return httpRequest.delete(`/admin/llm-keys/${id}`) as unknown as Promise<void>
}
