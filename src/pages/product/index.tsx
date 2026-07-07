import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Camera,
  Film,
  ImageIcon,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Upload,
  Video,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  addProductReference,
  createAdProject,
  generateAsset,
  generateKeyframe,
  generateKeyframeSlot,
  generateVideo,
  getAdProject,
  regenerateSceneVideoPrompt,
  rewriteScene,
  runAdPlan,
  selectKeyframeSlotCandidate,
  updateKeyframePromptSlot,
  updateProductReference,
  updateScene,
  updateSceneVideoPrompt,
} from "@/services/ads"
import type {
  AdAsset,
  AdGenerationTask,
  AdKeyframePromptSlot,
  AdProject,
  AdScene,
  AdVoiceLine,
} from "@/types/ads"

const PROJECT_STORAGE_KEY = "adsMvpProjectId"
const PRODUCT_KIND_OPTIONS = [
  "app_screen",
  "physical_product",
  "packaging",
  "logo",
  "usage_photo",
  "before_after",
  "other",
]

function ProductPage() {
  const [projectId, setProjectId] = useState(() =>
    localStorage.getItem(PROJECT_STORAGE_KEY)
  )
  const queryClient = useQueryClient()

  const projectQuery = useQuery({
    queryKey: ["ads-project", projectId],
    queryFn: () => getAdProject(projectId!),
    enabled: !!projectId,
    refetchInterval: projectId ? 2500 : false,
  })

  const project = projectQuery.data
  const latestTaskByTarget = useMemo(() => {
    const map = new Map<string, AdGenerationTask>()
    for (const task of project?.tasks ?? []) {
      const key = `${task.targetType}:${task.targetId}`
      if (!map.has(key)) map.set(key, task)
    }
    return map
  }, [project?.tasks])

  const refreshProject = () => {
    if (projectId) {
      void queryClient.invalidateQueries({ queryKey: ["ads-project", projectId] })
    }
  }

  const createMutation = useMutation({
    mutationFn: createAdProject,
    onSuccess: (created) => {
      localStorage.setItem(PROJECT_STORAGE_KEY, created.id)
      setProjectId(created.id)
      queryClient.setQueryData(["ads-project", created.id], created)
    },
  })

  const planMutation = useMutation({
    mutationFn: runAdPlan,
    onSuccess: refreshProject,
  })

  const assetMutation = useMutation({
    mutationFn: generateAsset,
    onSuccess: refreshProject,
  })

  const legacyKeyframeMutation = useMutation({
    mutationFn: generateKeyframe,
    onSuccess: refreshProject,
  })

  const videoMutation = useMutation({
    mutationFn: generateVideo,
    onSuccess: refreshProject,
  })

  const rewriteMutation = useMutation({
    mutationFn: ({
      sceneId,
      instruction,
    }: {
      sceneId: string
      instruction: string
    }) => rewriteScene(sceneId, instruction),
    onSuccess: refreshProject,
  })

  const resetProject = () => {
    localStorage.removeItem(PROJECT_STORAGE_KEY)
    setProjectId(null)
  }

  if (!projectId || !project) {
    return (
      <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950">
        <div className="mx-auto max-w-5xl">
          <BriefPanel
            isSubmitting={createMutation.isPending}
            error={readMutationError(createMutation.error)}
            onCreate={(payload) => createMutation.mutate(payload)}
          />
        </div>
      </main>
    )
  }

  const productRefs = project.assets.filter((asset) => asset.type === "PRODUCT")
  const character = project.assets.find((asset) => asset.type === "CHARACTER")
  const location = project.assets.find((asset) => asset.type === "LOCATION")
  const isPlanRunning = isRunning(latestTaskByTarget.get(`AdProject:${project.id}`))

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3">
          <div>
            <h1 className="text-xl font-semibold">{project.title || "Ads video"}</h1>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
              <span>{project.aspectRatio}</span>
              <span>voice: {project.voiceLanguage}</span>
              <span>overlay: {project.overlayEnabled ? "on" : "off"}</span>
              <span>{project.status}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              disabled={isPlanRunning || planMutation.isPending}
              onClick={() => planMutation.mutate(project.id)}
            >
              {isPlanRunning ? <Loader2 className="animate-spin" /> : <Sparkles />}
              Generate Plan
            </Button>
            <Button variant="outline" onClick={resetProject}>
              New
            </Button>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-4">
            <ProductReferencesPanel
              projectId={project.id}
              assets={productRefs}
              onSaved={(updated) =>
                queryClient.setQueryData(["ads-project", updated.id], updated)
              }
            />
            <ReferenceCard
              label="Character"
              asset={character}
              task={character ? latestTaskByTarget.get(`AdAsset:${character.id}`) : undefined}
              isSubmitting={assetMutation.isPending}
              onGenerate={(assetId) => assetMutation.mutate(assetId)}
            />
            <ReferenceCard
              label="Location"
              asset={location}
              task={location ? latestTaskByTarget.get(`AdAsset:${location.id}`) : undefined}
              isSubmitting={assetMutation.isPending}
              onGenerate={(assetId) => assetMutation.mutate(assetId)}
            />
          </aside>

          <div className="flex flex-col gap-4">
            <ProjectBrief project={project} />
            <SceneList
              project={project}
              latestTaskByTarget={latestTaskByTarget}
              onSaved={(updated) => {
                queryClient.setQueryData(["ads-project", updated.id], updated)
              }}
              onRewriteScene={(sceneId, instruction) =>
                rewriteMutation.mutate({ sceneId, instruction })
              }
              onGenerateLegacyKeyframe={(sceneId) =>
                legacyKeyframeMutation.mutate(sceneId)
              }
              onGenerateVideo={(sceneId) => videoMutation.mutate(sceneId)}
              onRefresh={refreshProject}
            />
          </div>
        </section>
      </div>
    </main>
  )
}

