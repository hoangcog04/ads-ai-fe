import { useEffect, useMemo, useRef, useState } from "react"
import {
  isAdTaskRunning,
  useGenerateKeyframeSlotMutation,
  useSelectKeyframeSlotCandidateMutation,
  useSetKeyframeSlotInVideoMutation,
  useUpdateKeyframePromptSlotMutation,
  useUpdateSceneDurationMutation,
  useUpdateSceneMutation,
  useUpdateSceneVideoPromptMutation,
  useUploadKeyframeSlotImageMutation,
} from "@/services/use-ads"
import {
  Camera,
  Copy,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Upload,
  Video,
} from "lucide-react"

import type {
  AdActingBeat,
  AdAsset,
  AdGenerationTask,
  AdKeyframePromptSlot,
  AdProject,
  AdScene,
  AdVoiceLine,
  KeyframeBatchEnqueueResult,
} from "@/types/ads"
import { resolveMediaUrl } from "@/lib/media-url"
import { useCopyFeedback } from "@/hooks/use-copy-feedback"
import { Button } from "@/components/ui/button"

import { SCENE_DURATION_OPTIONS } from "./constants"
import { TextareaField, TextField } from "./form-fields"
import { MediaPreview } from "./media-preview"
import { TaskBadge } from "./task-badge"
import { readMutationError } from "./utils"

export function KeyframesSceneList({
  project,
  latestTaskByTarget,
  onReplanScene,
  onGenerateMissingKeyframes,
  onRegenerateAllKeyframes,
  isBatchingKeyframes,
  keyframeBatchResult,
  keyframeBatchError,
  onGenerateVideo,
}: {
  project: AdProject
  latestTaskByTarget: Map<string, AdGenerationTask>
  onReplanScene: (sceneId: string, instruction: string) => void
  onGenerateMissingKeyframes: () => void
  onRegenerateAllKeyframes: () => void
  isBatchingKeyframes: boolean
  keyframeBatchResult?: KeyframeBatchEnqueueResult
  keyframeBatchError: string | null
  onGenerateVideo: (sceneId: string) => void
}) {
  if (project.scenes.length === 0) {
    return (
      <section className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-sm">
        No scenes yet
      </section>
    )
  }

  const keyframeSlots = project.scenes.flatMap(
    (scene) => scene.keyframePromptSlots ?? []
  )
  const queueableMissingCount = keyframeSlots.filter((slot) => {
    const task = latestTaskByTarget.get(`AdKeyframePromptSlot:${slot.id}`)
    return !isAdTaskRunning(task) && (slot.candidates?.length ?? 0) === 0
  }).length
  const queueableRegenerateCount = keyframeSlots.filter((slot) => {
    const task = latestTaskByTarget.get(`AdKeyframePromptSlot:${slot.id}`)
    return !isAdTaskRunning(task)
  }).length

  return (
    <section className="grid gap-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
        <div>
          <h2 className="text-sm font-semibold">Batch keyframes</h2>
          <p className="text-xs text-zinc-500">
            Generate Missing queues only slots without candidates. Regenerate
            All keeps existing candidates and adds a new one.
          </p>
          {keyframeBatchResult && (
            <p
              className={`mt-1 text-xs ${
                keyframeBatchResult.failedCount > 0
                  ? "text-amber-700"
                  : "text-emerald-700"
              }`}
            >
              Queued {keyframeBatchResult.queuedCount}; skipped{" "}
              {keyframeBatchResult.skippedActiveCount} active
              {keyframeBatchResult.skippedExistingCount > 0
                ? ` and ${keyframeBatchResult.skippedExistingCount} already generated`
                : ""}
              {keyframeBatchResult.failedCount > 0
                ? `; ${keyframeBatchResult.failedCount} failed to enqueue`
                : ""}
              .
            </p>
          )}
          {keyframeBatchError && (
            <p className="mt-1 text-xs text-red-700">{keyframeBatchError}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={isBatchingKeyframes || queueableMissingCount === 0}
            onClick={onGenerateMissingKeyframes}
          >
            {isBatchingKeyframes ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Sparkles />
            )}
            Generate Missing ({queueableMissingCount})
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isBatchingKeyframes || queueableRegenerateCount === 0}
            onClick={() => {
              if (
                window.confirm(
                  `Queue a new candidate for ${queueableRegenerateCount} keyframe slot${queueableRegenerateCount === 1 ? "" : "s"}? Existing candidates will be kept.`
                )
              ) {
                onRegenerateAllKeyframes()
              }
            }}
          >
            {isBatchingKeyframes ? (
              <Loader2 className="animate-spin" />
            ) : (
              <RefreshCw />
            )}
            Regenerate All ({queueableRegenerateCount})
          </Button>
        </div>
      </section>

      {project.scenes.map((scene) => (
        <KeyframeSceneCard
          key={scene.id}
          scene={scene}
          productReferences={project.assets.filter(
            (asset) => asset.type === "PRODUCT"
          )}
          overlayEnabled={project.overlayEnabled}
          latestTaskByTarget={latestTaskByTarget}
          sceneTask={latestTaskByTarget.get(`AdScene:${scene.id}`)}
          onReplanScene={onReplanScene}
          onGenerateVideo={onGenerateVideo}
        />
      ))}
    </section>
  )
}

