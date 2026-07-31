import type { AdProject } from "@/types/ads"

const WORKSPACE_STAGES = [
  { id: "plan", label: "Plan" },
  { id: "references", label: "References" },
  { id: "keyframes", label: "Keyframes" },
  { id: "videos", label: "Videos" },
] as const

export type WorkspaceStage = (typeof WORKSPACE_STAGES)[number]["id"]

export function StageTabs({
  stage,
  project,
  hasReadyReferences,
  hasUploadedReferences,
  onChange,
}: {
  stage: WorkspaceStage
  project: AdProject
  hasReadyReferences: boolean
  hasUploadedReferences: boolean
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
    references: hasUploadedReferences
      ? "Flow refs uploaded"
      : hasReadyReferences
        ? "upload all refs to Flow"
        : "generate or upload char/location",
    keyframes: selectedKeyframes
      ? `${selectedKeyframes} selected`
      : hasUploadedReferences
        ? "select refs"
        : "upload refs first",
    videos: hasUploadedReferences ? "Flow video" : "upload refs first",
  }

  return (
    <nav className="grid gap-2 rounded-lg border border-zinc-200 bg-white p-2 shadow-sm sm:grid-cols-4">
      {WORKSPACE_STAGES.map((item) => {
        const active = item.id === stage
        const disabled =
          (item.id === "keyframes" || item.id === "videos") &&
          !hasUploadedReferences
        return (
          <button
            key={item.id}
            className={`flex items-center justify-between rounded-md border px-3 py-2 text-left ${
              active
                ? "border-zinc-900 bg-zinc-950 text-white"
                : "border-zinc-200 bg-white text-zinc-700"
            } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
            disabled={disabled}
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