function BriefPanel({
  isSubmitting,
  error,
  onCreate,
}: {
  isSubmitting: boolean
  error?: string | null
  onCreate: (payload: {
    brief: string
    title?: string
    productContext?: string
    aspectRatio: string
    voiceLanguage: string
    overlayEnabled: boolean
    productImages: File[]
  }) => void
}) {
  const [brief, setBrief] = useState("")
  const [title, setTitle] = useState("")
  const [productContext, setProductContext] = useState("")
  const [aspectRatio, setAspectRatio] = useState("9:16")
  const [voiceLanguage, setVoiceLanguage] = useState("vi")
  const [overlayEnabled, setOverlayEnabled] = useState(false)
  const [productImages, setProductImages] = useState<File[]>([])

  return (
    <form
      className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault()
        if (productImages.length === 0) return
        onCreate({
          brief,
          title,
          productContext,
          aspectRatio,
          voiceLanguage,
          overlayEnabled,
          productImages,
        })
      }}
    >
      <div className="flex items-center gap-2">
        <Film className="size-5" />
        <h1 className="text-lg font-semibold">Ads Video Workspace</h1>
      </div>
      <TextField label="Title" value={title} onChange={setTitle} />
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Brief</span>
        <textarea
          className="min-h-28 rounded-md border border-zinc-300 p-3 leading-5"
          required
          value={brief}
          onChange={(event) => setBrief(event.target.value)}
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Product context</span>
        <textarea
          className="min-h-20 rounded-md border border-zinc-300 p-3 leading-5"
          value={productContext}
          onChange={(event) => setProductContext(event.target.value)}
        />
      </label>
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
            <option value="vi">Tieng Viet</option>
            <option value="en">English</option>
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
            onChange={(event) =>
              setProductImages(Array.from(event.target.files ?? []))
            }
          />
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
      <Button className="w-fit" disabled={isSubmitting || !brief || productImages.length === 0}>
        {isSubmitting ? <Loader2 className="animate-spin" /> : <Upload />}
        Create Project
      </Button>
    </form>
  )
}

