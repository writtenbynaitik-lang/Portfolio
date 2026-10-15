import { useEffect, useState } from 'react'

/**
 * Opens (and stays open) once `ready` is true, or after `timeoutMs` regardless,
 * so a slow font or GPU can delay the intro but never hide the page.
 */
export function useIntroGate(ready: boolean, timeoutMs = 2500) {
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), timeoutMs)
    return () => clearTimeout(timer)
  }, [timeoutMs])

  return ready || timedOut
}
