import { useCallback, useEffect, useRef, useState } from "react"

export function useCopyFeedback(resetAfterMs = 1500) {
  const [copied, setCopied] = useState(false)
  const resetTimerRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current)
      }
    },
    []
  )

  const copy = useCallback(
    async (value: string) => {
      try {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        if (resetTimerRef.current !== null) {
          window.clearTimeout(resetTimerRef.current)
        }
        resetTimerRef.current = window.setTimeout(() => {
          setCopied(false)
          resetTimerRef.current = null
        }, resetAfterMs)
        return true
      } catch {
        return false
      }
    },
    [resetAfterMs]
  )

  return { copied, copy }
}
