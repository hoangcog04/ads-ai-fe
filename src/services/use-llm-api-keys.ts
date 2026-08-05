import {
  createLlmApiKey,
  deleteLlmApiKey,
  listLlmApiKeys,
  updateLlmApiKey,
  type CreateLlmApiKeyPayload,
  type UpdateLlmApiKeyPayload,
} from "@/services/llm-api-keys"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export const llmApiKeyKeys = {
  all: ["admin", "llm-api-keys"] as const,
}

export function useLlmApiKeysQuery() {
  return useQuery({
    queryKey: llmApiKeyKeys.all,
    queryFn: listLlmApiKeys,
  })
}

export function useCreateLlmApiKeyMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateLlmApiKeyPayload) => createLlmApiKey(payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: llmApiKeyKeys.all }),
  })
}

export function useUpdateLlmApiKeyMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: UpdateLlmApiKeyPayload
    }) => updateLlmApiKey(id, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: llmApiKeyKeys.all }),
  })
}

export function useDeleteLlmApiKeyMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteLlmApiKey,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: llmApiKeyKeys.all }),
  })
}
