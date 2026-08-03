import { useMemo, useState } from "react"
import { Copy, FileJson, Loader2, Save, Sparkles } from "lucide-react"

import type { AdProject, UpdateAdProjectPayload } from "@/types/ads"
import { useCopyFeedback } from "@/hooks/use-copy-feedback"
import { Button } from "@/components/ui/button"

import { VOICE_LANGUAGE_OPTIONS } from "./constants"
import { TextareaField, TextField } from "./form-fields"

export function ProjectPlanEditor({
  project,
  isSaving,
  isPlanning,
  error,
  onSave,
}: {
  project: AdProject
  isSaving: boolean
  isPlanning: boolean
  error?: string | null
  onSave: (payload: UpdateAdProjectPayload, shouldReplan: boolean) => void
}) {
  const [draft, setDraft] = useState(() => ({
    title: project.title || "",
    brief: project.brief || "",
    productContext: project.productContext || "",
    scriptTimeline: project.scriptTimeline || "",
    characterBrief: project.characterBrief || "",
    locationBrief: project.locationBrief || "",
    aspectRatio: project.aspectRatio || "9:16",
    durationRangeMinSec: project.durationRangeMinSec?.toString() || "",
    durationRangeMaxSec: project.durationRangeMaxSec?.toString() || "",
    voiceLanguage: project.voiceLanguage || "auto",
    voiceNote: project.voiceNote || "",
    overlayEnabled: project.overlayEnabled,
  }))
  const setField = <K extends keyof typeof draft>(
    key: K,
    value: (typeof draft)[K]
  ) => setDraft((current) => ({ ...current, [key]: value }))
  const payload: UpdateAdProjectPayload = {
    title: draft.title,
    brief: draft.brief,
    productContext: draft.productContext,
    scriptTimeline: draft.scriptTimeline,
    characterBrief: draft.characterBrief,
    locationBrief: draft.locationBrief,
    aspectRatio: draft.aspectRatio,
    durationRangeMinSec: draft.durationRangeMinSec
      ? Number(draft.durationRangeMinSec)
      : null,
    durationRangeMaxSec: draft.durationRangeMaxSec
      ? Number(draft.durationRangeMaxSec)
      : null,
    voiceLanguage: draft.voiceLanguage,
    voiceNote: draft.voiceNote,
    overlayEnabled: draft.overlayEnabled,
  }
  const savedPayload: UpdateAdProjectPayload = {
    title: project.title || "",
    brief: project.brief || "",
    productContext: project.productContext || "",
    scriptTimeline: project.scriptTimeline || "",
    characterBrief: project.characterBrief || "",
    locationBrief: project.locationBrief || "",
    aspectRatio: project.aspectRatio,
    durationRangeMinSec: project.durationRangeMinSec ?? null,
    durationRangeMaxSec: project.durationRangeMaxSec ?? null,
    voiceLanguage: project.voiceLanguage,
    voiceNote: project.voiceNote || "",
    overlayEnabled: project.overlayEnabled,
  }
  const dirty = JSON.stringify(payload) !== JSON.stringify(savedPayload)
  const busy = isSaving || isPlanning
  const invalidDuration =
    payload.durationRangeMinSec != null &&
    payload.durationRangeMaxSec != null &&
    payload.durationRangeMinSec > payload.durationRangeMaxSec
  const canSubmit = !invalidDuration && !busy

  return (
    <section className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Plan inputs</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Save edits first. Replan reads these persisted values and keeps the
            same Ads/Flow project.
          </p>
        </div>
        {dirty && (
          <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
            Unsaved changes
          </span>
        )}
      </div>

      <TextField
        label="Title"
        value={draft.title}
        onChange={(value) => setField("title", value)}
      />
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Script / Timeline</span>
        <textarea
          className="min-h-32 rounded-md border border-zinc-300 p-3 leading-5"
          value={draft.scriptTimeline}
          onChange={(event) => setField("scriptTimeline", event.target.value)}
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Brief (optional)</span>
        <textarea
          className="min-h-28 rounded-md border border-zinc-300 p-3 leading-5"
          value={draft.brief}
          onChange={(event) => setField("brief", event.target.value)}
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Product context</span>
        <textarea
          className="min-h-24 rounded-md border border-zinc-300 p-3 leading-5"
          value={draft.productContext}
          onChange={(event) => setField("productContext", event.target.value)}
        />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <TextareaField
          label="Character brief"
          value={draft.characterBrief}
          onChange={(value) => setField("characterBrief", value)}
        />
        <TextareaField
          label="Location brief"
          value={draft.locationBrief}
          onChange={(value) => setField("locationBrief", value)}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Ratio</span>
          <select
            className="h-10 rounded-md border border-zinc-300 px-3"
            value={draft.aspectRatio}
            onChange={(event) => setField("aspectRatio", event.target.value)}
          >
            <option value="9:16">9:16</option>
            <option value="1:1">1:1</option>
            <option value="16:9">16:9</option>
          </select>
        </label>
        <TextField
          label="Min duration (s)"
          type="number"
          value={draft.durationRangeMinSec}
          onChange={(value) => setField("durationRangeMinSec", value)}
        />
        <TextField
          label="Max duration (s)"
          type="number"
          value={draft.durationRangeMaxSec}
          onChange={(value) => setField("durationRangeMaxSec", value)}
        />
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Voice language</span>
          <select
            className="h-10 rounded-md border border-zinc-300 px-3"
            value={draft.voiceLanguage}
            onChange={(event) => setField("voiceLanguage", event.target.value)}
          >
            {VOICE_LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Voice note</span>
        <textarea
          className="min-h-20 rounded-md border border-zinc-300 p-3 leading-5"
          placeholder="Example: Warm, confident, conversational tone; medium pace."
          value={draft.voiceNote}
          onChange={(event) => setField("voiceNote", event.target.value)}
        />
      </label>
      <label className="flex w-fit items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={draft.overlayEnabled}
          onChange={(event) => setField("overlayEnabled", event.target.checked)}
        />
        <span className="font-medium">Enable overlay text</span>
      </label>
      {invalidDuration && (
        <p className="text-sm text-red-600">
          Min duration must be less than or equal to max duration.
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!canSubmit || !dirty}
          onClick={() => onSave(payload, false)}
        >
          {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
          Save Inputs
        </Button>
        <Button
          type="button"
          disabled={!canSubmit}
          onClick={() => onSave(payload, true)}
        >
          {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {project.scenes.length ? "Save & Replan" : "Save & Generate Plan"}
        </Button>
        <p className="text-xs text-zinc-500">
          Replan replaces scenes, char/location specs, slots, and downstream
          scene outputs. Product refs and Flow project remain.
        </p>
      </div>
    </section>
  )
}

export function ImportPlanPanel({
  project,
  isSubmitting,
  error,
  onImport,
}: {
  project: AdProject
  isSubmitting: boolean
  error?: string | null
  onImport: (rawPlan: string) => void
}) {
  const [rawPlan, setRawPlan] = useState("")
  const hasExistingPlan = project.scenes.length > 0

  return (
    <section className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <FileJson className="size-4" />
          Import Plan JSON
        </div>
        {hasExistingPlan && (
          <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
            Rebuilds downstream plan data
          </span>
        )}
      </div>
      <textarea
        className="min-h-72 rounded-md border border-zinc-300 p-3 font-mono text-xs leading-5 text-zinc-900"
        placeholder="Paste the JSON returned by ads_plan.en.txt here"
        value={rawPlan}
        onChange={(event) => setRawPlan(event.target.value)}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          className="w-fit"
          disabled={isSubmitting || !rawPlan.trim()}
          onClick={() => onImport(rawPlan)}
        >
          {isSubmitting ? <Loader2 className="animate-spin" /> : <FileJson />}
          Import Plan
        </Button>
        <p className="text-xs text-zinc-500">
          Uses the same parser and DB persist path as Generate Plan.
        </p>
      </div>
    </section>
  )
}

export function PlanJsonPanel({ project }: { project: AdProject }) {
  const character = project.assets.find((asset) => asset.type === "CHARACTER")
  const location = project.assets.find((asset) => asset.type === "LOCATION")
  const productReferences = project.assets.filter(
    (asset) => asset.type === "PRODUCT"
  )
  const plan = useMemo(
    () => ({
      voiceNote: project.voiceNote || "",
      productAnalysis: project.productAnalysis || {},
      productReferences: productReferences.map((asset) => ({
        id: asset.id,
        name: asset.name,
        kind: asset.kind || "other",
        visualDescription: asset.visualDescription || asset.description || "",
        lockPrompt: asset.lockPrompt || "",
        useWhen: asset.useWhen || "",
      })),
      primaryCharacter: {
        name: character?.name || "Primary character",
        imagePrompt: character?.imagePrompt || "",
        consistencyPrompt: character?.consistencyPrompt || "",
      },
      primaryLocation: {
        name: location?.name || "Primary location",
        imagePrompt: location?.imagePrompt || "",
        consistencyPrompt: location?.consistencyPrompt || "",
      },
      scenes: project.scenes.map((scene) => ({
        sceneIndex: scene.sceneIndex,
        narrativePurpose: scene.narrativePurpose || "",
        title: scene.title,
        durationSec: scene.durationSec,
        visualAction: scene.visualAction,
        productMoment: scene.productMoment || "",
        characterAction: scene.characterAction || "",
        camera: {
          shot: scene.cameraShot || "",
          movement: scene.cameraMovement || "",
          composition: scene.composition || "",
          alternatives: scene.cameraAlternatives || [],
        },
        voiceLines: scene.voiceLines || [],
        actingBeats: scene.actingBeats || [],
        ambientAudio: scene.ambientAudio || "",
        onScreenText: scene.onScreenText || "",
        timingBeats: scene.timingBeats || [],
        keyframePrompts: (scene.keyframePromptSlots || []).map((slot) => ({
          id: slot.stableKey,
          label: slot.label,
          timing: slot.timing || "",
          purpose: slot.purpose,
          prompt: slot.prompt,
          ...(slot.productReferenceIds != null
            ? { productReferenceIds: slot.productReferenceIds }
            : {}),
        })),
        videoPrompt: scene.videoPrompt || "",
        negativeRules: scene.negativeRules || [],
      })),
    }),
    [character, location, productReferences, project]
  )
  const planJson = useMemo(() => JSON.stringify(plan, null, 2), [plan])
  const { copied, copy } = useCopyFeedback()
  const keyframePromptCount = project.scenes.reduce(
    (total, scene) => total + (scene.keyframePromptSlots?.length || 0),
    0
  )
  return (
    <section className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <FileJson className="size-4" />
            <h2 className="text-sm font-semibold">Plan JSON & prompts</h2>
            <span className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-600">
              {project.scenes.length} scenes
            </span>
            <span className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-600">
              {keyframePromptCount} keyframe prompts
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Current persisted plan, rebuilt in import-compatible JSON shape.
            Runtime Flow mappings are added later during generation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {copied && (
            <span className="text-xs font-medium text-emerald-700">Copied</span>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void copy(planJson)}
          >
            <Copy />
            Copy full JSON
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-3 xl:grid-cols-2">
        {/* <details
          open
          className="rounded-md border border-zinc-200 bg-zinc-50 p-3"
        >
          <summary className="cursor-pointer text-sm font-semibold text-zinc-800">
            Reference prompts
          </summary>
          <div className="mt-3 grid gap-3">
            <PromptPreview
              label="Character image prompt"
              value={character?.imagePrompt}
            />
            <PromptPreview
              label="Character consistency prompt"
              value={character?.consistencyPrompt}
            />
            <PromptPreview
              label="Location image prompt"
              value={location?.imagePrompt}
            />
            <PromptPreview
              label="Location consistency prompt"
              value={location?.consistencyPrompt}
            />
            {productReferences.map((asset) => (
              <PromptPreview
                key={asset.id}
                label={`${asset.name} · product lock`}
                value={asset.lockPrompt}
              />
            ))}
          </div>
        </details> */}

        <details
          open
          className="rounded-md border border-zinc-200 bg-zinc-50 p-3"
        >
          <summary className="cursor-pointer text-sm font-semibold text-zinc-800">
            Scene generation prompts
          </summary>
          <div className="mt-3 grid gap-2">
            {project.scenes.map((scene) => (
              <details
                key={scene.id}
                className="rounded-md border border-zinc-200 bg-white p-2"
              >
                <summary className="cursor-pointer text-xs font-semibold text-zinc-700">
                  Scene {scene.sceneIndex}: {scene.title} ·{" "}
                  {scene.keyframePromptSlots?.length || 0} keyframes
                </summary>
                <div className="mt-2 grid gap-2">
                  <PromptPreview
                    label="Stored video prompt"
                    value={scene.videoPrompt}
                  />
                  {(scene.keyframePromptSlots || []).map((slot) => (
                    <PromptPreview
                      key={slot.id}
                      label={`Keyframe · ${slot.stableKey} · ${slot.label}`}
                      value={slot.prompt}
                    />
                  ))}
                </div>
              </details>
            ))}
          </div>
        </details>
      </div>

      <details className="rounded-md border border-zinc-800 bg-zinc-950 p-3 text-zinc-100">
        <summary className="cursor-pointer text-sm font-semibold">
          Full plan JSON
        </summary>
        <pre className="mt-3 max-h-[42rem] overflow-auto whitespace-pre-wrap break-words rounded bg-black/30 p-3 font-mono text-xs leading-5 text-zinc-200">
          {planJson}
        </pre>
      </details>
    </section>
  )
}

function PromptPreview({
  label,
  value,
}: {
  label: string
  value?: string | null
}) {
  const { copied, copy } = useCopyFeedback()
  if (!value?.trim()) return null

  return (
    <div className="grid gap-2 rounded-md border border-zinc-200 bg-white p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-zinc-700">{label}</span>
        <button
          className="inline-flex h-7 items-center gap-1 rounded border border-zinc-200 px-2 text-xs text-zinc-600 hover:bg-zinc-100"
          type="button"
          onClick={() => void copy(value)}
        >
          <Copy className="size-3" />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-words rounded bg-zinc-50 p-2 font-mono text-xs leading-5 text-zinc-700">
        {value}
      </pre>
    </div>
  )
}
