import { isAdTaskRunning } from "@/services/use-ads"
import { Copy } from "lucide-react"

import type { AdGenerationTask } from "@/types/ads"
import { useCopyFeedback } from "@/hooks/use-copy-feedback"

export function TaskBadge({ task }: { task: AdGenerationTask }) {
  const { copied: copiedJobId, copy } = useCopyFeedback()
  const colors =
    task.status === "FAILED"
      ? "bg-red-50 text-red-700"
      : task.status === "COMPLETED"
        ? "bg-emerald-50 text-emerald-700"
        : "bg-blue-50 text-blue-700"
  return (
    <div className="flex max-w-full flex-wrap items-center justify-end gap-1">
      {task.status != "FAILED" && (
        <span
          className={`inline-flex h-9 items-center rounded-md px-2 text-xs font-medium ${colors}`}
        >
          {task.status}
          {isAdTaskRunning(task) ? ` ${task.progress}%` : ""}
        </span>
      )}
      {task.status === "FAILED" && task.errorCode && (
        <div className="flex h-9 max-w-64 items-center gap-1 rounded bg-red-50 px-1.5 text-[11px] text-red-700">
          <span className="shrink-0 font-medium">Code:</span>
          <code>{task.errorCode}</code>
        </div>
      )}
      {task.status === "FAILED" && task.bullJobId && (
        <button
          type="button"
          className="flex h-9 max-w-64 items-center gap-1 rounded bg-zinc-100 px-1.5 text-left text-[11px] text-zinc-700 hover:bg-zinc-200"
          title={`Copy Job: ${task.bullJobId}`}
          aria-label={`Copy Job ${task.bullJobId}`}
          onClick={() => void copy(task.bullJobId!)}
        >
          <span className="shrink-0 font-medium">Job:</span>
          <code className="truncate">{task.bullJobId}</code>
          <Copy className="size-3 shrink-0" />
          {copiedJobId && (
            <span className="shrink-0 text-emerald-700">Copied</span>
          )}
        </button>
      )}
    </div>
  )
}
