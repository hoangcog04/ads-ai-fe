import { useEffect, useRef, useState } from "react"
import { Film, ImageIcon, Loader2, Trash2, Upload } from "lucide-react"

import type { AdProjectListItem } from "@/types/ads"
import { resolveMediaUrl } from "@/lib/media-url"
import { Button } from "@/components/ui/button"

import {
  DURATION_RANGE_OPTIONS,
  PRODUCT_KIND_OPTIONS,
  VOICE_LANGUAGE_OPTIONS,
} from "./constants"
import { TextareaField, TextField } from "./form-fields"
import { MediaPreview } from "./media-preview"
import {
  buildProductContext,
  inferProductKind,
  sanitizeProductRefName,
  splitDurationRange,
} from "./utils"

type ProductImageDraft = {
  file: File
  previewUrl: string
  name: string
  kind: string
  visualDescription: string
}

export function ProjectListPanel({
  projects,
  isLoading,
  onOpen,
  deletingProjectId,
  onDelete,
}: {
  projects: AdProjectListItem[]
  isLoading: boolean
  onOpen: (projectId: string) => void
  deletingProjectId?: string
  onDelete: (projectId: string, title?: string | null) => void
}) {
  return (
    <section className="grid content-start gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Film className="size-4" />
          Projects
        </div>
        <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-600">
          DB
        </span>
      </div>
      {isLoading && (
        <p className="inline-flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="size-4 animate-spin" />
          Loading projects...
        </p>
      )}
      {!isLoading && projects.length === 0 && (
        <p className="text-sm leading-5 text-zinc-500">
          No ads projects yet. Create one from the form.
        </p>
      )}
      <div className="grid gap-2">
        {projects.map((project) => (
          <div
            key={project.id}
            className="flex items-start gap-1 rounded-md border border-zinc-200 p-1 transition hover:border-zinc-900"
          >
            <button
              className="grid min-w-0 flex-1 grid-cols-[56px_minmax(0,1fr)] gap-3 rounded p-1 text-left"
              onClick={() => onOpen(project.id)}
            >
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md bg-zinc-100">
                {project.productImageUrl ? (
                  <img
                    src={resolveMediaUrl(project.productImageUrl)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon className="size-5 text-zinc-400" />
                )}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">
                  {project.title || "Untitled ads project"}
                </div>
                <div className="mt-1 line-clamp-2 text-xs leading-4 text-zinc-500">
                  {project.brief}
                </div>
                <div className="mt-2 flex flex-wrap gap-1 text-[11px] text-zinc-500">
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5">
                    {project.sceneCount} scenes
                  </span>
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5">
                    {project.productReferenceCount} refs
                  </span>
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5">
                    {project.status}
                  </span>
                </div>
              </div>
            </button>
            <button
              type="button"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded text-zinc-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
              disabled={deletingProjectId === project.id}
              title={`Delete ${project.title || "project"}`}
              aria-label={`Delete ${project.title || "project"}`}
              onClick={() => onDelete(project.id, project.title)}
            >
              {deletingProjectId === project.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

export function BriefPanel({
  isSubmitting,
  error,
  onCreate,
}: {
  isSubmitting: boolean
  error?: string | null
  onCreate: (payload: {
    brief?: string
    title?: string
    productContext?: string
    productReferencesMeta?: Array<{
      name?: string
      kind?: string
      visualDescription?: string
    }>
    scriptTimeline?: string
    characterBrief?: string
    locationBrief?: string
    aspectRatio: string
    durationRangeMinSec?: string
    durationRangeMaxSec?: string
    voiceLanguage: string
    voiceNote?: string
    overlayEnabled: boolean
    productImages: File[]
  }) => void
}) {
  const [brief, setBrief] = useState("")
  const [title, setTitle] = useState("")
  const [scriptTimeline, setScriptTimeline] = useState("")
  const [characterBrief, setCharacterBrief] = useState("")
  const [locationBrief, setLocationBrief] = useState("")
  const [aspectRatio, setAspectRatio] = useState("9:16")
  const [durationRange, setDurationRange] = useState("")
  const [voiceLanguage, setVoiceLanguage] = useState("auto")
  const [voiceNote, setVoiceNote] = useState("")
  const [overlayEnabled, setOverlayEnabled] = useState(false)
  const [productRefs, setProductRefs] = useState<ProductImageDraft[]>([])
  const productRefsRef = useRef<ProductImageDraft[]>([])

  useEffect(() => {
    productRefsRef.current = productRefs
  }, [productRefs])

  useEffect(() => {
    return () => {
      productRefsRef.current.forEach((ref) =>
        URL.revokeObjectURL(ref.previewUrl)
      )
    }
  }, [])

  const handleProductFilesChange = (files: FileList | null) => {
    productRefs.forEach((ref) => URL.revokeObjectURL(ref.previewUrl))
    setProductRefs(
      Array.from(files ?? []).map((file, index) => ({
        file,
        previewUrl: URL.createObjectURL(file),
        name: sanitizeProductRefName(file.name, index),
        kind: inferProductKind(file.name),
        visualDescription: "",
      }))
    )
  }

  const updateProductRef = (
    index: number,
    patch: Partial<Omit<ProductImageDraft, "file" | "previewUrl">>
  ) => {
    setProductRefs((prev) =>
      prev.map((ref, refIndex) =>
        refIndex === index ? { ...ref, ...patch } : ref
      )
    )
  }
  const removeProductRef = (index: number) => {
    setProductRefs((prev) => {
      const removed = prev[index]
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((_, refIndex) => refIndex !== index)
    })
  }

  return (
    <form
      className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault()
        if (productRefs.length === 0) return
        const productReferencesMeta = productRefs.map((ref) => ({
          name: ref.name,
          kind: ref.kind,
          visualDescription: ref.visualDescription,
        }))
        const [durationRangeMinSec, durationRangeMaxSec] =
          splitDurationRange(durationRange)
        onCreate({
          brief,
          title,
          productContext: buildProductContext(productReferencesMeta),
          productReferencesMeta,
          scriptTimeline,
          characterBrief,
          locationBrief,
          aspectRatio,
          durationRangeMinSec,
          durationRangeMaxSec,
          voiceLanguage,
          voiceNote,
          overlayEnabled,
          productImages: productRefs.map((ref) => ref.file),
        })
      }}
    >
      <div className="flex items-center gap-2">
        <Film className="size-5" />
        <h1 className="text-lg font-semibold">Ads Video Workspace</h1>
      </div>
      <TextField label="Title" value={title} onChange={setTitle} />

      <label className="grid gap-1 text-sm">
        <span className="font-medium">Script / Timeline</span>
        <textarea
          className="min-h-32 rounded-md border border-zinc-300 p-3 leading-5"
          value={scriptTimeline}
          onChange={(event) => setScriptTimeline(event.target.value)}
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Brief (optional)</span>
        <textarea
          className="min-h-28 rounded-md border border-zinc-300 p-3 leading-5"
          value={brief}
          onChange={(event) => setBrief(event.target.value)}
        />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Character brief</span>
          <textarea
            className="min-h-20 rounded-md border border-zinc-300 p-3 leading-5"
            value={characterBrief}
            onChange={(event) => setCharacterBrief(event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Location brief</span>
          <textarea
            className="min-h-20 rounded-md border border-zinc-300 p-3 leading-5"
            value={locationBrief}
            onChange={(event) => setLocationBrief(event.target.value)}
          />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Ratio</span>
          <select
            className="h-10 rounded-md border border-zinc-300 px-3"
            value={aspectRatio}
            onChange={(event) => setAspectRatio(event.target.value)}
          >
            <option value="9:16">9:16</option>
            <option value="1:1">1:1</option>
            <option value="16:9">16:9</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Voice language</span>
          <select
            className="h-10 rounded-md border border-zinc-300 px-3"
            value={voiceLanguage}
            onChange={(event) => setVoiceLanguage(event.target.value)}
          >
            {VOICE_LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Product refs</span>
          <input
            className="h-10 rounded-md border border-zinc-300 px-3 py-2"
            required
            multiple
            type="file"
            accept="image/*"
            onChange={(event) => handleProductFilesChange(event.target.files)}
          />
        </label>
      </div>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Voice note</span>
        <textarea
          className="min-h-20 rounded-md border border-zinc-300 p-3 leading-5"
          placeholder="Example: Warm, confident, conversational tone; medium pace."
          value={voiceNote}
          onChange={(event) => setVoiceNote(event.target.value)}
        />
      </label>
      {productRefs.length > 0 && (
        <div className="grid gap-3">
          {productRefs.map((ref, index) => (
            <div
              key={`${ref.file.name}-${index}`}
              className="grid gap-3 rounded-md border border-zinc-200 p-3 md:grid-cols-[120px_1fr]"
            >
              <MediaPreview
                src={ref.previewUrl}
                alt={ref.name}
                label={`Product reference ${index + 1}`}
                thumbnailClassName="mx-auto aspect-[9/12] h-auto w-[90%]"
              />
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-zinc-600">
                    Product reference {index + 1}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    onClick={() => removeProductRef(index)}
                  >
                    <Trash2 />
                    Remove
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_150px]">
                  <TextField
                    label="Image id/name"
                    value={ref.name}
                    onChange={(name) => updateProductRef(index, { name })}
                  />
                  <label className="grid gap-1 text-xs font-medium text-zinc-600">
                    Kind
                    <select
                      className="h-9 rounded-md border border-zinc-300 px-2 text-sm text-zinc-900"
                      value={ref.kind}
                      onChange={(event) =>
                        updateProductRef(index, { kind: event.target.value })
                      }
                    >
                      {PRODUCT_KIND_OPTIONS.map((kind) => (
                        <option key={kind} value={kind}>
                          {kind}
                        </option>
                      ))}
                    </select>
                  </label>
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
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Duration range</span>
          <select
            className="h-10 rounded-md border border-zinc-300 px-3"
            value={durationRange}
            onChange={(event) => setDurationRange(event.target.value)}
          >
            {DURATION_RANGE_OPTIONS.map((option) => (
              <option key={option.value || "auto"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex w-fit items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={overlayEnabled}
          onChange={(event) => setOverlayEnabled(event.target.checked)}
        />
        <span className="font-medium">Enable overlay text</span>
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button
        className="w-fit"
        disabled={isSubmitting || !brief || productRefs.length === 0}
      >
        {isSubmitting ? <Loader2 className="animate-spin" /> : <Upload />}
        Create Project
      </Button>
    </form>
  )
}