function ProductReferencesPanel({
  projectId,
  assets,
  onSaved,
}: {
  projectId: string
  assets: AdAsset[]
  onSaved: (project: AdProject) => void
}) {
  const [newFile, setNewFile] = useState<File | null>(null)
  const [newName, setNewName] = useState("")
  const addMutation = useMutation({
    mutationFn: () => {
      if (!newFile) throw new Error("Product image required")
      return addProductReference(projectId, {
        productImage: newFile,
        name: newName,
      })
    },
    onSuccess: (updated) => {
      setNewFile(null)
      setNewName("")
      onSaved(updated)
    },
  })

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <ImageIcon className="size-4" />
        Product References
      </div>
      <div className="grid gap-3">
        {assets.map((asset) => (
          <ProductReferenceCard
            key={`${asset.id}-${asset.name}-${asset.kind}-${asset.isPrimary}`}
            asset={asset}
            onSaved={onSaved}
          />
        ))}
      </div>
      <div className="mt-3 grid gap-2 border-t border-zinc-200 pt-3">
        <input
          className="h-9 rounded-md border border-zinc-300 px-2 text-sm"
          placeholder="New reference name"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
        />
        <input
          className="h-9 rounded-md border border-zinc-300 px-2 py-1 text-sm"
          type="file"
          accept="image/*"
          onChange={(event) => setNewFile(event.target.files?.[0] ?? null)}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={!newFile || addMutation.isPending}
          onClick={() => addMutation.mutate()}
        >
          {addMutation.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
          Add Reference
        </Button>
      </div>
    </section>
  )
}

function ProductReferenceCard({
  asset,
  onSaved,
}: {
  asset: AdAsset
  onSaved: (project: AdProject) => void
}) {
  const [draft, setDraft] = useState({
    name: asset.name || "",
    kind: asset.kind || "other",
    visualDescription: asset.visualDescription || asset.description || "",
    lockPrompt: asset.lockPrompt || "",
    useWhen: asset.useWhen || "",
    isPrimary: asset.isPrimary,
  })
  const updateMutation = useMutation({
    mutationFn: () => updateProductReference(asset.id, draft),
    onSuccess: onSaved,
  })

  return (
    <div className="grid gap-2 rounded-md border border-zinc-200 p-2">
      {asset.imageUrl ? (
        <img
          src={asset.imageUrl}
          alt={asset.name}
          className="aspect-[9/12] w-full rounded-md object-cover"
        />
      ) : (
        <div className="flex aspect-[9/12] items-center justify-center rounded-md bg-zinc-100 text-sm text-zinc-500">
          No image
        </div>
      )}
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
      <label className="flex items-center gap-2 text-xs font-medium text-zinc-600">
        <input
          type="checkbox"
          checked={draft.isPrimary}
          onChange={(event) =>
            setDraft((prev) => ({ ...prev, isPrimary: event.target.checked }))
          }
        />
        Primary
      </label>
      <Button
        size="sm"
        variant="outline"
        disabled={updateMutation.isPending}
        onClick={() => updateMutation.mutate()}
      >
        {updateMutation.isPending ? <Loader2 className="animate-spin" /> : <Save />}
        Save Ref
      </Button>
    </div>
  )
}

function ReferenceCard({
  label,
  asset,
  task,
  isSubmitting,
  onGenerate,
}: {
  label: string
  asset?: AdAsset
  task?: AdGenerationTask
  isSubmitting: boolean
  onGenerate: (assetId: string) => void
}) {
  const running = isRunning(task)
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ImageIcon className="size-4" />
          {label}
        </div>
        {task && <TaskBadge task={task} />}
      </div>
      <div className="mt-2">
        {asset?.imageUrl ? (
          <img
            src={asset.imageUrl}
            alt={asset.name}
            className="aspect-[4/5] w-full rounded-md object-cover"
          />
        ) : (
          <div className="flex aspect-[4/5] items-center justify-center rounded-md bg-zinc-100 text-sm text-zinc-500">
            Pending
          </div>
        )}
      </div>
      <p className="mt-2 line-clamp-3 text-xs leading-4 text-zinc-600">
        {asset?.description || "Waiting for plan"}
      </p>
      <Button
        className="mt-3 w-full"
        size="sm"
        variant="outline"
        disabled={!asset || running || isSubmitting}
        onClick={() => asset && onGenerate(asset.id)}
      >
        {running ? <Loader2 className="animate-spin" /> : <RefreshCw />}
        Generate
      </Button>
    </section>
  )
}

function ProjectBrief({ project }: { project: AdProject }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold">Brief</h2>
          <p className="mt-1 text-sm leading-5 text-zinc-700">{project.brief}</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Product context</h2>
          <p className="mt-1 text-sm leading-5 text-zinc-700">
            {project.productContext || "None"}
          </p>
        </div>
      </div>
    </section>
  )
}