function KeyframeSceneCard({
  scene,
  productReferences,
  overlayEnabled,
  latestTaskByTarget,
  sceneTask,
  onReplanScene,
  onGenerateVideo,
}: {
  scene: AdScene
  productReferences: AdAsset[]
  overlayEnabled: boolean
  latestTaskByTarget: Map<string, AdGenerationTask>
  sceneTask?: AdGenerationTask
  onReplanScene: (sceneId: string, instruction: string) => void
  onGenerateVideo: (sceneId: string) => void
}) {
  const [replanInstruction, setReplanInstruction] = useState("")
  const persistedDraft = useMemo(
    () => ({
      visualAction: scene.visualAction,
      productMoment: scene.productMoment || "",
      cameraShot: scene.cameraShot || "",
      cameraMovement: scene.cameraMovement || "",
      voiceLines: normalizeVoiceLines(scene.voiceLines),
      actingBeats: normalizeActingBeats(scene.actingBeats),
      ambientAudio: scene.ambientAudio || "",
      onScreenText: scene.onScreenText || "",
      negativeRules: scene.negativeRules || [],
    }),
    [
      scene.visualAction,
      scene.productMoment,
      scene.cameraShot,
      scene.cameraMovement,
      scene.voiceLines,
      scene.actingBeats,
      scene.ambientAudio,
      scene.onScreenText,
      scene.negativeRules,
    ]
  )
  const [draft, setDraft] = useState(persistedDraft)
  const [videoPromptDraft, setVideoPromptDraft] = useState(
    scene.videoPrompt || ""
  )

  useEffect(() => {
    setDraft(persistedDraft)
  }, [persistedDraft])

  useEffect(() => {
    setVideoPromptDraft(scene.videoPrompt || "")
  }, [scene.id, scene.videoPrompt])

  const updateMutation = useUpdateSceneMutation(scene.id, () => draft)
  const durationMutation = useUpdateSceneDurationMutation(scene.id)
  const videoPromptMutation = useUpdateSceneVideoPromptMutation(
    scene.id,
    () => videoPromptDraft
  )
  const running = isAdTaskRunning(sceneTask)
  const sceneDirty = JSON.stringify(draft) !== JSON.stringify(persistedDraft)
  const videoPromptDirty = videoPromptDraft !== (scene.videoPrompt || "")
  const keyframePromptSlots = scene.keyframePromptSlots ?? []
  const includedSlots = keyframePromptSlots.filter(
    (slot) => slot.includeInVideo !== false
  )
  const excludedCount = keyframePromptSlots.length - includedSlots.length
  const selectedCount = includedSlots.filter(
    (slot) => !!slot.selectedCandidate
  ).length
  const canGenerateVideo =
    includedSlots.length > 0 && selectedCount === includedSlots.length

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-md bg-zinc-900 text-xs font-semibold text-white">
            {scene.sceneIndex}
          </span>
          <h2 className="flex h-9 min-w-0 items-center text-sm font-semibold">
            {scene.title}
          </h2>
          {sceneTask && <TaskBadge task={sceneTask} />}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-zinc-600">
            Duration
            <select
              className="h-8 rounded-md border border-zinc-300 bg-white px-2 text-xs text-zinc-800"
              value={scene.durationSec}
              disabled={
                running ||
                durationMutation.isPending ||
                updateMutation.isPending
              }
              onChange={(event) =>
                durationMutation.mutate(Number(event.target.value))
              }
            >
              {!SCENE_DURATION_OPTIONS.some(
                (durationSec) => durationSec === scene.durationSec
              ) && (
                <option value={scene.durationSec}>
                  {scene.durationSec}s (legacy)
                </option>
              )}
              {SCENE_DURATION_OPTIONS.map((durationSec) => (
                <option key={durationSec} value={durationSec}>
                  {durationSec}s
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {durationMutation.error && (
        <p className="mt-2 rounded-md bg-red-50 p-2 text-xs text-red-700">
          {readMutationError(durationMutation.error)}
        </p>
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]">
        <section className="grid content-start gap-3 rounded-md border border-zinc-200 p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">Scene setup</h3>
              <p className="text-xs text-zinc-500">
                Save this section before regenerating a keyframe.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {sceneDirty && (
                <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                  Unsaved changes
                </span>
              )}
              <Button
                size="sm"
                variant="outline"
                disabled={
                  updateMutation.isPending ||
                  durationMutation.isPending ||
                  !sceneDirty
                }
                onClick={() => updateMutation.mutate()}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Save />
                )}
                Save Scene Setup{sceneDirty ? " *" : ""}
              </Button>
            </div>
          </div>
          {updateMutation.error && (
            <p className="rounded-md bg-red-50 p-2 text-xs text-red-700">
              {readMutationError(updateMutation.error)}
            </p>
          )}
          <VoiceLinesEditor
            voiceLines={draft.voiceLines}
            onChange={(voiceLines) =>
              setDraft((prev) => ({ ...prev, voiceLines }))
            }
          />
          <details className="rounded-md border border-zinc-200 p-2">
            <summary className="cursor-pointer text-xs font-semibold text-zinc-700">
              Scene direction
            </summary>
            <div className="mt-2 grid gap-3 border-t border-zinc-100 pt-2">
              <label className="grid gap-1 text-xs font-medium text-zinc-600">
                Action
                <textarea
                  className="min-h-24 rounded-md border border-zinc-300 p-2 text-sm leading-5 text-zinc-900"
                  value={draft.visualAction}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      visualAction: event.target.value,
                    }))
                  }
                />
              </label>
              <TextField
                label="Product moment"
                value={draft.productMoment}
                onChange={(productMoment) =>
                  setDraft((prev) => ({ ...prev, productMoment }))
                }
              />
              <TextField
                label={overlayEnabled ? "Overlay" : "Overlay disabled"}
                value={draft.onScreenText}
                onChange={(onScreenText) =>
                  setDraft((prev) => ({ ...prev, onScreenText }))
                }
                disabled={!overlayEnabled}
              />
            </div>
          </details>
          <details className="hidden rounded-md border border-zinc-200 p-2">
            <summary className="cursor-pointer text-xs font-semibold text-zinc-700">
              Camera
            </summary>
            <div className="mt-2 grid gap-3 border-t border-zinc-100 pt-2">
              <TextField
                label="Camera shot"
                value={draft.cameraShot}
                onChange={(cameraShot) =>
                  setDraft((prev) => ({ ...prev, cameraShot }))
                }
              />
              <TextField
                label="Camera movement"
                value={draft.cameraMovement}
                onChange={(cameraMovement) =>
                  setDraft((prev) => ({ ...prev, cameraMovement }))
                }
              />
              {!!scene.cameraAlternatives?.length && (
                <label className="grid gap-1 text-xs font-medium text-zinc-600">
                  Suggested camera
                  <select
                    className="h-9 rounded-md border border-zinc-300 px-2 text-sm text-zinc-900"
                    value={draft.cameraShot}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        cameraShot: event.target.value,
                      }))
                    }
                  >
                    <option value={draft.cameraShot}>{draft.cameraShot}</option>
                    {scene.cameraAlternatives.map((camera) => (
                      <option key={camera} value={camera}>
                        {camera}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </details>

          <ActingBeatsEditor
            actingBeats={draft.actingBeats}
            onChange={(actingBeats) =>
              setDraft((prev) => ({ ...prev, actingBeats }))
            }
          />
          <details className="rounded-md border border-zinc-200 p-2">
            <summary className="cursor-pointer text-xs font-semibold text-zinc-700">
              Audio & constraints
            </summary>
            <div className="mt-2 grid gap-3 border-t border-zinc-100 pt-2">
              <TextareaField
                label="Ambient audio"
                value={draft.ambientAudio}
                onChange={(ambientAudio) =>
                  setDraft((prev) => ({ ...prev, ambientAudio }))
                }
              />
              <TextareaField
                label="Negative rules (one per line)"
                value={draft.negativeRules.join("\n")}
                onChange={(value) =>
                  setDraft((prev) => ({
                    ...prev,
                    negativeRules: value
                      .split("\n")
                      .map((rule) => rule.trim())
                      .filter(Boolean),
                  }))
                }
              />
            </div>
          </details>
          <details className="rounded-md border border-amber-200 bg-amber-50 p-2">
            <summary className="cursor-pointer text-xs font-semibold text-amber-800">
              Replan scene (replaces keyframe slots and candidates)
            </summary>
            <div className="mt-2 grid gap-2">
              <input
                className="h-9 rounded-md border border-amber-300 bg-white px-2 text-sm text-zinc-900"
                placeholder="Instruction for the new scene plan"
                value={replanInstruction}
                onChange={(event) => setReplanInstruction(event.target.value)}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={running || !replanInstruction.trim()}
                onClick={() => {
                  onReplanScene(scene.id, replanInstruction)
                  setReplanInstruction("")
                }}
              >
                <Sparkles />
                Replan Scene
              </Button>
            </div>
          </details>
        </section>

        <section className="grid content-start gap-3 rounded-md border border-zinc-200 p-3 xl:grid-cols-[minmax(0,3fr)_minmax(360px,2fr)]">
          <KeyframeSlots
            scene={{ ...scene, keyframePromptSlots }}
            productReferences={productReferences}
            latestTaskByTarget={latestTaskByTarget}
          />

          <div className="grid content-start gap-3">
            <section className="grid content-start gap-2 rounded-md border border-zinc-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-zinc-800">
                  Video prompt
                </h3>
                {scene.videoPromptStale && (
                  <span className="shrink-0 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium leading-4 text-amber-700">
                    Needs confirmation
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500">
                Direct-write Flow input. Save after editing or to confirm a
                stale prompt.
              </p>
              <textarea
                className="min-h-36 rounded-md border border-zinc-300 p-2 text-xs leading-5 text-zinc-900"
                value={videoPromptDraft}
                onChange={(event) => setVideoPromptDraft(event.target.value)}
              />
              <Button
                className="w-fit"
                size="sm"
                variant="outline"
                disabled={
                  videoPromptMutation.isPending ||
                  (!videoPromptDirty && !scene.videoPromptStale)
                }
                onClick={() => videoPromptMutation.mutate()}
              >
                {videoPromptMutation.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Save />
                )}
                Save Video Prompt
                {videoPromptDirty
                  ? " *"
                  : scene.videoPromptStale
                    ? " (confirm)"
                    : ""}
              </Button>
              {videoPromptMutation.error && (
                <p className="rounded-md bg-red-50 p-2 text-xs text-red-700">
                  {readMutationError(videoPromptMutation.error)}
                </p>
              )}
            </section>

            <section className="grid content-start gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">Video output</h3>
                  <p className="text-xs text-zinc-500">
                    {selectedCount}/{includedSlots.length} included keyframes
                    selected
                    {excludedCount > 0 ? ` · ${excludedCount} excluded` : ""}
                  </p>
                </div>
                {!canGenerateVideo && (
                  <span className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700">
                    {includedSlots.length === 0
                      ? "Enable at least one keyframe"
                      : "Select every enabled keyframe first"}
                  </span>
                )}
              </div>
              <Button
                size="sm"
                disabled={
                  running || durationMutation.isPending || !canGenerateVideo
                }
                onClick={() => onGenerateVideo(scene.id)}
              >
                <Video />
                Generate Video
              </Button>
              {scene.videoError && (
                <p className="rounded-md bg-red-50 p-2 text-xs leading-4 text-red-700">
                  {scene.videoError}
                </p>
              )}
              {scene.videoUrl && (
                <video
                  src={resolveMediaUrl(scene.videoUrl)}
                  controls
                  className="aspect-video w-full rounded-md bg-black object-contain"
                />
              )}
            </section>
          </div>
        </section>
      </div>
    </article>
  )
}

function VoiceLinesEditor({
  voiceLines,
  onChange,
}: {
  voiceLines: AdVoiceLine[]
  onChange: (voiceLines: AdVoiceLine[]) => void
}) {
  const updateLine = (index: number, patch: Partial<AdVoiceLine>) => {
    onChange(
      voiceLines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line
      )
    )
  }
  return (
    <details open className="rounded-md border border-zinc-200 p-2">
      <summary className="cursor-pointer text-xs font-semibold text-zinc-700">
        Voice lines ({voiceLines.length})
      </summary>
      <div className="mt-2 grid gap-2 border-t border-zinc-100 pt-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-zinc-500">Dialogue and delivery</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onChange([
                ...voiceLines,
                {
                  speaker: "Primary actor",
                  timing: "",
                  actionState: "",
                  emotion: "",
                  delivery: "",
                  line: "",
                },
              ])
            }
          >
            <Plus />
            Add Line
          </Button>
        </div>
        {voiceLines.map((voiceLine, index) => (
          <div key={index} className="grid gap-2 rounded-md bg-zinc-50 p-2">
            <TextareaField
              label="Exact line"
              value={voiceLine.line}
              onChange={(line) => updateLine(index, { line })}
            />
            <details className="rounded-md border border-zinc-200 bg-white p-2">
              <summary className="cursor-pointer text-xs font-semibold text-zinc-700">
                More details
                {voiceLine.speaker ? ` · ${voiceLine.speaker}` : ""}
                {voiceLine.timing ? ` · ${voiceLine.timing}` : ""}
              </summary>
              <div className="mt-2 grid gap-2 border-t border-zinc-100 pt-2">
                <TextField
                  label="Speaker"
                  value={voiceLine.speaker}
                  onChange={(speaker) => updateLine(index, { speaker })}
                />
                <TextField
                  label="Timing"
                  value={voiceLine.timing || ""}
                  onChange={(timing) => updateLine(index, { timing })}
                />
                <TextField
                  label="Emotion"
                  value={voiceLine.emotion || ""}
                  onChange={(emotion) => updateLine(index, { emotion })}
                />
                <TextField
                  label="Action state"
                  value={voiceLine.actionState || ""}
                  onChange={(actionState) => updateLine(index, { actionState })}
                />
                <TextField
                  label="Delivery"
                  value={voiceLine.delivery || ""}
                  onChange={(delivery) => updateLine(index, { delivery })}
                />
              </div>
            </details>
          </div>
        ))}
      </div>
    </details>
  )
}

