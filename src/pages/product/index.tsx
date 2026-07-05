import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Camera,
  Film,
  ImageIcon,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
  Upload,
  Video,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  createAdProject,
  generateAsset,
  generateKeyframe,
  generateVideo,
  getAdProject,
  rewriteScene,
  runAdPlan,
  selectKeyframe,
  regenerateSceneVideoPrompt,
  updateScene,
  updateSceneVideoPrompt,
} from "@/services/ads"
import type {
  AdAsset,
  AdGenerationTask,
  AdProject,
  AdScene,
} from "@/types/ads"

const PROJECT_STORAGE_KEY = "adsMvpProjectId"
const TARGET_DURATION_OPTIONS_SEC = [15, 20, 30]

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

  const keyframeMutation = useMutation({
    mutationFn: generateKeyframe,
    onSuccess: refreshProject,
  })

  const selectKeyframeMutation = useMutation({
    mutationFn: ({ sceneId, imageUrl }: { sceneId: string; imageUrl: string }) =>
      selectKeyframe(sceneId, imageUrl),
    onSuccess: (updated) => {
      queryClient.setQueryData(["ads-project", updated.id], updated)
    },
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

  const product = project.assets.find((asset) => asset.type === "PRODUCT")
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
              <span>{project.targetDurationSec}s</span>
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

        <section className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-4">
            <ProductReference asset={product} />
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
              onGenerateKeyframe={(sceneId) => keyframeMutation.mutate(sceneId)}
              onGenerateVideo={(sceneId) => videoMutation.mutate(sceneId)}
              onSelectKeyframe={(sceneId, imageUrl) =>
                selectKeyframeMutation.mutate({ sceneId, imageUrl })
              }
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
    targetDurationSec: number
    productImage: File
  }) => void
}) {
  const [brief, setBrief] = useState("")
  const [title, setTitle] = useState("")
  const [productContext, setProductContext] = useState("")
  const [aspectRatio, setAspectRatio] = useState("9:16")
  const [targetDurationSec, setTargetDurationSec] = useState(20)
  const [productImage, setProductImage] = useState<File | null>(null)

  return (
    <form
      className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault()
        if (!productImage) return
        onCreate({
          brief,
          title,
          productContext,
          aspectRatio,
          targetDurationSec,
          productImage,
        })
      }}
    >
      <div className="flex items-center gap-2">
        <Film className="size-5" />
        <h1 className="text-lg font-semibold">Ads Video Workspace</h1>
      </div>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Title</span>
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
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
          <span className="font-medium">Duration</span>
          <select
            className="h-10 rounded-md border border-zinc-300 px-3"
            value={targetDurationSec}
            onChange={(event) => setTargetDurationSec(Number(event.target.value))}
          >
            {TARGET_DURATION_OPTIONS_SEC.map((seconds) => (
              <option key={seconds} value={seconds}>
                {seconds}s
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Product image</span>
          <input
            className="h-10 rounded-md border border-zinc-300 px-3 py-2"
            required
            type="file"
            accept="image/*"
            onChange={(event) => setProductImage(event.target.files?.[0] ?? null)}
          />
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button className="w-fit" disabled={isSubmitting || !brief || !productImage}>
        {isSubmitting ? <Loader2 className="animate-spin" /> : <Upload />}
        Create Project
      </Button>
    </form>
  )
}

function ProductReference({ asset }: { asset?: AdAsset }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <ImageIcon className="size-4" />
        Product/App
      </div>
      {asset?.imageUrl ? (
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
    </section>
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
  onGenerateKeyframe,
  onGenerateVideo,
  onSelectKeyframe,
  onRefresh,
}: {
  project: AdProject
  latestTaskByTarget: Map<string, AdGenerationTask>
  onSaved: (project: AdProject) => void
  onRewriteScene: (sceneId: string, instruction: string) => void
  onGenerateKeyframe: (sceneId: string) => void
  onGenerateVideo: (sceneId: string) => void
  onSelectKeyframe: (sceneId: string, imageUrl: string) => void
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
          task={latestTaskByTarget.get(`AdScene:${scene.id}`)}
          onSaved={onSaved}
          onRewriteScene={onRewriteScene}
          onGenerateKeyframe={onGenerateKeyframe}
          onGenerateVideo={onGenerateVideo}
          onSelectKeyframe={onSelectKeyframe}
          onRefresh={onRefresh}
        />
      ))}
    </section>
  )
}

