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
  kind?: string | null
  visualDescription?: string | null
  lockPrompt?: string | null
  useWhen?: string | null
  isPrimary: boolean
  imagePrompt?: string | null
  consistencyPrompt?: string | null
  imageUrl?: string | null
  candidateImages?: string[] | null
  isLocked: boolean
  status: "PENDING" | "READY" | "FAILED"
}

export type AdVoiceLine = {
  speaker: string
  timing?: string | null
  actionState?: string | null
  emotion?: string | null
  delivery?: string | null
  line: string
}

export type AdKeyframeCandidate = {
  id: string
  slotId: string
  storageKey: string
  imageUrl: string
  mimeType?: string | null
  warning?: string | null
}

export type AdKeyframePromptSlot = {
  id: string
  sceneId: string
  slotIndex: number
  stableKey: string
  label: string
  timing?: string | null
  purpose: string
  prompt: string
  productReferenceIds?: string[] | null
  stale: boolean
  selectedCandidateId?: string | null
  selectedCandidate?: AdKeyframeCandidate | null
  candidates: AdKeyframeCandidate[]
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
  voiceLines?: AdVoiceLine[] | null
  ambientAudio?: string | null
  onScreenText?: string | null
  keyframePrompt?: string | null
  keyframePromptStale: boolean
  keyframePromptSlots: AdKeyframePromptSlot[]
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
  targetDurationSec?: number
  voiceLanguage: string
  overlayEnabled: boolean
  productImage?: File
  productImages: File[]
}
