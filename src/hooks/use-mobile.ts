import * as React from "react"

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches
}

/** Server render has no viewport; assume desktop to avoid a hydration mismatch. */
function getServerSnapshot() {
  return false
}

/**
 * Reads the viewport with useSyncExternalStore instead of setState-in-effect,
 * which avoided the cascading re-render flagged by react-hooks/set-state-in-effect
 * and removed the one-frame flash of the wrong layout on mobile.
 */
export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
