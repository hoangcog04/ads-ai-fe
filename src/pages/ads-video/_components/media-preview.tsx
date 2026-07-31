import { createContext, useContext, useState, type ReactNode } from "react"
import { ImageIcon } from "lucide-react"

import { resolveMediaUrl } from "@/lib/media-url"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type PreviewImage = {
  src: string
  alt: string
  label: string
}

const MediaPreviewContext = createContext<
  ((preview: PreviewImage) => void) | null
>(null)

export function MediaPreviewProvider({ children }: { children: ReactNode }) {
  const [preview, setPreview] = useState<PreviewImage | null>(null)

  return (
    <MediaPreviewContext.Provider value={setPreview}>
      {children}
      <Dialog
        open={preview !== null}
        onOpenChange={(open) => {
          if (!open) setPreview(null)
        }}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{preview?.label || "Image preview"}</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="flex max-h-[80vh] items-center justify-center overflow-auto rounded-lg bg-zinc-950 p-2">
              <img
                src={preview.src}
                alt={preview.alt}
                className="max-h-[76vh] max-w-full object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MediaPreviewContext.Provider>
  )
}

export function MediaPreview({
  src,
  alt,
  label,
  emptyText = "No image",
  className,
  thumbnailClassName,
}: {
  src?: string | null
  alt: string
  label?: string
  emptyText?: string
  className?: string
  thumbnailClassName?: string
}) {
  const resolvedSrc = resolveMediaUrl(src)
  const openPreview = useContext(MediaPreviewContext)

  if (!resolvedSrc) {
    return (
      <div
        className={cn(
          "flex size-28 items-center justify-center rounded-md border border-zinc-200 bg-zinc-100 text-xs text-zinc-500",
          className,
          thumbnailClassName
        )}
      >
        <span className="grid justify-items-center gap-1 text-center">
          <ImageIcon className="size-4" />
          {emptyText}
        </span>
      </div>
    )
  }

  if (!openPreview) {
    throw new Error("MediaPreview must be rendered inside MediaPreviewProvider")
  }

  return (
    <button
      type="button"
      className={cn(
        "group relative block size-28 overflow-hidden rounded-md border border-zinc-200 bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900",
        className,
        thumbnailClassName
      )}
      title={`Preview ${label || alt}`}
      onClick={() =>
        openPreview({
          src: resolvedSrc,
          alt,
          label: label || alt || "Image preview",
        })
      }
    >
      <img
        src={resolvedSrc}
        alt={alt}
        className="h-full w-full object-cover object-top transition-transform group-hover:scale-105"
      />
      <span className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
        Preview
      </span>
    </button>
  )
}
