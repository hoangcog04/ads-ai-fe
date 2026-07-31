import { useEffect, useState } from "react"
import {
  isAdTaskRunning,
  useAddProductReferenceMutation,
  useDeleteProductReferenceMutation,
  useUpdateProductReferenceMutation,
  useUpdateReferenceAssetMutation,
} from "@/services/use-ads"
import {
  ImageIcon,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Upload,
} from "lucide-react"

import type { AdAsset, AdGenerationTask } from "@/types/ads"
import { Button } from "@/components/ui/button"

import { PRODUCT_KIND_OPTIONS } from "./constants"
import { TextareaField, TextField } from "./form-fields"
import { MediaPreview } from "./media-preview"
import { TaskBadge } from "./task-badge"
import {
  inferProductKind,
  readMutationError,
  sanitizeProductRefName,
} from "./utils"

export function ProductReferencesPanel({
  projectId,
  assets,
  task,
  isSubmitting,
  canUpload,
  showFlowUpload = true,
  allowDelete = false,
  onUpload,
}: {
  projectId: string
  assets: AdAsset[]
  task?: AdGenerationTask
  isSubmitting: boolean
  canUpload: boolean
  showFlowUpload?: boolean
  allowDelete?: boolean
  onUpload: () => void
}) {
  const [newFile, setNewFile] = useState<File | null>(null)
  const [newName, setNewName] = useState("")
  const [newKind, setNewKind] = useState("other")
  const [newVisualDescription, setNewVisualDescription] = useState("")
  const addMutation = useAddProductReferenceMutation(projectId, () => {
    if (!newFile) throw new Error("Product image required")
    return {
      productImage: newFile,
      name: newName || sanitizeProductRefName(newFile.name, assets.length),
      kind: newKind,
      visualDescription: newVisualDescription,
    }
  })
  const uploadRunning = isAdTaskRunning(task)

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ImageIcon className="size-4" />
          Product References
        </div>
        {task && <TaskBadge task={task} />}
      </div>
      {showFlowUpload && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md bg-zinc-50 p-2">
          <p className="text-xs text-zinc-500">
            Upload product, character, and location together when all are ready.
          </p>
          <Button
            className="w-fit"
            size="sm"
            variant="outline"
            disabled={!canUpload || uploadRunning || isSubmitting}
            onClick={onUpload}
          >
            {uploadRunning || isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Upload />
            )}
            Upload all refs to Flow
          </Button>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {assets.map((asset) => (
          <ProductReferenceCard
            key={asset.id}
            asset={asset}
            allowDelete={allowDelete}
          />
        ))}
      </div>
      <details className="mt-3 rounded-md border border-zinc-200 p-2">
        <summary className="cursor-pointer text-xs font-semibold text-zinc-700">
          Add product reference
        </summary>
        <div className="mt-2 grid gap-2 border-t border-zinc-100 pt-2">
          <input
            className="h-9 rounded-md border border-zinc-300 px-2 text-sm"
            placeholder="New reference name"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
          <select
            className="h-9 rounded-md border border-zinc-300 px-2 text-sm"
            value={newKind}
            onChange={(event) => setNewKind(event.target.value)}
          >
            {PRODUCT_KIND_OPTIONS.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
          <input
            className="h-9 rounded-md border border-zinc-300 px-2 py-1 text-sm"
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null
              setNewFile(file)
              if (file && !newName) {
                setNewName(sanitizeProductRefName(file.name, assets.length))
                setNewKind(inferProductKind(file.name))
              }
            }}
          />
          <TextareaField
            label="Image context"
            value={newVisualDescription}
            onChange={setNewVisualDescription}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={!newFile || addMutation.isPending}
            onClick={() =>
              addMutation.mutate(undefined, {
                onSuccess: () => {
                  setNewFile(null)
                  setNewName("")
                  setNewKind("other")
                  setNewVisualDescription("")
                },
              })
            }
          >
            {addMutation.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Plus />
            )}
            Add Reference
          </Button>
        </div>
      </details>
    </section>
  )
}

