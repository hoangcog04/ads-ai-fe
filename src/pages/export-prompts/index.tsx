import { useMemo, useState } from "react"
import type { ReactNode } from "react"
import { useMutation } from "@tanstack/react-query"
import { AlertCircle, Copy, FileJson, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { renderManualGuide, renderPlanPrompt } from "@/services/ads"
import type {
  ManualPromptBlock,
  PromptExportProductReference,
  RenderManualGuideResponse,
  RenderPlanPromptResponse,
} from "@/types/ads"

const PRODUCT_KIND_OPTIONS = [
  "app_screen",
  "physical_product",
  "packaging",
  "logo",
  "usage_photo",
  "before_after",
  "other",
]

const VOICE_LANGUAGE_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "vi", label: "Vietnamese" },
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
]

const DURATION_RANGE_OPTIONS = [
  { value: "", label: "Auto" },
  { value: "15-20", label: "15-20s" },
  { value: "20-30", label: "20-30s" },
  { value: "30-40", label: "30-40s" },
  { value: "40-60", label: "40-60s" },
]

type ProductImageDraft = {
  file: File
  previewUrl: string
  name: string
  kind: string
  visualDescription: string
}

function ExportPromptsPage() {
  const [title, setTitle] = useState("")
  const [brief, setBrief] = useState("")
  const [scriptTimeline, setScriptTimeline] = useState("")
  const [characterBrief, setCharacterBrief] = useState("")
  const [locationBrief, setLocationBrief] = useState("")
  const [aspectRatio, setAspectRatio] = useState("9:16")
  const [voiceLanguage, setVoiceLanguage] = useState("auto")
  const [durationRange, setDurationRange] = useState("30-40")
  const [overlayEnabled, setOverlayEnabled] = useState(false)
  const [productRefs, setProductRefs] = useState<ProductImageDraft[]>([])
  const [rawPlan, setRawPlan] = useState("")
  const [planResult, setPlanResult] = useState<RenderPlanPromptResponse | null>(
    null,
  )
  const [guideResult, setGuideResult] =
    useState<RenderManualGuideResponse | null>(null)

  const productReferences = useMemo(
    () =>
      productRefs.map((ref, index): PromptExportProductReference => ({
        id: ref.name || `i_product_${index + 1}`,
        name: ref.name || `i_product_${index + 1}`,
        kind: ref.kind || "other",
        visualDescription: ref.visualDescription,
        isPrimary: index === 0,
      })),
    [productRefs],
  )

  const [durationRangeMinSec, durationRangeMaxSec] =
    splitDurationRange(durationRange)

  const planMutation = useMutation({
    mutationFn: () =>
      renderPlanPrompt({
        title,
        brief,
        scriptTimeline,
        characterBrief,
        locationBrief,
        aspectRatio,
        voiceLanguage,
        durationRangeMinSec,
        durationRangeMaxSec,
        overlayEnabled,
        productReferences,
      }),
    onSuccess: (result) => {
      setPlanResult(result)
      setGuideResult(null)
    },
  })

  const guideMutation = useMutation({
    mutationFn: () =>
      renderManualGuide({
        rawPlan,
        aspectRatio,
        voiceLanguage,
        overlayEnabled,
        productReferences,
      }),
    onSuccess: setGuideResult,
  })

  const handleProductFilesChange = (files: FileList | null) => {
    for (const ref of productRefs) URL.revokeObjectURL(ref.previewUrl)
    const nextRefs = Array.from(files ?? []).map((file, index) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      name: sanitizeProductRefName(file.name, index),
      kind: inferProductKind(file.name),
      visualDescription: "",
    }))
    setProductRefs(nextRefs)
    setPlanResult(null)
    setGuideResult(null)
  }

  const updateProductRef = (
    index: number,
    patch: Partial<ProductImageDraft>,
  ) => {
    setProductRefs((refs) =>
      refs.map((ref, refIndex) =>
        refIndex === index ? { ...ref, ...patch } : ref,
      ),
    )
    setPlanResult(null)
    setGuideResult(null)
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950">
      <div className="mx-auto grid max-w-7xl gap-4">
        <header className="border-b border-zinc-200 pb-3">
          <h1 className="text-xl font-semibold">Export Prompts</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Render manual demo prompts from the same backend templates used by
            the ads pipeline.
          </p>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
          <form
            className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
            onSubmit={(event) => {
              event.preventDefault()
              planMutation.mutate()
            }}
          >
            <TextField label="Title" value={title} onChange={setTitle} />
            <TextareaField
              label="Brief"
              value={brief}
              onChange={setBrief}
              minHeight="min-h-28"
              required
            />
            <TextareaField
              label="Script / Timeline"
              value={scriptTimeline}
              onChange={setScriptTimeline}
              minHeight="min-h-32"
            />
            <div className="grid gap-3 md:grid-cols-2">
              <TextareaField
                label="Character brief"
                value={characterBrief}
                onChange={setCharacterBrief}
              />
              <TextareaField
                label="Location brief"
                value={locationBrief}
                onChange={setLocationBrief}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <SelectField
                label="Ratio"
                value={aspectRatio}
                onChange={setAspectRatio}
                options={[
                  { value: "9:16", label: "9:16" },
                  { value: "1:1", label: "1:1" },
                  { value: "16:9", label: "16:9" },
                ]}
              />
              <SelectField
                label="Voice language"
                value={voiceLanguage}
                onChange={setVoiceLanguage}
                options={VOICE_LANGUAGE_OPTIONS}
              />
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Product refs</span>
                <input
                  className="h-10 rounded-md border border-zinc-300 px-3 py-2"
                  required
                  multiple
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    handleProductFilesChange(event.target.files)
                  }
                />
              </label>
            </div>

            {productRefs.length > 0 && (
              <div className="grid gap-3">
                {productRefs.map((ref, index) => (
                  <div
                    key={`${ref.file.name}-${index}`}
                    className="grid gap-3 rounded-md border border-zinc-200 p-3 md:grid-cols-[120px_1fr]"
                  >
                    <img
                      src={ref.previewUrl}
                      alt={ref.name}
                      className="aspect-[9/12] w-full rounded-md object-cover"
                    />
                    <div className="grid gap-2">
                      <div className="grid gap-2 sm:grid-cols-[1fr_150px]">
                        <TextField
                          label="Image id/name"
                          value={ref.name}
                          onChange={(name) => updateProductRef(index, { name })}
                        />
                        <SelectField
                          label="Kind"
                          value={ref.kind}
                          onChange={(kind) => updateProductRef(index, { kind })}
                          options={PRODUCT_KIND_OPTIONS.map((kind) => ({
                            value: kind,
                            label: kind,
                          }))}
                        />
                      </div>
                      <TextareaField
                        label="Image context"
                        value={ref.visualDescription}
                        onChange={(visualDescription) =>
                          updateProductRef(index, { visualDescription })
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                label="Duration range"
                value={durationRange}
                onChange={setDurationRange}
                options={DURATION_RANGE_OPTIONS}
              />
            </div>
            <label className="flex w-fit items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={overlayEnabled}
                onChange={(event) => setOverlayEnabled(event.target.checked)}
              />
              <span className="font-medium">Enable overlay text</span>
            </label>
            {readMutationError(planMutation.error) && (
              <ErrorText error={readMutationError(planMutation.error)} />
            )}
            <Button
              className="w-fit"
              disabled={
                planMutation.isPending ||
                !brief.trim() ||
                productRefs.length === 0
              }
            >
              {planMutation.isPending ? (
                <Sparkles className="animate-spin" />
              ) : (
                <Sparkles />
              )}
              Render Plan Prompt
            </Button>
          </form>

          <section className="grid content-start gap-4">
            <GuideBox title="Manual Flow">
              <ol className="grid list-decimal gap-1 pl-4 text-sm leading-5 text-zinc-600">
                <li>Upload the product refs to GPT/Flow with the same names.</li>
                <li>Copy the rendered plan prompt into GPT.</li>
                <li>Paste the returned JSON below.</li>
                <li>Copy reference, keyframe, and video prompts in order.</li>
              </ol>
            </GuideBox>
            {planResult && (
              <GuideBox title="Upload Guide">
                <div className="grid gap-2">
                  {planResult.uploadGuide.map((item, index) => (
                    <div
                      key={`${item.name}-${index}`}
                      className="rounded-md bg-zinc-50 p-2 text-xs leading-4"
                    >
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-zinc-500">{item.kind}</div>
                      <div className="mt-1 text-zinc-700">{item.context}</div>
                    </div>
                  ))}
                </div>
              </GuideBox>
            )}
          </section>
        </section>

        {planResult && (
          <PromptTextarea
            title="Plan Prompt"
            description="Copy this into GPT. This prompt is rendered from ads_plan.en.txt."
            value={planResult.prompt}
          />
        )}

        <section className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <FileJson className="size-4" />
            Paste Plan JSON
          </div>
          <textarea
            className="min-h-72 rounded-md border border-zinc-300 p-3 font-mono text-xs leading-5 text-zinc-900"
            placeholder="Paste the JSON returned by the plan prompt"
            value={rawPlan}
            onChange={(event) => {
              setRawPlan(event.target.value)
              setGuideResult(null)
            }}
          />
          {readMutationError(guideMutation.error) && (
            <ErrorText error={readMutationError(guideMutation.error)} />
          )}
          <Button
            className="w-fit"
            disabled={guideMutation.isPending || !rawPlan.trim()}
            onClick={() => guideMutation.mutate()}
          >
            {guideMutation.isPending ? (
              <FileJson className="animate-spin" />
            ) : (
              <FileJson />
            )}
            Render Manual Guide
          </Button>
        </section>

        {guideResult && <ManualGuide guide={guideResult} />}
      </div>
    </main>
  )
}

function ManualGuide({ guide }: { guide: RenderManualGuideResponse }) {
  return (
    <section className="grid gap-4">
      <GuideBox title="Plan Summary">
        <div className="grid gap-2 text-sm text-zinc-700 sm:grid-cols-3">
          <SummaryItem label="Product refs" value={guide.summary.productReferenceCount} />
          <SummaryItem label="Scenes" value={guide.summary.sceneCount} />
          <SummaryItem label="Keyframes" value={guide.summary.keyframePromptCount} />
          <SummaryItem label="Videos" value={guide.summary.videoPromptCount} />
          <SummaryItem label="Character" value={guide.summary.characterName} />
          <SummaryItem label="Location" value={guide.summary.locationName} />
        </div>
      </GuideBox>
      {!!guide.warnings.length && (
        <GuideBox title="Warnings">
          <div className="grid gap-2">
            {guide.warnings.map((warning, index) => (
              <p
                key={index}
                className="flex gap-2 rounded-md bg-amber-50 p-2 text-sm leading-5 text-amber-800"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {warning}
              </p>
            ))}
          </div>
        </GuideBox>
      )}
      <PromptBlockList title="Reference Prompts" blocks={guide.referencePrompts} />
      <PromptBlockList title="Keyframe Prompts" blocks={guide.keyframePrompts} />
      <PromptBlockList title="Video Prompts" blocks={guide.videoPrompts} />
    </section>
  )
}

function PromptBlockList({
  title,
  blocks,
}: {
  title: string
  blocks: ManualPromptBlock[]
}) {
  return (
    <section className="grid gap-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {blocks.map((block, index) => (
        <PromptBlock key={`${block.outputName}-${index}`} block={block} />
      ))}
    </section>
  )
}

function PromptBlock({ block }: { block: ManualPromptBlock }) {
  return (
    <section className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">
            {block.sceneIndex ? `Scene ${block.sceneIndex} · ` : ""}
            {block.slotIndex ? `Slot ${block.slotIndex} · ` : ""}
            {block.label || block.title || block.kind || block.outputName}
          </h3>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
            {block.mediaInputs?.length ? (
              <span>MEDIA INPUTS: {block.mediaInputs.join(" + ")}</span>
            ) : null}
            {block.durationSec ? <span>DURATION: {block.durationSec}s</span> : null}
            <span>OUTPUT NAME: {block.outputName}</span>
          </div>
        </div>
        <CopyButton value={block.prompt} />
      </div>
      <textarea
        className="min-h-72 rounded-md border border-zinc-300 p-3 font-mono text-xs leading-5 text-zinc-900"
        readOnly
        value={block.prompt}
      />
    </section>
  )
}

function PromptTextarea({
  title,
  description,
  value,
}: {
  title: string
  description: string
  value: string
}) {
  return (
    <section className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-1 text-xs text-zinc-500">{description}</p>
        </div>
        <CopyButton value={value} />
      </div>
      <textarea
        className="min-h-96 rounded-md border border-zinc-300 p-3 font-mono text-xs leading-5 text-zinc-900"
        readOnly
        value={value}
      />
    </section>
  )
}

function GuideBox({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function SummaryItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md bg-zinc-50 p-2">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  )
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      size="sm"
      variant="outline"
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1000)
        })
      }}
    >
      <Copy />
      {copied ? "Copied" : "Copy"}
    </Button>
  )
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-zinc-600">
      {label}
      <input
        className="h-9 rounded-md border border-zinc-300 px-2 text-sm text-zinc-900"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function TextareaField({
  label,
  value,
  onChange,
  minHeight = "min-h-20",
  required = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  minHeight?: string
  required?: boolean
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-zinc-600">
      {label}
      <textarea
        className={`${minHeight} rounded-md border border-zinc-300 p-2 text-sm leading-5 text-zinc-900`}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-zinc-600">
      {label}
      <select
        className="h-9 rounded-md border border-zinc-300 px-2 text-sm text-zinc-900"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value || "auto"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function ErrorText({ error }: { error: string | null }) {
  if (!error) return null
  return <p className="text-sm text-red-600">{error}</p>
}

function sanitizeProductRefName(fileName: string, index: number) {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "")
  const normalized = withoutExtension
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
  return normalized || `i_product_${index + 1}`
}

function inferProductKind(fileName: string) {
  const normalized = fileName.toLowerCase()
  if (normalized.includes("logo")) return "logo"
  if (
    normalized.includes("screen") ||
    normalized.includes("scan") ||
    normalized.includes("home") ||
    normalized.includes("result") ||
    normalized.includes("phone")
  ) {
    return "app_screen"
  }
  return "other"
}

function splitDurationRange(value: string) {
  const [min, max] = value.split("-")
  return [min || "", max || ""]
}

function readMutationError(error: unknown) {
  if (!error) return null
  if (error instanceof Error) return error.message
  return "Request failed"
}

export default ExportPromptsPage
