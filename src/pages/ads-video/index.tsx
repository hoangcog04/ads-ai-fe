import { useEffect, useMemo, useRef, useState } from "react"
import { ROUTES } from "@/constants"
import {
  addProductReference,
  assembleVideo,
  createAdProject,
  generateAsset,
  generateKeyframe,
  generateKeyframeSlot,
  generateVideo,
  getAdProject,
  importAdPlanJson,
  listAdProjects,
  regenerateSceneVideoPrompt,
  rewriteScene,
  runAdPlan,
  selectKeyframeSlotCandidate,
  updateKeyframePromptSlot,
  updateProductReference,
  updateReferenceAsset,
  updateScene,
  updateSceneVideoPrompt,
  uploadProductReferences,
} from "@/services/ads"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Camera,
  CheckCircle2,
  FileJson,
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
import { useNavigate, useParams } from "react-router-dom"

import type {
  AdActingBeat,
  AdAsset,
  AdGenerationTask,
  AdKeyframePromptSlot,
  AdProject,
  AdProjectListItem,
  AdScene,
  AdVoiceLine,
} from "@/types/ads"
import { Button } from "@/components/ui/button"

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
const WORKSPACE_STAGES = [
  { id: "plan", label: "Plan" },
  { id: "references", label: "References" },
  { id: "keyframes", label: "Keyframes" },
  { id: "videos", label: "Videos" },
] as const

type WorkspaceStage = (typeof WORKSPACE_STAGES)[number]["id"]
type ProductImageDraft = {
  file: File
  previewUrl: string
  name: string
  kind: string
  visualDescription: string
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
    normalized.includes("result")
  ) {
    return "app_screen"
  }
  return "other"
}

function buildProductContext(
  refs: Array<{ name?: string; visualDescription?: string }>
) {
  return refs
    .map((ref, index) => {
      const name = ref.name?.trim() || `i_product_${index + 1}`
      const description = ref.visualDescription?.trim()
      return description ? `${name}:\n${description}` : `${name}:`
    })
    .join("\n\n")
}

function splitDurationRange(value: string) {
  const [min, max] = value.split("-")
  return [min || "", max || ""]
}

