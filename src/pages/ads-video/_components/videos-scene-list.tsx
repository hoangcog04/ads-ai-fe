import { useEffect, useState } from "react"
import {
  isAdTaskRunning,
  useUpdateSceneDurationMutation,
  useUpdateSceneVideoPromptMutation,
} from "@/services/use-ads"
import { Film, Loader2, Save, Video } from "lucide-react"

import type { AdGenerationTask, AdProject, AdScene } from "@/types/ads"
import { resolveMediaUrl } from "@/lib/media-url"
import { Button } from "@/components/ui/button"

import { SCENE_DURATION_OPTIONS } from "./constants"
import { TaskBadge } from "./task-badge"
import { readMutationError } from "./utils"

export function VideosSceneList({
  project,
  latestTaskByTarget,
  onGenerateVideo,
  onAssembleVideo,
  isAssemblingVideo,
}: {
  project: AdProject
  latestTaskByTarget: Map<string, AdGenerationTask>
  onGenerateVideo: (sceneId: string) => void
  onAssembleVideo: () => void
  isAssemblingVideo: boolean
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

      {!project.finalVideoUrl && (
        <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {project.scenes.map((scene) => (
            <VideoSceneCard
              key={scene.id}
              scene={scene}
              sceneTask={latestTaskByTarget.get(`AdScene:${scene.id}`)}
              onGenerateVideo={onGenerateVideo}
            />
          ))}
        </div>
      )}
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
  const readySceneVideos = project.scenes.filter((scene) => !!scene.videoUrl)
  const readyVideoCount = readySceneVideos.length
  const missingVideoCount = project.scenes.length - readyVideoCount
  const running = isSubmitting || isAdTaskRunning(task)

  return (
    <section className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Final ad video</h2>
          <p className="text-xs text-zinc-500">
            {readyVideoCount > 0
              ? `Merge ${readyVideoCount} available scene video${readyVideoCount === 1 ? "" : "s"} in scene order.`
              : "Generate at least one scene video to start merging."}
            {missingVideoCount > 0 &&
              ` ${missingVideoCount} scene${missingVideoCount === 1 ? "" : "s"} without video will be skipped.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {task && <TaskBadge task={task} />}
          <Button
            className="w-fit"
            disabled={running || readyVideoCount === 0}
            onClick={onAssemble}
          >
            {running ? <Loader2 className="animate-spin" /> : <Film />}
            Merge {readyVideoCount} video{readyVideoCount === 1 ? "" : "s"}
          </Button>
        </div>
      </div>
      {project.finalVideoUrl && (
        <div className="grid gap-2">
          <video
            src={resolveMediaUrl(project.finalVideoUrl)}
            controls
            className="aspect-[9/16] w-48 max-w-full rounded-md bg-black"
          />
          <a
            className="w-fit rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            href={resolveMediaUrl(project.finalVideoUrl)}
            download
          >
            Download merged video
          </a>
        </div>
      )}
    </section>
  )
}

function VideoSceneCard({
  scene,
  sceneTask,
  onGenerateVideo,
}: {
  scene: AdScene
  sceneTask?: AdGenerationTask
  onGenerateVideo: (sceneId: string) => void
}) {
  const [videoPromptDraft, setVideoPromptDraft] = useState(
    scene.videoPrompt || ""
  )

  useEffect(() => {
    setVideoPromptDraft(scene.videoPrompt || "")
  }, [scene.id, scene.videoPrompt])

  const durationMutation = useUpdateSceneDurationMutation(scene.id)
  const videoPromptMutation = useUpdateSceneVideoPromptMutation(
    scene.id,
    () => videoPromptDraft
  )
  const running = isAdTaskRunning(sceneTask)
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
    <article className="min-w-0 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-zinc-900 text-xs font-semibold text-white">
            {scene.sceneIndex}
          </span>
          <div>
            <h2 className="text-sm font-semibold">{scene.title}</h2>
            <p className="text-xs text-zinc-500">Video production</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-zinc-600">
            Duration
            <select
              className="h-8 rounded-md border border-zinc-300 bg-white px-2 text-xs text-zinc-800"
              value={scene.durationSec}
              disabled={running || durationMutation.isPending}
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
          {sceneTask && <TaskBadge task={sceneTask} />}
        </div>
      </div>
      {durationMutation.error && (
        <p className="mt-2 rounded-md bg-red-50 p-2 text-xs text-red-700">
          {readMutationError(durationMutation.error)}
        </p>
      )}

      <div className="mt-4 grid w-full gap-4">
        <section className="grid content-start gap-3 rounded-md border border-zinc-200 p-3">
          <div className="grid gap-2 rounded-md border border-zinc-200 p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-zinc-800">
                Video prompt
              </span>
              {scene.videoPromptStale && (
                <span className="shrink-0 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium leading-4 text-amber-700">
                  Needs confirmation
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500">
              Direct-write Flow input. Save after editing or to confirm a stale
              prompt.
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
          </div>

          <section className="grid gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">
                  Video output
                  {!canGenerateVideo && (
                    <span className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700">
                      {includedSlots.length === 0
                        ? "Enable at least one keyframe"
                        : "Select every enabled keyframe first"}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-zinc-500">
                  {selectedCount}/{includedSlots.length} included keyframes
                  selected
                  {excludedCount > 0 ? ` · ${excludedCount} excluded` : ""}
                </p>
              </div>
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
                className="mx-auto aspect-[9/16] w-40 max-w-full rounded-md bg-black"
              />
            )}
          </section>
        </section>
      </div>
    </article>
  )
}
