import type { AdProject } from "@/types/ads"

export function ProjectBrief({ project }: { project: AdProject }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      <details>
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Project input</h2>
            <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">
              {project.brief}
            </p>
          </div>
          <span className="text-xs font-medium text-zinc-500">View brief</span>
        </summary>
        <div className="grid gap-3 border-t border-zinc-200 p-4 md:grid-cols-2">
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
      </details>
    </section>
  )
}
