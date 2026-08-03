import { useCallback, useEffect, useMemo } from "react"
import { ROUTES } from "@/constants"
import {
  isAdTaskRunning,
  useAdProjectQuery,
  useAdsProjectsQuery,
  useAssembleVideoMutation,
  useCreateAdProjectMutation,
  useDeleteAdProjectMutation,
  useGenerateAssetMutation,
  useGenerateMissingKeyframesMutation,
  useGenerateVideoMutation,
  useRegenerateAllKeyframesMutation,
  useReplanSceneMutation,
  useRunAdPlanMutation,
  useUpdateAdProjectMutation,
  useUploadProductReferencesMutation,
  useUploadReferenceAssetImageMutation,
} from "@/services/use-ads"
import { Copy, Loader2, Trash2 } from "lucide-react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"

import type { AdAsset, AdGenerationTask } from "@/types/ads"
import { useCopyFeedback } from "@/hooks/use-copy-feedback"
import { Button } from "@/components/ui/button"
import { FlowLoginControl } from "@/components/flow-login-control"

import { KeyframesSceneList } from "./_components/keyframes-scene-list"
import { MediaPreviewProvider } from "./_components/media-preview"
import { PlanJsonPanel, ProjectPlanEditor } from "./_components/plan-panels"
import { BriefPanel, ProjectListPanel } from "./_components/project-panels"
import {
  ProductReferencesPanel,
  ReferenceCard,
} from "./_components/reference-panels"
import { StageTabs, type WorkspaceStage } from "./_components/stage-tabs"
import { readMutationError } from "./_components/utils"
import { VideosSceneList } from "./_components/videos-scene-list"

const WORKSPACE_STAGE_IDS: WorkspaceStage[] = [
  "plan",
  "references",
  "keyframes",
  "videos",
]

function isWorkspaceStage(value: string | null): value is WorkspaceStage {
  return WORKSPACE_STAGE_IDS.some((stage) => stage === value)
}

