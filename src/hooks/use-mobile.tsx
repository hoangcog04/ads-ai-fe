import { useSyncExternalStore } from "react"

const MOBILE_BREAKPOINT = 768

function mediaQueryListener(callback: (event: MediaQueryListEvent) => void) {
  if (typeof window === "undefined") return () => {}

  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", callback)

  return () => {
    mql.removeEventListener("change", callback)
  }
}

function isSmallerThanBreakpoint() {
  if (typeof window === "undefined") return false

  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches
}

export function useIsMobile() {
  return useSyncExternalStore(
    mediaQueryListener,
    isSmallerThanBreakpoint,
    () => false
  )
}
