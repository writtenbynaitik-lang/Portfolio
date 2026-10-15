import { useEffect, useState } from 'react'

/**
 * True once the given font faces (CSS font shorthand, e.g. '400 1em "Geist"')
 * have loaded or failed to. Lets the intro start without animating a visible
 * font swap; pair with useIntroGate for a time limit.
 */
export function useFontsReady(faces: readonly string[]) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    Promise.all(faces.map((face) => document.fonts.load(face)))
      .catch(() => undefined)
      .then(() => {
        if (!cancelled) setReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [faces])

  return ready
}
