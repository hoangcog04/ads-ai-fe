import httpRequest from "@/lib/axios"
import type {
  AdGenerationTask,
  AdProject,
  CreateAdProjectPayload,
} from "@/types/ads"

export async function createAdProject(payload: CreateAdProjectPayload) {
  const formData = new FormData()
  formData.append("brief", payload.brief)
  formData.append("aspectRatio", payload.aspectRatio)
  formData.append("targetDurationSec", String(payload.targetDurationSec))
  formData.append("voiceLanguage", payload.voiceLanguage)
  formData.append("overlayEnabled", String(payload.overlayEnabled))
  formData.append("productImage", payload.productImage)
  if (payload.title) formData.append("title", payload.title)
  if (payload.productContext) {
    formData.append("productContext", payload.productContext)
  }

  return httpRequest.post("/ads/projects", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }) as unknown as AdProject
}

export async function getAdProject(projectId: string) {
  return httpRequest.get(`/ads/projects/${projectId}`) as unknown as AdProject
}

export async function runAdPlan(projectId: string) {
  return httpRequest.post(`/ads/projects/${projectId}/plan`) as unknown as AdGenerationTask
}

export async function generateAsset(assetId: string) {
  return httpRequest.post(`/ads/assets/${assetId}/generate`) as unknown as AdGenerationTask
}

export async function updateScene(
  sceneId: string,
  payload: Record<string, unknown>
) {
  return httpRequest.patch(`/ads/scenes/${sceneId}`, payload) as unknown as AdProject
}

export async function updateSceneVideoPrompt(
  sceneId: string,
  finalVideoPrompt: string
) {
  return httpRequest.patch(`/ads/scenes/${sceneId}/video-prompt`, {
    finalVideoPrompt,
  }) as unknown as AdProject
}

export async function regenerateSceneVideoPrompt(sceneId: string) {
  return httpRequest.post(
    `/ads/scenes/${sceneId}/video-prompt/regenerate`
  ) as unknown as AdGenerationTask
}

export async function rewriteScene(sceneId: string, instruction: string) {
  return httpRequest.post(`/ads/scenes/${sceneId}/rewrite`, {
    instruction,
  }) as unknown as AdGenerationTask
}

export async function generateKeyframe(sceneId: string) {
  return httpRequest.post(`/ads/scenes/${sceneId}/keyframe`) as unknown as AdGenerationTask
}

export async function selectKeyframe(sceneId: string, imageUrl: string) {
  return httpRequest.post(`/ads/scenes/${sceneId}/keyframe/select`, {
    imageUrl,
  }) as unknown as AdProject
}

export async function generateVideo(sceneId: string) {
  return httpRequest.post(`/ads/scenes/${sceneId}/video`) as unknown as AdGenerationTask
}
