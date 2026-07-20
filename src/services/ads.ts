import type {
  AdGenerationTask,
  AdProject,
  AdProjectListItem,
  CreateAdProjectPayload,
  RenderManualGuidePayload,
  RenderManualGuideResponse,
  RenderPlanPromptPayload,
  RenderPlanPromptResponse,
  UpdateAdProjectPayload,
} from "@/types/ads"
import httpRequest from "@/lib/axios"

export async function createAdProject(payload: CreateAdProjectPayload) {
  const formData = new FormData()
  formData.append("brief", payload.brief)
  formData.append("aspectRatio", payload.aspectRatio)
  formData.append("voiceLanguage", payload.voiceLanguage)
  formData.append("overlayEnabled", String(payload.overlayEnabled))
  const productImages = payload.productImages ?? []
  for (const image of productImages) {
    formData.append("productImages", image)
  }
  if (payload.productReferencesMeta?.length) {
    formData.append(
      "productReferencesMeta",
      JSON.stringify(payload.productReferencesMeta)
    )
  }
  if (productImages.length === 0 && payload.productImage) {
    formData.append("productImage", payload.productImage)
  }
  if (payload.title) formData.append("title", payload.title)
  if (payload.productContext) {
    formData.append("productContext", payload.productContext)
  }
  if (payload.scriptTimeline) {
    formData.append("scriptTimeline", payload.scriptTimeline)
  }
  if (payload.characterBrief) {
    formData.append("characterBrief", payload.characterBrief)
  }
  if (payload.locationBrief) {
    formData.append("locationBrief", payload.locationBrief)
  }
  if (payload.durationRangeMinSec) {
    formData.append("durationRangeMinSec", payload.durationRangeMinSec)
  }
  if (payload.durationRangeMaxSec) {
    formData.append("durationRangeMaxSec", payload.durationRangeMaxSec)
  }

  return httpRequest.post("/ads/projects", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }) as unknown as AdProject
}

export async function listAdProjects() {
  return httpRequest.get("/ads/projects") as unknown as AdProjectListItem[]
}

export async function getAdProject(projectId: string) {
  return httpRequest.get(`/ads/projects/${projectId}`) as unknown as AdProject
}

export async function updateAdProject(
  projectId: string,
  payload: UpdateAdProjectPayload
) {
  return httpRequest.patch(
    `/ads/projects/${projectId}`,
    payload
  ) as unknown as AdProject
}

export async function runAdPlan(projectId: string) {
  return httpRequest.post(
    `/ads/projects/${projectId}/plan`
  ) as unknown as AdGenerationTask
}

export async function importAdPlanJson(projectId: string, rawPlan: string) {
  return httpRequest.post(`/ads/projects/${projectId}/plan/import`, {
    rawPlan,
  }) as unknown as AdProject
}

export async function generateAsset(assetId: string) {
  return httpRequest.post(
    `/ads/assets/${assetId}/generate`
  ) as unknown as AdGenerationTask
}

export async function uploadReferenceAssetImage(
  assetId: string,
  referenceImage: File
) {
  const formData = new FormData()
  formData.append("referenceImage", referenceImage)
  return httpRequest.post(`/ads/assets/${assetId}/reference-image`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }) as unknown as AdProject
}

export async function uploadProductReferences(projectId: string) {
  return httpRequest.post(
    `/ads/projects/${projectId}/product-references/upload`
  ) as unknown as AdGenerationTask
}

export async function updateScene(
  sceneId: string,
  payload: Record<string, unknown>
) {
  return httpRequest.patch(
    `/ads/scenes/${sceneId}`,
    payload
  ) as unknown as AdProject
}

export async function updateSceneVideoPrompt(
  sceneId: string,
  videoPrompt: string
) {
  return httpRequest.patch(`/ads/scenes/${sceneId}/video-prompt`, {
    videoPrompt,
  }) as unknown as AdProject
}

export async function replanScene(sceneId: string, instruction: string) {
  return httpRequest.post(`/ads/scenes/${sceneId}/replan`, {
    instruction,
  }) as unknown as AdGenerationTask
}

export async function addProductReference(
  projectId: string,
  payload: {
    productImage: File
    name?: string
    kind?: string
    visualDescription?: string
    lockPrompt?: string
    useWhen?: string
  }
) {
  const formData = new FormData()
  formData.append("productImage", payload.productImage)
  if (payload.name) formData.append("name", payload.name)
  if (payload.kind) formData.append("kind", payload.kind)
  if (payload.visualDescription) {
    formData.append("visualDescription", payload.visualDescription)
  }
  if (payload.lockPrompt) formData.append("lockPrompt", payload.lockPrompt)
  if (payload.useWhen) formData.append("useWhen", payload.useWhen)
  return httpRequest.post(
    `/ads/projects/${projectId}/product-references`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    }
  ) as unknown as AdProject
}

export async function updateProductReference(
  assetId: string,
  payload: Record<string, unknown>
) {
  return httpRequest.patch(
    `/ads/assets/${assetId}/product-reference`,
    payload
  ) as unknown as AdProject
}

export async function updateReferenceAsset(
  assetId: string,
  payload: Record<string, unknown>
) {
  return httpRequest.patch(
    `/ads/assets/${assetId}/reference`,
    payload
  ) as unknown as AdProject
}

export async function updateKeyframePromptSlot(
  slotId: string,
  payload: Record<string, unknown>
) {
  return httpRequest.patch(
    `/ads/keyframe-slots/${slotId}`,
    payload
  ) as unknown as AdProject
}

export async function generateKeyframeSlot(slotId: string) {
  return httpRequest.post(
    `/ads/keyframe-slots/${slotId}/generate`
  ) as unknown as AdGenerationTask
}

export async function selectKeyframeSlotCandidate(
  slotId: string,
  candidateId: string
) {
  return httpRequest.post(`/ads/keyframe-slots/${slotId}/select`, {
    candidateId,
  }) as unknown as AdProject
}

export async function generateVideo(sceneId: string) {
  return httpRequest.post(
    `/ads/scenes/${sceneId}/video`
  ) as unknown as AdGenerationTask
}

export async function assembleVideo(projectId: string) {
  return httpRequest.post(
    `/ads/projects/${projectId}/final-video/assemble`
  ) as unknown as AdGenerationTask
}

export async function renderPlanPrompt(payload: RenderPlanPromptPayload) {
  return httpRequest.post(
    "/ads/prompt-export/plan-prompt",
    payload
  ) as unknown as RenderPlanPromptResponse
}

export async function renderManualGuide(payload: RenderManualGuidePayload) {
  return httpRequest.post(
    "/ads/prompt-export/manual-guide",
    payload
  ) as unknown as RenderManualGuideResponse
}