function ActingBeatsEditor({
  actingBeats,
  onChange,
}: {
  actingBeats: AdActingBeat[]
  onChange: (actingBeats: AdActingBeat[]) => void
}) {
  const updateBeat = (index: number, patch: Partial<AdActingBeat>) => {
    onChange(
      actingBeats.map((beat, beatIndex) =>
        beatIndex === index ? { ...beat, ...patch } : beat
      )
    )
  }

  return (
    <details className="rounded-md border border-zinc-200 p-2">
      <summary className="cursor-pointer text-xs font-semibold text-zinc-700">
        Acting beats ({actingBeats.length})
      </summary>
      <div className="mt-2 grid gap-2 border-t border-zinc-100 pt-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-zinc-500">
            Performance by time range
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onChange([
                ...actingBeats,
                {
                  timing: "",
                  emotion: "",
                  facialExpression: "",
                  bodyLanguage: "",
                  microAction: "",
                  gaze: "",
                },
              ])
            }
          >
            <Plus />
            Add Beat
          </Button>
        </div>
        {actingBeats.map((beat, index) => (
          <div key={index} className="grid gap-2 rounded-md bg-zinc-50 p-2">
            <div className="grid gap-2">
              <TextField
                label="Timing"
                value={beat.timing || ""}
                onChange={(timing) => updateBeat(index, { timing })}
              />
              <TextField
                label="Emotion"
                value={beat.emotion || ""}
                onChange={(emotion) => updateBeat(index, { emotion })}
              />
            </div>
            <TextareaField
              label="Facial expression"
              value={beat.facialExpression || ""}
              onChange={(facialExpression) =>
                updateBeat(index, { facialExpression })
              }
            />
            <TextareaField
              label="Body language"
              value={beat.bodyLanguage || ""}
              onChange={(bodyLanguage) => updateBeat(index, { bodyLanguage })}
            />
            <TextField
              label="Micro action"
              value={beat.microAction || ""}
              onChange={(microAction) => updateBeat(index, { microAction })}
            />
            <TextField
              label="Gaze"
              value={beat.gaze || ""}
              onChange={(gaze) => updateBeat(index, { gaze })}
            />
          </div>
        ))}
      </div>
    </details>
  )
}

