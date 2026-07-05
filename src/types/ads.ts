export type AdTaskStatus =
  | "QUEUED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELED"

export type AdAssetType = "PRODUCT" | "CHARACTER" | "LOCATION"

export type AdAsset = {
  id: string
  type: AdAssetType
  name: string
  description?: string | null
  imagePrompt?: string | null
  consistencyPrompt?: string | null
  imageUrl?: string | null
  candidateImages?: string[] | null
  isLocked: boolean
  status: "PENDING" | "READY" | "FAILED"
}

export type AdScene = {
  id: string
  sceneIndex: number
  narrativePurpose?: string | null
  title: string
  durationSec: number
  sceneGoal?: string | null
  visualAction: string
  productMoment?: string | null
  characterAction?: string | null
  locationUse?: string | null
  cameraShot?: string | null
  cameraMovement?: string | null
  composition?: string | null
  cameraAlternatives?: string[] | null
  voiceLine?: string | null
  onScreenText?: string | null
  keyframePrompt?: string | null
  keyframePromptStale: boolean
  finalVideoPrompt?: string | null
  finalVideoPromptStale: boolean
  negativeRules?: string[] | null
  keyframeImageUrl?: string | null
  keyframeWarning?: string | null
  keyframeCandidates?: string[] | null
  videoUrl?: string | null
  videoError?: string | null
  status: string
  updatedAt: string
}

export type AdGenerationTask = {
  id: string
  projectId: string
  assetId?: string | null
  sceneId?: string | null
  type: string
  targetType: string
  targetId: string
  status: AdTaskStatus
  progress: number
  errorMessage?: string | null
  createdAt: string
}

export type AdProject = {
  id: string
  title?: string | null
  brief: string
  productContext?: string | null
  aspectRatio: string
  targetDurationSec: number
  voiceLanguage: string
  overlayEnabled: boolean
  status: string
  productAnalysis?: Record<string, unknown> | null
  finalVideoUrl?: string | null
  assets: AdAsset[]
  scenes: AdScene[]
  tasks: AdGenerationTask[]
}

export type CreateAdProjectPayload = {
  brief: string
  title?: string
  productContext?: string
  aspectRatio: string
  targetDurationSec: number
  voiceLanguage: string
  overlayEnabled: boolean
  productImage: File
}
