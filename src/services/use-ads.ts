import {
  addProductReference,
  assembleVideo,
  createAdProject,
  createKeyframePromptSlot,
  deleteAdProject,
  deleteProductReference,
  generateAsset,
  generateKeyframeSlot,
  generateMissingKeyframes,
  generateVideo,
  getAdProject,
  importAdPlanJson,
  listAdProjects,
  regenerateAllKeyframes,
  replanScene,
  runAdPlan,
  selectKeyframeSlotCandidate,
  updateAdProject,
  updateAdProjectFlowConnection,
  updateKeyframePromptSlot,
  updateProductReference,
  updateReferenceAsset,
  updateScene,
  updateSceneVideoPrompt,
  uploadKeyframeSlotImage,
  uploadProductReferences,
  uploadReferenceAssetImage,
} from "@/services/ads"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type {
  AdGenerationTask,
  CreateKeyframePromptSlotPayload,
  UpdateAdProjectPayload,
} from "@/types/ads"

export const adsKeys = {
  projects: ["ads-projects"] as const,
  project: (projectId?: string) => ["ads-project", projectId] as const,
}

export function isAdTaskRunning(task?: AdGenerationTask) {
  return task?.status === "QUEUED" || task?.status === "PROCESSING"
}

export function useAdsProjectsQuery() {
  return useQuery({
    queryKey: adsKeys.projects,
    queryFn: listAdProjects,
  })
}

export function useAdProjectQuery(projectId?: string) {
  return useQuery({
    queryKey: adsKeys.project(projectId),
    queryFn: () => getAdProject(projectId!),
    enabled: !!projectId,
    refetchInterval: (query) =>
      (query.state.data?.tasks ?? []).some(isAdTaskRunning) ? 2500 : false,
  })
}

export function useCreateAdProjectMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createAdProject,
    onSuccess: (project) => {
      queryClient.setQueryData(adsKeys.project(project.id), project)
      void queryClient.invalidateQueries({ queryKey: adsKeys.projects })
    },
  })
}

export function useDeleteAdProjectMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteAdProject,
    onSuccess: (deleted) => {
      queryClient.removeQueries({ queryKey: adsKeys.project(deleted.id) })
      void queryClient.invalidateQueries({ queryKey: adsKeys.projects })
    },
  })
}

export function useRunAdPlanMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: runAdPlan,
    onSuccess: (task) => {
      void queryClient.invalidateQueries({
        queryKey: adsKeys.project(task.projectId),
      })
      void queryClient.invalidateQueries({ queryKey: adsKeys.projects })
    },
  })
}

export function useUpdateAdProjectMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: UpdateAdProjectPayload
    }) => updateAdProject(id, payload),
    onSuccess: (project) => {
      queryClient.setQueryData(adsKeys.project(project.id), project)
      void queryClient.invalidateQueries({ queryKey: adsKeys.projects })
    },
  })
}

export function useUpdateAdProjectFlowConnectionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      flowConnectionId,
    }: {
      projectId: string
      flowConnectionId: string
    }) => updateAdProjectFlowConnection(projectId, flowConnectionId),
    onSuccess: (project) => {
      queryClient.setQueryData(adsKeys.project(project.id), project)
      void queryClient.invalidateQueries({ queryKey: adsKeys.projects })
    },
  })
}

export function useImportAdPlanMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, rawPlan }: { id: string; rawPlan: string }) =>
      importAdPlanJson(id, rawPlan),
    onSuccess: (project) => {
      queryClient.setQueryData(adsKeys.project(project.id), project)
    },
  })
}

export function useGenerateAssetMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: generateAsset,
    onSuccess: (task) => {
      void queryClient.invalidateQueries({
        queryKey: adsKeys.project(task.projectId),
      })
      void queryClient.invalidateQueries({ queryKey: adsKeys.projects })
    },
  })
}

export function useUploadReferenceAssetImageMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ assetId, file }: { assetId: string; file: File }) =>
      uploadReferenceAssetImage(assetId, file),
    onSuccess: (project) => {
      queryClient.setQueryData(adsKeys.project(project.id), project)
    },
  })
}

export function useUploadProductReferencesMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: uploadProductReferences,
    onSuccess: (task) => {
      void queryClient.invalidateQueries({
        queryKey: adsKeys.project(task.projectId),
      })
      void queryClient.invalidateQueries({ queryKey: adsKeys.projects })
    },
  })
}

export function useGenerateMissingKeyframesMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: generateMissingKeyframes,
    onSuccess: (_, projectId) => {
      void queryClient.invalidateQueries({
        queryKey: adsKeys.project(projectId),
      })
      void queryClient.invalidateQueries({ queryKey: adsKeys.projects })
    },
  })
}

export function useRegenerateAllKeyframesMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: regenerateAllKeyframes,
    onSuccess: (_, projectId) => {
      void queryClient.invalidateQueries({
        queryKey: adsKeys.project(projectId),
      })
      void queryClient.invalidateQueries({ queryKey: adsKeys.projects })
    },
  })
}

