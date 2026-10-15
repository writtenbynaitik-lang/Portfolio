import { useFrame } from '@react-three/fiber'
import { useRef, type RefObject } from 'react'

export interface IntroClock {
  /** Seconds since the intro started. Infinity when motion is reduced. */
  elapsed: number
}

export type IntroClockRef = RefObject<IntroClock>

/**
 * One shared clock for the scene's intro choreography. Ticks before every
 * other frame callback (priority -2) so all readers see the same time.
 */
export function useIntroClock(playing: boolean, reducedMotion: boolean): IntroClockRef {
  const clock = useRef<IntroClock>({ elapsed: 0 })
  const startedAt = useRef<number | null>(null)

  useFrame((state) => {
    if (reducedMotion) {
      clock.current.elapsed = Infinity
      return
    }
    if (!playing) return
    startedAt.current ??= state.clock.elapsedTime
    clock.current.elapsed = state.clock.elapsedTime - startedAt.current
  }, -2)

  return clock
}