function KeyframeSlots({
  scene,
  productReferences,
  latestTaskByTarget,
}: {
  scene: AdScene
  productReferences: AdAsset[]
  latestTaskByTarget: Map<string, AdGenerationTask>
}) {
  const keyframePromptSlots = scene.keyframePromptSlots ?? []
  if (!keyframePromptSlots.length) {
    return (
      <div className="rounded-md border border-zinc-200 p-3">
        <p className="text-sm text-zinc-500">
          No keyframe slots available. Replan this scene to create them.
        </p>
      </div>
    )
  }

  return (
    <section className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Keyframe slots</h3>
        <span className="text-xs text-zinc-500">
          {keyframePromptSlots.length} refs
        </span>
      </div>
      <div className="grid items-stretch gap-3">
        {keyframePromptSlots.map((slot) => (
          <KeyframeSlotCard
            key={slot.id}
            slot={slot}
            productReferences={productReferences}
            task={latestTaskByTarget.get(`AdKeyframePromptSlot:${slot.id}`)}
          />
        ))}
      </div>
    </section>
  )
}

function KeyframeSlotCard({
  slot,
  productReferences,
  task,
}: {
  slot: AdKeyframePromptSlot
  productReferences: AdAsset[]
  task?: AdGenerationTask
}) {
  const [draft, setDraft] = useState({
    label: slot.label,
    timing: slot.timing || "",
    purpose: slot.purpose,
    prompt: slot.prompt,
    productReferenceIds: normalizeProductReferenceIds(
      slot.productReferenceIds,
      productReferences
    ),
  })
  const { copied: copiedStableKey, copy } = useCopyFeedback()
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const updateMutation = useUpdateKeyframePromptSlotMutation(
    slot.id,
    () => draft
  )
  const includeMutation = useSetKeyframeSlotInVideoMutation(slot.id)
  const generateMutation = useGenerateKeyframeSlotMutation(slot.id)
  const uploadMutation = useUploadKeyframeSlotImageMutation(slot.id)
  const selectMutation = useSelectKeyframeSlotCandidateMutation(slot.id)
  const running =
    isAdTaskRunning(task) ||
    generateMutation.isPending ||
    uploadMutation.isPending
  const dirty =
    JSON.stringify(draft) !==
    JSON.stringify({
      label: slot.label,
      timing: slot.timing || "",
      purpose: slot.purpose,
      prompt: slot.prompt,
      productReferenceIds: normalizeProductReferenceIds(
        slot.productReferenceIds,
        productReferences
      ),
    })

  return (
    <div className="flex h-full min-w-0 flex-col gap-2 rounded-md border border-zinc-200 p-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-xs font-semibold text-zinc-600">
            Ref {slot.slotIndex + 1}
          </span>
          <code className="max-w-48 truncate rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-700">
            {slot.stableKey}
          </code>
          <button
            className="inline-flex size-6 shrink-0 items-center justify-center rounded border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
            type="button"
            title="Copy keyframe ID"
            aria-label={`Copy keyframe ID ${slot.stableKey}`}
            onClick={() => void copy(slot.stableKey)}
          >
            <Copy className="size-3.5" />
          </button>
          {copiedStableKey && (
            <span className="text-xs text-emerald-700">Copied</span>
          )}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="flex h-9 items-center gap-2 text-xs font-medium text-zinc-700">
            <input
              type="checkbox"
              checked={slot.includeInVideo !== false}
              disabled={includeMutation.isPending || updateMutation.isPending}
              onChange={(event) => includeMutation.mutate(event.target.checked)}
            />
            Use in video
          </label>
          {slot.stale && (
            <span className="inline-flex h-9 items-center rounded-md bg-amber-50 px-2 text-xs font-medium text-amber-700">
              Needs keyframe
            </span>
          )}
          {dirty && (
            <span className="inline-flex h-9 items-center rounded-md bg-amber-50 px-2 text-xs font-medium text-amber-700">
              Unsaved
            </span>
          )}
          {task && <TaskBadge task={task} />}
        </div>
      </div>
      <details className="min-w-0 rounded-md border border-zinc-200 p-2">
        <summary className="cursor-pointer truncate text-xs font-semibold text-zinc-700">
          Slot details · {draft.label || "Untitled"} ·{" "}
          {draft.timing || "No timing"}
        </summary>
        <div className="mt-2 grid min-w-0 gap-2 border-t border-zinc-100 pt-2">
          <TextField
            label="Label"
            value={draft.label}
            onChange={(label) => setDraft((prev) => ({ ...prev, label }))}
          />
          <TextField
            label="Timing"
            value={draft.timing}
            onChange={(timing) => setDraft((prev) => ({ ...prev, timing }))}
          />
          <TextareaField
            label="Purpose"
            value={draft.purpose}
            onChange={(purpose) => setDraft((prev) => ({ ...prev, purpose }))}
          />
        </div>
      </details>
      <label className="grid min-w-0 gap-1 text-xs font-medium text-zinc-600">
        Prompt
        <textarea
          className="min-h-32 w-full min-w-0 rounded-md border border-zinc-300 p-2 text-sm leading-5 text-zinc-900"
          value={draft.prompt}
          onChange={(event) =>
            setDraft((prev) => ({ ...prev, prompt: event.target.value }))
          }
        />
      </label>
      <details open className="rounded-md border border-zinc-200 p-2">
        <summary className="cursor-pointer text-xs font-semibold text-zinc-700">
          Product references ({draft.productReferenceIds.length}/
          {productReferences.length})
        </summary>
        <fieldset className="mt-2 grid gap-2 border-0 border-t border-zinc-100 p-0 pt-2">
          {productReferences.length ? (
            <div className="grid max-h-40 gap-x-3 overflow-y-auto pr-1 sm:grid-cols-2">
              {productReferences.map((reference) => {
                const selected = draft.productReferenceIds.includes(
                  reference.id
                )
                return (
                  <label
                    key={reference.id}
                    className="flex min-h-9 items-center gap-2 border-b border-zinc-100 py-1 text-sm text-zinc-800"
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(event) => {
                        setDraft((prev) => ({
                          ...prev,
                          productReferenceIds: event.target.checked
                            ? [...prev.productReferenceIds, reference.id]
                            : prev.productReferenceIds.filter(
                                (id) => id !== reference.id
                              ),
                        }))
                      }}
                    />
                    <span className="min-w-0 truncate">{reference.name}</span>
                    {reference.kind && (
                      <span className="ml-auto text-xs text-zinc-400">
                        {reference.kind}
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
          ) : (
            <span className="text-xs text-zinc-500">No product references</span>
          )}
        </fieldset>
      </details>
      {!!slot.candidates?.length && (
        <div className="grid grid-cols-4 gap-2">
          {slot.candidates.map((candidate) => (
            <div
              key={candidate.id}
              className={`grid gap-1 rounded border p-1 ${
                slot.selectedCandidateId === candidate.id
                  ? "border-zinc-900"
                  : "border-zinc-200"
              }`}
            >
              <MediaPreview
                src={candidate.imageUrl}
                alt={`${slot.label} candidate`}
                label={`${slot.label} candidate`}
                thumbnailClassName="aspect-square h-auto w-full"
              />
              <button
                type="button"
                className="rounded bg-zinc-100 px-1 py-1 text-[10px] font-medium text-zinc-700 hover:bg-zinc-200 disabled:opacity-50"
                disabled={
                  selectMutation.isPending ||
                  slot.selectedCandidateId === candidate.id
                }
                onClick={() => selectMutation.mutate(candidate.id)}
              >
                {slot.selectedCandidateId === candidate.id
                  ? "Selected"
                  : "Select"}
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-auto grid grid-cols-3 gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={
            updateMutation.isPending || includeMutation.isPending || !dirty
          }
          onClick={() => updateMutation.mutate()}
        >
          {updateMutation.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Save />
          )}
          Save Slot{dirty ? " *" : ""}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={running}
          onClick={() => generateMutation.mutate()}
        >
          {running ? <Loader2 className="animate-spin" /> : <Camera />}
          Generate
        </Button>
        <input
          ref={uploadInputRef}
          className="hidden"
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.currentTarget.value = ""
            if (file) uploadMutation.mutate(file)
          }}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={running}
          onClick={() => uploadInputRef.current?.click()}
        >
          {uploadMutation.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Upload />
          )}
          Upload
        </Button>
      </div>
      {slot.selectedCandidate?.warning && (
        <p className="rounded-md bg-amber-50 p-2 text-xs leading-4 text-amber-700">
          {slot.selectedCandidate.warning}
        </p>
      )}
      {(updateMutation.error ||
        includeMutation.error ||
        uploadMutation.error) && (
        <p className="rounded-md bg-red-50 p-2 text-xs leading-4 text-red-700">
          {readMutationError(
            updateMutation.error ||
              includeMutation.error ||
              uploadMutation.error
          )}
        </p>
      )}
    </div>
  )
}

function normalizeProductReferenceIds(
  productReferenceIds: string[] | null | undefined,
  productReferences: AdAsset[]
) {
  const selected = new Set(productReferenceIds || [])
  return productReferences
    .filter(
      (reference) => selected.has(reference.id) || selected.has(reference.name)
    )
    .map((reference) => reference.id)
}

function normalizeVoiceLines(voiceLines?: AdVoiceLine[] | null): AdVoiceLine[] {
  if (voiceLines?.length) return voiceLines
  return [
    {
      speaker: "Primary actor",
      timing: "",
      actionState: "",
      emotion: "",
      delivery: "",
      line: "",
    },
  ]
}

function normalizeActingBeats(
  actingBeats?: AdActingBeat[] | null
): AdActingBeat[] {
  if (actingBeats?.length) return actingBeats
  return [
    {
      timing: "",
      emotion: "",
      facialExpression: "",
      bodyLanguage: "",
      microAction: "",
      gaze: "",
    },
  ]
}