function ProductReferenceCard({
  asset,
  allowDelete,
}: {
  asset: AdAsset
  allowDelete: boolean
}) {
  const [draft, setDraft] = useState({
    name: asset.name || "",
    kind: asset.kind || "other",
    visualDescription: asset.visualDescription || asset.description || "",
    lockPrompt: asset.lockPrompt || "",
    useWhen: asset.useWhen || "",
  })
  const updateMutation = useUpdateProductReferenceMutation(
    asset.id,
    () => draft
  )
  const deleteMutation = useDeleteProductReferenceMutation(asset.id)
  const dirty =
    JSON.stringify(draft) !==
    JSON.stringify({
      name: asset.name || "",
      kind: asset.kind || "other",
      visualDescription: asset.visualDescription || asset.description || "",
      lockPrompt: asset.lockPrompt || "",
      useWhen: asset.useWhen || "",
    })

  return (
    <div className="grid gap-2 rounded-md border border-zinc-200 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-semibold text-zinc-800">
          {asset.name}
        </span>
        {allowDelete && (
          <Button
            type="button"
            size="sm"
            variant="default"
            disabled={deleteMutation.isPending || updateMutation.isPending}
            onClick={() => {
              const confirmed = window.confirm(
                `Delete product reference "${asset.name}"? Existing keyframes will be kept but marked stale.`
              )
              if (confirmed) deleteMutation.mutate()
            }}
          >
            {deleteMutation.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Trash2 />
            )}
            Delete
          </Button>
        )}
      </div>
      <MediaPreview
        src={asset.imageUrl}
        alt={asset.name}
        label={asset.name}
        thumbnailClassName="mx-auto aspect-[9/12] h-auto w-[90%]"
      />
      {deleteMutation.error && (
        <p className="rounded-md bg-red-50 p-2 text-xs text-red-700">
          {readMutationError(deleteMutation.error)}
        </p>
      )}
      <details className="rounded-md border border-zinc-200 p-2">
        <summary className="cursor-pointer text-xs font-semibold text-zinc-700">
          Edit metadata{dirty ? " *" : ""}
        </summary>
        <div className="mt-2 grid gap-2 border-t border-zinc-100 pt-2">
          <TextField
            label="Name"
            value={draft.name}
            onChange={(name) => setDraft((prev) => ({ ...prev, name }))}
          />
          <label className="grid gap-1 text-xs font-medium text-zinc-600">
            Kind
            <select
              className="h-9 rounded-md border border-zinc-300 px-2 text-sm text-zinc-900"
              value={draft.kind}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, kind: event.target.value }))
              }
            >
              {PRODUCT_KIND_OPTIONS.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
          </label>
          <TextareaField
            label="Visual description"
            value={draft.visualDescription}
            onChange={(visualDescription) =>
              setDraft((prev) => ({ ...prev, visualDescription }))
            }
          />
          <TextareaField
            label="Lock prompt"
            value={draft.lockPrompt}
            onChange={(lockPrompt) =>
              setDraft((prev) => ({ ...prev, lockPrompt }))
            }
          />
          <TextareaField
            label="Use when"
            value={draft.useWhen}
            onChange={(useWhen) => setDraft((prev) => ({ ...prev, useWhen }))}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={
              updateMutation.isPending || deleteMutation.isPending || !dirty
            }
            onClick={() => updateMutation.mutate()}
          >
            {updateMutation.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Save />
            )}
            Save Ref{dirty ? " *" : ""}
          </Button>
          {updateMutation.error && (
            <p className="rounded-md bg-red-50 p-2 text-xs text-red-700">
              {readMutationError(updateMutation.error)}
            </p>
          )}
        </div>
      </details>
    </div>
  )
}

