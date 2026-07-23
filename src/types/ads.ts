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
  imagePrompt?: string | null
  consistencyPrompt?: string | null
  imageUrl?: string | null
  candidateImages?: string[] | null
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

export type AdActingBeat = {
  timing?: string | null
  emotion?: string | null
  facialExpression?: string | null
  bodyLanguage?: string | null
  microAction?: string | null
  gaze?: string | null
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
  includeInVideo: boolean
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
  visualAction: string
  productMoment?: string | null
  characterAction?: string | null
  cameraShot?: string | null
  cameraMovement?: string | null
  composition?: string | null
  cameraAlternatives?: string[] | null
  voiceLines?: AdVoiceLine[] | null
  actingBeats?: AdActingBeat[] | null
  ambientAudio?: string | null
  onScreenText?: string | null
  keyframePrompt?: string | null
  keyframePromptStale: boolean
  keyframePromptSlots: AdKeyframePromptSlot[]
  videoPrompt?: string | null
  videoPromptStale: boolean
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
  errorCode?: string | null
  errorMessage?: string | null
  bullJobId?: string | null
  createdAt: string
}

export type AdFlowMedia = {
  id: string
  assetId?: string | null
  kind: string
  status: string
  flowAssetName: string
  localStorageKey?: string | null
}

export type AdProject = {
  id: string
  title?: string | null
  brief: string
  productContext?: string | null
  scriptTimeline?: string | null
  characterBrief?: string | null
  locationBrief?: string | null
  aspectRatio: string
  durationRangeMinSec?: number | null
  durationRangeMaxSec?: number | null
  voiceLanguage: string
  voiceNote?: string | null
  overlayEnabled: boolean
  status: string
  productAnalysis?: Record<string, unknown> | null
  finalVideoUrl?: string | null
  assets: AdAsset[]
  scenes: AdScene[]
  tasks: AdGenerationTask[]
  flowMedia: AdFlowMedia[]
}

export type AdProjectListItem = {
  id: string
  title?: string | null
  brief: string
  aspectRatio: string
  voiceLanguage: string
  overlayEnabled: boolean
  status: string
  createdAt: string
  updatedAt: string
  productImageUrl?: string | null
  productReferenceCount: number
  sceneCount: number
  taskCount: number
}

export type CreateAdProjectPayload = {
  brief: string
  title?: string
  productContext?: string
  scriptTimeline?: string
  characterBrief?: string
  locationBrief?: string
  aspectRatio: string
  durationRangeMinSec?: string
  durationRangeMaxSec?: string
  voiceLanguage: string
  voiceNote?: string
  overlayEnabled: boolean
  productImage?: File
  productImages: File[]
  productReferencesMeta?: Array<{
    name?: string
    kind?: string
    visualDescription?: string
    lockPrompt?: string
    useWhen?: string
  }>
}

export type UpdateAdProjectPayload = {
  title?: string
  brief?: string
  productContext?: string
  scriptTimeline?: string
  characterBrief?: string
  locationBrief?: string
  aspectRatio?: string
  durationRangeMinSec?: number | null
  durationRangeMaxSec?: number | null
  voiceLanguage?: string
  voiceNote?: string
  overlayEnabled?: boolean
}

export type PromptExportProductReference = {
  id?: string
  name?: string
  kind?: string
  visualDescription?: string
  lockPrompt?: string
  useWhen?: string
}

export type RenderPlanPromptPayload = {
  brief: string
  title?: string
  productContext?: string
  scriptTimeline?: string
  characterBrief?: string
  locationBrief?: string
  aspectRatio?: string
  voiceLanguage?: string
  voiceNote?: string
  overlayEnabled?: boolean
  durationRangeMinSec?: string
  durationRangeMaxSec?: string
  manualRunId?: string
  productReferences: PromptExportProductReference[]
}

export type RenderPlanPromptResponse = {
  prompt: string
  productContext: string
  productReferencesJson: string
  uploadGuide: Array<{
    name?: string
    flowName?: string
    kind?: string
    context?: string
  }>
}

export type RenderManualGuidePayload = {
  rawPlan: string
  aspectRatio?: string
  voiceLanguage?: string
  voiceNote?: string
  overlayEnabled?: boolean
  manualRunId?: string
  productReferences: PromptExportProductReference[]
}

export type ManualPromptBlock = {
  label?: string
  kind?: string
  sceneIndex?: number
  slotIndex?: number
  title?: string
  mediaInputs?: string[]
  outputName: string
  durationSec?: number
  prompt: string
}

export type RenderManualGuideResponse = {
  summary: {
    productReferenceCount: number
    sceneCount: number
    keyframePromptCount: number
    videoPromptCount: number
    characterName: string
    locationName: string
  }
  referencePrompts: ManualPromptBlock[]
  keyframePrompts: ManualPromptBlock[]
  videoPrompts: ManualPromptBlock[]
  warnings: string[]
}