function SceneList({
  project,
  latestTaskByTarget,
  onSaved,
  onRewriteScene,
  onGenerateLegacyKeyframe,
  onGenerateVideo,
  onRefresh,
}: {
  project: AdProject
  latestTaskByTarget: Map<string, AdGenerationTask>
  onSaved: (project: AdProject) => void
  onRewriteScene: (sceneId: string, instruction: string) => void
  onGenerateLegacyKeyframe: (sceneId: string) => void
  onGenerateVideo: (sceneId: string) => void
  onRefresh: () => void
}) {
  if (project.scenes.length === 0) {
    return (
      <section className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-sm">
        No scenes yet
      </section>
    )
  }

  return (
    <section className="grid gap-4">
      {project.scenes.map((scene) => (
        <SceneCard
          key={`${scene.id}-${scene.updatedAt}`}
          scene={scene}
          overlayEnabled={project.overlayEnabled}
          latestTaskByTarget={latestTaskByTarget}
          sceneTask={latestTaskByTarget.get(`AdScene:${scene.id}`)}
          onSaved={onSaved}
          onRewriteScene={onRewriteScene}
          onGenerateLegacyKeyframe={onGenerateLegacyKeyframe}
          onGenerateVideo={onGenerateVideo}
          onRefresh={onRefresh}
        />
      ))}
    </section>
  )
}