function AdsVideoPage() {
  const { projectId } = useParams<{ projectId?: string }>()
  const navigate = useNavigate()
  const [workspaceStage, setWorkspaceStage] = useState<WorkspaceStage>("plan")
  const queryClient = useQueryClient()

  const projectsQuery = useQuery({
    queryKey: ["ads-projects"],
    queryFn: listAdProjects,
  })

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
      void queryClient.invalidateQueries({
        queryKey: ["ads-project", projectId],
      })
      void queryClient.invalidateQueries({ queryKey: ["ads-projects"] })
    }
  }

  const createMutation = useMutation({
    mutationFn: createAdProject,
    onSuccess: (created) => {
      setWorkspaceStage("plan")
      queryClient.setQueryData(["ads-project", created.id], created)
      void queryClient.invalidateQueries({ queryKey: ["ads-projects"] })
      navigate(`${ROUTES.ADS_VIDEO}/${created.id}`)
    },
  })

  const planMutation = useMutation({
    mutationFn: runAdPlan,
    onSuccess: refreshProject,
  })

  const importPlanMutation = useMutation({
    mutationFn: ({ id, rawPlan }: { id: string; rawPlan: string }) =>
      importAdPlanJson(id, rawPlan),
    onSuccess: (updated) => {
      queryClient.setQueryData(["ads-project", updated.id], updated)
      setWorkspaceStage("references")
    },
  })

  const assetMutation = useMutation({
    mutationFn: generateAsset,
    onSuccess: refreshProject,
  })

  const productRefUploadMutation = useMutation({
    mutationFn: uploadProductReferences,
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

  const assembleVideoMutation = useMutation({
    mutationFn: assembleVideo,
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
    setWorkspaceStage("plan")
    navigate(ROUTES.ADS_VIDEO)
  }

  useEffect(() => {
    if (!project) return
    if (workspaceStage === "plan" && project.scenes.length > 0) {
      setWorkspaceStage("references")
      return
    }
    const nextCharacter = project.assets.find(
      (asset) => asset.type === "CHARACTER"
    )
    const nextLocation = project.assets.find(
      (asset) => asset.type === "LOCATION"
    )
    if (
      workspaceStage === "references" &&
      nextCharacter?.imageUrl &&
      nextLocation?.imageUrl
    ) {
      setWorkspaceStage("keyframes")
    }
  }, [project, workspaceStage])

  if (!projectId) {
    return (
      <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950">
        <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <BriefPanel
            isSubmitting={createMutation.isPending}
            error={readMutationError(createMutation.error)}
            onCreate={(payload) => createMutation.mutate(payload)}
          />
          <ProjectListPanel
            projects={projectsQuery.data ?? []}
            isLoading={projectsQuery.isLoading}
            onOpen={(id) => navigate(`${ROUTES.ADS_VIDEO}/${id}`)}
          />
        </div>
      </main>
    )
  }

  if (!project) {
    return (
      <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950">
        <div className="mx-auto max-w-5xl rounded-lg border border-zinc-200 bg-white p-6 text-sm shadow-sm">
          {projectQuery.isLoading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Loading project...
            </span>
          ) : (
            <div className="grid gap-3">
              <p className="font-medium text-red-700">Project not found.</p>
              <Button
                className="w-fit"
                variant="outline"
                onClick={resetProject}
              >
                Back to projects
              </Button>
            </div>
          )}
        </div>
      </main>
    )
  }

  const productRefs = project.assets.filter((asset) => asset.type === "PRODUCT")
  const character = project.assets.find((asset) => asset.type === "CHARACTER")
  const location = project.assets.find((asset) => asset.type === "LOCATION")
  const isPlanRunning = isRunning(
    latestTaskByTarget.get(`AdProject:${project.id}`)
  )
  const hasPlan = project.scenes.length > 0
  const hasDownstream = hasPlan || !!character || !!location
  const hasReadyReferences = !!character?.imageUrl && !!location?.imageUrl

  const confirmRebuildPlan = () => {
    if (!hasDownstream) return true
    return window.confirm(
      "This will rebuild the plan, character/location specs, scenes, and keyframe slots. Existing downstream keyframes/videos can become invalid. Continue?"
    )
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3">
          <div>
            <h1 className="text-xl font-semibold">
              {project.title || "Ads video"}
            </h1>
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
              onClick={() => {
                if (confirmRebuildPlan()) {
                  planMutation.mutate(project.id)
                  setWorkspaceStage("plan")
                }
              }}
            >
              {isPlanRunning ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Sparkles />
              )}
              Generate Plan
            </Button>
            <Button variant="outline" onClick={resetProject}>
              Projects
            </Button>
          </div>
        </header>

        <StageTabs
          stage={workspaceStage}
          project={project}
          hasReadyReferences={hasReadyReferences}
          onChange={setWorkspaceStage}
        />

        <section className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-4">
            <ProductReferencesPanel
              projectId={project.id}
              assets={productRefs}
              task={latestTaskByTarget.get(
                `AdProjectProductRefs:${project.id}`
              )}
              isSubmitting={productRefUploadMutation.isPending}
              onUpload={() => productRefUploadMutation.mutate(project.id)}
              onSaved={(updated) =>
                queryClient.setQueryData(["ads-project", updated.id], updated)
              }
            />
            <ReferenceCard
              label="Character"
              asset={character}
              task={
                character
                  ? latestTaskByTarget.get(`AdAsset:${character.id}`)
                  : undefined
              }
              isSubmitting={assetMutation.isPending}
              onGenerate={(assetId) => assetMutation.mutate(assetId)}
              onSaved={(updated) =>
                queryClient.setQueryData(["ads-project", updated.id], updated)
              }
            />
            <ReferenceCard
              label="Location"
              asset={location}
              task={
                location
                  ? latestTaskByTarget.get(`AdAsset:${location.id}`)
                  : undefined
              }
              isSubmitting={assetMutation.isPending}
              onGenerate={(assetId) => assetMutation.mutate(assetId)}
              onSaved={(updated) =>
                queryClient.setQueryData(["ads-project", updated.id], updated)
              }
            />
          </aside>

          <div className="flex flex-col gap-4">
            <ProjectBrief project={project} />
            {workspaceStage === "plan" && (
              <ImportPlanPanel
                project={project}
                isSubmitting={importPlanMutation.isPending}
                error={readMutationError(importPlanMutation.error)}
                onImport={(rawPlan) => {
                  if (confirmRebuildPlan()) {
                    importPlanMutation.mutate({ id: project.id, rawPlan })
                  }
                }}
              />
            )}
            {workspaceStage === "references" && (
              <ReferenceStageSummary
                character={character}
                location={location}
                latestTaskByTarget={latestTaskByTarget}
              />
            )}
            {(workspaceStage === "keyframes" ||
              workspaceStage === "videos") && (
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
                onAssembleVideo={() => assembleVideoMutation.mutate(project.id)}
                isAssemblingVideo={assembleVideoMutation.isPending}
                onRefresh={refreshProject}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function StageTabs({
  stage,
  project,
  hasReadyReferences,
  onChange,
}: {
  stage: WorkspaceStage
  project: AdProject
  hasReadyReferences: boolean
  onChange: (stage: WorkspaceStage) => void
}) {
  const sceneCount = project.scenes.length
  const selectedKeyframes = project.scenes.reduce(
    (count, scene) =>
      count +
      (scene.keyframePromptSlots ?? []).filter((slot) => slot.selectedCandidate)
        .length,
    0
  )
  const stageHint: Record<WorkspaceStage, string> = {
    plan: sceneCount ? `${sceneCount} scenes` : "create or import plan",
    references: hasReadyReferences ? "refs ready" : "generate char/location",
    keyframes: selectedKeyframes
      ? `${selectedKeyframes} selected`
      : "select refs",
    videos: "Flow video",
  }

  return (
    <nav className="grid gap-2 rounded-lg border border-zinc-200 bg-white p-2 shadow-sm sm:grid-cols-4">
      {WORKSPACE_STAGES.map((item) => {
        const active = item.id === stage
        return (
          <button
            key={item.id}
            className={`flex items-center justify-between rounded-md border px-3 py-2 text-left ${
              active
                ? "border-zinc-900 bg-zinc-950 text-white"
                : "border-zinc-200 bg-white text-zinc-700"
            }`}
            onClick={() => onChange(item.id)}
          >
            <span className="text-sm font-semibold">{item.label}</span>
            <span
              className={`text-xs ${
                active ? "text-zinc-200" : "text-zinc-500"
              }`}
            >
              {stageHint[item.id]}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

function ImportPlanPanel({
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

function ReferenceStageSummary({
  character,
  location,
  latestTaskByTarget,
}: {
  character?: AdAsset
  location?: AdAsset
  latestTaskByTarget: Map<string, AdGenerationTask>
}) {
  return (
    <section className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <CheckCircle2 className="size-4" />
        Reference Readiness
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <ReferenceReadinessRow
          label="Character"
          asset={character}
          task={
            character
              ? latestTaskByTarget.get(`AdAsset:${character.id}`)
              : undefined
          }
        />
        <ReferenceReadinessRow
          label="Location"
          asset={location}
          task={
            location
              ? latestTaskByTarget.get(`AdAsset:${location.id}`)
              : undefined
          }
        />
      </div>
      <p className="text-xs leading-5 text-zinc-500">
        Generate both references from the left rail. When both are ready, the
        workspace advances to keyframe slots automatically.
      </p>
    </section>
  )
}

function ReferenceReadinessRow({
  label,
  asset,
  task,
}: {
  label: string
  asset?: AdAsset
  task?: AdGenerationTask
}) {
  const ready = !!asset?.imageUrl
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 p-2">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-zinc-500">
          {asset ? asset.name : "Waiting for imported/generated plan"}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {task && <TaskBadge task={task} />}
        <span
          className={`rounded-md px-2 py-1 text-xs font-medium ${
            ready
              ? "bg-emerald-50 text-emerald-700"
              : "bg-zinc-100 text-zinc-600"
          }`}
        >
          {ready ? "Ready" : "Pending"}
        </span>
      </div>
    </div>
  )
}

function ProjectListPanel({
  projects,
  isLoading,
  onOpen,
}: {
  projects: AdProjectListItem[]
  isLoading: boolean
  onOpen: (projectId: string) => void
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
          <button
            key={project.id}
            className="grid grid-cols-[56px_minmax(0,1fr)] gap-3 rounded-md border border-zinc-200 p-2 text-left transition hover:border-zinc-900"
            onClick={() => onOpen(project.id)}
          >
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md bg-zinc-100">
              {project.productImageUrl ? (
                <img
                  src={project.productImageUrl}
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
        ))}
      </div>
    </section>
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
        <span className="font-medium">Brief</span>
        <textarea
          className="min-h-28 rounded-md border border-zinc-300 p-3 leading-5"
          required
          value={brief}
          onChange={(event) => setBrief(event.target.value)}
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Script / Timeline</span>
        <textarea
          className="min-h-32 rounded-md border border-zinc-300 p-3 leading-5"
          value={scriptTimeline}
          onChange={(event) => setScriptTimeline(event.target.value)}
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

function ProductReferencesPanel({
  projectId,
  assets,
  task,
  isSubmitting,
  onUpload,
  onSaved,
}: {
  projectId: string
  assets: AdAsset[]
  task?: AdGenerationTask
  isSubmitting: boolean
  onUpload: () => void
  onSaved: (project: AdProject) => void
}) {
  const [newFile, setNewFile] = useState<File | null>(null)
  const [newName, setNewName] = useState("")
  const [newKind, setNewKind] = useState("other")
  const [newVisualDescription, setNewVisualDescription] = useState("")
  const addMutation = useMutation({
    mutationFn: () => {
      if (!newFile) throw new Error("Product image required")
      return addProductReference(projectId, {
        productImage: newFile,
        name: newName || sanitizeProductRefName(newFile.name, assets.length),
        kind: newKind,
        visualDescription: newVisualDescription,
      })
    },
    onSuccess: (updated) => {
      setNewFile(null)
      setNewName("")
      setNewKind("other")
      setNewVisualDescription("")
      onSaved(updated)
    },
  })
  const uploadRunning = isRunning(task)

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ImageIcon className="size-4" />
          Product References
        </div>
        {task && <TaskBadge task={task} />}
      </div>
      <Button
        className="mb-3 w-full"
        size="sm"
        variant="outline"
        disabled={assets.length === 0 || uploadRunning || isSubmitting}
        onClick={onUpload}
      >
        {uploadRunning || isSubmitting ? (
          <Loader2 className="animate-spin" />
        ) : (
          <Upload />
        )}
        Upload product refs to Flow
      </Button>
      <div className="grid gap-3">
        {assets.map((asset) => (
          <ProductReferenceCard
            key={`${asset.id}-${asset.name}-${asset.kind}`}
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
          onClick={() => addMutation.mutate()}
        >
          {addMutation.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Plus />
          )}
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
        onChange={(lockPrompt) => setDraft((prev) => ({ ...prev, lockPrompt }))}
      />
      <TextareaField
        label="Use when"
        value={draft.useWhen}
        onChange={(useWhen) => setDraft((prev) => ({ ...prev, useWhen }))}
      />
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
  onSaved,
}: {
  label: string
  asset?: AdAsset
  task?: AdGenerationTask
  isSubmitting: boolean
  onGenerate: (assetId: string) => void
  onSaved: (project: AdProject) => void
}) {
  const running = isRunning(task)
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
  const updateMutation = useMutation({
    mutationFn: () => {
      if (!asset) throw new Error("Reference asset required")
      return updateReferenceAsset(asset.id, draft)
    },
    onSuccess: onSaved,
  })

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
      {asset && (
        <div className="mt-3 grid gap-2 border-t border-zinc-200 pt-3">
          <TextField
            label="Name"
            value={draft.name}
            onChange={(name) => setDraft((prev) => ({ ...prev, name }))}
          />
          <TextareaField
            label="Primary image prompt"
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
            disabled={updateMutation.isPending}
            onClick={() => updateMutation.mutate()}
          >
            {updateMutation.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Save />
            )}
            Save Specs
          </Button>
        </div>
      )}
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
          <p className="mt-1 text-sm leading-5 text-zinc-700">
            {project.brief}
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Product context</h2>
          <p className="mt-1 text-sm leading-5 text-zinc-700">
            {project.productContext || "None"}
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Script / Timeline</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-zinc-700">
            {project.scriptTimeline || "None"}
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Duration range</h2>
          <p className="mt-1 text-sm leading-5 text-zinc-700">
            {project.durationRangeMinSec || project.durationRangeMaxSec
              ? `${project.durationRangeMinSec || "?"}-${project.durationRangeMaxSec || "?"}s`
              : "None"}
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Character brief</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-zinc-700">
            {project.characterBrief || "None"}
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Location brief</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-zinc-700">
            {project.locationBrief || "None"}
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
  onAssembleVideo,
  isAssemblingVideo,
  onRefresh,
}: {
  project: AdProject
  latestTaskByTarget: Map<string, AdGenerationTask>
  onSaved: (project: AdProject) => void
  onRewriteScene: (sceneId: string, instruction: string) => void
  onGenerateLegacyKeyframe: (sceneId: string) => void
  onGenerateVideo: (sceneId: string) => void
  onAssembleVideo: () => void
  isAssemblingVideo: boolean
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
      <FinalVideoPanel
        project={project}
        task={latestTaskByTarget.get(`AdProjectFinalVideo:${project.id}`)}
        isSubmitting={isAssemblingVideo}
        onAssemble={onAssembleVideo}
      />
      {project.scenes.map((scene) => (
        <SceneCard
          key={`${scene.id}-${scene.updatedAt}`}
          scene={scene}
          productReferences={project.assets.filter(
            (asset) => asset.type === "PRODUCT"
          )}
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

function FinalVideoPanel({
  project,
  task,
  isSubmitting,
  onAssemble,
}: {
  project: AdProject
  task?: AdGenerationTask
  isSubmitting: boolean
  onAssemble: () => void
}) {
  const allSceneVideosReady =
    project.scenes.length > 0 &&
    project.scenes.every((scene) => !!scene.videoUrl && !scene.videoError)
  const sceneVideoStillRunning = project.tasks.some(
    (task) => task.type === "AD_SCENE_VIDEO" && isRunning(task)
  )
  if (!allSceneVideosReady || sceneVideoStillRunning) return null

  const running = isSubmitting || isRunning(task)
  return (
    <section className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Final ad video</h2>
          <p className="text-xs text-zinc-500">
            Merge {project.scenes.length} scene videos in scene order.
          </p>
        </div>
        {task && <TaskBadge task={task} />}
      </div>
      <Button className="w-fit" disabled={running} onClick={onAssemble}>
        {running ? <Loader2 className="animate-spin" /> : <Film />}
        Merge {project.scenes.length} videos
      </Button>
      {project.finalVideoUrl && (
        <div className="grid gap-2">
          <video
            src={project.finalVideoUrl}
            controls
            className="aspect-[9/16] w-full max-w-sm rounded-md bg-black"
          />
          <a
            className="w-fit rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            href={project.finalVideoUrl}
            download
          >
            Download merged video
          </a>
        </div>
      )}
    </section>
  )
}

function SceneCard({
  scene,
  productReferences,
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
  productReferences: AdAsset[]
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
    actingBeats: normalizeActingBeats(scene.actingBeats),
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
    keyframePromptSlots.length > 0 &&
    selectedCount === keyframePromptSlots.length

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
                setDraft((prev) => ({
                  ...prev,
                  visualAction: event.target.value,
                }))
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
            onChange={(voiceLines) =>
              setDraft((prev) => ({ ...prev, voiceLines }))
            }
          />
          <ActingBeatsEditor
            actingBeats={draft.actingBeats}
            onChange={(actingBeats) =>
              setDraft((prev) => ({ ...prev, actingBeats }))
            }
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
            productReferences={productReferences}
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
    <div className="grid gap-2 rounded-md border border-zinc-200 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-zinc-600">
          Acting beats
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
          <div className="grid gap-2 md:grid-cols-2">
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
  )
}

function KeyframeSlots({
  scene,
  productReferences,
  latestTaskByTarget,
  onSaved,
  onRefresh,
  onGenerateLegacyKeyframe,
}: {
  scene: AdScene
  productReferences: AdAsset[]
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
          productReferences={productReferences}
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
  productReferences,
  task,
  onSaved,
  onRefresh,
}: {
  slot: AdKeyframePromptSlot
  productReferences: AdAsset[]
  task?: AdGenerationTask
  onSaved: (project: AdProject) => void
  onRefresh: () => void
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
      <fieldset className="grid gap-2 border-0 p-0">
        <legend className="text-xs font-medium text-zinc-600">
          Product references
        </legend>
        {productReferences.length ? (
          <div className="grid gap-1">
            {productReferences.map((reference) => {
              const selected = draft.productReferenceIds.includes(reference.id)
              return (
                <label
                  key={reference.id}
                  className="flex min-h-9 items-center gap-2 border-b border-zinc-100 py-1 text-sm text-zinc-800 last:border-b-0"
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
          {updateMutation.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Save />
          )}
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
      {updateMutation.error && (
        <p className="rounded-md bg-red-50 p-2 text-xs leading-4 text-red-700">
          {readMutationError(updateMutation.error)}
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

function TextField({
  label,
  value,
  onChange,
  disabled = false,
  type = "text",
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  type?: string
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-zinc-600">
      {label}
      <input
        className="h-9 rounded-md border border-zinc-300 px-2 text-sm text-zinc-900"
        disabled={disabled}
        type={type}
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

function isRunning(task?: AdGenerationTask) {
  return task?.status === "QUEUED" || task?.status === "PROCESSING"
}

function readMutationError(error: unknown) {
  if (!error) return null
  if (error instanceof Error) return error.message
  return "Request failed"
}

export default AdsVideoPage
