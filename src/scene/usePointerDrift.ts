import { useFrame } from '@react-three/fiber'
import { useRef, type RefObject } from 'react'
import { MathUtils } from 'three'
import type { GalleryInteraction } from './gallery/interaction'

export interface PointerDrift {
  /** Where the pointer is across the screen, −1…1 each way, followed slowly. */
  x: number
  y: number
}

export type PointerDriftRef = RefObject<PointerDrift>

/** How quickly the drift follows the pointer (per second): slow enough to feel weighted. */
const FOLLOW = 1.8

/**
 * The pointer's influence on the environment, shared by everything that
 * responds to it (the camera's parallax, the hall's lights, the contact
 * room's glow), so they all move as one. It trails the pointer with a little
 * inertia, holds still while the visitor is engaged with a project (so
 * nothing slides out from under the pointer), and rests at the centre when
 * `enabled` is off: touch screens and reduced motion. Reads the pointer the
 * scene already tracks, so it adds no listeners of its own.
 */
export function usePointerDrift(enabled: boolean, interaction: GalleryInteraction): PointerDriftRef {
  const drift = useRef<PointerDrift>({ x: 0, y: 0 })

  // After the scroll sampler and intro clock (−2), before anything that reads it
  useFrame(({ pointer }, delta) => {
    const state = drift.current
    const rate = enabled ? FOLLOW * (1 - interaction.engaged) : FOLLOW
    state.x = MathUtils.damp(state.x, enabled ? pointer.x : 0, rate, delta)
    state.y = MathUtils.damp(state.y, enabled ? pointer.y : 0, rate, delta)
  }, -1)

  return drift
}