function SceneCard({
  scene,
  overlayEnabled,
  latestTaskByTarget,
  sceneTask,
  onSaved,
  onRewriteScene,
  onGenerateLegacyKeyframe,
  onGenerateVideo,
  onRefresh,
}: {
  scene: AdScene
  overlayEnabled: boolean
  latestTaskByTarget: Map<string, AdGenerationTask>
  sceneTask?: AdGenerationTask
  onSaved: (project: AdProject) => void
  onRewriteScene: (sceneId: string, instruction: string) => void
  onGenerateLegacyKeyframe: (sceneId: string) => void
  onGenerateVideo: (sceneId: string) => void
  onRefresh: () => void
}) {
  const [rewriteInstruction, setRewriteInstruction] = useState("")
  const [draft, setDraft] = useState({
    title: scene.title,
    visualAction: scene.visualAction,
    productMoment: scene.productMoment || "",
    cameraShot: scene.cameraShot || "",
    cameraMovement: scene.cameraMovement || "",
    composition: scene.composition || "",
    voiceLines: normalizeVoiceLines(scene.voiceLines, scene.voiceLine),
    ambientAudio: scene.ambientAudio || "",
    onScreenText: scene.onScreenText || "",
  })
  const [videoPromptDraft, setVideoPromptDraft] = useState(
    scene.finalVideoPrompt || ""
  )

  const updateMutation = useMutation({
    mutationFn: () => updateScene(scene.id, draft),
    onSuccess: onSaved,
  })
  const videoPromptMutation = useMutation({
    mutationFn: () => updateSceneVideoPrompt(scene.id, videoPromptDraft),
    onSuccess: onSaved,
  })
  const regeneratePromptMutation = useMutation({
    mutationFn: () => regenerateSceneVideoPrompt(scene.id),
    onSuccess: onRefresh,
  })
  const running = isRunning(sceneTask)
  const keyframePromptSlots = scene.keyframePromptSlots ?? []
  const selectedCount = keyframePromptSlots.filter(
    (slot) => !!slot.selectedCandidate
  ).length
  const canGenerateVideo =
    keyframePromptSlots.length > 0 && selectedCount === keyframePromptSlots.length

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-zinc-900 text-xs font-semibold text-white">
            {scene.sceneIndex}
          </span>
          <input
            className="h-9 min-w-0 rounded-md border border-zinc-300 px-2 text-sm font-semibold"
            value={draft.title}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, title: event.target.value }))
            }
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-600">
            {scene.durationSec}s
          </span>
          {sceneTask && <TaskBadge task={sceneTask} />}
          <Button
            size="sm"
            variant="outline"
            disabled={updateMutation.isPending}
            onClick={() => updateMutation.mutate()}
          >
            {updateMutation.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Save />
            )}
            Save Scene
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-3">
          <label className="grid gap-1 text-xs font-medium text-zinc-600">
            Action
            <textarea
              className="min-h-20 rounded-md border border-zinc-300 p-2 text-sm leading-5 text-zinc-900"
              value={draft.visualAction}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, visualAction: event.target.value }))
              }
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
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
          </div>
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
          <VoiceLinesEditor
            voiceLines={draft.voiceLines}
            onChange={(voiceLines) => setDraft((prev) => ({ ...prev, voiceLines }))}
          />
          <TextareaField
            label="Ambient audio"
            value={draft.ambientAudio}
            onChange={(ambientAudio) =>
              setDraft((prev) => ({ ...prev, ambientAudio }))
            }
          />
          <div className="grid gap-2 rounded-md border border-zinc-200 p-2">
            <input
              className="h-9 rounded-md border border-zinc-300 px-2 text-sm text-zinc-900"
              placeholder="Rewrite instruction"
              value={rewriteInstruction}
              onChange={(event) => setRewriteInstruction(event.target.value)}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={running || !rewriteInstruction.trim()}
              onClick={() => {
                onRewriteScene(scene.id, rewriteInstruction)
                setRewriteInstruction("")
              }}
            >
              <Sparkles />
              Rewrite Scene
            </Button>
          </div>
          <div className="grid gap-2 rounded-md border border-zinc-200 p-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-zinc-600">
                Final video prompt
              </span>
              {scene.finalVideoPromptStale && (
                <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                  Needs refresh
                </span>
              )}
            </div>
            <textarea
              className="min-h-40 rounded-md border border-zinc-300 p-2 text-xs leading-5 text-zinc-900"
              value={videoPromptDraft}
              onChange={(event) => setVideoPromptDraft(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={videoPromptMutation.isPending}
                onClick={() => videoPromptMutation.mutate()}
              >
                {videoPromptMutation.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Save />
                )}
                Save Prompt
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={regeneratePromptMutation.isPending}
                onClick={() => regeneratePromptMutation.mutate()}
              >
                {regeneratePromptMutation.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <RefreshCw />
                )}
                Regenerate Prompt
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          <KeyframeSlots
            scene={{ ...scene, keyframePromptSlots }}
            latestTaskByTarget={latestTaskByTarget}
            onSaved={onSaved}
            onRefresh={onRefresh}
            onGenerateLegacyKeyframe={onGenerateLegacyKeyframe}
          />
          <Button
            size="sm"
            disabled={running || !canGenerateVideo}
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
              src={scene.videoUrl}
              controls
              className="aspect-[9/16] w-full rounded-md bg-black"
            />
          )}
        </div>
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
    <div className="grid gap-2 rounded-md border border-zinc-200 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-zinc-600">Voice lines</span>
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
          <div className="grid gap-2 md:grid-cols-3">
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
          </div>
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
          <TextareaField
            label="Exact line"
            value={voiceLine.line}
            onChange={(line) => updateLine(index, { line })}
          />
        </div>
      ))}
    </div>
  )
}