function AdsVideoPageContent() {
  const { projectId } = useParams<{ projectId?: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { copied: copiedFlowId, copy } = useCopyFeedback()
  const stageParam = searchParams.get("stage")
  const workspaceStage = isWorkspaceStage(stageParam) ? stageParam : "plan"
  const setWorkspaceStage = useCallback(
    (stage: WorkspaceStage, replaceHistory = false) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          next.set("stage", stage)
          return next
        },
        { replace: replaceHistory }
      )
    },
    [setSearchParams]
  )
  const projectsQuery = useAdsProjectsQuery()
  const projectQuery = useAdProjectQuery(projectId)

  const project = projectQuery.data
  const latestTaskByTarget = useMemo(() => {
    const map = new Map<string, AdGenerationTask>()
    for (const task of project?.tasks ?? []) {
      const key = `${task.targetType}:${task.targetId}`
      if (!map.has(key)) map.set(key, task)
    }
    return map
  }, [project?.tasks])

  const createMutation = useCreateAdProjectMutation()
  const deleteProjectMutation = useDeleteAdProjectMutation()

  const confirmDeleteProject = (id: string, title?: string | null) => {
    const displayName = title?.trim() || "Untitled ads project"
    if (
      window.confirm(
        `Delete "${displayName}"? The project will be hidden, but its data and media files will be retained.`
      )
    ) {
      deleteProjectMutation.mutate(id, {
        onSuccess: (deleted) => {
          if (projectId === deleted.id) {
            setWorkspaceStage("plan")
            navigate(ROUTES.ADS_VIDEO)
          }
        },
        onError: (error) => {
          window.alert(readMutationError(error) || "Could not delete project.")
        },
      })
    }
  }

  const planMutation = useRunAdPlanMutation()
  const projectInputMutation = useUpdateAdProjectMutation()
  const assetMutation = useGenerateAssetMutation()
  const referenceImageUploadMutation = useUploadReferenceAssetImageMutation()
  const productRefUploadMutation = useUploadProductReferencesMutation()
  const generateMissingKeyframesMutation = useGenerateMissingKeyframesMutation()
  const regenerateAllKeyframesMutation = useRegenerateAllKeyframesMutation()
  const videoMutation = useGenerateVideoMutation()
  const assembleVideoMutation = useAssembleVideoMutation()
  const replanMutation = useReplanSceneMutation()

  useEffect(() => {
    if (!project) return
    const nextCharacter = project.assets.find(
      (asset) => asset.type === "CHARACTER"
    )
    const nextLocation = project.assets.find(
      (asset) => asset.type === "LOCATION"
    )
    const referenceAssets = [
      ...project.assets.filter((asset) => asset.type === "PRODUCT"),
      ...(nextCharacter ? [nextCharacter] : []),
      ...(nextLocation ? [nextLocation] : []),
    ]
    const flowKindFor = (asset: AdAsset) =>
      asset.type === "CHARACTER"
        ? "CHARACTER_REF"
        : asset.type === "LOCATION"
          ? "LOCATION_REF"
          : "PRODUCT_UPLOAD"
    const referencesUploaded =
      referenceAssets.length > 2 &&
      referenceAssets.every((asset) =>
        project.flowMedia.some(
          (media) =>
            media.assetId === asset.id &&
            media.kind === flowKindFor(asset) &&
            (media.status === "UPLOADED" || media.status === "DOWNLOADED")
        )
      )
    if (
      (workspaceStage === "keyframes" || workspaceStage === "videos") &&
      !referencesUploaded
    ) {
      setWorkspaceStage("references", true)
    }
  }, [project, setWorkspaceStage, workspaceStage])

  if (!projectId) {
    return (
      <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950">
        <div className="mx-auto grid max-w-7xl gap-4">
          <div className="flex justify-end">
            <FlowLoginControl />
          </div>
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <BriefPanel
              isSubmitting={createMutation.isPending}
              error={readMutationError(createMutation.error)}
              onCreate={(payload) =>
                createMutation.mutate(payload, {
                  onSuccess: (created) => {
                    setWorkspaceStage("plan")
                    navigate(`${ROUTES.ADS_VIDEO}/${created.id}`)
                  },
                })
              }
            />
            <ProjectListPanel
              projects={projectsQuery.data ?? []}
              isLoading={projectsQuery.isLoading}
              deletingProjectId={
                deleteProjectMutation.isPending
                  ? deleteProjectMutation.variables
                  : undefined
              }
              onDelete={confirmDeleteProject}
            />
          </div>
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
              <Button className="w-fit" variant="outline" asChild>
                <Link to={ROUTES.ADS_VIDEO}>Back to projects</Link>
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
  const isPlanRunning = isAdTaskRunning(
    latestTaskByTarget.get(`AdProject:${project.id}`)
  )
  const hasPlan = project.scenes.length > 0
  const hasDownstream = hasPlan || !!character || !!location
  const hasReadyReferences = !!character?.imageUrl && !!location?.imageUrl
  const referenceAssets = [
    ...productRefs,
    ...(character ? [character] : []),
    ...(location ? [location] : []),
  ]
  const flowKindFor = (asset: AdAsset) =>
    asset.type === "CHARACTER"
      ? "CHARACTER_REF"
      : asset.type === "LOCATION"
        ? "LOCATION_REF"
        : "PRODUCT_UPLOAD"
  const hasUploadedReferenceSet =
    hasReadyReferences &&
    productRefs.length > 0 &&
    referenceAssets.every((asset) =>
      project.flowMedia.some(
        (media) =>
          media.assetId === asset.id &&
          media.kind === flowKindFor(asset) &&
          (media.status === "UPLOADED" || media.status === "DOWNLOADED")
      )
    )
  const referencesBusy =
    isAdTaskRunning(
      latestTaskByTarget.get(`AdProjectProductRefs:${project.id}`)
    ) ||
    [character, location].some((asset) =>
      asset
        ? isAdTaskRunning(latestTaskByTarget.get(`AdAsset:${asset.id}`))
        : false
    )
  const canAdvanceToKeyframes = hasUploadedReferenceSet && !referencesBusy

  const confirmRebuildPlan = () => {
    if (!hasDownstream) return true
    return window.confirm(
      "This will rebuild the plan, character/location specs, scenes, and keyframe slots. Existing downstream keyframes/videos can become invalid. Continue?"
    )
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-4">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm">
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
            <div className="flex flex-wrap items-center gap-2">
              {project.flowProjectId && (
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
                  <span title={`Flow Project ID: ${project.flowProjectId}`}>
                    ID: {project.flowProjectId}
                  </span>

                  <button
                    className="inline-flex size-5 shrink-0 items-center justify-center rounded border border-violet-300 bg-white text-violet-700 transition hover:bg-violet-100"
                    type="button"
                    title="Copy Flow Project ID"
                    aria-label={`Copy Flow Project ID ${project.flowProjectId}`}
                    onClick={() => void copy(project.flowProjectId ?? "")}
                  >
                    <Copy className="size-3" />
                  </button>
                  {copiedFlowId && (
                    <span className="text-xs text-emerald-700">Copied</span>
                  )}
                </div>
              )}

              {project.flowAccountEmail && (
                <span
                  className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                  title={`Google Flow account: ${project.flowAccountEmail}`}
                >
                  Flow: {project.flowAccountEmail}
                </span>
              )}
            </div>
            <FlowLoginControl />
            <Button variant="outline" asChild>
              <Link to={ROUTES.ADS_VIDEO}>Projects</Link>
            </Button>
            <Button
              variant="outline"
              disabled={deleteProjectMutation.isPending}
              onClick={() => confirmDeleteProject(project.id, project.title)}
            >
              {deleteProjectMutation.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Trash2 />
              )}
              Delete
            </Button>
          </div>
        </header>

        <StageTabs
          stage={workspaceStage}
          project={project}
          hasReadyReferences={hasReadyReferences}
          hasUploadedReferences={hasUploadedReferenceSet}
          onChange={setWorkspaceStage}
        />

        {/* Project input intentionally hidden.
        {workspaceStage !== "plan" && <ProjectBrief project={project} />}
        */}

        {workspaceStage === "plan" && (
          <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
            <div className="grid gap-4">
              <ProjectPlanEditor
                project={project}
                isSaving={projectInputMutation.isPending}
                isPlanning={isPlanRunning || planMutation.isPending}
                error={readMutationError(projectInputMutation.error)}
                onSave={(payload, shouldReplan) => {
                  if (shouldReplan && !confirmRebuildPlan()) return
                  projectInputMutation.mutate(
                    { id: project.id, payload },
                    {
                      onSuccess: () => {
                        if (shouldReplan) planMutation.mutate(project.id)
                      },
                    }
                  )
                }}
              />
            </div>
            <ProductReferencesPanel
              projectId={project.id}
              assets={productRefs}
              task={latestTaskByTarget.get(
                `AdProjectProductRefs:${project.id}`
              )}
              isSubmitting={productRefUploadMutation.isPending}
              canUpload={false}
              showFlowUpload={false}
              allowDelete
              onUpload={() => productRefUploadMutation.mutate(project.id)}
            />
            <div className="col-span-full">
              <PlanJsonPanel project={project} />
            </div>
            {/* <ImportPlanPanel
              project={project}
              isSubmitting={importPlanMutation.isPending}
              error={readMutationError(importPlanMutation.error)}
              onImport={(rawPlan) => {
                if (confirmRebuildPlan()) {
                  importPlanMutation.mutate(
                    { id: project.id, rawPlan },
                    {
                      onSuccess: () => setWorkspaceStage("references"),
                    }
                  )
                }
              }}
            /> */}
          </section>
        )}

        {workspaceStage === "references" && (
          <section className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
              <p className="text-sm text-zinc-600">
                Upload complete reference set to Flow, then continue manually.
              </p>
              <Button
                disabled={!canAdvanceToKeyframes}
                onClick={() => setWorkspaceStage("keyframes")}
              >
                Next: Keyframes
              </Button>
            </div>

            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,1fr)_minmax(280px,1fr)]">
              <ProductReferencesPanel
                projectId={project.id}
                assets={productRefs}
                task={latestTaskByTarget.get(
                  `AdProjectProductRefs:${project.id}`
                )}
                isSubmitting={productRefUploadMutation.isPending}
                canUpload={hasReadyReferences && productRefs.length > 0}
                onUpload={() => productRefUploadMutation.mutate(project.id)}
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
                isUploadSubmitting={referenceImageUploadMutation.isPending}
                onGenerate={(assetId) => assetMutation.mutate(assetId)}
                onUpload={(assetId, file) =>
                  referenceImageUploadMutation.mutate({ assetId, file })
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
                isUploadSubmitting={referenceImageUploadMutation.isPending}
                onGenerate={(assetId) => assetMutation.mutate(assetId)}
                onUpload={(assetId, file) =>
                  referenceImageUploadMutation.mutate({ assetId, file })
                }
              />
            </div>
          </section>
        )}

        {workspaceStage === "keyframes" && (
          <KeyframesSceneList
            project={project}
            latestTaskByTarget={latestTaskByTarget}
            onReplanScene={(sceneId, instruction) =>
              replanMutation.mutate({ sceneId, instruction })
            }
            onGenerateMissingKeyframes={() =>
              generateMissingKeyframesMutation.mutate(project.id)
            }
            onRegenerateAllKeyframes={() =>
              regenerateAllKeyframesMutation.mutate(project.id)
            }
            isBatchingKeyframes={
              generateMissingKeyframesMutation.isPending ||
              regenerateAllKeyframesMutation.isPending
            }
            keyframeBatchResult={
              generateMissingKeyframesMutation.data ||
              regenerateAllKeyframesMutation.data
            }
            keyframeBatchError={readMutationError(
              generateMissingKeyframesMutation.error ||
                regenerateAllKeyframesMutation.error
            )}
            onGenerateVideo={(sceneId) => videoMutation.mutate(sceneId)}
          />
        )}

        {workspaceStage === "videos" && (
          <VideosSceneList
            project={project}
            latestTaskByTarget={latestTaskByTarget}
            onGenerateVideo={(sceneId) => videoMutation.mutate(sceneId)}
            onAssembleVideo={() => assembleVideoMutation.mutate(project.id)}
            isAssemblingVideo={assembleVideoMutation.isPending}
          />
        )}
      </div>
    </main>
  )
}

function AdsVideoPage() {
  return (
    <MediaPreviewProvider>
      <AdsVideoPageContent />
    </MediaPreviewProvider>
  )
}

export default AdsVideoPage