function SceneCard({
  scene,
  task,
  onSaved,
  onRewriteScene,
  onGenerateKeyframe,
  onGenerateVideo,
  onSelectKeyframe,
  onRefresh,
}: {
  scene: AdScene
  task?: AdGenerationTask
  onSaved: (project: AdProject) => void
  onRewriteScene: (sceneId: string, instruction: string) => void
  onGenerateKeyframe: (sceneId: string) => void
  onGenerateVideo: (sceneId: string) => void
  onSelectKeyframe: (sceneId: string, imageUrl: string) => void
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
    voiceLine: scene.voiceLine || "",
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
  const running = isRunning(task)

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
          {task && <TaskBadge task={task} />}
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
            Save
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
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
              label="Overlay"
              value={draft.onScreenText}
              onChange={(onScreenText) =>
                setDraft((prev) => ({ ...prev, onScreenText }))
              }
            />
            <TextField
              label="Camera shot"
              value={draft.cameraShot}
              onChange={(cameraShot) =>
                setDraft((prev) => ({ ...prev, cameraShot }))
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
            <TextField
              label="Camera movement"
              value={draft.cameraMovement}
              onChange={(cameraMovement) =>
                setDraft((prev) => ({ ...prev, cameraMovement }))
              }
            />
          </div>
          <label className="grid gap-1 text-xs font-medium text-zinc-600">
            Voice
            <textarea
              className="min-h-16 rounded-md border border-zinc-300 p-2 text-sm leading-5 text-zinc-900"
              value={draft.voiceLine}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, voiceLine: event.target.value }))
              }
            />
          </label>
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
              className="min-h-36 rounded-md border border-zinc-300 p-2 text-xs leading-5 text-zinc-900"
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
          <div className="overflow-hidden rounded-md border border-zinc-200 bg-zinc-100">
            {scene.keyframeImageUrl ? (
              <img
                src={scene.keyframeImageUrl}
                alt={scene.title}
                className="aspect-[9/16] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[9/16] items-center justify-center text-sm text-zinc-500">
                Keyframe
              </div>
            )}
          </div>
          {!!scene.keyframeCandidates?.length && (
            <div className="grid grid-cols-4 gap-2">
              {scene.keyframeCandidates.map((candidate) => (
                <button
                  key={candidate}
                  className="overflow-hidden rounded border border-zinc-200"
                  onClick={() => onSelectKeyframe(scene.id, candidate)}
                >
                  <img
                    src={candidate}
                    alt=""
                    className="aspect-square w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
          <div className="grid gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={running}
              onClick={() => onGenerateKeyframe(scene.id)}
            >
              {running ? <Loader2 className="animate-spin" /> : <Camera />}
              Generate Keyframe
            </Button>
            <Button
              size="sm"
              disabled={running || !scene.keyframeImageUrl}
              onClick={() => onGenerateVideo(scene.id)}
            >
              <Video />
              Generate Video
            </Button>
          </div>
          {scene.videoError && (
            <p className="rounded-md bg-red-50 p-2 text-xs leading-4 text-red-700">
              {scene.videoError}
            </p>
          )}
          {scene.keyframeWarning && (
            <p className="rounded-md bg-amber-50 p-2 text-xs leading-4 text-amber-700">
              {scene.keyframeWarning}
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

function isRunning(task?: AdGenerationTask) {
  return task?.status === "QUEUED" || task?.status === "PROCESSING"
}

function readMutationError(error: unknown) {
  if (!error) return null
  if (error instanceof Error) return error.message
  return "Request failed"
}

export default ProductPage
