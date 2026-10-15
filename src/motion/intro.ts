import type { CSSProperties } from 'react'

/**
 * Opening choreography, in seconds from the moment the intro starts (once the
 * fonts are ready). DOM reveals and the 3D scene both read from here so they
 * stay in step.
 */
export const INTRO = {
  backdrop: 0,
  signature: 0.1,
  nav: 0.28,
  /** The headline types itself from here; the scroll cue follows it (see Hero). */
  headline: { start: 0.3 },
  scene: {
    dolly: { start: 0, duration: 2.8 },
    /** The hall emerges from the void: visibility reaches further and the lights come up. */
    reveal: { start: 0.1, duration: 2.6 },
    dust: { start: 1.6, duration: 1.8 },
  },
} as const

/** Inline style that gives a reveal (see reveal.module.css) its timing. */
export function revealTiming(delay: number, duration?: number): CSSProperties {
  return {
    '--delay': `${delay}s`,
    ...(duration === undefined ? {} : { '--duration': `${duration}s` }),
  } as CSSProperties
}