export function useGenerateVideoMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: generateVideo,
    onSuccess: (task) => {
      void queryClient.invalidateQueries({
        queryKey: adsKeys.project(task.projectId),
      })
      void queryClient.invalidateQueries({ queryKey: adsKeys.projects })
    },
  })
}

export function useAssembleVideoMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: assembleVideo,
    onSuccess: (task) => {
      void queryClient.invalidateQueries({
        queryKey: adsKeys.project(task.projectId),
      })
      void queryClient.invalidateQueries({ queryKey: adsKeys.projects })
    },
  })
}

export function useReplanSceneMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      sceneId,
      instruction,
    }: {
      sceneId: string
      instruction: string
    }) => replanScene(sceneId, instruction),
    onSuccess: (task) => {
      void queryClient.invalidateQueries({
        queryKey: adsKeys.project(task.projectId),
      })
      void queryClient.invalidateQueries({ queryKey: adsKeys.projects })
    },
  })
}

export function useAddProductReferenceMutation(
  projectId: string,
  getPayload: () => Parameters<typeof addProductReference>[1]
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => addProductReference(projectId, getPayload()),
    onSuccess: (project) => {
      queryClient.setQueryData(adsKeys.project(project.id), project)
    },
  })
}

export function useUpdateProductReferenceMutation(
  assetId: string,
  getPayload: () => Record<string, unknown>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => updateProductReference(assetId, getPayload()),
    onSuccess: (project) => {
      queryClient.setQueryData(adsKeys.project(project.id), project)
    },
  })
}

export function useDeleteProductReferenceMutation(assetId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => deleteProductReference(assetId),
    onSuccess: (project) => {
      queryClient.setQueryData(adsKeys.project(project.id), project)
    },
  })
}

export function useUpdateReferenceAssetMutation(
  assetId: string | undefined,
  getPayload: () => Record<string, unknown>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => {
      if (!assetId) throw new Error("Reference asset required")
      return updateReferenceAsset(assetId, getPayload())
    },
    onSuccess: (project) => {
      queryClient.setQueryData(adsKeys.project(project.id), project)
    },
  })
}

export function useUpdateSceneMutation(
  sceneId: string,
  getPayload: () => Record<string, unknown>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => updateScene(sceneId, getPayload()),
    onSuccess: (project) => {
      queryClient.setQueryData(adsKeys.project(project.id), project)
    },
  })
}

export function useUpdateSceneDurationMutation(sceneId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (durationSec: number) => updateScene(sceneId, { durationSec }),
    onSuccess: (project) => {
      queryClient.setQueryData(adsKeys.project(project.id), project)
    },
  })
}

export function useUpdateSceneVideoPromptMutation(
  sceneId: string,
  getVideoPrompt: () => string
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => updateSceneVideoPrompt(sceneId, getVideoPrompt()),
    onSuccess: (project) => {
      queryClient.setQueryData(adsKeys.project(project.id), project)
    },
  })
}

export function useUpdateKeyframePromptSlotMutation(
  slotId: string,
  getPayload: () => Record<string, unknown>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => updateKeyframePromptSlot(slotId, getPayload()),
    onSuccess: (project) => {
      queryClient.setQueryData(adsKeys.project(project.id), project)
    },
  })
}

export function useCreateKeyframePromptSlotMutation(sceneId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateKeyframePromptSlotPayload) =>
      createKeyframePromptSlot(sceneId, payload),
    onSuccess: (project) => {
      queryClient.setQueryData(adsKeys.project(project.id), project)
      void queryClient.invalidateQueries({ queryKey: adsKeys.projects })
    },
  })
}

export function useSetKeyframeSlotInVideoMutation(slotId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (includeInVideo: boolean) =>
      updateKeyframePromptSlot(slotId, { includeInVideo }),
    onSuccess: (project) => {
      queryClient.setQueryData(adsKeys.project(project.id), project)
    },
  })
}

export function useGenerateKeyframeSlotMutation(slotId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => generateKeyframeSlot(slotId),
    onSuccess: (task) => {
      void queryClient.invalidateQueries({
        queryKey: adsKeys.project(task.projectId),
      })
      void queryClient.invalidateQueries({ queryKey: adsKeys.projects })
    },
  })
}

export function useUploadKeyframeSlotImageMutation(slotId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => uploadKeyframeSlotImage(slotId, file),
    onSuccess: (task) => {
      void queryClient.invalidateQueries({
        queryKey: adsKeys.project(task.projectId),
      })
      void queryClient.invalidateQueries({ queryKey: adsKeys.projects })
    },
  })
}

export function useSelectKeyframeSlotCandidateMutation(slotId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (candidateId: string) =>
      selectKeyframeSlotCandidate(slotId, candidateId),
    onSuccess: (project) => {
      queryClient.setQueryData(adsKeys.project(project.id), project)
    },
  })
}