function KeyframeSlots({
  scene,
  latestTaskByTarget,
  onSaved,
  onRefresh,
  onGenerateLegacyKeyframe,
}: {
  scene: AdScene
  latestTaskByTarget: Map<string, AdGenerationTask>
  onSaved: (project: AdProject) => void
  onRefresh: () => void
  onGenerateLegacyKeyframe: (sceneId: string) => void
}) {
  const keyframePromptSlots = scene.keyframePromptSlots ?? []
  if (!keyframePromptSlots.length) {
    return (
      <div className="grid gap-2 rounded-md border border-zinc-200 p-3">
        <p className="text-sm text-zinc-500">No keyframe slots yet</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onGenerateLegacyKeyframe(scene.id)}
        >
          <Camera />
          Generate Legacy Keyframe
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      {keyframePromptSlots.map((slot) => (
        <KeyframeSlotCard
          key={`${slot.id}-${slot.selectedCandidateId}-${slot.stale}`}
          slot={slot}
          task={latestTaskByTarget.get(`AdKeyframePromptSlot:${slot.id}`)}
          onSaved={onSaved}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  )
}

function KeyframeSlotCard({
  slot,
  task,
  onSaved,
  onRefresh,
}: {
  slot: AdKeyframePromptSlot
  task?: AdGenerationTask
  onSaved: (project: AdProject) => void
  onRefresh: () => void
}) {
  const [draft, setDraft] = useState({
    label: slot.label,
    timing: slot.timing || "",
    purpose: slot.purpose,
    prompt: slot.prompt,
    productReferenceIds: slot.productReferenceIds || [],
  })
  const updateMutation = useMutation({
    mutationFn: () => updateKeyframePromptSlot(slot.id, draft),
    onSuccess: onSaved,
  })
  const generateMutation = useMutation({
    mutationFn: () => generateKeyframeSlot(slot.id),
    onSuccess: onRefresh,
  })
  const selectMutation = useMutation({
    mutationFn: (candidateId: string) =>
      selectKeyframeSlotCandidate(slot.id, candidateId),
    onSuccess: onSaved,
  })
  const running = isRunning(task) || generateMutation.isPending

  return (
    <div className="grid gap-2 rounded-md border border-zinc-200 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-zinc-600">
          Ref {slot.slotIndex + 1}
        </span>
        <div className="flex items-center gap-2">
          {slot.stale && (
            <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
              Needs keyframe
            </span>
          )}
          {task && <TaskBadge task={task} />}
        </div>
      </div>
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
      <TextareaField
        label="Prompt"
        value={draft.prompt}
        onChange={(prompt) => setDraft((prev) => ({ ...prev, prompt }))}
      />
      <div className="overflow-hidden rounded-md border border-zinc-200 bg-zinc-100">
        {slot.selectedCandidate?.imageUrl ? (
          <img
            src={slot.selectedCandidate.imageUrl}
            alt={slot.label}
            className="aspect-[9/16] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[9/16] items-center justify-center text-sm text-zinc-500">
            Selected keyframe
          </div>
        )}
      </div>
      {!!slot.candidates?.length && (
        <div className="grid grid-cols-4 gap-2">
          {slot.candidates.map((candidate) => (
            <button
              key={candidate.id}
              className={`overflow-hidden rounded border ${
                slot.selectedCandidateId === candidate.id
                  ? "border-zinc-900"
                  : "border-zinc-200"
              }`}
              onClick={() => selectMutation.mutate(candidate.id)}
            >
              <img
                src={candidate.imageUrl}
                alt=""
                className="aspect-square w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={updateMutation.isPending}
          onClick={() => updateMutation.mutate()}
        >
          {updateMutation.isPending ? <Loader2 className="animate-spin" /> : <Save />}
          Save Slot
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
      </div>
      {slot.selectedCandidate?.warning && (
        <p className="rounded-md bg-amber-50 p-2 text-xs leading-4 text-amber-700">
          {slot.selectedCandidate.warning}
        </p>
      )}
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-zinc-600">
      {label}
      <input
        className="h-9 rounded-md border border-zinc-300 px-2 text-sm text-zinc-900"
        disabled={disabled}
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
  disabled = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-zinc-600">
      {label}
      <textarea
        className="min-h-20 rounded-md border border-zinc-300 p-2 text-sm leading-5 text-zinc-900"
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function TaskBadge({ task }: { task: AdGenerationTask }) {
  const colors =
    task.status === "FAILED"
      ? "bg-red-50 text-red-700"
      : task.status === "COMPLETED"
        ? "bg-emerald-50 text-emerald-700"
        : "bg-blue-50 text-blue-700"
  return (
    <span className={`rounded-md px-2 py-1 text-xs font-medium ${colors}`}>
      {task.status}
      {isRunning(task) ? ` ${task.progress}%` : ""}
    </span>
  )
}

function normalizeVoiceLines(
  voiceLines?: AdVoiceLine[] | null,
  fallback?: string | null
): AdVoiceLine[] {
  if (voiceLines?.length) return voiceLines
  if (fallback) {
    return [
      {
        speaker: "Primary actor",
        timing: "",
        actionState: "",
        emotion: "",
        delivery: "",
        line: fallback,
      },
    ]
  }
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

function isRunning(task?: AdGenerationTask) {
  return task?.status === "QUEUED" || task?.status === "PROCESSING"
}

function readMutationError(error: unknown) {
  if (!error) return null
  if (error instanceof Error) return error.message
  return "Request failed"
}

export default ProductPage