export function ReferenceCard({
  label,
  asset,
  task,
  isSubmitting,
  isUploadSubmitting,
  onGenerate,
  onUpload,
}: {
  label: string
  asset?: AdAsset
  task?: AdGenerationTask
  isSubmitting: boolean
  isUploadSubmitting: boolean
  onGenerate: (assetId: string) => void
  onUpload: (assetId: string, file: File) => void
}) {
  const running = isAdTaskRunning(task)
  const lowerLabel = label.toLowerCase()
  const descriptionLabel = lowerLabel.includes("location")
    ? "Location description"
    : "Character description"
  const lockLabel = lowerLabel.includes("location")
    ? "Location lock"
    : "Identity lock"
  const [draft, setDraft] = useState({
    name: asset?.name || "",
    description: asset?.description || "",
    imagePrompt: asset?.imagePrompt || "",
    consistencyPrompt: asset?.consistencyPrompt || "",
  })
  useEffect(() => {
    setDraft({
      name: asset?.name || "",
      description: asset?.description || "",
      imagePrompt: asset?.imagePrompt || "",
      consistencyPrompt: asset?.consistencyPrompt || "",
    })
  }, [
    asset?.id,
    asset?.name,
    asset?.description,
    asset?.imagePrompt,
    asset?.consistencyPrompt,
  ])
  const updateMutation = useUpdateReferenceAssetMutation(asset?.id, () => draft)
  const dirty =
    JSON.stringify(draft) !==
    JSON.stringify({
      name: asset?.name || "",
      description: asset?.description || "",
      imagePrompt: asset?.imagePrompt || "",
      consistencyPrompt: asset?.consistencyPrompt || "",
    })

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ImageIcon className="size-4" />
          {label}
        </div>
        {task && <TaskBadge task={task} />}
        {dirty && (
          <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
            Unsaved
          </span>
        )}
      </div>
      <div className="mt-2">
        <MediaPreview
          src={asset?.imageUrl}
          alt={asset?.name || label}
          label={asset?.name || label}
          emptyText="Pending"
          thumbnailClassName="mx-auto aspect-[4/5] h-auto w-[90%]"
        />
      </div>
      <p className="mt-2 line-clamp-3 text-xs leading-4 text-zinc-600">
        {asset?.description || "Waiting for plan"}
      </p>
      {asset && (
        <details className="mt-3 rounded-md border border-zinc-200 p-2">
          <summary className="cursor-pointer text-xs font-semibold text-zinc-700">
            Edit specs
          </summary>
          <div className="mt-2 grid gap-2 border-t border-zinc-100 pt-2">
            <TextField
              label="Name"
              value={draft.name}
              onChange={(name) => setDraft((prev) => ({ ...prev, name }))}
            />
            <TextareaField
              label="Image prompt"
              value={draft.imagePrompt}
              onChange={(imagePrompt) =>
                setDraft((prev) => ({ ...prev, imagePrompt }))
              }
            />
            <TextareaField
              label={descriptionLabel}
              value={draft.description}
              onChange={(description) =>
                setDraft((prev) => ({ ...prev, description }))
              }
            />
            <TextareaField
              label={lockLabel}
              value={draft.consistencyPrompt}
              onChange={(consistencyPrompt) =>
                setDraft((prev) => ({ ...prev, consistencyPrompt }))
              }
            />
            <Button
              size="sm"
              variant="outline"
              disabled={updateMutation.isPending || !dirty}
              onClick={() => updateMutation.mutate()}
            >
              {updateMutation.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Save />
              )}
              Save Specs{dirty ? " *" : ""}
            </Button>
          </div>
        </details>
      )}
      <Button
        className="mt-3 w-full"
        size="sm"
        variant="outline"
        disabled={!asset || running || isSubmitting}
        onClick={() => asset && onGenerate(asset.id)}
      >
        {running ? <Loader2 className="animate-spin" /> : <RefreshCw />}
        {asset?.imageUrl ? "Regenerate" : "Generate"}
      </Button>
      <label className="mt-2 block">
        <input
          className="sr-only"
          type="file"
          accept="image/*"
          disabled={!asset || running || isUploadSubmitting}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (asset && file) onUpload(asset.id, file)
            event.currentTarget.value = ""
          }}
        />
        <span
          className={`flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-zinc-300 px-3 text-sm font-medium transition-colors hover:bg-zinc-100 ${
            !asset || running || isUploadSubmitting
              ? "pointer-events-none cursor-not-allowed opacity-50"
              : ""
          }`}
        >
          {isUploadSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          Upload image
        </span>
      </label>
    </section>
  )
}
